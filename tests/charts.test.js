import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chartData,renderInsightCharts} from '../dist/charts.js';
const now=new Date(2026,10,14,15);
const iso=(day,h=0,m=0,s=0)=>new Date(2026,10,day,h,m,s).toISOString();
test('duration splits across midnight and stacks intensity without burst gaps',()=>{
 const entries=[{severity:1,startedAt:iso(13,23,59),endedAt:iso(14,0,1)},{severity:3,bursts:[{startedAt:iso(14,10),endedAt:iso(14,10,0,2)},{startedAt:iso(14,11),endedAt:iso(14,11,0,3)}]}];
 const {days,hours}=chartData(entries,now);assert.equal(days.length,30);assert.equal(hours.length,24);
 assert.deepEqual(days.at(-2).values,[60,0,0]);assert.deepEqual(days.at(-1).values,[60,0,5]);
 assert.equal(hours[23].values[0],1);assert.equal(hours[10].values[2],1);assert.equal(hours[11].values[2],1);
});
test('calendar window excludes earlier onsets and future dates; ongoing pain clips at now',()=>{
 const {days,hours}=chartData([{severity:2,startedAt:iso(14,14),endedAt:null},{severity:1,startedAt:iso(15),endedAt:iso(15,1)},{severity:3,startedAt:iso(-20),endedAt:iso(-20,1)}],now);
 assert.deepEqual(days.at(-1).values,[0,3600,0]);assert.equal(hours[14].values[1],1);assert.equal(hours.reduce((n,r)=>n+r.values.reduce((a,b)=>a+b,0),0),1);
});
test('frequency stacks starts by local hour and uses the selected calendar period',()=>{
 const e=[{severity:1,startedAt:iso(14,9),endedAt:iso(14,10)},{severity:2,startedAt:iso(14,9),endedAt:iso(14,10)},{severity:3,startedAt:iso(-20,9),endedAt:iso(-20,10)}];
 assert.deepEqual(chartData(e,now,30).hours[9].values,[1,1,0]);assert.deepEqual(chartData(e,now,90).hours[9].values,[1,1,1]);
});
test('empty charts retain labelled axes, intensity legend and accessible data tables',()=>{const html=renderInsightCharts([],30,now);assert.equal((html.match(/role="img"/g)||[]).length,2);assert.ok(html.includes('View chart data'));assert.ok(html.includes('No recorded pain'));assert.ok(!html.includes('NaN'));});
