const COLORS=['#91aa70','#d3aa6c','#ba8589'];
const NAMES=['Mild','Moderate','Severe'];
const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const shortDate=d=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(d);
export function chartData(entries,now=new Date(),frequencyDays=30){
  const today=new Date(now);today.setHours(0,0,0,0);
  const dates=Array.from({length:31},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-29+i);return d;});
  const days=dates.slice(0,30).map(d=>({key:dayKey(d),label:shortDate(d),values:[0,0,0]}));
  const hours=Array.from({length:24},(_,hour)=>({label:`${String(hour).padStart(2,'0')}:00`,values:[0,0,0]}));
  const since=new Date(today);since.setDate(since.getDate()-(frequencyDays-1));
  for(const e of entries){
    const level=e.severity-1;if(level<0||level>2)continue;
    const intervals=e.bursts||[{startedAt:e.startedAt,endedAt:e.endedAt}];
    for(const b of intervals){
      const start=new Date(b.startedAt),end=b.endedAt?new Date(b.endedAt):now;
      if(start>=since&&start<=now)hours[start.getHours()].values[level]++;
      // Split actual pain intervals at local midnight; gaps between bursts stay excluded.
      for(let i=0;i<days.length;i++){
        const overlap=Math.min(+end,+dates[i+1],+now)-Math.max(+start,+dates[i]);
        if(overlap>0)days[i].values[level]+=overlap/1000;
      }
    }
  }
  return {days,hours};
}
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function stackedChart(rows,{id,title,subtitle,frequency=false}){
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
    const show=frequency?i%2===0:i%5===0||i===rows.length-1;
    if(show)marks+=`<text x="${L+bucket*(i+.5)}" y="${H-B+20}" text-anchor="middle">${esc(frequency?r.label.slice(0,2):r.label)}</text>`;
  });
  const table=`<details class="chart-data"><summary>View chart data</summary><div class="chart-table-wrap"><table><caption>${esc(title)} (${unit.toLowerCase()})</caption><thead><tr><th scope="col">${frequency?'Hour':'Date'}</th>${NAMES.map(n=>`<th scope="col">${n}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${esc(r.label)}</th>${r.values.map(v=>`<td>${number(v/divisor)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  return `<article class="content-card chart-card"><h3>${title}</h3><p>${subtitle}</p><div class="chart-legend">${NAMES.map((n,i)=>`<span><i style="background:${COLORS[i]}"></i>${n}</span>`).join('')}</div><span class="chart-unit">${unit}</span><div class="chart-scroll"><svg class="insight-chart" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${esc(title)}</title><desc id="${id}-desc">${esc(subtitle)} Columns stack mild, moderate and severe intensity. Exact values are available in the data table.</desc>${marks}</svg></div><p class="chart-axis">${frequency?'Hour of day (local time)':'Date (local time)'}</p>${max===0?'<p class="info-note">No recorded pain in this period yet.</p>':''}${table}</article>`;
}
export function renderInsightCharts(entries,frequencyDays=30,now=new Date()){
 const {days,hours}=chartData(entries,now,frequencyDays);
 return stackedChart(days,{id:'daily-duration',title:'Pain duration · last 30 days',subtitle:'Total pain time each day, stacked by intensity. Gaps between bursts are excluded.'})+stackedChart(hours,{id:'hourly-frequency',title:'Pain frequency by hour',subtitle:`Last ${frequencyDays} calendar days. Each recorded burst counts once at its start hour; a manual episode counts once at its start.`,frequency:true});
}
