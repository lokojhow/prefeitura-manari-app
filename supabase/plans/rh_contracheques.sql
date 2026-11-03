-- Portal do Servidor: isolated schema and private PDF bucket. No existing payroll data is changed.
begin;
create schema rh_private;
revoke all on schema rh_private from public,anon;
grant usage on schema rh_private to authenticated;

create table rh_private.employees (
 id uuid primary key default gen_random_uuid(), registration text not null unique check(registration ~ '^[A-Za-z0-9._-]{1,40}$'),
 full_name text not null check(length(full_name) between 3 and 160), email text not null check(email=lower(email) and length(email) between 5 and 254),
 department text not null default '' check(length(department)<=160), user_id uuid references auth.users(id), active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index rh_employees_user on rh_private.employees(user_id);
create index rh_employees_unlinked_email on rh_private.employees(email) where user_id is null;
create table rh_private.payslips (
 id uuid primary key default gen_random_uuid(), employee_id uuid not null references rh_private.employees(id),
 competence date not null check(extract(day from competence)=1 and competence between '2000-01-01' and '2100-12-01'),
 kind text not null check(kind in ('mensal','decimo','ferias','complementar')),
 description text not null default '' check(length(description)<=200), object_path text unique not null,
 state text not null default 'draft' check(state in ('draft','published','archived')),
 size_bytes bigint not null check(size_bytes between 1 and 20971520), created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), published_at timestamptz, updated_at timestamptz not null default now()
);
create unique index rh_one_published on rh_private.payslips(employee_id,competence,kind) where state='published';
create index rh_payslips_employee_month on rh_private.payslips(employee_id,competence desc,id);
create index rh_payslips_state_month on rh_private.payslips(state,competence desc,id);
create table rh_private.events (
 id bigint generated always as identity primary key, actor uuid not null, action text not null,
 employee_id uuid, payslip_id uuid, created_at timestamptz not null default now()
);
create index rh_events_payslip on rh_private.events(payslip_id,created_at desc);
alter table rh_private.employees enable row level security;
alter table rh_private.payslips enable row level security;
alter table rh_private.events enable row level security;
revoke all on all tables in schema rh_private from public,anon,authenticated;
revoke all on all sequences in schema rh_private from public,anon,authenticated;

create function rh_private.manager() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.portal_staff_members s where s.user_id=auth.uid() and s.active and (s.role='admin' or s.can_manage_payslips))
 and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now()));
$$;
create function rh_private.read_object(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now()))
 and exists(select 1 from rh_private.payslips p join rh_private.employees e on e.id=p.employee_id where p.object_path=p_path and
 (rh_private.manager() or (e.user_id=auth.uid() and e.active and p.state='published')));
$$;
create function rh_private.upload_object(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select rh_private.manager() and exists(select 1 from rh_private.payslips p where p.object_path=p_path and p.state='draft' and p.created_by=auth.uid());
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('rh-contracheques','rh-contracheques',false,20971520,array['application/pdf']);
create policy rh_pdf_read on storage.objects for select to authenticated using(bucket_id='rh-contracheques' and rh_private.read_object(name));
create policy rh_pdf_upload on storage.objects for insert to authenticated with check(bucket_id='rh-contracheques' and rh_private.upload_object(name));
create policy rh_pdf_cleanup on storage.objects for delete to authenticated using(bucket_id='rh-contracheques' and rh_private.upload_object(name));

create function rh_private.api(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); mail text; manager boolean; general_admin boolean; result jsonb; v_emp rh_private.employees; v_pay rh_private.payslips;
 page_no int; page_size int:=25; month_filter date; employee_filter uuid; manage_view boolean; state_filter text;
 name_value text; email_value text; reg_value text; dept_value text; target uuid; enabled boolean; changed int; obj jsonb;
begin
 if uid is null then raise exception 'Entre na sua conta para continuar.' using errcode='42501'; end if;
 select lower(u.email) into mail from auth.users u where u.id=uid and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now());
 if mail is null then raise exception 'Confirme seu e-mail antes de acessar.' using errcode='42501'; end if;
 manager:=rh_private.manager(); general_admin:=public.is_portal_admin();
 if p_action='snapshot' then
  with linked as (update rh_private.employees set user_id=uid,updated_at=now() where user_id is null and email=mail and active returning id)
   insert into rh_private.events(actor,action,employee_id) select uid,'vinculo_confirmado',id from linked;
  return jsonb_build_object('manager',manager,'admin',general_admin,'email',mail,'employees',coalesce((select jsonb_agg(jsonb_build_object('id',id,'registration',registration,'full_name',full_name,'department',department,'active',active) order by registration) from rh_private.employees where user_id=uid),'[]'::jsonb));
 end if;
 if p_action='list' then
  manage_view:=coalesce((p_data->>'manage')::boolean,false);
  if manage_view and not manager then raise exception 'Acesso exclusivo do RH.' using errcode='42501'; end if;
  page_no:=coalesce((p_data->>'page')::int,1);
  if page_no<1 or page_no>100000 then raise exception 'Página inválida.'; end if;
  month_filter:=nullif(p_data->>'month','')::date; employee_filter:=nullif(p_data->>'employee','')::uuid;
  if month_filter is not null and extract(day from month_filter)<>1 then raise exception 'Competência inválida.'; end if;
  state_filter:=coalesce(p_data->>'state','published');
  if state_filter not in ('published','archived','all') then raise exception 'Situação inválida.'; end if;
  with eligible as (
   select pay.id,pay.employee_id,pay.competence,pay.kind,pay.description,pay.state,pay.size_bytes,pay.published_at,emp.registration,emp.full_name,emp.department
   from rh_private.payslips pay join rh_private.employees emp on emp.id=pay.employee_id
   where pay.state<>'draft' and ((manage_view and (state_filter='all' or pay.state=state_filter)) or (not manage_view and pay.state='published' and emp.user_id=uid and emp.active))
   and (month_filter is null or pay.competence=month_filter) and (employee_filter is null or pay.employee_id=employee_filter)
  ), sliced as (select * from eligible order by competence desc,published_at desc,id limit page_size offset (page_no-1)*page_size)
  select jsonb_build_object('total',(select count(*) from eligible),'rows',coalesce((select jsonb_agg(to_jsonb(sliced)) from sliced),'[]'::jsonb),'page',page_no) into result;
  return result;
 end if;
 if p_action='document' then
  select * into v_pay from rh_private.payslips where id=(p_data->>'id')::uuid;
  if v_pay.id is null or not rh_private.read_object(v_pay.object_path) then raise exception 'Documento não disponível para esta conta.' using errcode='42501'; end if;
  insert into rh_private.events(actor,action,employee_id,payslip_id) values(uid,'consulta_pdf',v_pay.employee_id,v_pay.id);
  return jsonb_build_object('path',v_pay.object_path);
 end if;
 -- Every action below is restricted to an active RH manager, checked in the database.
 if not manager then raise exception 'Acesso exclusivo do RH.' using errcode='42501'; end if;
 if p_action='employees' then
  page_no:=coalesce((p_data->>'page')::int,1); if page_no<1 or page_no>100000 then raise exception 'Página inválida.'; end if;
  name_value:=left(trim(coalesce(p_data->>'search','')),160);
  with eligible as (select id,registration,full_name,email,department,active,user_id is not null as linked from rh_private.employees
   where name_value='' or full_name ilike '%'||name_value||'%' or registration ilike '%'||name_value||'%' or email ilike '%'||name_value||'%'),
  sliced as(select * from eligible order by full_name,id limit page_size offset (page_no-1)*page_size)
  select jsonb_build_object('total',(select count(*) from eligible),'rows',coalesce((select jsonb_agg(to_jsonb(sliced)) from sliced),'[]'::jsonb)) into result; return result;
 end if;
 if p_action='find' then
  if jsonb_typeof(p_data->'registrations') is distinct from 'array' or jsonb_array_length(p_data->'registrations')>100 then raise exception 'Selecione até 100 arquivos.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'registration',registration,'full_name',full_name,'active',active)) from rh_private.employees
   where registration in(select jsonb_array_elements_text(p_data->'registrations'))),'[]'::jsonb);
 end if;
 if p_action='register' then
  reg_value:=trim(coalesce(p_data->>'registration','')); name_value:=trim(coalesce(p_data->>'full_name','')); email_value:=lower(trim(coalesce(p_data->>'email','')));dept_value:=trim(coalesce(p_data->>'department',''));
  if reg_value!~'^[A-Za-z0-9._-]{1,40}$' or length(name_value) not between 3 and 160 or length(email_value)>254 or email_value!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(dept_value)>160 then raise exception 'Confira matrícula, nome, e-mail e setor.'; end if;
  select u.id into target from auth.users u where lower(u.email)=email_value and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now());
  insert into rh_private.employees(registration,full_name,email,department,user_id) values(reg_value,name_value,email_value,dept_value,target) returning * into v_emp;
  insert into rh_private.events(actor,action,employee_id) values(uid,'servidor_cadastrado',v_emp.id);
  return jsonb_build_object('id',v_emp.id,'linked',v_emp.user_id is not null);
 end if;
 if p_action='employee_status' then
  enabled:=(p_data->>'active')::boolean; if enabled is null then raise exception 'Informe a situação do vínculo.'; end if;
  update rh_private.employees set active=enabled,updated_at=now() where id=(p_data->>'id')::uuid returning * into v_emp;
  if v_emp.id is null then raise exception 'Servidor não encontrado.'; end if;
  insert into rh_private.events(actor,action,employee_id) values(uid,case when enabled then 'servidor_ativado' else 'servidor_suspenso' end,v_emp.id);
  return jsonb_build_object('ok',true);
 end if;
 if p_action='begin_upload' then
  select * into v_emp from rh_private.employees where id=(p_data->>'employee')::uuid for update;
  if v_emp.id is null or not v_emp.active then raise exception 'Selecione um servidor ativo.'; end if;
  month_filter:=(p_data->>'month')::date;
  if month_filter is null or extract(day from month_filter)<>1 or month_filter not between '2000-01-01' and '2100-12-01' then raise exception 'Competência inválida.'; end if;
  if coalesce(p_data->>'kind','') not in ('mensal','decimo','ferias','complementar') or coalesce((p_data->>'size')::bigint,0) not between 1 and 20971520 or length(coalesce(p_data->>'description',''))>200 then raise exception 'Confira o tipo, descrição e tamanho do PDF (até 20 MB).'; end if;
  if exists(select 1 from rh_private.payslips where employee_id=v_emp.id and competence=month_filter and kind=p_data->>'kind' and state='published') then raise exception 'Já existe contracheque publicado para esta matrícula, competência e tipo. Retire a publicação anterior antes de substituir.'; end if;
  target:=gen_random_uuid();
  insert into rh_private.payslips(id,employee_id,competence,kind,description,object_path,size_bytes,created_by)
  values(target,v_emp.id,month_filter,p_data->>'kind',trim(coalesce(p_data->>'description','')),v_emp.id::text||'/'||target::text||'/'||gen_random_uuid()::text||'.pdf',(p_data->>'size')::bigint,uid) returning * into v_pay;
  return jsonb_build_object('id',v_pay.id,'path',v_pay.object_path);
 end if;
 if p_action in ('publish','payslip_status') then
  select * into v_pay from rh_private.payslips where id=(p_data->>'id')::uuid for update;
  if v_pay.id is null then raise exception 'Documento não encontrado.'; end if;
  select * into v_emp from rh_private.employees where id=v_pay.employee_id for update;
  if p_action='publish' then
   if v_pay.state<>'draft' or v_pay.created_by<>uid then raise exception 'Envio não disponível.'; end if;
   select metadata into obj from storage.objects where bucket_id='rh-contracheques' and name=v_pay.object_path;
   if obj is null or obj->>'mimetype' is distinct from 'application/pdf' or (obj->>'size')::bigint is distinct from v_pay.size_bytes then raise exception 'O PDF não foi recebido integralmente. Envie novamente.'; end if;
   state_filter:='published';
  else
   state_filter:=p_data->>'state';
   if state_filter is null or state_filter not in ('published','archived') or v_pay.state='draft' then raise exception 'Situação inválida.'; end if;
  end if;
  if state_filter='published' and not v_emp.active then raise exception 'O vínculo do servidor está suspenso.'; end if;
  if state_filter='published' and exists(select 1 from rh_private.payslips where employee_id=v_pay.employee_id and competence=v_pay.competence and kind=v_pay.kind and state='published' and id<>v_pay.id) then raise exception 'Já existe outra publicação para esta competência e tipo.'; end if;
  update rh_private.payslips set state=state_filter,published_at=case when state_filter='published' then coalesce(published_at,now()) else published_at end,updated_at=now() where id=v_pay.id;
  insert into rh_private.events(actor,action,employee_id,payslip_id) values(uid,case when state_filter='published' then 'contracheque_publicado' else 'publicacao_retirada' end,v_pay.employee_id,v_pay.id);
  return jsonb_build_object('ok',true);
 end if;
 if p_action='team' then
  if not general_admin then raise exception 'Acesso exclusivo do administrador geral.' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('full_name',s.full_name,'email',coalesce(u.email,s.email),'role',s.role,'active',s.active)) from public.portal_staff_members s join auth.users u on u.id=s.user_id where s.role='admin' or s.can_manage_payslips),'[]'::jsonb);
 end if;
 if p_action='team_access' then
  if not general_admin then raise exception 'Acesso exclusivo do administrador geral.' using errcode='42501'; end if;
  enabled:=(p_data->>'enabled')::boolean; email_value:=lower(trim(coalesce(p_data->>'email','')));
  if enabled is null or email_value='' then raise exception 'Informe o e-mail e a permissão.'; end if;
  select u.id into target from auth.users u where lower(u.email)=email_value and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now());
  if target is null then raise exception 'Esta pessoa precisa criar e confirmar a conta antes de receber acesso ao RH.'; end if;
  if exists(select 1 from public.portal_staff_members where user_id=target and (role='admin' or not active)) then raise exception 'Administradores gerais ou contas suspensas devem ser gerenciados na administração do portal.'; end if;
  if enabled then
   insert into public.portal_staff_members(user_id,role,department,can_manage_documents,can_manage_payslips,email,active) values(target,'editor','Recursos Humanos',false,true,email_value,true)
   on conflict(user_id) do update set can_manage_payslips=true,updated_at=now();
  else update public.portal_staff_members set can_manage_payslips=false,updated_at=now() where user_id=target; end if;
  insert into rh_private.events(actor,action) values(uid,case when enabled then 'acesso_rh_concedido' else 'acesso_rh_revogado' end);
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Ação inválida.';
exception when unique_violation then raise exception 'Esta matrícula ou publicação já está cadastrada. Confira os dados.';
end;
$$;
revoke all on all functions in schema rh_private from public,anon;
grant execute on all functions in schema rh_private to authenticated;
create function public.manari_rh(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$ select rh_private.api(p_action,coalesce(p_data,'{}'::jsonb)); $$;
revoke all on function public.manari_rh(text,jsonb) from public,anon;
grant execute on function public.manari_rh(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
