# Integração unificada do cidadão (sem ativação)

Criado `prototipos/esic-cidadao-integracao.js`. Este adaptador implementa exatamente o contrato da interface `esic-ui-controller.js`:
- `solicitar({assunto, descricao, nome, email})`
- `meusPedidos()`
- `detalhe(id)`

Ele compõe o cadastro por RPC autenticada e as consultas com filtro por `auth.uid()`. O padrão `homologado=false` bloqueia operações sem depender de interface ou domínio.

## Integração futura com o portal
O frontend web real deverá autenticar o cidadão, criar o cliente Supabase institucional e passar o serviço ao controlador. Não inserir credenciais `service_role` na interface.

## Condições antes de ativar
- Publicar e testar a RPC proposta `esic_criar_pedido_autenticado` em instância de homologação.
- Reconciliar a RLS/GRANT de `citizen_requests` para impedir acesso direto indevido e preservar Ouvidoria.
- Confirmar titularidade/identidade e privacidade de protocolos.
- Executar testes de permissões de múltiplas contas e testes end-to-end reais.
- Identificar o verdadeiro frontend web do portal para integração.

Nada neste commit aplica SQL em produção ou altera os serviços atuais.
