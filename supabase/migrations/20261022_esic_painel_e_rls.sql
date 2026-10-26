-- e-SIC Manari — revisão de permissões + fila de atendimento (SOMENTE homologação)
-- Este script corrige a checagem ambígua/recursiva das políticas anteriores.
-- Depende das migrações anteriores; requer revisão e testes antes de produção.

create or replace function esic.pode_ler_pedido(p_requerente uuid,p_unidade uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select auth.uid() is not null and (
    p_requerente=auth.uid()
    or exists(
      select 1 from esic.servidores s
      where s.usuario_id=auth.uid() and s.ativo
       and (
         s.papel='administrador'
         or (s.papel='gestor' and (s.unidade_id=p_unidade or p_unidade is null))
         or (s.papel='atendente' and s.unidade_id=p_unidade)
       )
    )
  );
$$;

-- Self-reference on esic.pedidos in policies is replaced by isolated helper.
drop policy if exists pedidos_ler on esic.pedidos;
create policy pedidos_ler on esic.pedidos for select to authenticated
  using (esic.pode_ler_pedido(requerente_id,unidade_id));

drop policy if exists interacoes_ler on esic.interacoes;
create policy interacoes_ler on esic.interacoes for select to authenticated using (
  exists (
    select 1 from esic.pedidos p
    where p.id=pedido_id and
      (esic.pode_ler_pedido(p.requerente_id,p.unidade_id))
      and (visivel_ao_cidadao or p.requerente_id<>auth.uid())
  )
  or exists (select 1 from esic.servidores s
    join esic.pedidos p on p.id=pedido_id
    where s.usuario_id=auth.uid() and s.ativo and
      (s.papel='administrador' or
      (s.papel='gestor' and (s.unidade_id=p.unidade_id or p.unidade_id is null))
      or (s.papel='atendente' and s.unidade_id=p.unidade_id)))
);
-- Note: RLS policy above checks visibility for citizens, and grants internal records
-- only to authorized staff. The explicit second staff branch is intentional.

drop policy if exists recursos_ler on esic.recursos;
create policy recursos_ler on esic.recursos for select to authenticated using (
  recorrente_id=auth.uid()
  or exists (
    select 1 from esic.pedidos p
    join esic.servidores s on s.usuario_id=auth.uid() and s.ativo
    where p.id=pedido_id and (
      s.papel='administrador'
      or (s.papel='gestor' and (s.unidade_id=p.unidade_id or p.unidade_id is null))
      or (s.papel='atendente' and s.unidade_id=p.unidade_id)
    )
  )
);

-- Informações privadas de resposta e usuário nunca entram nos relatórios públicos.
create or replace function public.esic_fila_atendimento()
returns table(
 id uuid, protocolo bigint, assunto text, situacao text,
 unidade_id uuid, criado_em timestamptz, atualizado_em timestamptz
)
language plpgsql stable security definer set search_path=''
as $$
begin
 if not exists(select 1 from esic.servidores s where s.usuario_id=auth.uid() and s.ativo)
 then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 return query
 select p.id,p.numero_protocolo,p.assunto,p.status::text,
        p.unidade_id,p.criado_em,p.atualizado_em
 from esic.pedidos p
 where exists(
   select 1 from esic.servidores s where s.usuario_id=auth.uid() and s.ativo
   and (s.papel='administrador'
     or (s.papel='gestor' and (s.unidade_id=p.unidade_id or p.unidade_id is null))
     or (s.papel='atendente' and s.unidade_id=p.unidade_id))
 )
 order by p.criado_em asc
 limit 200;
end;
$$;
revoke all on function public.esic_fila_atendimento() from public,anon;
grant execute on function public.esic_fila_atendimento() to authenticated;

-- Bloquear execução das funções helper por usuários não autenticados.
revoke all on function esic.pode_ler_pedido(uuid,uuid) from public,anon;
grant execute on function esic.pode_ler_pedido(uuid,uuid) to authenticated;
-- A schema esic só pode ser consultada via políticas autorizadas, caso seja exposta na API.
grant usage on schema esic to authenticated;
grant select on esic.unidades,esic.servidores,esic.pedidos,esic.interacoes,esic.recursos to authenticated;
revoke all on esic.auditoria from authenticated,anon;
revoke insert,update,delete on esic.unidades,esic.servidores,esic.pedidos,esic.interacoes,esic.recursos from authenticated,anon;
