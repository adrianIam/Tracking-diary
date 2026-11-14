import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chartData,renderInsightCharts,frequencyStart,FREQUENCY_RANGES} from '../dist/charts.js';
const now=new Date(2026,10,14,15);
const iso=(day,h=0,m=0,s=0)=>new Date(2026,10,day,h,m,s).toISOString();
test('duration splits across midnight and stacks intensity without burst gaps',()=>{
 const entries=[{severity:1,startedAt:iso(13,23,59),endedAt:iso(14,0,1)},{severity:3,bursts:[{startedAt:iso(14,10),endedAt:iso(14,10,0,2)},{startedAt:iso(14,11),endedAt:iso(14,11,0,3)}]}];
 const {days,timeBuckets}=chartData(entries,now);assert.equal(days.length,30);assert.equal(timeBuckets.length,72);
 assert.deepEqual(days.at(-2).values,[60,0,0]);assert.deepEqual(days.at(-1).values,[60,0,5]);
 assert.equal(timeBuckets[71].values[0],1);assert.equal(timeBuckets[30].values[2],1);assert.equal(timeBuckets[33].values[2],1);
});
test('calendar window excludes earlier onsets and future dates; ongoing pain clips at now',()=>{
 const {days,timeBuckets}=chartData([{severity:2,startedAt:iso(14,14),endedAt:null},{severity:1,startedAt:iso(15),endedAt:iso(15,1)},{severity:3,startedAt:iso(-20),endedAt:iso(-20,1)}],now,30);
 assert.deepEqual(days.at(-1).values,[0,3600,0]);assert.equal(timeBuckets[42].values[1],1);assert.equal(timeBuckets.reduce((n,r)=>n+r.values.reduce((a,b)=>a+b,0),0),1);
});
test('frequency stacks starts by local 20-minute interval and uses the selected calendar period',()=>{
 const e=[{severity:1,startedAt:iso(14,9),endedAt:iso(14,10)},{severity:2,startedAt:iso(14,9),endedAt:iso(14,10)},{severity:3,startedAt:iso(-20,9),endedAt:iso(-20,10)}];
 assert.deepEqual(chartData(e,now,30).timeBuckets[27].values,[1,1,0]);assert.deepEqual(chartData(e,now,90).timeBuckets[27].values,[1,1,1]);
});
test('empty charts retain labelled axes, intensity legend and accessible data tables',()=>{const html=renderInsightCharts([],30,now);assert.equal((html.match(/role="img"/g)||[]).length,2);assert.ok(html.includes('View chart data'));assert.ok(html.includes('No recorded pain'));assert.ok(!html.includes('NaN'));});

test('20-minute boundaries use start-inclusive, end-exclusive buckets across all 24 hours',()=>{
 const times=[[0,19,59],[0,20,0],[0,39,59],[0,40,0],[0,59,59],[1,0,0],[23,59,59]];
 const entries=times.map(([h,m,s])=>({severity:1,startedAt:iso(13,h,m,s),endedAt:iso(14)}));
 const {timeBuckets}=chartData(entries,now);
 assert.equal(timeBuckets.length,72);
 assert.equal(timeBuckets[0].label,'00:00–00:20');assert.equal(timeBuckets[71].label,'23:40–24:00');
 assert.deepEqual([0,1,2,3,71].map(i=>timeBuckets[i].values[0]),[1,2,2,1,1]);
 assert.equal(timeBuckets.reduce((n,r)=>n+r.values[0],0),times.length);
});

test('frequency defaults to all past records, including entries older than a year',()=>{
 const old=new Date(2020,0,1,9).toISOString();const e=[{severity:3,startedAt:old,endedAt:old}];
 assert.equal(chartData(e,now).timeBuckets[27].values[2],1);
 assert.equal(chartData(e,now,'year').timeBuckets[27].values[2],0);
 assert.ok(renderInsightCharts(e,undefined,now).includes('value="all" selected'));
 assert.deepEqual(FREQUENCY_RANGES.map(r=>r[0]),['all','year','6months','90','30','14','7']);
});
test('day windows include their first local midnight and exclude earlier starts',()=>{
 for(const days of [7,14,30,90]){
  const cutoff=frequencyStart(String(days),now);const before=new Date(+cutoff-1);
  const e=[{severity:1,startedAt:cutoff.toISOString(),endedAt:cutoff.toISOString()},{severity:2,startedAt:before.toISOString(),endedAt:before.toISOString()}];
  const rows=chartData(e,now,String(days)).timeBuckets;
  assert.equal(rows.reduce((n,r)=>n+r.values[0],0),1);assert.equal(rows.reduce((n,r)=>n+r.values[1],0),0);
 }
});
test('calendar month/year ranges clamp dates and do not change the fixed 30-day duration series',()=>{
 assert.equal(frequencyStart('6months',new Date(2026,9,31,12)).getDate(),30);
 const leap=frequencyStart('year',new Date(2024,1,29,12));assert.equal(leap.getFullYear(),2023);assert.equal(leap.getMonth(),1);assert.equal(leap.getDate(),28);
 const e=[{severity:1,startedAt:iso(13,10),endedAt:iso(13,11)}];
 assert.deepEqual(chartData(e,now,'all').days,chartData(e,now,'7').days);
});

test('duration chart matches all summary ranges while frequency keeps its own range',()=>{
 const e=[{severity:1,startedAt:iso(-20,9),endedAt:iso(-20,10)}];
 for(const days of [30,90,365]){
  const data=chartData(e,now,'all',days);assert.equal(data.days.length,days);
  assert.equal(data.days.reduce((n,d)=>n+d.values[0],0),days===30?0:3600);
  const html=renderInsightCharts(e,'all',now,days);assert.ok(html.includes(`Pain duration · last ${days} days`));assert.ok(html.includes('value="all" selected'));
 }
 assert.deepEqual(chartData(e,now,'90',90).timeBuckets,chartData(e,now,'90',365).timeBuckets);
});
