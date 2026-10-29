import test from 'node:test';
import assert from 'node:assert/strict';
import {createEsicApi} from '../www/esic/api.mjs';
import {OTHER_DEPARTMENT,OTHER_DEPARTMENT_LABEL,departmentName,dashboardParams} from '../www/esic/dashboard.mjs';
function fixture(){
 let inserted;
 const client={auth:{getUser:async()=>({data:{user:{id:'cidadao'}}})},from(){return {insert(row){inserted=row;return this;},select(){return this;},single:async()=>({data:inserted,error:null})};}};
 return {api:createEsicApi(client),row:()=>inserted};
}
test('Outros exige explicação e preserva titularidade, sem inventar secretaria',async()=>{
 const {api,row}=fixture();
 const input={subject:'Pedido de teste',description:'Informação fictícia de teste.',requested_department_code:OTHER_DEPARTMENT};
 for(const value of [undefined,'    ','abcd','x'.repeat(501)])await assert.rejects(api.create({...input,requested_department_other:value}),/Explique do que se trata/);
 assert.equal(row(),undefined);
 const result=await api.create({...input,requested_department_other:'  Não sei qual setor atende este serviço.  ',citizen_id:'outra-pessoa',status:'respondido'});
 assert.equal(result.requested_department_code,null);
 assert.equal(result.requested_department_other,'Não sei qual setor atende este serviço.');
 assert.equal(result.citizen_id,'cidadao');assert.equal(result.status,undefined);
});
test('selecionar secretaria ignora explicação antiga de Outros',async()=>{
 const {api}=fixture();
 const result=await api.create({subject:'Pedido de teste',description:'Informação fictícia de teste.',requested_department_code:'educacao',requested_department_other:'Texto anterior que não deve ser enviado.'});
 assert.equal(result.requested_department_code,'educacao');
 assert.equal(Object.hasOwn(result,'requested_department_other'),false);
});
test('Outros tem identificação e filtro próprios, distintos do legado sem secretaria',()=>{
 assert.equal(departmentName(null,[],'Explicação de teste'),OTHER_DEPARTMENT_LABEL);
 assert.equal(departmentName(OTHER_DEPARTMENT,[]),OTHER_DEPARTMENT_LABEL);
 assert.equal(departmentName(null,[]),'Secretaria não informada');
 assert.equal(dashboardParams({department:OTHER_DEPARTMENT}).p_department,OTHER_DEPARTMENT);
});
