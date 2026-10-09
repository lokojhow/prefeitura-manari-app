-- Applied to Manari conectado; keep this version with the frontend.
alter table public.portal_staff_members drop constraint portal_staff_members_role_check;
alter table public.portal_staff_members add constraint portal_staff_members_role_check
  check (role in ('staff','editor','manager','admin','rh'));

create schema if not exists portal_private;
revoke all on schema portal_private from public;
grant usage on schema portal_private to authenticated, anon;
create or replace function portal_private.can_access(p_module text, p_department text default null, p_publish boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
 select 1 from public.portal_staff_members s
 where s.user_id=auth.uid() and s.active and
 (s.role='admin' or (s.can_manage_documents and p_module=any(s.modules)
 and (not p_publish or s.role in ('manager','rh'))
 and (p_department is null or p_department=s.department or exists (
 select 1 from public.portal_departments d where d.active
 and (s.department=d.code or s.department=d.name)
 and (p_department=d.code or p_department=d.name))))));
$$;
revoke all on function portal_private.can_access(text,text,boolean) from public;
grant execute on function portal_private.can_access(text,text,boolean) to authenticated, anon;
create or replace function public.can_manage_portal_module(p_module text)
returns boolean language sql stable security invoker set search_path = '' as $$
 select portal_private.can_access(p_module);
$$;

-- Published content remains public; drafts and writes require both module and sector.
drop policy records_staff_select on public.portal_records;
drop policy records_staff_insert on public.portal_records;
drop policy records_staff_update on public.portal_records;
drop policy records_staff_delete on public.portal_records;
create policy records_staff_select on public.portal_records for select to authenticated
 using (department is not null and portal_private.can_access(module,department));
create policy records_staff_insert on public.portal_records for insert to authenticated
 with check (department is not null and portal_private.can_access(module,department,status<>'draft'));
create policy records_staff_update on public.portal_records for update to authenticated
 using (department is not null and portal_private.can_access(module,department,status<>'draft'))
 with check (department is not null and portal_private.can_access(module,department,status<>'draft'));
create policy records_staff_delete on public.portal_records for delete to authenticated
 using (department is not null and portal_private.can_access(module,department,true));

drop policy portal_documents_staff_insert on public.portal_documents;
drop policy portal_documents_staff_update on public.portal_documents;
drop policy portal_documents_staff_delete on public.portal_documents;
create policy portal_documents_staff_select on public.portal_documents for select to authenticated
 using (department is not null and portal_private.can_access(module,department));
create policy portal_documents_staff_insert on public.portal_documents for insert to authenticated
 with check (department is not null and portal_private.can_access(module,department,true));
create policy portal_documents_staff_update on public.portal_documents for update to authenticated
 using (department is not null and portal_private.can_access(module,department,true))
 with check (department is not null and portal_private.can_access(module,department,true));
create policy portal_documents_staff_delete on public.portal_documents for delete to authenticated
 using (department is not null and portal_private.can_access(module,department,true));

alter table public.portal_financial_entries add column if not exists department text;
alter table public.portal_official_acts add column if not exists department text;
do $$ declare t text; m text; begin
 for t,m in select * from (values
 ('portal_financial_entries','receitas'),('portal_procurements','licitacoes'),
 ('portal_contracts','contratos'),('portal_official_acts','leis'),
 ('portal_public_works','obras_publicas'),('portal_remuneration_records','servidores_remuneracoes')) x loop
 execute format('drop policy public_read_published on public.%I',t);
 execute format('drop policy staff_insert on public.%I',t);
 execute format('drop policy staff_update on public.%I',t);
 execute format('drop policy staff_delete on public.%I',t);
 execute format('create policy public_read_published on public.%I for select using (published or (department is not null and portal_private.can_access(%L,department)))',t,m);
 execute format('create policy staff_insert on public.%I for insert to authenticated with check (department is not null and portal_private.can_access(%L,department,published))',t,m);
 execute format('create policy staff_update on public.%I for update to authenticated using (department is not null and portal_private.can_access(%L,department,published)) with check (department is not null and portal_private.can_access(%L,department,published))',t,m,m);
 execute format('create policy staff_delete on public.%I for delete to authenticated using (department is not null and portal_private.can_access(%L,department,true))',t,m);
 end loop;
end $$;

-- Uploads are namespaced by module. Only publishers can replace or delete files.
drop policy portal_staff_upload_objects on storage.objects;
drop policy portal_staff_update_objects on storage.objects;
drop policy portal_staff_delete_objects on storage.objects;
create policy portal_staff_upload_objects on storage.objects for insert to authenticated
 with check (bucket_id='portal-documentos' and portal_private.can_access((storage.foldername(name))[1]));
create policy portal_staff_update_objects on storage.objects for update to authenticated
 using (bucket_id='portal-documentos' and portal_private.can_access((storage.foldername(name))[1],null,true))
 with check (bucket_id='portal-documentos' and portal_private.can_access((storage.foldername(name))[1],null,true));
create policy portal_staff_delete_objects on storage.objects for delete to authenticated
 using (bucket_id='portal-documentos' and portal_private.can_access((storage.foldername(name))[1],null,true));

create or replace function public.admin_create_portal_invite(p_email text,p_full_name text,p_department_code text,p_role text default 'staff')
returns public.portal_staff_invites language plpgsql security definer set search_path = '' as $$
declare d public.portal_departments%rowtype; i public.portal_staff_invites%rowtype;
begin
 if auth.uid() is null or not public.is_portal_admin() then raise exception 'Acesso negado'; end if;
 if p_role not in ('staff','manager','admin') then raise exception 'Perfil inválido'; end if;
 if p_email is null or trim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail inválido'; end if;
 if nullif(trim(p_full_name),'') is null then raise exception 'Nome obrigatório'; end if;
 select * into d from public.portal_departments where code=p_department_code and active;
 if d.code is null then raise exception 'Setor inválido'; end if;
 if exists(select 1 from public.portal_staff_members where lower(email)=lower(trim(p_email))) then raise exception 'Este usuário já possui vínculo no portal'; end if;
 -- Serialize replacement invitations for the same e-mail.
 perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_email)),0));
 update public.portal_staff_invites set expires_at=now() where email=lower(trim(p_email)) and accepted_at is null;
 insert into public.portal_staff_invites(email,full_name,department_code,role,modules,can_manage_documents,can_manage_payslips,created_by)
 values(lower(trim(p_email)),trim(p_full_name),d.code,p_role,d.modules,d.can_manage_documents,d.can_manage_payslips,auth.uid()) returning * into i;
 insert into public.portal_audit_log(user_id,action,entity_type,entity_id,details)
 values(auth.uid(),'create_invite','portal_staff_invites',i.id::text,jsonb_build_object('department',d.code,'role',p_role));
 return i;
end $$;

create or replace function public.accept_portal_invite(p_token uuid)
returns public.portal_staff_members language plpgsql security definer set search_path = '' as $$
declare i public.portal_staff_invites%rowtype; d public.portal_departments%rowtype;
 s public.portal_staff_members%rowtype; e text; confirmed timestamptz;
begin
 if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;
 select email,email_confirmed_at into e,confirmed from auth.users where id=auth.uid();
 if confirmed is null then raise exception 'Confirme seu e-mail antes de ativar o convite'; end if;
 select * into i from public.portal_staff_invites where token=p_token for update;
 if i.id is null or i.accepted_at is not null or i.expires_at<=now() then raise exception 'Convite inválido ou expirado'; end if;
 if lower(coalesce(e,''))<>lower(i.email) then raise exception 'Este convite pertence a outro e-mail'; end if;
 select * into d from public.portal_departments where code=i.department_code and active;
 if d.code is null then raise exception 'Setor inativo ou inválido'; end if;
 if exists(select 1 from public.portal_staff_members where user_id=auth.uid()) then raise exception 'Esta conta já possui vínculo; solicite a alteração ao administrador'; end if;
 insert into public.portal_staff_members(user_id,department,role,modules,can_manage_documents,can_manage_payslips,active,full_name,email)
 values(auth.uid(),d.name,i.role,i.modules,i.can_manage_documents,i.can_manage_payslips,true,i.full_name,i.email) returning * into s;
 update public.portal_staff_invites set accepted_at=now() where id=i.id;
 insert into public.portal_audit_log(user_id,action,entity_type,entity_id,details)
 values(auth.uid(),'accept_invite','portal_staff_members',auth.uid()::text,jsonb_build_object('department',s.department,'role',s.role));
 return s;
end $$;
revoke all on function public.admin_create_portal_invite(text,text,text,text) from public, anon;
revoke all on function public.accept_portal_invite(uuid) from public, anon;
grant execute on function public.admin_create_portal_invite(text,text,text,text),public.accept_portal_invite(uuid) to authenticated;
