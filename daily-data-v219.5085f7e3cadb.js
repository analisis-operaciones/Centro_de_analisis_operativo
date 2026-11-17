/* V-2.12: importación temporal exclusiva de Operación diaria. */
(function(){
'use strict';
function text(v){return v==null?'':String(v).trim()}
function date(v){if(v instanceof Date&&!isNaN(v)){const pad=n=>String(n).padStart(2,'0');return v.getFullYear()+'-'+pad(v.getMonth()+1)+'-'+pad(v.getDate())+'T'+pad(v.getHours())+':'+pad(v.getMinutes())+':'+pad(v.getSeconds())}if(typeof v==='number'&&Number.isFinite(v)){const d=new Date(Date.UTC(1899,11,30)+Math.round(v*86400000));return isNaN(d)?'':d.toISOString().slice(0,19)}const t=text(v);if(/^\d{4}-\d\d-\d\d[T ]\d\d:\d\d/.test(t))return (t.length>=19?t.slice(0,19):t.slice(0,16)+':00').replace(' ','T');if(/^\d{4}-\d\d-\d\d$/.test(t))return t+'T00:00:00';return ''}
function norm(v){return text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toUpperCase()}
function parseLegacy(sheets){let main,header;for(const sheet of sheets){const idx=sheet.rows.findIndex(r=>norm(r[0])==='CLUSTER'&&norm(r[3])==='OT'&&norm(r[4])==='OS');if(idx>=0){main=sheet;header=idx;break}}if(!main)throw Error('No se encontró la tabla de operación diaria con columnas CLUSTER, OLT, F/S/P, OT y OS.');const records=[],pauses=[],seen=new Set();let identical=0,invalidDates=0;const skipped=[];
for(let i=header+1;i<main.rows.length;i++){const r=main.rows[i];if(!text(r[3])&&!text(r[4])){if(r.some(v=>v!==null&&v!==undefined&&text(v)!==''))skipped.push({row:i+1,reason:'Sin OT ni OS',sheet:main.name});continue;}const raw=r.slice(0,18).map(v=>v instanceof Date?date(v):v);const key=JSON.stringify(raw);if(seen.has(key)){identical++;continue}seen.add(key);const start=date(r[9]);if(!start)invalidDates++;records.push({cluster:text(r[0]),olt:text(r[1]),fsp:text(r[2]),ot:text(r[3]),os:text(r[4]),month:text(r[5]),failure:text(r[6]),subtype:text(r[7]),slaOriginal:r[8]??'',start,pauseOriginal:r[10]??'',end:date(r[11]),timeOriginal:r[12]??'',slaResultOriginal:text(r[13]),status:text(r[14])||'SIN ESTATUS',person:text(r[15]),coords:text(r[16]),clientcoords:'',comments:text(r[17]),sourceSheet:main.name,sourceRow:i+1,raw});}
for(const sheet of sheets){const idx=sheet.rows.findIndex(r=>norm(r[0])==='CLUSTER'&&norm(r[1])==='OT'&&norm(r[3])==='INICIO PAUSA');if(idx<0)continue;for(let i=idx+1;i<sheet.rows.length;i++){const r=sheet.rows[i];if(!/^OT-/i.test(text(r[1])))continue;pauses.push({cluster:text(r[0]),ot:text(r[1]),os:text(r[2]),start:date(r[3]),end:date(r[4]),durationOriginal:r[5]??'',status:text(r[6]),person:text(r[7]),coords:text(r[8]),comments:text(r[11]),sourceRow:i+1,sourceSheet:sheet.name});}}
if(!records.length)throw Error('No se encontraron registros con OT en la tabla.');const counts={};records.forEach(r=>counts[r.ot]=(counts[r.ot]||0)+1);return{records,pauses,identical,invalidDates,skipped,repeatedOT:Object.values(counts).filter(n=>n>1).length};}
function parse(sheets){
const canonical=['CLUSTER','OLT','F/S/P','OT','OS','MES','FALLA','SUBTIPO','SLA DE ATENCION','FECHA INICIO','PAUSAS','FECHA TERMIO','TIEMPO DE ATENCION','SLA','STATUS','ATENDIO','COORDENADA DE DAÑO','COMENTARIOS'];
const key=v=>norm(v).replace(/[^A-Z0-9]/g,'');
const aliases={'FECHATERMIO':['FECHATERMINO','TERMINO','FECHAHORATERMINO'],'FECHAINICIO':['INICIO','FECHAHORAINICIO'],'STATUS':['ESTATUS'],'ATENDIO':['TECNICO'],'COORDENADADEDANO':['COORDENADASDELCIERRE','COORDENADADELCIERRE','COORDENADASDEDANO'],'PAUSAS':['PAUSA']};
const prepared=sheets.map(sheet=>{const index=sheet.rows.findIndex(row=>{const keys=row.map(key);return ['CLUSTER','OLT','FSP','OT','OS'].every(k=>keys.includes(k))});if(index<0)return sheet;const headers=sheet.rows[index].map(key);const positions=canonical.map(n=>{const k=key(n),accepted=[k,...(aliases[k]||[])];return headers.findIndex(v=>accepted.includes(v))});if(headers[0]==='SEMANA'&&headers[4]==='OT'&&headers[5]==='OS'){const fixed={0:1,3:4,4:5,6:7,7:8,9:10,11:12,14:15,15:16};Object.entries(fixed).forEach(([field,column])=>positions[+field]=column)}const rows=sheet.rows.map((row,i)=>i<index?[]:i===index?canonical:positions.map(j=>j<0?null:row[j]));return{...sheet,rows}});
const result=parseLegacy(prepared);
// Keep the source row, including additional columns such as SEMANA.
result.records.forEach(record=>{const sheet=sheets.find(s=>s.name===record.sourceSheet);if(sheet){record.sourceValues=sheet.rows[record.sourceRow-1].map(v=>v instanceof Date?date(v):v)}});
return result;
}
if(typeof module!=='undefined'&&module.exports){module.exports={parse,date};return}
window.odParse=parse;
})();
