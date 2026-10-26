# e-SIC — testes manuais obrigatórios para homologação

Estado atual: scripts ainda não executados e interface demonstrativa sem ligação com contas reais.

## Casos para validar com dois cidadãos (A e B)
- [ ] A cria pedido, recebe protocolo numérico único e vê histórico.
- [ ] B não consegue obter detalhe do pedido de A mesmo conhecendo UUID/protocolo.
- [ ] Anônimo não consegue executar RPCs.
- [ ] Cidadão não altera status/unidade, cria resposta oficial ou autoatribui cargo.
- [ ] Resposta só aparece ao cidadão titular e após registro oficial.
- [ ] Atendente de secretaria X não lê pedidos atribuídos a secretaria Y.
- [ ] Administrador autorizado consegue encaminhar e auditar.
- [ ] Abertura rejeita textos inválidos; inputs tratados como dados.
- [ ] Migrações aplicam numa instância vazia sem erro e não afetam sistema existente.
- [ ] Testes de acessibilidade, idioma, responsividade e LGPD.
- [ ] Juridicamente validar prazos, negativa fundamentada, graus e admissibilidade de recursos.

## Bloqueios de produção
- Ausência de frontend web identificado
- Ausência de URL/instância Supabase de testes confirmada
- Recursos, prazos úteis/corridos e fluxo de notificação ainda não homologados
- Migração de histórico do e-SIC anterior não realizada
- Ausência de testes executados e aprovação formal da prefeitura

Não remover redirecionamentos existentes até a substituição ser verificada e aprovada.
