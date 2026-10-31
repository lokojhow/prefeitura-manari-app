create schema manari_ouvidoria_private;
revoke all on schema manari_ouvidoria_private from public,anon,authenticated;
create table public.manari_ouvidoria_requests(
 id uuid primary key default gen_random_uuid(),protocol text not null unique default ('OUV-'||to_char(now() at time zone 'America/Sao_Paulo','YYYYMMDD')||'-'||upper(encode(extensions.gen_random_bytes(8),'hex'))),
 citizen_id uuid references auth.users(id),is_anonymous boolean not null default false,
 kind text not null check(kind in ('reclamacao','denuncia','solicitacao','sugestao','elogio')),
 department_code text references public.portal_departments(code),other_department text,
 subject text not null check(char_length(btrim(subject)) between 5 and 200),description text not null check(char_length(btrim(description)) between 10 and 10000),
 status text not null default 'recebido' check(status in ('recebido','em_analise','respondido','arquivado')),
 assigned_department text,response text,responded_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((is_anonymous and citizen_id is null and kind='denuncia') or (not is_anonymous and citizen_id is not null)),
 check((department_code is not null and other_department is null) or (department_code is null and char_length(btrim(other_department)) between 5 and 500 and other_department is not null))
);
alter table public.manari_ouvidoria_requests enable row level security;
revoke all on public.manari_ouvidoria_requests from public,anon,authenticated;
grant select on public.manari_ouvidoria_requests to authenticated;
create policy ouvidoria_read on public.manari_ouvidoria_requests for select to authenticated using(citizen_id=(select auth.uid()) or public.is_portal_admin());
create index ouvidoria_order_idx on public.manari_ouvidoria_requests(created_at desc,id desc);
create index ouvidoria_owner_idx on public.manari_ouvidoria_requests(citizen_id,created_at desc);
create table public.manari_ouvidoria_events(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.manari_ouvidoria_requests(id) on delete cascade,event text not null,details text not null default '',created_at timestamptz not null default now());
alter table public.manari_ouvidoria_events enable row level security;
revoke all on public.manari_ouvidoria_events from public,anon,authenticated;
grant select on public.manari_ouvidoria_events to authenticated;
create policy ouvidoria_event_read on public.manari_ouvidoria_events for select to authenticated using(exists(select 1 from public.manari_ouvidoria_requests r where r.id=request_id and (r.citizen_id=(select auth.uid()) or public.is_portal_admin())));
create index ouvidoria_event_request_idx on public.manari_ouvidoria_events(request_id,created_at);
create table manari_ouvidoria_private.receipts(request_id uuid primary key references public.manari_ouvidoria_requests(id) on delete cascade,key_hash bytea not null);
create table manari_ouvidoria_private.limits(bucket timestamptz,kind text,n integer not null,primary key(bucket,kind));
alter table manari_ouvidoria_private.receipts enable row level security;
alter table manari_ouvidoria_private.limits enable row level security;
revoke all on all tables in schema manari_ouvidoria_private from public,anon,authenticated;
create function manari_ouvidoria_private.rate_limit(p_kind text,p_limit integer) returns void language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into manari_ouvidoria_private.limits(bucket,kind,n) values(date_trunc('minute',now()),p_kind,1) on conflict(bucket,kind) do update set n=manari_ouvidoria_private.limits.n+1 returning limits.n into n;
 if n>p_limit then raise exception 'Muitos acessos. Aguarde um minuto e tente novamente.' using errcode='54000';end if;
end $$;
revoke all on function manari_ouvidoria_private.rate_limit(text,integer) from public,anon,authenticated;
create function public.manari_ouvidoria_submit(p_kind text,p_subject text,p_description text,p_department text default null,p_other text default null,p_anonymous boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.manari_ouvidoria_requests%rowtype;k text;begin
 if p_anonymous is null or (p_anonymous and p_kind is distinct from 'denuncia') or (not p_anonymous and auth.uid() is null) then raise exception 'Entre na sua conta ou escolha denúncia sem identificação.' using errcode='42501';end if;
 if p_kind is null or p_kind not in ('reclamacao','denuncia','solicitacao','sugestao','elogio') then raise exception 'Tipo inválido' using errcode='22023';end if;
 if p_department is not null and not exists(select 1 from public.portal_departments where code=p_department and active) then raise exception 'Secretaria indisponível' using errcode='22023';end if;
 if char_length(btrim(coalesce(p_subject,''))) not between 5 and 200 or char_length(btrim(coalesce(p_description,''))) not between 10 and 10000 then raise exception 'Informe assunto de 5 a 200 caracteres e relato de 10 a 10000 caracteres.' using errcode='22023';end if;
 if p_department is null and char_length(btrim(coalesce(p_other,''))) not between 5 and 500 then raise exception 'Explique qual é o assunto em Outros.' using errcode='22023';end if;
 perform manari_ouvidoria_private.rate_limit('envio',30);
 insert into public.manari_ouvidoria_requests(citizen_id,is_anonymous,kind,subject,description,department_code,other_department) values(case when p_anonymous then null else auth.uid() end,p_anonymous,p_kind,btrim(p_subject),btrim(p_description),p_department,case when p_department is null then btrim(p_other) else null end) returning * into r;
 if p_anonymous then k:=encode(extensions.gen_random_bytes(32),'hex');insert into manari_ouvidoria_private.receipts values(r.id,extensions.digest(k,'sha256'));end if;
 insert into public.manari_ouvidoria_events(request_id,event,details) values(r.id,'recebido','Manifestação registrada.');
 return jsonb_build_object('protocol',r.protocol,'key',k,'anonymous',p_anonymous);
end $$;
revoke all on function public.manari_ouvidoria_submit(text,text,text,text,text,boolean) from public;
grant execute on function public.manari_ouvidoria_submit(text,text,text,text,text,boolean) to anon,authenticated;
create function public.manari_ouvidoria_track(p_protocol text,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.manari_ouvidoria_requests%rowtype;begin
 if p_protocol is null or length(p_protocol)>80 or p_key is null or p_key !~ '^[a-f0-9]{64}$' then raise exception 'Protocolo ou chave inválidos.' using errcode='42501';end if;
 perform manari_ouvidoria_private.rate_limit('consulta',120);
 select q.* into r from public.manari_ouvidoria_requests q join manari_ouvidoria_private.receipts k on k.request_id=q.id where q.protocol=p_protocol and q.is_anonymous and k.key_hash=extensions.digest(p_key,'sha256');
 if not found then raise exception 'Protocolo ou chave inválidos.' using errcode='42501';end if;
 return to_jsonb(r)||jsonb_build_object('history',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.manari_ouvidoria_events e where e.request_id=r.id),'[]'::jsonb));
end $$;
revoke all on function public.manari_ouvidoria_track(text,text) from public;
grant execute on function public.manari_ouvidoria_track(text,text) to anon,authenticated;
create function public.manari_ouvidoria_list(p_page integer default 1,p_from date default null,p_to date default null,p_kind text default null,p_status text default null,p_department text default null) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode='42501';end if;
 if p_page is null or p_page<1 or p_page>1000000 or (p_from is not null and p_to is not null and p_from>p_to) then raise exception 'Página ou período inválido.' using errcode='22023';end if;
 return(with filtered as materialized(select * from public.manari_ouvidoria_requests where (p_from is null or created_at>=p_from::timestamp at time zone 'America/Sao_Paulo') and (p_to is null or created_at<(p_to+1)::timestamp at time zone 'America/Sao_Paulo') and (p_kind is null or kind=p_kind) and(p_status is null or status=p_status) and(p_department is null or department_code=p_department or(p_department='__other__' and department_code is null))),paged as(select * from filtered order by created_at desc,id desc limit 25 offset (p_page-1)::bigint*25)
 select jsonb_build_object('total',(select count(*) from filtered),'page',p_page,'rows',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id desc) from paged p),'[]'::jsonb),'departments',coalesce((select jsonb_agg(to_jsonb(g)) from(select coalesce(department_code,'__other__') code,count(*) total from filtered where status in ('recebido','em_analise') group by department_code order by count(*) desc) g),'[]'::jsonb)));
end $$;
revoke all on function public.manari_ouvidoria_list(integer,date,date,text,text,text) from public,anon;
grant execute on function public.manari_ouvidoria_list(integer,date,date,text,text,text) to authenticated;
create function public.manari_ouvidoria_act(p_request uuid,p_action text,p_text text) returns void language plpgsql security definer set search_path='' as $$
declare r public.manari_ouvidoria_requests%rowtype;begin
 if auth.uid() is null or not public.is_portal_admin() then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 select * into r from public.manari_ouvidoria_requests where id=p_request for update;
 if not found then raise exception 'Manifestação não encontrada.' using errcode='P0002';end if;
 if p_action='encaminhar' then
  if r.status not in ('recebido','em_analise') or not exists(select 1 from public.portal_departments where code=p_text and active) then raise exception 'Encaminhamento inválido.' using errcode='22023';end if;
  update public.manari_ouvidoria_requests set assigned_department=p_text,status='em_analise',updated_at=now() where id=r.id;
 elsif p_action='responder' then
  if r.status not in ('recebido','em_analise') or char_length(btrim(coalesce(p_text,''))) not between 10 and 10000 then raise exception 'Resposta inválida.' using errcode='22023';end if;
  update public.manari_ouvidoria_requests set response=btrim(p_text),responded_at=now(),status='respondido',updated_at=now() where id=r.id;
 elsif p_action='arquivar' and r.status='respondido' then update public.manari_ouvidoria_requests set status='arquivado',updated_at=now() where id=r.id;
 else raise exception 'Ação inválida para esta situação.' using errcode='22023';end if;
 insert into public.manari_ouvidoria_events(request_id,event,details) values(r.id,p_action,case when p_action='responder' then 'Resposta disponível.' when p_action='encaminhar' then 'Secretaria: '||(select name from public.portal_departments where code=p_text) else 'Atendimento arquivado.' end);
end $$;
revoke all on function public.manari_ouvidoria_act(uuid,text,text) from public,anon;
grant execute on function public.manari_ouvidoria_act(uuid,text,text) to authenticated;
