-- Verified individually through Supabase execute_sql. Run each transaction separately.
-- These tests reuse confirmed identities and roll back every portal membership/invite.
begin;
create temporary table fixture as select u.id,u.email from auth.users u where u.email_confirmed_at is not null and not exists(select 1 from public.portal_staff_members s where s.user_id=u.id) order by u.id limit 1;
grant select on fixture to authenticated;
select set_config('request.jwt.claim.sub','89c92bd6-28b3-49ae-bd7d-454a3e319dd3',true);
set local role authenticated;
create temporary table invitation as select (public.admin_create_portal_invite((select email from fixture),'Teste Supervisor','financas','staff')).token;
select set_config('request.jwt.claim.sub',(select id::text from fixture),true);
select (public.accept_portal_invite((select token from invitation))).role as activated_role;
select public.can_manage_portal_module('receitas') as own_module_allowed,not public.can_manage_portal_module('licitacoes') as other_module_denied,not portal_private.can_access('receitas','Finanças',true) as publication_denied,not portal_private.can_access('receitas','Saúde') as other_department_denied;
rollback;

begin;
create temporary table fixture as select u.id,u.email from auth.users u where u.email_confirmed_at is not null and not exists(select 1 from public.portal_staff_members s where s.user_id=u.id) order by u.id limit 1;
grant select on fixture to authenticated;
select set_config('request.jwt.claim.sub','89c92bd6-28b3-49ae-bd7d-454a3e319dd3',true);
set local role authenticated;
create temporary table invitation as select (public.admin_create_portal_invite((select email from fixture),'Teste Secretário','financas','manager')).token;
select set_config('request.jwt.claim.sub',(select id::text from fixture),true);
select (public.accept_portal_invite((select token from invitation))).role as activated_role;
select public.can_manage_portal_module('receitas') as own_module_allowed,not public.can_manage_portal_module('licitacoes') as other_module_denied,portal_private.can_access('receitas','Finanças',true) as publication_allowed,not portal_private.can_access('receitas','Saúde') as other_department_denied;
rollback;

begin;
create temporary table fixture as select u.id,u.email from auth.users u where u.email_confirmed_at is not null and not exists(select 1 from public.portal_staff_members s where s.user_id=u.id) order by u.id limit 1;
grant select on fixture to authenticated;
select set_config('request.jwt.claim.sub','89c92bd6-28b3-49ae-bd7d-454a3e319dd3',true);
set local role authenticated;
create temporary table invitation as select (public.admin_create_portal_invite((select email from fixture),'Teste Administrador','financas','admin')).token;
select set_config('request.jwt.claim.sub',(select id::text from fixture),true);
select (public.accept_portal_invite((select token from invitation))).role as activated_role;
select public.can_manage_portal_module('receitas') as own_module_allowed,public.can_manage_portal_module('licitacoes') as other_module_allowed,portal_private.can_access('receitas','Finanças',true) as publication_allowed,portal_private.can_access('receitas','Saúde') as other_department_allowed;
rollback;

begin;
create temporary table fixture as select u.id,u.email from auth.users u where u.email_confirmed_at is not null and not exists(select 1 from public.portal_staff_members s where s.user_id=u.id) order by u.id limit 1;
grant select on fixture to authenticated;
select set_config('request.jwt.claim.sub','89c92bd6-28b3-49ae-bd7d-454a3e319dd3',true);
set local role authenticated;
create temporary table invitation as select (public.admin_create_portal_invite((select email from fixture),'Teste Supervisor','financas','staff')).token;
select set_config('request.jwt.claim.sub',(select id::text from fixture),true);
select (public.accept_portal_invite((select token from invitation))).role as activated_role;
create temporary table checks(name text,ok boolean);
insert into public.portal_records(module,department,title,status) values('receitas','Finanças','Teste transacional','draft');
insert into checks values ('Supervisor cria rascunho',true);
do $$ begin
 begin update public.portal_records set status='published' where title='Teste transacional'; insert into checks values('Publicação bloqueada',false);
 exception when insufficient_privilege then insert into checks values('Publicação bloqueada',true); end;
 begin insert into public.portal_records(module,department,title) values('receitas','Saúde','Negado'); insert into checks values('Outro setor bloqueado',false);
 exception when insufficient_privilege then insert into checks values('Outro setor bloqueado',true); end;
 begin perform public.accept_portal_invite((select token from invitation)); insert into checks values('Reutilização bloqueada',false);
 exception when others then insert into checks values('Reutilização bloqueada',sqlerrm='Convite inválido ou expirado'); end;
 begin perform public.admin_create_portal_invite('denied@example.invalid','Negado','financas','admin'); insert into checks values('Escalada bloqueada',false);
 exception when others then insert into checks values('Escalada bloqueada',sqlerrm='Acesso negado'); end;
end $$;
select jsonb_agg(to_jsonb(c)) as checks from checks c; rollback;
