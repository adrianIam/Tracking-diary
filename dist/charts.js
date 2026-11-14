const COLORS=['#91aa70','#d3aa6c','#ba8589'];
const NAMES=['Mild','Moderate','Severe'];
export const FREQUENCY_RANGES=[['all','All records'],['year','1 year'],['6months','6 months'],['90','90 days'],['30','30 days'],['14','14 days'],['7','7 days']];
export function frequencyStart(range,now){
  if(range==='all')return null;
  const start=new Date(now);start.setHours(0,0,0,0);
  if(range==='year'||range==='6months'){
    const day=start.getDate();start.setDate(1);
    if(range==='year')start.setFullYear(start.getFullYear()-1);else start.setMonth(start.getMonth()-6);
    const last=new Date(start.getFullYear(),start.getMonth()+1,0).getDate();start.setDate(Math.min(day,last));
  }else{const days=Number(range);if(!Number.isFinite(days)||days<1)throw new Error('Invalid chart range');start.setDate(start.getDate()-(days-1));}
  return start;
}
const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const shortDate=d=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(d);
export function chartData(entries,now=new Date(),frequencyRange='all',durationDays=30){
  const today=new Date(now);today.setHours(0,0,0,0);
  const dates=Array.from({length:durationDays+1},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-(durationDays-1)+i);return d;});
  const days=dates.slice(0,durationDays).map(d=>({key:dayKey(d),label:shortDate(d),values:[0,0,0]}));
  const clockLabel=minutes=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
  const timeBuckets=Array.from({length:72},(_,index)=>({startLabel:clockLabel(index*20),label:`${clockLabel(index*20)}–${clockLabel((index+1)*20)}`,values:[0,0,0]}));
  const since=frequencyStart(frequencyRange,now);
  for(const e of entries){
    const level=e.severity-1;if(level<0||level>2)continue;
    const intervals=e.bursts||[{startedAt:e.startedAt,endedAt:e.endedAt}];
    for(const b of intervals){
      const start=new Date(b.startedAt),end=b.endedAt?new Date(b.endedAt):now;
      if((since===null||start>=since)&&start<=now)timeBuckets[start.getHours()*3+Math.floor(start.getMinutes()/20)].values[level]++;
      // Split actual pain intervals at local midnight; gaps between bursts stay excluded.
      for(let i=0;i<days.length;i++){
        const overlap=Math.min(+end,+dates[i+1],+now)-Math.max(+start,+dates[i]);
        if(overlap>0)days[i].values[level]+=overlap/1000;
      }
    }
  }
  return {days,timeBuckets};
}
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function stackedChart(rows,{id,title,subtitle,frequency=false,frequencyRange='all'}){
  const max=Math.max(0,...rows.map(r=>r.values.reduce((a,b)=>a+b,0)));
  const divisor=frequency?1:max>=60?60:1,unit=frequency?'Onsets':divisor===60?'Minutes':'Seconds';
  const rough=Math.max(max/divisor,frequency?1:5),step=frequency?Math.max(1,Math.ceil(rough/4)):10**Math.floor(Math.log10(rough/4));
  const top=frequency?step*4:Math.ceil(rough/(step*4))*step*4;
  const W=860,H=270,L=52,R=14,T=18,B=45,plotH=H-T-B,plotW=W-L-R,bucket=plotW/rows.length;
  const number=n=>Number(n.toFixed(2)).toLocaleString();
  let marks='';
  for(let i=0;i<=4;i++){const value=top*i/4,y=H-B-plotH*i/4;marks+=`<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="#e5e8e1"/><text x="${L-9}" y="${y+4}" text-anchor="end">${number(value)}</text>`;}
  rows.forEach((r,i)=>{
    let baseline=H-B;const x=L+bucket*i+bucket*.16;
    r.values.forEach((raw,level)=>{const value=raw/divisor,h=value/top*plotH;if(h>0){marks+=`<rect x="${x}" y="${baseline-h}" width="${bucket*.68}" height="${h}" fill="${COLORS[level]}"><title>${esc(`${r.label} · ${NAMES[level]}: ${number(value)} ${unit.toLowerCase()}`)}</title></rect>`;baseline-=h;}});
    const show=frequency?i%6===0:i%Math.ceil(rows.length/6)===0||i===rows.length-1;
    if(show)marks+=`<text x="${L+bucket*(i+.5)}" y="${H-B+20}" text-anchor="middle">${esc(frequency?r.startLabel:r.label)}</text>`;
  });
  const table=`<details class="chart-data"><summary>View chart data</summary><div class="chart-table-wrap"><table><caption>${esc(title)} (${unit.toLowerCase()})</caption><thead><tr><th scope="col">${frequency?'20-minute interval':'Date'}</th>${NAMES.map(n=>`<th scope="col">${n}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${esc(r.label)}</th>${r.values.map(v=>`<td>${number(v/divisor)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  return `<article class="content-card chart-card"><div class="chart-heading"><h3>${title}</h3>${frequency?`<label class="chart-range-label">Time range<select id="frequency-period" class="period-select" aria-label="Time-of-day chart range">${FREQUENCY_RANGES.map(([value,label])=>`<option value="${value}" ${String(frequencyRange)===value?'selected':''}>${label}</option>`).join('')}</select></label>`:''}</div><p>${subtitle}</p><div class="chart-legend">${NAMES.map((n,i)=>`<span><i style="background:${COLORS[i]}"></i>${n}</span>`).join('')}</div><span class="chart-unit">${unit}</span><div class="chart-scroll"><svg class="insight-chart" style="--chart-min-width:${Math.max(560,rows.length*3)}px" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${esc(title)}</title><desc id="${id}-desc">${esc(subtitle)} Columns stack mild, moderate and severe intensity. Exact values are available in the data table.</desc>${marks}</svg></div><p class="chart-axis">${frequency?'Time of day · 20-minute intervals (local time)':'Date (local time)'}</p>${max===0?'<p class="info-note">No recorded pain in this period yet.</p>':''}${table}</article>`;
}
export function renderInsightCharts(entries,frequencyRange='all',now=new Date(),durationDays=30){
 const {days,timeBuckets}=chartData(entries,now,frequencyRange,durationDays);
 return stackedChart(days,{id:'daily-duration',title:`Pain duration · last ${durationDays} days`,subtitle:'Total pain time each day, stacked by intensity. Gaps between bursts are excluded.'})+stackedChart(timeBuckets,{id:'time-frequency',title:'Pain frequency · 20-minute intervals',subtitle:`${frequencyRange==='all'?'All past records':'Past '+(FREQUENCY_RANGES.find(([value])=>value===String(frequencyRange))?.[1]||frequencyRange+' days')}. Each recorded burst counts once in its start-time interval; a manual episode counts once at its start.`,frequency:true,frequencyRange});
}
