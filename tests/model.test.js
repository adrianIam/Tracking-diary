import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateEntry,parseBackup,mergeEntries,toCSV,durationMinutes,durationMs,createBurstSession,SCHEMA_VERSION,summarise} from '../dist/model.js';
const now=Date.parse('2026-11-14T10:00:00Z');
const sample=(overrides={})=>({id:'a',trackerType:'headache',kind:'migraine',severity:2,startedAt:'2026-11-14T08:00:00Z',endedAt:'2026-11-14T09:00:00Z',triggers:['Stress'],symptoms:[],relief:['Rest'],notes:'',medication:'',impact:'',createdAt:'2026-11-14T09:00:00Z',updatedAt:'2026-11-14T09:00:00Z',...overrides});
test('ongoing duration derives from persisted timestamps',()=>assert.equal(durationMinutes(sample({endedAt:null}),now),120));
test('rejects future timestamps and end preceding start',()=>{assert.throws(()=>validateEntry(sample({startedAt:'2026-11-15T08:00:00Z'}),now),/Start/);assert.throws(()=>validateEntry(sample({endedAt:'2026-11-14T07:00:00Z'}),now),/End/);});
test('backup preserves all episode data and strips unknown properties',()=>{const e=sample({notes:'Line one\nLine two',medication:'Example only',extra:'untrusted'});const out=parseBackup(JSON.stringify({schemaVersion:1,entries:[e]}),now);assert.equal(out[0].notes,e.notes);assert.equal(out[0].medication,e.medication);assert.equal(out[0].extra,undefined);});
test('malformed backup, duplicate IDs, and multiple running episodes fail without merging',()=>{assert.throws(()=>parseBackup('{bad',now));assert.throws(()=>parseBackup(JSON.stringify({schemaVersion:1,entries:[sample(),sample()]}),now),/duplicate/);assert.throws(()=>mergeEntries([sample({endedAt:null})],[sample({id:'b',endedAt:null})]),/ongoing/);});
test('merge is idempotent and latest update wins',()=>{const old=sample(), fresh=sample({notes:'updated',updatedAt:'2026-11-14T09:30:00Z'});assert.deepEqual(mergeEntries([old],[fresh]),[fresh]);assert.deepEqual(mergeEntries([fresh],[old,fresh]),[fresh]);});
test('CSV escapes quotes, newlines and formula-like health notes',()=>{const csv=toCSV([sample({notes:'=HYPERLINK("example")\nnext'})]);assert.ok(csv.includes('"\'=HYPERLINK(""example"")\nnext"'));assert.ok(csv.includes('"60"'));});
test('summary excludes ongoing episodes from mean duration',()=>{const s=summarise([sample(),sample({id:'b',endedAt:null})],now-86400000,now);assert.equal(s.avgMinutes,60);assert.equal(s.days,1);assert.equal(s.list.length,2);assert.deepEqual(s.topTriggers,[['Stress',2]]);});

const burstSample=()=>createBurstSession([
  {startedAt:'2026-11-14T08:00:00.100Z',endedAt:'2026-11-14T08:00:02.450Z'},
  {startedAt:'2026-11-14T08:01:10.000Z',endedAt:'2026-11-14T08:01:11.200Z'}
],now);
test('separate bursts become one session without counting pain-free gaps',()=>{
 const session=burstSample();
 assert.equal(session.startedAt,'2026-11-14T08:00:00.100Z');
 assert.equal(session.endedAt,'2026-11-14T08:01:11.200Z');
 assert.equal(durationMs(session),3550);
 assert.equal(session.bursts.length,2);
 const copy=createBurstSession(session.bursts,now);copy.bursts[0].startedAt='changed';
 assert.equal(session.bursts[0].startedAt,'2026-11-14T08:00:00.100Z');
});
test('all burst timestamps survive version 2 backups, note edits and merges',()=>{
 const entry=validateEntry(sample({...burstSample(),notes:'A group of short bursts'}),now);
 const roundtrip=parseBackup(JSON.stringify({schemaVersion:SCHEMA_VERSION,entries:[entry]}),now)[0];
 assert.deepEqual(roundtrip,entry);
 const edited=validateEntry({...roundtrip,notes:'Updated note',updatedAt:'2026-11-14T09:30:00Z'},now);
 assert.deepEqual(edited.bursts,entry.bursts);
 assert.deepEqual(mergeEntries([entry],[edited])[0].bursts,entry.bursts);
});
test('version 1 diary entries remain valid with no invented bursts',()=>{
 const old=sample();const [restored]=parseBackup(JSON.stringify({schemaVersion:1,entries:[old]}),now);
 assert.deepEqual(restored,old);assert.equal(durationMs(restored),3600000);
 assert.equal(SCHEMA_VERSION,2);
});
test('invalid or overlapping bursts and mismatched session bounds are rejected',()=>{
 const b=burstSample();
 assert.throws(()=>createBurstSession([],now),/session/);
 assert.throws(()=>createBurstSession([b.bursts[1],b.bursts[0]],now),/overlap/);
 assert.throws(()=>createBurstSession([b.bursts[0],b.bursts[0]],now),/overlap/);
 assert.throws(()=>createBurstSession([{startedAt:'2026-11-14T11:00:00Z',endedAt:'2026-11-14T11:00:01Z'}],now),/Burst/);
 assert.throws(()=>validateEntry(sample({...b,endedAt:'2026-11-14T08:05:00Z'}),now),/Session/);
 assert.throws(()=>parseBackup(JSON.stringify({schemaVersion:2,entries:[sample({...b,bursts:[]})]}),now),/session/);
});
test('CSV contains individual burst times and exact total pain duration',()=>{
 const entry=sample({...burstSample()});const csv=toCSV([entry]);
 assert.ok(csv.includes('"Burst count"'));assert.ok(csv.includes('"0.0592"'));
 for(const b of entry.bursts){assert.ok(csv.includes(b.startedAt));assert.ok(csv.includes(b.endedAt));}
});
test('summary averages pain time per session rather than the span of its gaps',()=>{
 const session=createBurstSession([
   {startedAt:'2026-11-14T08:00:00Z',endedAt:'2026-11-14T08:01:00Z'},
   {startedAt:'2026-11-14T08:30:00Z',endedAt:'2026-11-14T08:31:00Z'}
 ],now);
 const s=summarise([sample(session)],now-86400000,now);
 assert.equal(s.list.length,1);assert.equal(s.avgMinutes,2);
});
