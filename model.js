/* Shared data model, calculation and validation for UI and Word. */
(function(root){
'use strict';
const defaults={insulationMin:0.5,ratioMin:1.3,deviationMax:2,inclusive:false,ratioDigits:2,deviationDigits:2,photoCm:4.3};
const people={writers:['赵建鹏','朱云江','高安厅','董焕亮','邹宏志','邓钰龙'],reviewers:['成胜鹏'],approvers:['伍重庆']};
const equipment=()=>[{name:'绝缘电阻测试仪',code:'DBRZ-EQ-094',model:'1508',validUntil:'2027-01-04'},{name:'直流低电阻测试仪',code:'DBRZ-EQ-096',model:'6310B',validUntil:'2027-01-04'}];
const num=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
const present=v=>String(v??'').trim()!=='';
const key=v=>String(v).trim().replace(/#$/,'').replace(/^0+(?=\d)/,'').toUpperCase();
const date=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
function ratio(a,b){a=num(a);b=num(b);return a===null||b===null||a<=0||b<0?null:b/a}
function deviation(values){const a=values.map(num);if(a.length!==3||a.some(x=>x===null||x<0))return null;const mean=a.reduce((x,y)=>x+y,0)/3;return mean<=0?null:a.map(x=>Math.abs(x-mean)/mean*100)}
const pass=(v,t,inclusive=true)=>v===null?null:inclusive?v<=t:v<t;
function insResult(x,r){const a=num(x.r15),b=num(x.r60),v=ratio(a,b);return a===null||b===null||a<0||b<0||v===null?null:a>r.insulationMin&&b>r.insulationMin&&v>=r.ratioMin}
const dcResult=(x,r)=>{const d=deviation(x.values);return d===null?null:d.every(v=>pass(v,r.deviationMax,r.inclusive))};
const sideName=s=>s==='stator'?'定子':'转子';
const pairs=s=>s==='stator'?['U1—V1','U1—W1','V1—W1']:['U2—V2','U2—W2','V2—W2'];
function unit(index=1){return {id:crypto.randomUUID(),number:String(index),place:'',spec:{},scope:{insulation:true,dc:true},insulationSummary:{stator:'',rotor:''},summaryEnabled:{stator:true,rotor:true},insulation:[1,2].flatMap(g=>['U','V','W'].map(p=>({side:'stator',group:'cabinet'+g,location:'',phase:p+g,r15:'',r60:'',photo15:null,photo60:null}))),dc:['stator','rotor'].map(side=>({side,location:'',pairs:pairs(side),values:['','',''],photos:[null,null,null]}))}}
function report(rules=defaults){return {id:crypto.randomUUID(),schemaVersion:3,dateFormat:'compact',testDateMode:'end',name:'',contractDate:date(),contractSeq:'01',reportSeq:'01',startDate:'',endDate:'',projectEnd:'',location:'',producer:'',client:'',clientAddress:'',model:'',diameter:'',height:'',power:'',manufacturer:'',writer:people.writers[0],reviewer:people.reviewers[0],approver:people.approvers[0],overview:'',conclusion:'',equipment:equipment(),templateConfirmed:false,units:[unit()],rules:{...defaults,...rules},ruleConfirmed:false,createdAt:Date.now(),updatedAt:Date.now(),exportedAt:null,demo:false}}
function normalize(r){r.dateFormat??='chinese';r.testDateMode??='range';r.rules={...defaults,...r.rules};r.equipment??=equipment();r.overview??='';r.templateConfirmed??=false;r.units.forEach(u=>{u.id||=crypto.randomUUID();u.spec??={};u.scope??={insulation:true,dc:true};u.summaryEnabled??={stator:true,rotor:true};u.insulation.forEach(x=>{x.location??=''});u.dc.forEach(x=>{x.pairs??=pairs(x.side);x.location??=''})});r.schemaVersion=3;return r}
const spec=(r,u)=>Object.fromEntries(['model','diameter','height','power','manufacturer'].map(k=>[k,u.spec?.[k]||r[k]]));
function codes(r){const d=(r.contractDate||'').replaceAll('-','').slice(2);return {contract:`DBRZ-TK-${d}-${r.contractSeq}`,report:`DBRZ-RP-${d}-${r.reportSeq}`}}
function overview(r){const models=[...new Set(r.units.map(u=>spec(r,u).model).filter(Boolean))].join('、');return r.overview?.trim()||`受${r.client||'〔委托单位〕'}委托，江苏地标检测认证技术有限公司对位于${r.name||'〔项目名称〕'}的${r.units.length}台${models||'〔机组型号〕'}风力发电机组的发电机开展专项检测工作，确保风力发电机组健康稳定运行。`}
function photoCount(r){let missing=0,total=0;r.units.forEach(u=>{const arr=[];if(u.scope.insulation)arr.push(...u.insulation.flatMap(x=>[x.photo15,x.photo60]));if(u.scope.dc)arr.push(...u.dc.flatMap(x=>x.photos));total+=arr.length;missing+=arr.filter(x=>!x).length});return {missing,total}}
function checks(r,signatures={},reports=[]){const out=[],add=(text,step=0,unit=null,kind=null,field=null)=>out.push({text,step,unit,kind,field});
for(const [k,v]of Object.entries({name:'项目名称',location:'检测地点',client:'委托单位',clientAddress:'委托单位地址',producer:'生产单位'}))if(!present(r[k]))add(`请填写${v}`,0,null,null,k);
for(const [k,l]of [['contractDate','合同日期'],['startDate','检测开始日期'],['endDate','检测结束日期'],['projectEnd','项目结束日期']])if(!validDate(r[k]))add(`请填写有效的${l}`,0,null,null,k);
if(r.startDate>r.endDate)add('检测结束日期不能早于开始日期');if(r.projectEnd<r.endDate)add('项目结束日期不能早于检测结束日期');
if(!/^(0[1-9]|[1-9]\d)$/.test(r.contractSeq)||!/^(0[1-9]|[1-9]\d)$/.test(r.reportSeq))add('合同与报告序号须为01至99');
if(reports.some(x=>x.id!==r.id&&codes(x).report===codes(r).report))add('报告编号已存在，请修改报告序号');
if(!r.units.length)add('至少添加一台机组',1);const seen=new Set();
r.units.forEach((u,i)=>{const label=`${u.number||'未编号'}#：`,s=spec(r,u);if(!present(u.number)||seen.has(key(u.number)))add(label+'机位号为空或重复（01与1视为同一机位）',1,i);seen.add(key(u.number));if(!present(u.place))add(label+'请填写检测位置',1,i);
for(const k of ['model','manufacturer'])if(!present(s[k]))add(label+`请填写${k==='model'?'机组型号':'制造商'}`,1,i);
for(const [k,l]of [['diameter','叶轮直径'],['height','轮毂高度'],['power','额定功率']])if(num(s[k])===null||num(s[k])<=0)add(label+l+'须为大于0的数值',1,i);
if(!u.scope.insulation&&!u.scope.dc)add(label+'请至少选择一个检测项目',1,i);
if(u.scope.insulation){if(!Object.values(u.summaryEnabled).some(Boolean))add(label+'请至少选择一个绝缘汇总绕组',2,i,'insulation');for(const s of ['stator','rotor'])if(u.summaryEnabled[s]&&(num(u.insulationSummary[s])===null||num(u.insulationSummary[s])<0))add(label+sideName(s)+'绝缘汇总值未填写或无效',2,i,'insulation');if(!u.insulation.length)add(label+'请添加绝缘回路',2,i,'insulation');const names=new Set();u.insulation.forEach(x=>{const id=[x.side,x.phase,x.location||u.place].join('|');if(!present(x.phase)||names.has(id))add(label+'绝缘回路名称为空或重复',2,i,'insulation');names.add(id);if(insResult(x,r.rules)===null)add(label+`${sideName(x.side)} ${x.phase} 测量不完整或15s值为0，无法计算吸收比`,2,i,'insulation')})}
if(u.scope.dc){if(!u.dc.length)add(label+'请添加直流测量组',2,i,'dc');u.dc.forEach(x=>{const sx=dcSummary(x);if(sx.pairs.length!==3||sx.pairs.some(p=>!present(p))||new Set(sx.pairs).size!==3)add(label+'直流汇总测点须为三个不同名称',2,i,'dc');if(dcResult(sx,r.rules)===null)add(label+sideName(x.side)+'直流汇总三项实测值未填写或无效',2,i,'dc');if(x.pairs.length!==3||x.pairs.some(p=>!present(p))||new Set(x.pairs).size!==3)add(label+'直流回路须为三个不同名称',2,i,'dc');if(dcResult(x,r.rules)===null)add(label+sideName(x.side)+'直流三项测量不完整或平均值为0',2,i,'dc')})}});
for(const k of ['insulationMin','ratioMin','deviationMax'])if(num(r.rules[k])===null||num(r.rules[k])<=0)add('判定阈值须大于0',3);
for(const k of ['ratioDigits','deviationDigits'])if(!Number.isInteger(r.rules[k])||r.rules[k]<0||r.rules[k]>4)add('显示小数位须为0至4的整数',3);
if(!r.ruleConfirmed)add('请确认本项目的判定规则',3);if(!r.templateConfirmed)add('请核对固定章节与实际检测设备',3);
if(!present(r.conclusion))add('请根据实测结果填写检测结论',3,null,null,'conclusion');
if(!r.equipment.length)add('请填写实际使用的检测设备',3);r.equipment.forEach((e,i)=>{if(['name','code','model','validUntil'].some(k=>!present(e[k]))||!validDate(e.validUntil))add(`设备${i+1}信息不完整`,3);else if(e.validUntil<r.endDate)add(`设备${i+1}校准有效期早于检测结束日期`,3)});
return out}
function finalChecks(r,signatures,reports){const out=checks(r,signatures,reports);r.units.forEach((u,i)=>{if(u.scope.insulation&&u.insulation.some(x=>!x.photo15||!x.photo60))out.push({text:`${u.number}#：绝缘照片未齐全`,step:2,unit:i,kind:'insulation'});if(u.scope.dc&&u.dc.some(x=>x.photos.some(p=>!p)))out.push({text:`${u.number}#：直流照片未齐全`,step:2,unit:i,kind:'dc'})});for(const [k,l]of [['writer','编写'],['reviewer','审核'],['approver','批准']])if(!present(r[k])||!signatures[r[k]])out.push({text:`${l}人员签名未齐全`,step:3});return out}
function completeness(r){const fields=['name','location','client','clientAddress','producer','contractDate','startDate','endDate','projectEnd','conclusion'];let a=fields.map(k=>present(r[k]));r.units.forEach(u=>{a.push(present(u.number),present(u.place));a.push(...Object.values(spec(r,u)).map(present));if(u.scope.insulation){for(const s of ['stator','rotor'])if(u.summaryEnabled[s])a.push(num(u.insulationSummary[s])!==null);u.insulation.forEach(x=>a.push(num(x.r15)!==null,num(x.r60)!==null,!!x.photo15,!!x.photo60))}if(u.scope.dc)u.dc.forEach(x=>a.push(...dcSummary(x).values.map(v=>num(v)!==null),...x.values.map(v=>num(v)!==null),...x.photos.map(Boolean)))});return Math.round(a.filter(Boolean).length/a.length*100)}
function displayDate(v,format='compact'){return v?(format==='compact'?v.replaceAll('-','').slice(2):v.replace(/^(\d{4})-(\d{2})-(\d{2})$/,'$1年$2月$3日')):'〔日期待填写〕'}
function findings(r){const result=[];r.units.forEach(u=>{if(u.scope.insulation){for(const s of ['stator','rotor']){const n=num(u.insulationSummary[s]);if(u.summaryEnabled[s]&&n!==null&&n>=0&&n<=r.rules.insulationMin)result.push(`${u.number}# ${sideName(s)}绝缘汇总不合格`)}u.insulation.forEach(x=>{if(insResult(x,r.rules)===false)result.push(`${u.number}# ${sideName(x.side)} ${x.phase} 绝缘明细不合格`)})}if(u.scope.dc)u.dc.forEach(x=>{if(dcResult(dcSummary(x),r.rules)===false)result.push(`${u.number}# ${sideName(x.side)}直流汇总偏差不合格`);if(dcResult(x,r.rules)===false)result.push(`${u.number}# ${sideName(x.side)}直流电阻偏差不合格`)})});return result}
// One mapping for the Word tables and the on-screen cross-check.
function insulationTables(u,rule){
const value=v=>String(v??'').trim()||'〔待填写〕', verdict=v=>v===null?'待完善':v?'合格':'不合格';
const number=value(u.number)+'#',summary=[],details=[];
if(!u.scope.insulation)return {summary:[{cells:['绝缘电阻测试',number,'本项目未开展','—','未检测']}],details:[{cells:['绝缘电阻测试','—','本项目未开展','—','未检测']}]};
for(const side of ['stator','rotor']){const n=num(u.insulationSummary[side]);summary.push({cells:[`风机发电机定转子绕组绝缘电阻测试（大于${rule.insulationMin}MΩ）`,number,sideName(side)+'绕组对地',u.summaryEnabled[side]?value(u.insulationSummary[side])+'MΩ':'—',u.summaryEnabled[side]?verdict(n===null||n<0?null:n>rule.insulationMin):'未检测']})}
for(const x of u.insulation){const part=`发电机${sideName(x.side)}绝缘电阻测试（大于${rule.insulationMin}MΩ）`,project=value(x.location||u.place),name=sideName(x.side)+'侧'+value(x.phase)+'—PE';
for(const sec of ['15','60']){const n=num(x['r'+sec]);details.push({cells:[part,project,`${name} ${sec}s：${value(x['r'+sec])}MΩ`,'',verdict(n===null||n<0?null:n>rule.insulationMin)],photo:x['photo'+sec]||null,measurement:true})}
const v=ratio(x.r15,x.r60);details.push({cells:[part,project,`${sideName(x.side)}吸收比≥${rule.ratioMin}`,v===null?'〔无法计算〕':v.toFixed(rule.ratioDigits),verdict(v===null?null:v>=rule.ratioMin)]});
}
if(!u.insulation.length)details.push({cells:['绝缘电阻测试','〔检测项目待填写〕','〔回路待填写〕','—','待完善']});
return {summary,details};
}
function dcSummary(x){return {side:x.side,pairs:x.summaryPairs|| (x.side==='stator'?['U—V','U—W','V—W']:['K—L','K—M','L—M']),values:x.summaryValues||['','','']}}
function dcTables(u,rule){
const v=x=>String(x??'').trim()||'〔待填写〕',verdict=x=>x===null?'待完善':x?'合格':'不合格',fmt=x=>x===null?'〔无法计算〕':x.toFixed(rule.deviationDigits)+'%',number=v(u.number)+'#',sign=rule.inclusive?'≤':'<';
const summary=[],details=[];
if(!u.scope.dc)return {summary:[{cells:[number+'风机发电机定转子绕组直流电阻测试','本项目未开展','—','未检测']}],details:[{cells:['发电机直流电阻测试','—','本项目未开展','—','未检测']} ]};
for(const x of u.dc){const sx=dcSummary(x),sd=deviation(sx.values),d=deviation(x.values),where=v(x.location||u.place);
for(let j=0;j<3;j++){
summary.push({cells:[number+'风机发电机定转子绕组直流电阻测试',sideName(x.side),`${sideName(x.side)}侧${v(sx.pairs[j])}：${v(sx.values[j])}mΩ`,`${sign}${rule.deviationMax}%；${verdict(sd?sd.every(n=>pass(n,rule.deviationMax,rule.inclusive)):null)}`]});
details.push({cells:['发电机直流电阻测试',where,`${sideName(x.side)}侧${v(x.pairs[j])}：${v(x.values[j])}mΩ`,'',verdict(d?pass(d[j],rule.deviationMax,rule.inclusive):null)],photo:x.photos[j]||null,measurement:true});
}
details.push({cells:['发电机直流电阻测试',`${sideName(x.side)}绕组直流电阻偏差值${rule.inclusive?'小于等于':'小于'}${rule.deviationMax}％`,...Array.from({length:3},(_,j)=>fmt(d?d[j]:null)),verdict(dcResult(x,rule))],deviation:true});
}
if(!u.dc.length){summary.push({cells:[number+'直流电阻测试','〔测量组待填写〕','—','待完善']});details.push({cells:['发电机直流电阻测试','〔测量组待填写〕','—','—','待完善']})}
return {summary,details};
}
// Shared semantic spans. A zero marks a continuation cell, not deleted data.
function tableSpans(data,kind){
const spans=data.map(r=>r.cells.map(()=>1));
const cols=kind==='dcSummary'?[0,1,3]:[0,1];
for(const col of cols){let start=0;while(start<data.length){
const key=i=>{const r=data[i];if(kind==='dcDetails'&&col===1&&!r.measurement)return null;
const group=kind==='dcSummary'&&col!==0?Math.floor(i/3):'';
return JSON.stringify([group,...r.cells.slice(0,col===0?1:2),col===3?r.cells[3]:''])};
const k=key(start);let end=start+1;if(k!==null)while(end<data.length&&key(end)===k)end++;
spans[start][col]=end-start;for(let i=start+1;i<end;i++)spans[i][col]=0;start=end;
}}
return spans;
}
root.ReportCore={tableSpans,dcSummary,dcTables,insulationTables,defaults,people,equipment,num,key,date,validDate,ratio,deviation,pass,unit,report,normalize,spec,codes,overview,photoCount,checks,issues:r=>checks(r).map(x=>x.text),finalChecks,completeness,insResult,dcResult,sideName,pairs,findings,displayDate};if(typeof module!=='undefined')module.exports=root.ReportCore;
})(globalThis);
