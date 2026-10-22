-- e-SIC Manari: endpoints transacionais iniciais para Supabase Auth
-- DEPENDÊNCIA: 20261022_esic_base.sql; rodar somente em homologação.
-- A política de prazos deve ser parametrizada após validação da regulamentação local.

-- Evita que servidores de uma secretaria vejam indiscriminadamente os pedidos de outras.
drop policy if exists pedidos_ler on esic.pedidos;
create policy pedidos_ler on esic.pedidos for select to authenticated using (
  requerente_id = (select auth.uid())
  or exists (
    select 1 from esic.servidores s
    where s.usuario_id = (select auth.uid()) and s.ativo
      and (s.papel = 'administrador' or
        (s.papel = 'gestor' and (s.unidade_id = unidade_id or unidade_id is null))
        or (s.papel = 'atendente' and s.unidade_id = unidade_id))
  )
);
drop policy if exists interacoes_ler on esic.interacoes;
create policy interacoes_ler on esic.interacoes for select to authenticated using (
  exists (select 1 from esic.pedidos p where p.id = pedido_id and p.requerente_id = (select auth.uid()) and visivel_ao_cidadao)
  or exists (
    select 1 from esic.pedidos p
    join esic.servidores s on s.usuario_id = (select auth.uid()) and s.ativo
    where p.id = pedido_id and
       (s.papel = 'administrador' or (s.papel = 'gestor' and (s.unidade_id = p.unidade_id or p.unidade_id is null))
         or (s.papel = 'atendente' and s.unidade_id = p.unidade_id))
  )
);
drop policy if exists recursos_ler on esic.recursos;
create policy recursos_ler on esic.recursos for select to authenticated using (
  recorrente_id = (select auth.uid())
  or exists (select 1 from esic.pedidos p
    join esic.servidores s on s.usuario_id = (select auth.uid()) and s.ativo
    where p.id = pedido_id and
      (s.papel = 'administrador' or (s.papel = 'gestor' and (s.unidade_id = p.unidade_id or p.unidade_id is null))
       or (s.papel = 'atendente' and s.unidade_id = p.unidade_id)))
);

-- Um pedido é criado atomicamente com seu registro de auditoria.
create or replace function public.esic_abrir_pedido(p_assunto text, p_descricao text)
returns table(pedido_id uuid, protocolo bigint, registrado_em timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare v_pedido esic.pedidos%rowtype;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária' using errcode='28000'; end if;
  if char_length(trim(coalesce(p_assunto,''))) not between 5 and 200
   or char_length(trim(coalesce(p_descricao,''))) not between 10 and 10000 then
    raise exception 'Assunto ou descrição fora do tamanho permitido';
  end if;
  insert into esic.pedidos (requerente_id,assunto,descricao)
    values (auth.uid(),trim(p_assunto),trim(p_descricao)) returning * into v_pedido;
  insert into esic.auditoria(pedido_id,ator_id,acao)
    values (v_pedido.id,auth.uid(),'pedido_criado');
  return query select v_pedido.id, v_pedido.numero_protocolo, v_pedido.criado_em;
end;
$$;
revoke all on function public.esic_abrir_pedido(text,text) from public, anon;
grant execute on function public.esic_abrir_pedido(text,text) to authenticated;

-- Encaminhamento restrito à gestão do SIC; secretaria de destino deve estar ativa.
create or replace function public.esic_encaminhar_pedido(p_pedido uuid,p_unidade uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not exists(select 1 from esic.servidores where usuario_id=auth.uid()
    and ativo and papel in ('gestor','administrador')) then
     raise exception 'Acesso não autorizado' using errcode='42501';
  end if;
  if not exists(select 1 from esic.unidades where id=p_unidade and ativo) then
     raise exception 'Unidade inválida';
  end if;
  select id into v_id from esic.pedidos where id=p_pedido for update;
  if v_id is null then raise exception 'Pedido não encontrado'; end if;
  update esic.pedidos set unidade_id=p_unidade, status='encaminhado', atualizado_em=now()
  where id=v_id and status not in ('concluido');
  if not found then raise exception 'Pedido encerrado'; end if;
  insert into esic.auditoria(pedido_id,ator_id,acao,detalhes)
    values (v_id,auth.uid(),'encaminhado',pg_catalog.jsonb_build_object('unidade_id',p_unidade));
end;
$$;
revoke all on function public.esic_encaminhar_pedido(uuid,uuid) from public, anon;
grant execute on function public.esic_encaminhar_pedido(uuid,uuid) to authenticated;

-- Resposta oficial somente por servidor da unidade ou administrador.
create or replace function public.esic_responder_pedido(p_pedido uuid,p_resposta text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_pedido esic.pedidos%rowtype;
begin
  if char_length(trim(coalesce(p_resposta,''))) not between 10 and 15000 then
    raise exception 'Resposta fora do tamanho permitido';
  end if;
  select * into v_pedido from esic.pedidos where id=p_pedido for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if not exists(select 1 from esic.servidores s where s.usuario_id=auth.uid() and s.ativo
    and (s.papel='administrador' or
      (s.unidade_id=v_pedido.unidade_id and s.papel in ('atendente','gestor')))) then
    raise exception 'Acesso não autorizado' using errcode='42501';
  end if;
  if v_pedido.status in ('respondido','concluido') then
     raise exception 'Pedido já respondido ou encerrado';
  end if;
  insert into esic.interacoes(pedido_id,autor_id,tipo,conteudo,visivel_ao_cidadao)
    values (p_pedido,auth.uid(),'resposta_oficial',trim(p_resposta),true);
  update esic.pedidos set status='respondido', respondido_em=now(), atualizado_em=now() where id=p_pedido;
  insert into esic.auditoria(pedido_id,ator_id,acao) values(p_pedido,auth.uid(),'resposta_publicada');
end;
$$;
revoke all on function public.esic_responder_pedido(uuid,text) from public, anon;
grant execute on function public.esic_responder_pedido(uuid,text) to authenticated;

-- Proíbe login automático de funcionários via cadastro aberto:
-- inclusão/edição em esic.servidores continua sem políticas de escrita no navegador.
comment on function public.esic_abrir_pedido(text,text) is 'Registrar solicitação autenticada, com protocolo e auditoria.';
comment on function public.esic_responder_pedido(uuid,text) is 'Publicar resposta por equipe autorizada; usar somente após aprovação do fluxo de assinatura.';
