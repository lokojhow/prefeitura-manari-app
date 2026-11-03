-- Entire test is rolled back. Reuses confirmed accounts without changing credentials.
begin;
create temporary table rh_fixture as select
 (select s.user_id from public.portal_staff_members s where s.active and s.role='admin' limit 1) as admin_id,
 (select u.id from auth.users u where u.email_confirmed_at is not null and not exists(select 1 from public.portal_staff_members s where s.user_id=u.id) order by u.id limit 1) as user1,
 (select u.id from auth.users u where u.email_confirmed_at is not null and not exists(select 1 from public.portal_staff_members s where s.user_id=u.id) order by u.id limit 1 offset 1) as user2,
 null::uuid as employee1,null::uuid as employee2,null::uuid as payslip1,null::uuid as payslip2,null::text as path1,null::text as path2;
alter table rh_fixture add column email1 text;
alter table rh_fixture add column email2 text;
update rh_fixture f set email1=(select email from auth.users where id=f.user1),email2=(select email from auth.users where id=f.user2);
create temporary table rh_checks(name text,ok boolean);
grant all on rh_fixture,rh_checks to authenticated;
select set_config('request.jwt.claim.sub',(select admin_id::text from rh_fixture),true);
set local role authenticated;
do $$declare r jsonb; id1 uuid; id2 uuid;begin
 if not (public.manari_rh('snapshot')->>'manager')::boolean then raise exception 'Admin not recognized'; end if;
 r:=public.manari_rh('register',jsonb_build_object('registration','TEST-RH-001','full_name','Servidor Fictício Um','email',(select email1 from rh_fixture),'department','Teste'));
 update rh_fixture set employee1=(r->>'id')::uuid;
 r:=public.manari_rh('register',jsonb_build_object('registration','TEST-RH-002','full_name','Servidor Fictício Dois','email',(select email2 from rh_fixture),'department','Teste'));
 update rh_fixture set employee2=(r->>'id')::uuid;
 insert into rh_checks values('RH cadastra e vincula contas confirmadas',(r->>'linked')::boolean);
 insert into rh_checks values('RH lista servidores',(public.manari_rh('employees','{"search":"TEST-RH"}')->>'total')::int=2);
 insert into rh_checks values('Busca em lote preserva matrícula exata',jsonb_array_length(public.manari_rh('find','{"registrations":["TEST-RH-001","TEST-RH-002"]}'))=2);
 r:=public.manari_rh('begin_upload',jsonb_build_object('employee',(select employee1 from rh_fixture),'month','2026-10-01','kind','mensal','size',12));
 update rh_fixture set payslip1=(r->>'id')::uuid,path1=r->>'path';
 r:=public.manari_rh('begin_upload',jsonb_build_object('employee',(select employee2 from rh_fixture),'month','2026-10-01','kind','mensal','size',12));
 update rh_fixture set payslip2=(r->>'id')::uuid,path2=r->>'path';
 begin perform public.manari_rh('publish',jsonb_build_object('id',(select payslip1 from rh_fixture)));insert into rh_checks values('Publicação sem upload é bloqueada',false);exception when others then insert into rh_checks values('Publicação sem upload é bloqueada',sqlerrm like '%não foi recebido%');end;
 begin perform public.manari_rh('begin_upload',jsonb_build_object('employee',(select employee1 from rh_fixture),'month','2026-10-12','kind','mensal','size',12));insert into rh_checks values('Dia fora da competência é bloqueado',false);exception when others then insert into rh_checks values('Dia fora da competência é bloqueado',true);end;
end $$;
reset role;
-- Metadata fixtures only; no object bytes are uploaded and every row is rolled back.
insert into storage.objects(bucket_id,name,metadata) select 'rh-contracheques',path1,'{"mimetype":"application/pdf","size":12}'::jsonb from rh_fixture
union all select 'rh-contracheques',path2,'{"mimetype":"application/pdf","size":12}'::jsonb from rh_fixture;
set local role authenticated;
do $$begin
 perform public.manari_rh('publish',jsonb_build_object('id',(select payslip1 from rh_fixture)));
 perform public.manari_rh('publish',jsonb_build_object('id',(select payslip2 from rh_fixture)));
 insert into rh_checks values('Dois PDFs publicados para titulares distintos',(public.manari_rh('list','{"manage":true}')->>'total')::int=2);
 begin perform public.manari_rh('begin_upload',jsonb_build_object('employee',(select employee1 from rh_fixture),'month','2026-10-01','kind','mensal','size',12));insert into rh_checks values('Duplicidade não substitui PDF silenciosamente',false);exception when others then insert into rh_checks values('Duplicidade não substitui PDF silenciosamente',sqlerrm like '%Já existe%');end;
 insert into rh_checks values('Objeto publicado não pode ser removido',not rh_private.upload_object((select path1 from rh_fixture)));
end $$;
select set_config('request.jwt.claim.sub',(select user1::text from rh_fixture),true);
do $$begin
 insert into rh_checks values('Cidadão não recebe gestão RH',not (public.manari_rh('snapshot')->>'manager')::boolean);
 insert into rh_checks values('Lista pessoal ignora titular forjado',(public.manari_rh('list',jsonb_build_object('user_id',(select user2 from rh_fixture)))->>'total')::int=1);
 insert into rh_checks values('Filtro de outro titular não revela documentos',(public.manari_rh('list',jsonb_build_object('employee',(select employee2 from rh_fixture)))->>'total')::int=0);
 insert into rh_checks values('Storage permite somente PDF do titular',(select count(*) from storage.objects where bucket_id='rh-contracheques')=1);
 insert into rh_checks values('Titular consulta o caminho autorizado',public.manari_rh('document',jsonb_build_object('id',(select payslip1 from rh_fixture)))->>'path'=(select path1 from rh_fixture));
 begin perform public.manari_rh('list','{"manage":true}');insert into rh_checks values('Fila RH bloqueada ao cidadão',false);exception when insufficient_privilege then insert into rh_checks values('Fila RH bloqueada ao cidadão',true);end;
 begin perform public.manari_rh('document',jsonb_build_object('id',(select payslip2 from rh_fixture)));insert into rh_checks values('PDF de outro servidor bloqueado',false);exception when insufficient_privilege then insert into rh_checks values('PDF de outro servidor bloqueado',true);end;
 begin perform public.manari_rh('team_access',jsonb_build_object('email',(select email1 from rh_fixture),'enabled',true));insert into rh_checks values('Autoelevação ao RH bloqueada',false);exception when insufficient_privilege then insert into rh_checks values('Autoelevação ao RH bloqueada',true);end;
 begin perform count(*) from rh_private.payslips;insert into rh_checks values('Leitura direta das tabelas bloqueada',false);exception when insufficient_privilege then insert into rh_checks values('Leitura direta das tabelas bloqueada',true);end;
 begin insert into storage.objects(bucket_id,name,metadata) values('rh-contracheques','forged.pdf','{}');insert into rh_checks values('Upload de cidadão bloqueado',false);exception when insufficient_privilege then insert into rh_checks values('Upload de cidadão bloqueado',true);end;
end $$;
select set_config('request.jwt.claim.sub',(select admin_id::text from rh_fixture),true);
do $$begin
 perform public.manari_rh('payslip_status',jsonb_build_object('id',(select payslip1 from rh_fixture),'state','archived'));
 begin perform public.manari_rh('employee_status',jsonb_build_object('id',(select employee1 from rh_fixture),'active',null));insert into rh_checks values('Situação nula rejeitada',false);exception when others then insert into rh_checks values('Situação nula rejeitada',true);end;
end $$;
select set_config('request.jwt.claim.sub',(select user1::text from rh_fixture),true);
do $$begin
 insert into rh_checks values('Retirada oculta publicação ao titular',(public.manari_rh('list')->>'total')::int=0);
 insert into rh_checks values('Retirada bloqueia leitura no storage',not rh_private.read_object((select path1 from rh_fixture)));
end $$;
select set_config('request.jwt.claim.sub',(select admin_id::text from rh_fixture),true);
do $$begin
 perform public.manari_rh('payslip_status',jsonb_build_object('id',(select payslip1 from rh_fixture),'state','published'));
 perform public.manari_rh('employee_status',jsonb_build_object('id',(select employee1 from rh_fixture),'active',false));

end $$;
select set_config('request.jwt.claim.sub',(select user1::text from rh_fixture),true);
do $$begin
 insert into rh_checks values('Vínculo suspenso não lê PDFs',not rh_private.read_object((select path1 from rh_fixture)));
 insert into rh_checks values('Vínculo suspenso não lista PDFs',(public.manari_rh('list')->>'total')::int=0);
end $$;
reset role;
update rh_private.employees set user_id=null where id=(select employee2 from rh_fixture);
select set_config('request.jwt.claim.sub',(select user2::text from rh_fixture),true);
set local role authenticated;
do $$begin
 perform public.manari_rh('snapshot');
 insert into rh_checks values('Primeiro acesso vincula e-mail confirmado',jsonb_array_length(public.manari_rh('snapshot')->'employees')=1);
end $$;
reset role;
insert into rh_checks values('Bucket privado',(select not public from storage.buckets where id='rh-contracheques'));
insert into rh_checks values('RPC inacessível a visitantes',not has_function_privilege('anon','public.manari_rh(text,jsonb)','execute'));
insert into rh_checks values('Operações auditadas',(select count(*) from rh_private.events)>5);
do $$begin if exists(select 1 from rh_checks where not ok) then raise exception 'RH security test failed: %',(select string_agg(name,', ') from rh_checks where not ok);end if;end $$;
select jsonb_build_object('checks',count(*),'passed',bool_and(ok),'results',jsonb_agg(to_jsonb(rh_checks))) as test_result from rh_checks;
rollback;
