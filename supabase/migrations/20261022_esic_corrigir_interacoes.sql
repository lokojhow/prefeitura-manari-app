-- e-SIC Manari — correção de isolamento de interações
-- Migração incremental para homologação. Não aplicar em produção sem testes.
-- Cidadão vê SOMENTE interações visíveis vinculadas ao seu pedido;
-- servidor vê registros internos APENAS dos pedidos de sua unidade.
drop policy if exists interacoes_ler on esic.interacoes;
create policy interacoes_ler on esic.interacoes
for select to authenticated
using (
 (visivel_ao_cidadao and exists (
   select 1 from esic.pedidos p
   where p.id=pedido_id and p.requerente_id=auth.uid()
 ))
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

-- Para evitar leitura indevida de perfis via APIs, a leitura de
-- dados de servidores permanece limitada ao próprio usuário.
-- Reforçar testes com cidadão que também seja funcionário.
