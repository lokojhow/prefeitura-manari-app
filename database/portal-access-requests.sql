create table public.portal_access_requests(
 id uuid primary key default gen_random_uuid(),
 full_name text not null check(char_length(trim(full_name)) between 5 and 150),
 cpf text not null check(cpf ~ '^[0-9]{11}$'),
 identity_number text not null check(char_length(trim(identity_number)) between 3 and 50),
 identity_issuer text not null check(char_length(trim(identity_issuer)) between 2 and 40),
 email text not null check(email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and char_length(email)<=200),
 phone text not null check(phone ~ '^[0-9]{10,13}$'),
 requested_department text not null check(char_length(requested_department) between 2 and 80),
 parent_department text check(char_length(parent_department)<=150),
 job_title text not null check(char_length(trim(job_title)) between 2 and 120),
 responsibility text not null check(responsibility in('secretario','coordenador','alimentador')),
 employee_number text check(char_length(employee_number)<=60),
 consent boolean not null check(consent),
 status text not null default 'pending' check(status in('pending','approved','rejected')),
 created_at timestamptz not null default now(),reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id),approved_department text,approved_role text,
 invite_id uuid references public.portal_staff_invites(id)
);
create unique index portal_access_requests_email_open on public.portal_access_requests(lower(email)) where status in('pending','approved');
create unique index portal_access_requests_cpf_open on public.portal_access_requests(cpf) where status in('pending','approved');
create index portal_access_requests_queue on public.portal_access_requests(status,created_at);
alter table public.portal_access_requests enable row level security;
revoke all on public.portal_access_requests from anon,authenticated;
grant insert(full_name,cpf,identity_number,identity_issuer,email,phone,requested_department,parent_department,job_title,responsibility,employee_number,consent) on public.portal_access_requests to anon,authenticated;
grant select on public.portal_access_requests to authenticated;
create policy access_request_submit on public.portal_access_requests for insert to anon,authenticated with check(status='pending' and reviewed_by is null and invite_id is null and reviewed_at is null and approved_department is null and approved_role is null);
create policy access_request_admin_read on public.portal_access_requests for select to authenticated using((select public.is_portal_admin()));
create function portal_private.validate_access_request() returns trigger language plpgsql set search_path='' as $$
declare i integer; total integer; digit integer;
begin
 new.email=lower(trim(new.email));new.cpf=regexp_replace(new.cpf,'[^0-9]','','g');new.phone=regexp_replace(new.phone,'[^0-9]','','g');
 if new.cpf !~ '^[0-9]{11}$' or new.cpf=repeat(substr(new.cpf,1,1),11) then raise exception 'CPF inválido';end if;
 for digit in 10..11 loop
 total=0;for i in 1..digit-1 loop total=total+substr(new.cpf,i,1)::integer*(digit+1-i);end loop;
 total=(total*10)%11;if total=10 then total=0;end if;
 if total<>substr(new.cpf,digit,1)::integer then raise exception 'CPF inválido';end if;
 end loop;
 if not exists(select 1 from public.portal_departments where code=new.requested_department and active) and new.requested_department not in('mulher','comunicacao','tributos','cras','creas','planejamento') then raise exception 'Área inválida';end if;
 return new;
end $$;
create trigger validate_access_request before insert on public.portal_access_requests for each row execute function portal_private.validate_access_request();
-- Trigger lookup uses public department policy; expose only the public sector list.
grant select on public.portal_departments to anon;
create policy access_request_department_list on public.portal_departments for select to anon using(active);
create function portal_private.review_access_request(p_id uuid,p_action text,p_department text,p_role text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.portal_access_requests%rowtype; invitation public.portal_staff_invites%rowtype; unit_name text;
begin
 if auth.uid() is null or not public.is_portal_admin() then raise exception 'Acesso negado';end if;
 select * into r from public.portal_access_requests where id=p_id for update;
 if r.id is null or r.status<>'pending' then raise exception 'Solicitação não disponível';end if;
 if p_action='reject' then
 update public.portal_access_requests set status='rejected',reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
 return jsonb_build_object('status','rejected');
 end if;
 if p_action<>'approve' or p_role not in('staff','manager') then raise exception 'Aprovação inválida';end if;
 if not exists(select 1 from public.portal_departments where code=p_department and active) then
 unit_name=case p_department when 'mulher' then 'Coordenadoria da Mulher' when 'comunicacao' then 'Comunicação' when 'tributos' then 'Tributos' when 'cras' then 'CRAS' when 'creas' then 'CREAS' when 'planejamento' then 'Planejamento' else null end;
 if unit_name is null then raise exception 'Área inválida';end if;
 insert into public.portal_departments(code,name,description,modules,can_manage_documents,can_manage_payslips,sort_order)
 values(p_department,unit_name,'Área com acesso próprio. Vinculação institucional informada no cadastro, sujeita à confirmação.',array[]::text[],true,false,100);
 end if;
 invitation=public.admin_create_portal_invite(r.email,r.full_name,p_department,p_role);
 update public.portal_access_requests set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),approved_department=p_department,approved_role=p_role,invite_id=invitation.id where id=p_id;
 return jsonb_build_object('status','approved','token',invitation.token);
end $$;
revoke all on function portal_private.review_access_request(uuid,text,text,text) from public;
grant execute on function portal_private.review_access_request(uuid,text,text,text) to authenticated;
create function public.admin_review_portal_request(p_id uuid,p_action text,p_department text default null,p_role text default 'staff') returns jsonb language sql security invoker set search_path='' as $$select portal_private.review_access_request(p_id,p_action,p_department,p_role)$$;
revoke all on function public.admin_review_portal_request(uuid,text,text,text) from public,anon;
grant execute on function public.admin_review_portal_request(uuid,text,text,text) to authenticated;
