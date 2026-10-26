# e-SIC Manari — fluxo consolidado e critérios de homologação

## Estados do fluxo
1. Cidadão autenticado registra solicitação e recebe protocolo.
2. Pedido inicia em `recebido`.
3. Servidor com permissão específica encaminha para `em_analise`.
4. Resposta fundamentada altera para `respondido`.
5. Arquivamento posterior, se regulamentado, altera para `arquivado`.

`prototipos/esic-fluxo.js` e `prototipos/esic-fluxo.test.mjs` oferecem validações puras para os campos do pedido e para transições. **Não atualizam o banco**. Não incluem o estado de recurso nem substituem auditoria no SQL. Recurso deve ser entidade separada com prazo, instância competente e decisão.

## Falta para publicação
- Resolver repositório do portal web efetivo (este repositório é wrapper Android/Capacitor).
- Homologar políticas RLS e RPCs no Supabase isolado, sem tocar no banco ativo.
- Corrigir vulnerabilidade atual de INSERT/UPDATE na `citizen_requests`.
- Criar anexos privados com autorização por pedido, análise de arquivos e retenção.
- Implementar recurso e prorrogação com fundamentação e legislação municipal.
- Testar fluxo completo com papéis cidadão, atendente e administrador.
- Migrar pedidos históricos do e-SIC antigo com autorização e reconciliação dos protocolos.
- Aceite formal da prefeitura antes de mudar menus/domínios públicos.

## Testes
O GitHub Actions executa `npm test` em `prototipos`. Seu resultado prova apenas contratos JS simulados, não segurança ou funcionamento real de políticas no banco.
