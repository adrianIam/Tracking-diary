export const STORAGE_KEY = 'tracking-diary:v1';
export const TYPES = [{id:'headache', label:'Headache'}, {id:'migraine', label:'Migraine'}];
export const SEVERITIES = {1:'Mild',2:'Moderate',3:'Severe'};
export function durationMinutes(entry, now=Date.now()) {
  return Math.max(0, Math.round(((entry.endedAt ? Date.parse(entry.endedAt) : now) - Date.parse(entry.startedAt))/60000));
}
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes/60)}h${minutes%60 ? ` ${minutes%60}m` : ''}`;
}
export function validateEntry(e, now=Date.now()) {
  if (!e || typeof e !== 'object') throw new Error('Invalid entry.');
  if (typeof e.id !== 'string' || !e.id || e.id.length>100) throw new Error('Invalid entry ID.');
  if (e.trackerType !== 'headache' || !TYPES.some(t=>t.id===e.kind)) throw new Error('Unsupported tracker type.');
  if (![1,2,3].includes(e.severity)) throw new Error('Choose a severity level.');
  const start=Date.parse(e.startedAt), end=e.endedAt===null ? null : Date.parse(e.endedAt);
  if (!Number.isFinite(start) || start>now+60000) throw new Error('Start time must be now or earlier.');
  if (end!==null && (!Number.isFinite(end) || end<start || end>now+60000)) throw new Error('End time must be after the start and no later than now.');
  for (const key of ['triggers','symptoms','relief']) {
    if (!Array.isArray(e[key]) || e[key].length>50 || e[key].some(v=>typeof v!=='string'||v.length>200)) throw new Error(`Invalid ${key}.`);
  }
  for (const key of ['notes','medication','impact']) if(typeof e[key]!=='string'||e[key].length>10000) throw new Error(`Invalid ${key}.`);
  if (!Number.isFinite(Date.parse(e.createdAt)) || !Number.isFinite(Date.parse(e.updatedAt))) throw new Error('Invalid record timestamps.');
  // Whitelist fields so imports cannot smuggle application state into records.
  return Object.fromEntries(['id','trackerType','kind','severity','startedAt','endedAt','triggers','symptoms','relief','notes','medication','impact','createdAt','updatedAt'].map(k=>[k,e[k]]));
}
export function parseBackup(text, now=Date.now()) {
  const data=JSON.parse(text);
  if(data.schemaVersion!==1 || !Array.isArray(data.entries) || data.entries.length>20000) throw new Error('Choose a valid Tracking Diary version 1 backup.');
  const entries=data.entries.map(e=>validateEntry(e,now));
  if(new Set(entries.map(e=>e.id)).size!==entries.length) throw new Error('This backup contains duplicate IDs.');
  if(entries.filter(e=>e.endedAt===null).length>1) throw new Error('Only one episode can be ongoing.');
  return entries;
}
export function mergeEntries(current, incoming) {
  const map=new Map(current.map(e=>[e.id,e]));
  incoming.forEach(e=> {const old=map.get(e.id); if(!old || Date.parse(e.updatedAt)>Date.parse(old.updatedAt)) map.set(e.id,e);});
  const merged=[...map.values()];
  if(merged.filter(e=>e.endedAt===null).length>1) throw new Error('Finish your ongoing episode before importing another ongoing episode.');
  return merged;
}
export function toCSV(entries) {
  const cell=v=>`"${String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')}"`;
  const rows=[['Type','Start (ISO)','End (ISO)','Duration (minutes)','Severity (1–3)','Triggers','Symptoms','Relief','Medication / dose','Activity impact','Notes']];
  entries.forEach(e=>rows.push([e.kind,e.startedAt,e.endedAt,e.endedAt ? Number(((Date.parse(e.endedAt)-Date.parse(e.startedAt))/60000).toFixed(4)) : '',e.severity,e.triggers.join('; '),e.symptoms.join('; '),e.relief.join('; '),e.medication,e.impact,e.notes]));
  return rows.map(r=>r.map(cell).join(',')).join('\r\n');
}
export function summarise(entries, since, now=Date.now()) {
  const list=entries.filter(e=>Date.parse(e.startedAt)>=since && Date.parse(e.startedAt)<=now);
  const days=new Set(list.map(e=>new Date(e.startedAt).toLocaleDateString('en-CA'))).size;
  const completed=list.filter(e=>e.endedAt);
  const counts=new Map(); list.forEach(e=>e.triggers.forEach(t=>counts.set(t,(counts.get(t)||0)+1)));
  return {list,days,completed,avgMinutes:completed.length?Math.round(completed.reduce((n,e)=>n+durationMinutes(e),0)/completed.length):null,topTriggers:[...counts].sort((a,b)=>b[1]-a[1]).slice(0,5)};
}
