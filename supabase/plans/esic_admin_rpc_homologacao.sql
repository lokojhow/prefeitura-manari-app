-- e-SIC Manari: proposta de operações administrativas sobre citizen_requests.
-- HOMOLOGAÇÃO APENAS. NÃO EXECUTAR EM PRODUÇÃO.
-- Pré-requisitos: retirar política staff_update excessiva em migração coordenada,
-- auditar privilégios de cidadão e validar a regulamentação municipal.

create table if not exists public.esic_historico_atendimento (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.citizen_requests(id) on delete restrict,
 actor_id uuid not null references auth.users(id),
 action text not null check (action in ('encaminhado','respondido')),
 previous_department text,
 new_department text,
 recorded_at timestamptz not null default now()
);
alter table public.esic_historico_atendimento enable row level security;
revoke all on public.esic_historico_atendimento from anon, authenticated;

-- SECURITY DEFINER estritamente necessário para registrar mudanças atômicas
-- e histórico protegido, sem conceder UPDATE geral à interface.
create or replace function public.esic_admin_encaminhar(p_id uuid,p_department text)
returns void language plpgsql security definer set search_path=''
as $$
declare v_req public.citizen_requests%rowtype;
begin
 if auth.uid() is null then raise exception 'Acesso negado' using errcode='42501'; end if;
 if not exists(
   select 1 from public.portal_staff_members s where s.user_id=auth.uid() and s.active
     and (s.role='admin' or (s.department='Ouvidoria e LAI' and 'esic'=any(s.modules)))
 ) then raise exception 'Acesso negado' using errcode='42501'; end if;
 if nullif(trim(p_department),'') is null or not exists(
   select 1 from public.portal_departments d where d.code=p_department and d.active
 ) then raise exception 'Setor inválido'; end if;
 select * into v_req from public.citizen_requests where id=p_id and request_type='esic' for update;
 if not found then raise exception 'Pedido não localizado'; end if;
 if v_req.status in ('respondido','arquivado') then raise exception 'Pedido encerrado'; end if;
 update public.citizen_requests set department=p_department,status='em_analise',updated_at=now() where id=p_id;
 insert into public.esic_historico_atendimento(request_id,actor_id,action,previous_department,new_department)
 values(p_id,auth.uid(),'encaminhado',v_req.department,p_department);
end; $$;
revoke all on function public.esic_admin_encaminhar(uuid,text) from public,anon;
grant execute on function public.esic_admin_encaminhar(uuid,text) to authenticated;

create or replace function public.esic_admin_responder(p_id uuid,p_resposta text)
returns void language plpgsql security definer set search_path=''
as $$
declare v_req public.citizen_requests%rowtype;
begin
 if auth.uid() is null then raise exception 'Acesso negado' using errcode='42501'; end if;
 if char_length(trim(coalesce(p_resposta,''))) not between 10 and 15000 then
  raise exception 'Resposta inválida'; end if;
 select * into v_req from public.citizen_requests where id=p_id and request_type='esic' for update;
 if not found then raise exception 'Pedido não localizado'; end if;
 if v_req.status in ('respondido','arquivado') then raise exception 'Pedido encerrado'; end if;
 if not exists(
  select 1 from public.portal_staff_members s
  where s.user_id=auth.uid() and s.active
   and (s.role='admin' or
      (s.department='Ouvidoria e LAI' and 'esic'=any(s.modules))
      or (s.department=v_req.department and 'esic'=any(s.modules)))
 ) then raise exception 'Acesso negado' using errcode='42501'; end if;
 update public.citizen_requests
  set response_text=trim(p_resposta),response_at=now(),status='respondido',updated_at=now()
  where id=p_id;
 insert into public.esic_historico_atendimento(request_id,actor_id,action,previous_department,new_department)
 values(p_id,auth.uid(),'respondido',v_req.department,v_req.department);
end; $$;
revoke all on function public.esic_admin_responder(uuid,text) from public,anon;
grant execute on function public.esic_admin_responder(uuid,text) to authenticated;

-- A implementação real precisa de teste independente da Ouvidoria, auditoria de
-- autorização, política de prazo, recursos e trilha mais completa (conteúdo assinado).
