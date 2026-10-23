/**
 * Verificação somente de metadados RLS. Usar em HOMOLOGAÇÃO com conexão administrativa
 * protegida, nunca diretamente no navegador. Não lê pedidos nem informações pessoais.
 *
 * Query SQL consultiva para revisão manual de políticas na tabela citizen_requests.
 */
export const SQL_AUDITORIA_POLICIES = `
select polname, polcmd,
       pg_get_expr(polqual,polrelid) as using_expr,
       pg_get_expr(polwithcheck,polrelid) as check_expr
from pg_policy
where polrelid='public.citizen_requests'::regclass
order by polname;
`;
export function avaliarPoliticas(policies){
 if(!Array.isArray(policies)) throw new Error('É necessária uma lista de políticas.');
 const inserts=policies.filter(p=>p.polcmd==='a');
 const updates=policies.filter(p=>p.polcmd==='w');
 const riscos=[];
 if(!inserts.length) riscos.push('Nenhuma política INSERT encontrada: verificar privilégios e RPCs.');
 if(!updates.length) riscos.push('Nenhuma política UPDATE encontrada: verificar RPCs administrativas.');
 for(const p of inserts){
  const c=String(p.check_expr||'').toLowerCase();
  if(!c.includes('auth.uid()')&&!c.includes('is_portal_admin'))
   riscos.push('INSERT '+p.polname+' sem vínculo explícito à identidade: revisão obrigatória.');
 }
 for(const p of updates){
  const c=(String(p.using_expr||'')+' '+String(p.check_expr||'')).toLowerCase();
  if(!c.includes('esic')&&!c.includes('ouvidoria')&&!c.includes('module'))
   riscos.push('UPDATE '+p.polname+' sem segregação explícita por módulo: revisão obrigatória.');
 }
 return {aprovado:false,riscoDetectado:riscos.length>0,riscos,
  aviso:'Análise heurística apenas. Nenhuma política é considerada aprovada automaticamente; exige revisão e teste real de RLS.'};
}
