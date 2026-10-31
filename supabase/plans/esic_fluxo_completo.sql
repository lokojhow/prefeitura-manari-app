-- Additive e-SIC workflow. Shared portal files, roles and existing protocols remain intact.
create schema manari_esic_private;
revoke all on schema manari_esic_private from public,anon,authenticated;
create table manari_esic_private.settings (
 id boolean primary key default true check(id), response_days integer not null default 20 check(response_days between 1 and 60),
 extension_days integer not null default 10 check(extension_days between 1 and 30), appeal_days integer not null default 10 check(appeal_days between 1 and 30),
 decision_days integer not null default 5 check(decision_days between 1 and 30), appeal_levels integer not null default 1 check(appeal_levels between 1 and 3),
 roll_weekends boolean not null default true, holidays date[] not null default '{}', responsible_id uuid references auth.users(id), reviewers uuid[] not null default '{}',
 smtp_login text not null default 'c00c42001@smtp-brevo.com', sender_email text not null default 'discipulojonathas@gmail.com',
 updated_at timestamptz not null default now()
);
insert into manari_esic_private.settings(id) values(true);
alter table manari_esic_private.settings enable row level security;
revoke all on manari_esic_private.settings from public,anon,authenticated;

alter table public.manari_digital_requests
 add column due_date date,
 add column extended_at timestamptz,
 add column extension_reason text check(extension_reason is null or char_length(btrim(extension_reason)) between 10 and 2000),
 add column response_by uuid references auth.users(id),
 add column response_read_at timestamptz,
 add column response_outcome text check(response_outcome in ('informacao','parcial','negado','inexistente','sem_competencia'));
create table public.manari_esic_events (
 id uuid primary key default gen_random_uuid(),request_id uuid not null references public.manari_digital_requests(id) on delete cascade,
 actor_id uuid references auth.users(id),event_type text not null check(event_type in ('prorrogado','ciencia','recurso_decidido')),details text not null default '',created_at timestamptz not null default now()
);
alter table public.manari_esic_events enable row level security;
revoke all on public.manari_esic_events from public,anon,authenticated;
grant select on public.manari_esic_events to authenticated;
create policy esic_workflow_event_read on public.manari_esic_events for select to authenticated using(exists(select 1 from public.manari_digital_requests r where r.id=request_id and (r.citizen_id=(select auth.uid()) or public.is_portal_admin())));
create index esic_workflow_event_request_idx on public.manari_esic_events(request_id,created_at);
create function public.manari_esic_history(p_request uuid) returns table(event_type text,details text,created_at timestamptz)
 language sql stable security invoker set search_path='' as $$
 select event_type,details,created_at from public.manari_digital_events where request_id=p_request
 union all select event_type,details,created_at from public.manari_esic_events where request_id=p_request order by created_at;
$$;
revoke all on function public.manari_esic_history(uuid) from public,anon;
grant execute on function public.manari_esic_history(uuid) to authenticated;

create table public.manari_digital_appeals (
 id uuid primary key default gen_random_uuid(),request_id uuid not null references public.manari_digital_requests(id) on delete cascade,
 citizen_id uuid not null references auth.users(id),source_response_at timestamptz not null,level integer not null check(level between 1 and 3),
 reason text not null check(char_length(btrim(reason)) between 10 and 10000),status text not null default 'pendente' check(status in ('pendente','decidido')),
 due_date date not null,decision text check(decision is null or char_length(btrim(decision)) between 10 and 10000),
 outcome text check(outcome in ('mantida','revisada')),decided_by uuid references auth.users(id),created_at timestamptz not null default now(),decided_at timestamptz,read_at timestamptz,
 unique(request_id,source_response_at,level)
);
alter table public.manari_digital_appeals enable row level security;
revoke all on public.manari_digital_appeals from public,anon,authenticated;
grant select on public.manari_digital_appeals to authenticated;
create policy esic_appeal_owner_read on public.manari_digital_appeals for select to authenticated using(citizen_id=(select auth.uid()) or public.is_portal_admin());
create index esic_appeals_pending_idx on public.manari_digital_appeals(status,due_date,created_at);

create table public.manari_esic_preferences (
 citizen_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,email_enabled boolean not null default true
);
alter table public.manari_esic_preferences enable row level security;
revoke all on public.manari_esic_preferences from public,anon,authenticated;
grant select on public.manari_esic_preferences to authenticated;
grant insert(email_enabled),update(email_enabled) on public.manari_esic_preferences to authenticated;
create policy esic_preferences_read on public.manari_esic_preferences for select to authenticated using(citizen_id=(select auth.uid()));
create policy esic_preferences_insert on public.manari_esic_preferences for insert to authenticated with check(citizen_id=(select auth.uid()));
create policy esic_preferences_update on public.manari_esic_preferences for update to authenticated using(citizen_id=(select auth.uid())) with check(citizen_id=(select auth.uid()));

create table public.manari_digital_mail_queue (
 id uuid primary key default gen_random_uuid(),request_id uuid references public.manari_digital_requests(id) on delete cascade,
 citizen_id uuid not null references auth.users(id),protocol text not null,event text not null check(event in ('criado','encaminhado','respondido','prorrogado','recurso','recurso_decidido','teste')),
 dedupe_key text not null unique,state text not null default 'pendente' check(state in ('pendente','enviando','enviado','falhou','ignorado')),
 attempts integer not null default 0,next_attempt_at timestamptz not null default now(),lease_until timestamptz,lease_token uuid,
 created_at timestamptz not null default now(),sent_at timestamptz,error_code text
);
alter table public.manari_digital_mail_queue enable row level security;
revoke all on public.manari_digital_mail_queue from public,anon,authenticated;
grant select(id,request_id,citizen_id,protocol,event,state,attempts,created_at,sent_at,error_code) on public.manari_digital_mail_queue to authenticated;
create policy esic_mail_owner_read on public.manari_digital_mail_queue for select to authenticated using(citizen_id=(select auth.uid()) or public.is_portal_admin());
create index esic_mail_pending_idx on public.manari_digital_mail_queue(state,next_attempt_at);

create function public.manari_esic_add_days(p_date date,p_days integer) returns date
 language plpgsql stable security definer set search_path='' as $$
declare s manari_esic_private.settings%rowtype; d date; i integer:=0;
begin
 if p_date is null or p_days is null or p_days<0 or p_days>365 then raise exception 'Prazo inválido' using errcode='22023';end if;
 select * into strict s from manari_esic_private.settings;d:=p_date+p_days;
 while (s.roll_weekends and extract(isodow from d) in (6,7)) or d=any(s.holidays) loop
  d:=d+1;i:=i+1;if i>370 then raise exception 'Calendário inválido';end if;
 end loop;return d;
end $$;
create function public.manari_esic_due_date(p_created timestamptz) returns date
 language sql stable security definer set search_path='' as $$
 select public.manari_esic_add_days((p_created at time zone 'America/Sao_Paulo')::date,response_days) from manari_esic_private.settings;
$$;
revoke all on function public.manari_esic_add_days(date,integer),public.manari_esic_due_date(timestamptz) from public,anon;
grant execute on function public.manari_esic_add_days(date,integer),public.manari_esic_due_date(timestamptz) to authenticated;

create function manari_esic_private.prepare_request() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.module='esic' then
  new.due_date:=public.manari_esic_due_date(new.created_at);new.extended_at:=null;new.extension_reason:=null;new.response_by:=null;new.response_read_at:=null;new.response_outcome:=null;
 end if;return new;
end $$;
revoke all on function manari_esic_private.prepare_request() from public,anon,authenticated;
create trigger esic_prepare_request before insert on public.manari_digital_requests for each row execute function manari_esic_private.prepare_request();

create function manari_esic_private.request_mail() returns trigger language plpgsql security definer set search_path='' as $$
declare kind text;key text;
begin
 if new.module<>'esic' then return new;end if;
 if tg_op='INSERT' then kind:='criado';key:=new.id::text||':criado';
 elsif new.responded_at is distinct from old.responded_at and new.responded_at is not null then kind:='respondido';key:=new.id::text||':respondido:'||new.responded_at::text;
 elsif new.extended_at is distinct from old.extended_at and new.extended_at is not null then kind:='prorrogado';key:=new.id::text||':prorrogado';
 elsif new.department is distinct from old.department and new.department is not null then kind:='encaminhado';key:=new.id::text||':encaminhado:'||new.updated_at::text;
 else return new;end if;
 insert into public.manari_digital_mail_queue(request_id,citizen_id,protocol,event,dedupe_key) values(new.id,new.citizen_id,new.protocol,kind,key) on conflict(dedupe_key) do nothing;
 return new;
end $$;
revoke all on function manari_esic_private.request_mail() from public,anon,authenticated;
create trigger esic_request_mail after insert or update on public.manari_digital_requests for each row execute function manari_esic_private.request_mail();

create function public.manari_esic_extend(p_request uuid,p_reason text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare r public.manari_digital_requests%rowtype;s manari_esic_private.settings%rowtype;d date;
begin
 if auth.uid() is null or not public.is_portal_admin() then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 if char_length(btrim(coalesce(p_reason,''))) not between 10 and 2000 then raise exception 'Justifique a prorrogação com 10 a 2000 caracteres' using errcode='22023';end if;
 select * into r from public.manari_digital_requests where id=p_request and module='esic' for update;
 if not found then raise exception 'Protocolo não encontrado' using errcode='P0002';end if;
 if r.status not in ('recebido','em_analise') or r.extended_at is not null then raise exception 'Este pedido não pode ser prorrogado' using errcode='22023';end if;
 d:=coalesce(r.due_date,public.manari_esic_due_date(r.created_at));
 if (now() at time zone 'America/Sao_Paulo')::date>d then raise exception 'O prazo já venceu; registre o atendimento sem prorrogação retroativa' using errcode='22023';end if;
 select * into strict s from manari_esic_private.settings;
 -- The extension is measured from the original unadjusted deadline, not from a weekend rollover.
 d:=public.manari_esic_add_days((r.created_at at time zone 'America/Sao_Paulo')::date,s.response_days+s.extension_days);
 update public.manari_digital_requests set due_date=d,extended_at=now(),extension_reason=btrim(p_reason),updated_at=now() where id=p_request;
 insert into public.manari_esic_events(request_id,actor_id,event_type,details) values(p_request,auth.uid(),'prorrogado','Novo prazo: '||to_char(d,'DD/MM/YYYY')||'. Justificativa: '||btrim(p_reason));
 return jsonb_build_object('due_date',d);
end $$;

create or replace function public.manari_digital_admin_action(p_request uuid,p_action text,p_department text default null,p_response text default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare r public.manari_digital_requests%rowtype;n public.manari_digital_requests%rowtype;v_actor uuid;
begin
 v_actor:=auth.uid();if v_actor is null or not public.is_portal_admin() then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 if p_action is null or p_action not in ('encaminhar','responder','arquivar','reabrir') then raise exception 'Ação inválida' using errcode='22023';end if;
 select * into r from public.manari_digital_requests where id=p_request and module='esic' for update;
 if not found then raise exception 'Protocolo não encontrado' using errcode='P0002';end if;
 if p_action='encaminhar' then
  if r.status not in ('recebido','em_analise') or nullif(btrim(p_department),'') is null or length(p_department)>120 then raise exception 'Encaminhamento inválido' using errcode='22023';end if;
  update public.manari_digital_requests set department=btrim(p_department),status='em_analise',updated_at=now() where id=p_request returning * into n;
 elsif p_action='responder' then
  if r.status not in ('recebido','em_analise') or char_length(btrim(coalesce(p_response,'')))<10 or char_length(p_response)>10000 then raise exception 'Resposta inválida' using errcode='22023';end if;
  update public.manari_digital_requests set response_text=btrim(p_response),responded_at=clock_timestamp(),response_by=v_actor,response_read_at=null,response_outcome='informacao',status='respondido',updated_at=now() where id=p_request returning * into n;
 elsif p_action='arquivar' then
  if r.status<>'respondido' then raise exception 'Apenas respondidos podem ser arquivados' using errcode='22023';end if;
  update public.manari_digital_requests set status='arquivado',updated_at=now() where id=p_request returning * into n;
 else
  if r.status not in ('respondido','arquivado') then raise exception 'Apenas concluídos podem ser reabertos' using errcode='22023';end if;
  if exists(select 1 from public.manari_digital_appeals where request_id=p_request and status='pendente') then raise exception 'Há recurso pendente; conclua a análise recursal antes de reabrir' using errcode='22023';end if;
  update public.manari_digital_requests set status='em_analise',updated_at=now() where id=p_request returning * into n;
 end if;
 insert into public.manari_digital_events(request_id,actor_id,event_type,details) values(p_request,v_actor,case p_action when 'encaminhar' then 'encaminhado' when 'responder' then 'respondido' when 'arquivar' then 'arquivado' else 'reaberto' end,case when p_action='encaminhar' then 'Setor: '||n.department else '' end);
 return jsonb_build_object('id',n.id,'protocol',n.protocol,'status',n.status,'department',n.department,'updated_at',n.updated_at);
end $$;

create function public.manari_esic_acknowledge(p_request uuid,p_response_at timestamptz,p_appeal uuid default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare r public.manari_digital_requests%rowtype;a public.manari_digital_appeals%rowtype;t timestamptz;days integer;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta' using errcode='42501';end if;
 select * into r from public.manari_digital_requests where id=p_request and citizen_id=auth.uid() and module='esic' for update;
 if not found then raise exception 'Protocolo não encontrado' using errcode='42501';end if;
 select appeal_days into days from manari_esic_private.settings;
 if p_appeal is null then
  if r.responded_at is null or r.responded_at is distinct from p_response_at or r.status not in ('respondido','arquivado') then raise exception 'Atualize o protocolo antes de consultar a resposta' using errcode='22023';end if;
  t:=coalesce(r.response_read_at,now());
  if r.response_read_at is null then
   update public.manari_digital_requests set response_read_at=t where id=r.id;
   insert into public.manari_esic_events(request_id,actor_id,event_type,details) values(r.id,auth.uid(),'ciencia','Cidadão consultou a resposta.');
  end if;
 else
  select * into a from public.manari_digital_appeals where id=p_appeal and request_id=r.id and citizen_id=auth.uid() for update;
  if not found or a.status<>'decidido' or a.decided_at is distinct from p_response_at then raise exception 'Decisão indisponível ou alterada; atualize a página' using errcode='22023';end if;
  t:=coalesce(a.read_at,now());update public.manari_digital_appeals set read_at=t where id=a.id;
 end if;
 return jsonb_build_object('read_at',t,'appeal_deadline',public.manari_esic_add_days((t at time zone 'America/Sao_Paulo')::date,days));
end $$;

create function public.manari_esic_appeal(p_request uuid,p_reason text,p_level integer default 1,p_response_at timestamptz default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare r public.manari_digital_requests%rowtype;a public.manari_digital_appeals%rowtype;prev public.manari_digital_appeals%rowtype;s manari_esic_private.settings%rowtype;t timestamptz;d date;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta' using errcode='42501';end if;
 if char_length(btrim(coalesce(p_reason,''))) not between 10 and 10000 then raise exception 'Fundamente o recurso com 10 a 10000 caracteres' using errcode='22023';end if;
 select * into r from public.manari_digital_requests where id=p_request and citizen_id=auth.uid() and module='esic' for update;
 if not found then raise exception 'Protocolo não encontrado' using errcode='42501';end if;
 select * into strict s from manari_esic_private.settings;
 if p_response_at is distinct from r.responded_at then raise exception 'A resposta mudou; atualize o protocolo antes de recorrer' using errcode='22023';end if;
 if p_level is null or p_level<1 or p_level>s.appeal_levels or r.status not in ('respondido','arquivado') or r.responded_at is null then raise exception 'Recurso indisponível para este protocolo ou instância' using errcode='22023';end if;
 if p_level=1 then t:=r.response_read_at;
 else
  select * into prev from public.manari_digital_appeals where request_id=r.id and source_response_at=r.responded_at and level=p_level-1;
  if not found or prev.status<>'decidido' then raise exception 'Aguarde a decisão da instância anterior' using errcode='22023';end if;t:=prev.read_at;
 end if;
 if t is null then raise exception 'Consulte a resposta ou a decisão antes de apresentar o recurso' using errcode='22023';end if;
 d:=public.manari_esic_add_days((t at time zone 'America/Sao_Paulo')::date,s.appeal_days);
 if (now() at time zone 'America/Sao_Paulo')::date>d then raise exception 'O prazo para apresentar este recurso encerrou em %',to_char(d,'DD/MM/YYYY') using errcode='22023';end if;
 insert into public.manari_digital_appeals(request_id,citizen_id,source_response_at,level,reason,due_date)
 values(r.id,auth.uid(),r.responded_at,p_level,btrim(p_reason),public.manari_esic_add_days((now() at time zone 'America/Sao_Paulo')::date,s.decision_days)) returning * into a;
 insert into public.manari_digital_events(request_id,actor_id,event_type,details) values(r.id,auth.uid(),'recurso','Recurso registrado na instância '||p_level||'.');
 return to_jsonb(a);
exception when unique_violation then raise exception 'Já existe um recurso nesta instância para esta resposta' using errcode='22023';
end $$;

create function public.manari_esic_decide(p_appeal uuid,p_decision text,p_outcome text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare a public.manari_digital_appeals%rowtype;r public.manari_digital_requests%rowtype;s manari_esic_private.settings%rowtype;prior_actor uuid;
begin
 if auth.uid() is null or not public.is_portal_admin() then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 if char_length(btrim(coalesce(p_decision,''))) not between 10 and 10000 or p_outcome is null or p_outcome not in ('mantida','revisada') then raise exception 'Informe a decisão e o resultado do recurso' using errcode='22023';end if;
 -- Lock parent before appeal, matching acknowledgement and filing lock order.
 select r0.* into r from public.manari_digital_requests r0 join public.manari_digital_appeals a0 on a0.request_id=r0.id where a0.id=p_appeal for update of r0;
 if not found then raise exception 'Recurso não encontrado' using errcode='P0002';end if;
 select * into a from public.manari_digital_appeals where id=p_appeal for update;
 select * into strict s from manari_esic_private.settings;
 if s.reviewers[a.level] is null or s.reviewers[a.level]<>auth.uid() then raise exception 'A autoridade desta instância ainda não foi designada para esta conta' using errcode='42501';end if;
 if a.level=1 then prior_actor:=r.response_by;else select decided_by into prior_actor from public.manari_digital_appeals where request_id=r.id and source_response_at=a.source_response_at and level=a.level-1;end if;
 if prior_actor=auth.uid() then raise exception 'A decisão deve ser feita por autoridade diferente de quem proferiu a resposta recorrida' using errcode='42501';end if;
 if a.status<>'pendente' then raise exception 'Este recurso já foi decidido' using errcode='22023';end if;
 update public.manari_digital_appeals set status='decidido',decision=btrim(p_decision),outcome=p_outcome,decided_by=auth.uid(),decided_at=clock_timestamp() where id=a.id returning * into a;
 insert into public.manari_esic_events(request_id,actor_id,event_type,details) values(r.id,auth.uid(),'recurso_decidido','Decisão registrada na instância '||a.level||'. Resultado: '||p_outcome||'.');
 return to_jsonb(a);
end $$;

create function manari_esic_private.appeal_mail() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.manari_digital_requests%rowtype;kind text;
begin
 if tg_op='INSERT' then kind:='recurso';elsif new.status='decidido' and old.status<>'decidido' then kind:='recurso_decidido';else return new;end if;
 select * into r from public.manari_digital_requests where id=new.request_id;
 insert into public.manari_digital_mail_queue(request_id,citizen_id,protocol,event,dedupe_key) values(r.id,r.citizen_id,r.protocol,kind,new.id::text||':'||kind) on conflict(dedupe_key) do nothing;return new;
end $$;
revoke all on function manari_esic_private.appeal_mail() from public,anon,authenticated;
create trigger esic_appeal_mail after insert or update on public.manari_digital_appeals for each row execute function manari_esic_private.appeal_mail();

create function public.manari_esic_snapshot(p_requests uuid[] default '{}') returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare s manari_esic_private.settings%rowtype;v_admin boolean;v_mail boolean;v_ids uuid[];
begin
 if auth.uid() is null then raise exception 'Entre na sua conta' using errcode='42501';end if;
 if coalesce(cardinality(p_requests),0)>150 then raise exception 'Muitos protocolos' using errcode='22023';end if;
 v_admin:=public.is_portal_admin();select * into strict s from manari_esic_private.settings;
 select array_agg(id) into v_ids from public.manari_digital_requests where id=any(p_requests) and module='esic' and (citizen_id=auth.uid() or v_admin);
 v_mail:=exists(select 1 from vault.secrets where name='manari_esic_smtp_password');
 return jsonb_build_object('today',(now() at time zone 'America/Sao_Paulo')::date,'server_time',now(),
  'settings',jsonb_build_object('response_days',s.response_days,'extension_days',s.extension_days,'appeal_days',s.appeal_days,'decision_days',s.decision_days,'appeal_levels',s.appeal_levels,'roll_weekends',s.roll_weekends,'mail_ready',v_mail,'responsible_configured',s.responsible_id is not null,'reviewers_configured',to_jsonb(array(select v is not null from unnest(s.reviewers) v))),
  'requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'due_date',coalesce(r.due_date,public.manari_esic_due_date(r.created_at)),'extended_at',r.extended_at,'extension_reason',r.extension_reason,'response_read_at',r.response_read_at,'response_by',case when v_admin then r.response_by else null end,'appeal_deadline',case when r.response_read_at is not null then public.manari_esic_add_days((r.response_read_at at time zone 'America/Sao_Paulo')::date,s.appeal_days) else null end)) from public.manari_digital_requests r where r.id=any(v_ids)),'[]'::jsonb),
  'appeals',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('protocol',r.protocol,'subject',r.subject,'may_decide',v_admin and s.reviewers[a.level]=auth.uid() and auth.uid() is distinct from case when a.level=1 then r.response_by else (select a2.decided_by from public.manari_digital_appeals a2 where a2.request_id=a.request_id and a2.source_response_at=a.source_response_at and a2.level=a.level-1) end,'next_deadline',case when a.read_at is not null then public.manari_esic_add_days((a.read_at at time zone 'America/Sao_Paulo')::date,s.appeal_days) else null end) order by a.created_at desc) from (select * from public.manari_digital_appeals where (request_id=any(v_ids) or v_admin) and (citizen_id=auth.uid() or v_admin) order by created_at desc limit 100) a join public.manari_digital_requests r on r.id=a.request_id),'[]'::jsonb),
  'mail',coalesce((select jsonb_agg(jsonb_build_object('request_id',q.request_id,'event',q.event,'state',q.state,'created_at',q.created_at,'sent_at',q.sent_at)) from (select distinct on (request_id) * from public.manari_digital_mail_queue where request_id=any(v_ids) order by request_id,created_at desc) q),'[]'::jsonb),
  'email_enabled',coalesce((select email_enabled from public.manari_esic_preferences where citizen_id=auth.uid()),true),
  'administration',case when v_admin then jsonb_build_object('responsible_id',s.responsible_id,'reviewers',s.reviewers,'holidays',s.holidays,'smtp_login',s.smtp_login,'sender_email',s.sender_email,'mail_pending',(select count(*) from public.manari_digital_mail_queue where state in ('pendente','enviando')),'mail_failed',(select count(*) from public.manari_digital_mail_queue where state='falhou'),'last_test',(select jsonb_build_object('state',state,'created_at',created_at,'sent_at',sent_at,'error_code',error_code) from public.manari_digital_mail_queue where citizen_id=auth.uid() and event='teste' order by created_at desc limit 1),'operators',(select jsonb_agg(jsonb_build_object('id',p.user_id,'name',coalesce(nullif(p.full_name,''),u.email))) from public.portal_staff_members p join auth.users u on u.id=p.user_id where p.active and p.role='admin')) else null end);
end $$;

create function public.manari_esic_configure(p_config jsonb) returns void language plpgsql security definer set search_path='' as $$
declare s manari_esic_private.settings%rowtype;v_id uuid;ids uuid[];dates date[];
begin
 if auth.uid() is null or not public.is_portal_admin() then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 select * into strict s from manari_esic_private.settings for update;
 if jsonb_typeof(p_config)<>'object' then raise exception 'Configuração inválida' using errcode='22023';end if;
 select coalesce(array_agg(case when value='' then null else value::uuid end order by ord),'{}') into ids from jsonb_array_elements_text(coalesce(p_config->'reviewers','[]')) with ordinality a(value,ord);
 if cardinality(ids)>3 then raise exception 'Máximo de três instâncias' using errcode='22023';end if;
 v_id:=nullif(p_config->>'responsible_id','')::uuid;
 if exists(select 1 from unnest(array_append(ids,v_id)) v where v is not null and not exists(select 1 from public.portal_staff_members where user_id=v and active and role='admin')) then raise exception 'Escolha contas administrativas ativas' using errcode='22023';end if;
 select coalesce(array_agg(value::date),'{}') into dates from jsonb_array_elements_text(coalesce(p_config->'holidays','[]'));
 if cardinality(dates)>500 then raise exception 'Calendário excede 500 datas' using errcode='22023';end if;
 update manari_esic_private.settings set response_days=(p_config->>'response_days')::integer,extension_days=(p_config->>'extension_days')::integer,appeal_days=(p_config->>'appeal_days')::integer,decision_days=(p_config->>'decision_days')::integer,appeal_levels=(p_config->>'appeal_levels')::integer,roll_weekends=(p_config->>'roll_weekends')::boolean,responsible_id=v_id,reviewers=ids,holidays=dates,updated_at=now();
end $$;

create function public.manari_esic_email_preference(p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_enabled is null then raise exception 'Preferência inválida' using errcode='42501';end if;
 insert into public.manari_esic_preferences(citizen_id,email_enabled) values(auth.uid(),p_enabled) on conflict(citizen_id) do update set email_enabled=excluded.email_enabled;
end $$;

-- Mail credentials are only written by an administrator and read by the service worker.
create function public.manari_esic_mail_configure(p_password text,p_login text,p_sender text) returns void language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not public.is_portal_admin() then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 if p_login is null or p_login !~ '^[A-Za-z0-9._+%-]+@smtp-brevo.com$' or char_length(p_login)>254 or p_sender is null or p_sender !~ '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}$' or char_length(p_sender)>254 then raise exception 'Login SMTP ou remetente inválido' using errcode='22023';end if;
 if p_password is not null then
  if p_password ~ '[[:space:]]' or char_length(p_password) not between 15 and 128 then raise exception 'Cole a chave SMTP completa, sem espaços' using errcode='22023';end if;
  select id into v_id from vault.secrets where name='manari_esic_smtp_password';
  if v_id is null then perform vault.create_secret(p_password,'manari_esic_smtp_password');else perform vault.update_secret(v_id,p_password);end if;
 end if;
 update manari_esic_private.settings set smtp_login=p_login,sender_email=p_sender,updated_at=now();
end $$;

revoke all on function public.manari_esic_extend(uuid,text),public.manari_esic_acknowledge(uuid,timestamptz,uuid),public.manari_esic_appeal(uuid,text,integer,timestamptz),public.manari_esic_decide(uuid,text,text),public.manari_esic_snapshot(uuid[]),public.manari_esic_configure(jsonb),public.manari_esic_email_preference(boolean),public.manari_esic_mail_configure(text,text,text) from public,anon;
grant execute on function public.manari_esic_extend(uuid,text),public.manari_esic_acknowledge(uuid,timestamptz,uuid),public.manari_esic_appeal(uuid,text,integer,timestamptz),public.manari_esic_decide(uuid,text,text),public.manari_esic_snapshot(uuid[]),public.manari_esic_configure(jsonb),public.manari_esic_email_preference(boolean),public.manari_esic_mail_configure(text,text,text) to authenticated;

-- Dedicated worker token is generated server-side and never returned to browsers.
select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'manari_esic_job_token');
create function public.manari_esic_mail_test() returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not public.is_portal_admin() then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 if not exists(select 1 from vault.secrets where name='manari_esic_smtp_password') then raise exception 'Configure a chave SMTP antes do teste' using errcode='22023';end if;
 if exists(select 1 from public.manari_digital_mail_queue where citizen_id=auth.uid() and event='teste' and created_at>now()-interval '2 minutes') then raise exception 'Aguarde dois minutos antes de repetir o teste' using errcode='22023';end if;
 insert into public.manari_digital_mail_queue(citizen_id,protocol,event,dedupe_key) values(auth.uid(),'TESTE-ENVIO','teste',gen_random_uuid()::text) returning id into v_id;return v_id;
end $$;
revoke all on function public.manari_esic_mail_test() from public,anon;
grant execute on function public.manari_esic_mail_test() to authenticated;

create function public.manari_esic_mail_runtime(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s manari_esic_private.settings%rowtype;v_token text;v_pass text;
begin
 select decrypted_secret into v_token from vault.decrypted_secrets where name='manari_esic_job_token';
 if p_token is null or extensions.digest(p_token,'sha256') is distinct from extensions.digest(v_token,'sha256') then raise exception 'Não autorizado' using errcode='42501';end if;
 select * into strict s from manari_esic_private.settings;
 select decrypted_secret into v_pass from vault.decrypted_secrets where name='manari_esic_smtp_password';
 return jsonb_build_object('ready',v_pass is not null,'host','smtp-relay.brevo.com','port',587,'login',s.smtp_login,'password',v_pass,'sender',s.sender_email);
end $$;
create function public.manari_esic_mail_claim() returns jsonb language plpgsql security definer set search_path='' as $$
declare available integer;result jsonb;
begin
 -- Serialize quota reservations across concurrent cron invocations.
 perform pg_advisory_xact_lock(786327419);
 update public.manari_digital_mail_queue q set state='ignorado',error_code='preferencia_desativada' where q.state='pendente' and q.event<>'teste' and exists(select 1 from public.manari_esic_preferences p where p.citizen_id=q.citizen_id and not p.email_enabled);
 update public.manari_digital_mail_queue set state=case when attempts>=5 then 'falhou' else 'pendente' end,lease_until=null,lease_token=null,error_code='tempo_esgotado' where state='enviando' and lease_until<now();
 select greatest(0,250-count(*)::integer) into available from public.manari_digital_mail_queue where state='enviando' or (state='enviado' and (sent_at at time zone 'America/Sao_Paulo')::date=(now() at time zone 'America/Sao_Paulo')::date);
 with picked as (
  select q.id from public.manari_digital_mail_queue q join auth.users u on u.id=q.citizen_id where q.state='pendente' and q.attempts<5 and q.next_attempt_at<=now() and u.email_confirmed_at is not null and u.email is not null order by q.created_at limit least(5,available) for update of q skip locked
 ), claimed as (
  update public.manari_digital_mail_queue q set state='enviando',attempts=attempts+1,lease_until=now()+interval '3 minutes',lease_token=gen_random_uuid() from picked where q.id=picked.id returning q.*
 ) select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'token',c.lease_token,'email',u.email,'protocol',c.protocol,'event',c.event)),'[]'::jsonb) into result from claimed c join auth.users u on u.id=c.citizen_id;
 return result;
end $$;
create function public.manari_esic_mail_finish(p_id uuid,p_token uuid,p_sent boolean,p_error text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if p_sent is null or (not p_sent and p_error not in ('smtp_auth','smtp_rejected','network','provider')) then raise exception 'Resultado inválido' using errcode='22023';end if;
 update public.manari_digital_mail_queue set state=case when p_sent then 'enviado' when attempts>=5 then 'falhou' else 'pendente' end,sent_at=case when p_sent then now() else null end,error_code=case when p_sent then null else coalesce(p_error,'provider') end,next_attempt_at=now()+make_interval(mins=>least(360,5*(2^attempts)::integer)),lease_until=null,lease_token=null where id=p_id and state='enviando' and lease_token=p_token;
 get diagnostics n=row_count;return n=1;
end $$;
revoke all on function public.manari_esic_mail_runtime(text),public.manari_esic_mail_claim(),public.manari_esic_mail_finish(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.manari_esic_mail_runtime(text),public.manari_esic_mail_claim(),public.manari_esic_mail_finish(uuid,uuid,boolean,text) to service_role;

create extension if not exists pg_net with schema extensions;
create function manari_esic_private.dispatch_mail() returns bigint language plpgsql security definer set search_path='' as $$
declare token text;request_id bigint;
begin
 if not exists(select 1 from vault.secrets where name='manari_esic_smtp_password') then return null;end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='manari_esic_job_token';
 select net.http_post(url:='https://dxvqiiawthxwkypvsxci.supabase.co/functions/v1/manari-esic-mailer',headers:=jsonb_build_object('Content-Type','application/json','X-Esic-Job',token),body:='{}'::jsonb,timeout_milliseconds:=55000) into request_id;
 return request_id;
end $$;
revoke all on function manari_esic_private.dispatch_mail() from public,anon,authenticated;
select cron.schedule('manari-esic-mailer','* * * * *','select manari_esic_private.dispatch_mail()');

create or replace function public.manari_digital_admin_dashboard(
 p_date_from date default null,p_date_to date default null,
 p_department text default null,p_status text default null,
 p_page integer default 1,p_page_size integer default 25
) returns jsonb language plpgsql stable security invoker set search_path='' as $function$
declare v_from timestamptz;v_until timestamptz;
begin
 if auth.uid() is null or not public.is_portal_admin() then
  raise exception 'Acesso administrativo não autorizado' using errcode='42501';
 end if;
 if p_page is null or p_page<1 or p_page>1000000 or p_page_size is null or p_page_size<1 or p_page_size>100 then
  raise exception 'Página inválida' using errcode='22023';
 end if;
 if p_date_from is not null and p_date_to is not null and p_date_from>p_date_to then
  raise exception 'A data inicial deve ser anterior à data final' using errcode='22023';
 end if;
 if p_status is not null and p_status not in ('recebido','em_analise','respondido','arquivado') then
  raise exception 'Situação inválida' using errcode='22023';
 end if;
 if p_department is not null and p_department not in ('__unassigned__','__other__')
  and not exists(select 1 from public.portal_departments where code=p_department) then
  raise exception 'Secretaria inválida' using errcode='22023';
 end if;
 v_from:=p_date_from::timestamp at time zone 'America/Sao_Paulo';
 v_until:=(p_date_to+1)::timestamp at time zone 'America/Sao_Paulo';
 return (
  with filtered as materialized (
   select r.*,coalesce(r.due_date,public.manari_esic_due_date(r.created_at)) as effective_due_date from public.manari_digital_requests r
   where r.module='esic'
    and (v_from is null or r.created_at>=v_from)
    and (v_until is null or r.created_at<v_until)
    and (p_status is null or r.status=p_status)
    and (p_department is null
     or (p_department='__unassigned__' and r.requested_department_code is null and r.requested_department_other is null)
     or (p_department='__other__' and r.requested_department_other is not null)
     or r.requested_department_code=p_department)
  ), totals as (
   select count(*) as total,
    count(*) filter(where status in ('recebido','em_analise')) as open,
    count(*) filter(where status='respondido') as answered,
    count(*) filter(where status='arquivado') as archived,
    count(*) filter(where status in ('recebido','em_analise') and effective_due_date<(now() at time zone 'America/Sao_Paulo')::date) as overdue,
    count(*) filter(where status in ('recebido','em_analise') and effective_due_date between (now() at time zone 'America/Sao_Paulo')::date and (now() at time zone 'America/Sao_Paulo')::date+3) as due_soon
   from filtered
  ), grouped as (
   select case when f.requested_department_other is not null then '__other__' else f.requested_department_code end as code,
    case when f.requested_department_other is not null then 'Outros / Não sei qual secretaria' else coalesce(d.name,'Secretaria não informada') end as name,count(*) as open
   from filtered f left join public.portal_departments d on d.code=f.requested_department_code
   where f.status in ('recebido','em_analise')
   group by 1,2
  ), page_rows as (
   select * from filtered order by created_at desc,id desc
   limit p_page_size offset ((p_page-1)::bigint*p_page_size)
  )
  select jsonb_build_object(
   'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc) from page_rows r),'[]'::jsonb),
   'total',t.total,'page',p_page,'page_size',p_page_size,
   'totals',to_jsonb(t),
   'departments',coalesce((select jsonb_agg(to_jsonb(g) order by g.open desc,g.name) from grouped g),'[]'::jsonb)
  ) from totals t
 );
end $function$;
revoke all on function public.manari_digital_admin_dashboard(date,date,text,text,integer,integer) from public,anon;
grant execute on function public.manari_digital_admin_dashboard(date,date,text,text,integer,integer) to authenticated;
