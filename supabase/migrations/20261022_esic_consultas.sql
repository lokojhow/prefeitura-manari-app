-- e-SIC: consulta segura e recurso de primeira instância (homologação).
-- Depende das migrações esic_base e esic_operacoes; NÃO rodar direto na produção.
-- Dados retornados somente ao titular autenticado; nunca usar número de protocolo como senha.

create or replace function public.esic_meus_pedidos()
returns table(id uuid, protocolo bigint, assunto text, situacao text, criado_em timestamptz, atualizado_em timestamptz)
language sql stable security definer set search_path = ''
as $$
 select p.id,p.numero_protocolo,p.assunto,p.status::text,p.criado_em,p.atualizado_em
 from esic.pedidos p
 where p.requerente_id=auth.uid()
 order by p.criado_em desc
 limit 200;
$$;
revoke all on function public.esic_meus_pedidos() from public, anon;
grant execute on function public.esic_meus_pedidos() to authenticated;

create or replace function public.esic_detalhe_pedido(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_detalhe jsonb;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária' using errcode='28000'; end if;
 select pg_catalog.jsonb_build_object(
   'id',p.id,'protocolo',p.numero_protocolo,'assunto',p.assunto,
   'descricao',p.descricao,'status',p.status,'criado_em',p.criado_em,
   'respondido_em',p.respondido_em,'interacoes',coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('tipo',i.tipo,'conteudo',i.conteudo,'criado_em',i.criado_em)
        order by i.criado_em
      ) from esic.interacoes i where i.pedido_id=p.id and i.visivel_ao_cidadao
   ),'[]'::jsonb))
 into v_detalhe from esic.pedidos p where p.id=p_id and p.requerente_id=auth.uid();
 if v_detalhe is null then raise exception 'Pedido não encontrado' using errcode='P0002'; end if;
 return v_detalhe;
end;
$$;
revoke all on function public.esic_detalhe_pedido(uuid) from public, anon;
grant execute on function public.esic_detalhe_pedido(uuid) to authenticated;

-- Recurso de primeira instância após resposta/indeferimento. Janela recursal,
-- competências e instâncias dependem de regulamentação municipal: esta função
-- é intencionalmente BLOQUEADA até configuração/aprovação do fluxo definitivo.
-- Não fornecer função RPC pública para recurso enquanto não validado.

-- Proteção adicional: bloquear INSERT direto de pedidos pelo cliente,
-- concentrando geração de protocolo no RPC esic_abrir_pedido.
drop policy if exists pedidos_criar on esic.pedidos;
