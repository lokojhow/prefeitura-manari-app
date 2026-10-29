export const MANARI_TIME_ZONE='America/Sao_Paulo';
export const OTHER_DEPARTMENT='__other__';
export const OTHER_DEPARTMENT_LABEL='Outros / Não sei qual secretaria';
export const UNASSIGNED_DEPARTMENT='__unassigned__';
export function manariDate(now=new Date()) {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:MANARI_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=type=>parts.find(value=>value.type===type).value;
 return `${part('year')}-${part('month')}-${part('day')}`;
}
function shiftDate(date,days) {
 const [year,month,day]=date.split('-').map(Number);
 return new Date(Date.UTC(year,month-1,day+days)).toISOString().slice(0,10);
}
export function dateRangeForPreset(preset,now=new Date()) {
 const today=manariDate(now);
 if(preset==='today')return {from:today,to:today};
 if(preset==='yesterday'){const yesterday=shiftDate(today,-1);return {from:yesterday,to:yesterday};}
 if(preset==='week')return {from:shiftDate(today,-6),to:today};
 return {from:'',to:''};
}
function validDate(value) {
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error('Informe uma data válida.');
 return value;
}
export function dashboardParams({from='',to='',department='',status='',page=1,pageSize=25}={}) {
 const dateFrom=validDate(from),dateTo=validDate(to);
 if(dateFrom&&dateTo&&dateFrom>dateTo)throw Error('A data inicial deve ser anterior à data final.');
 if(!Number.isInteger(page)||page<1||page>1000000||!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw Error('Página inválida.');
 if(status&&!['recebido','em_analise','respondido','arquivado'].includes(status))throw Error('Situação inválida.');
 if(department&&!/^[a-z0-9_]{1,100}$/.test(department))throw Error('Secretaria inválida.');
 return {p_date_from:dateFrom,p_date_to:dateTo,p_department:department||null,p_status:status||null,p_page:page,p_page_size:pageSize};
}
export function departmentName(code,departments,other=null) {
 if(code===OTHER_DEPARTMENT||other)return OTHER_DEPARTMENT_LABEL;
 return departments.find(department=>department.code===code)?.name||(code?'Secretaria indisponível':'Secretaria não informada');
}
