# Auditoria de autorização do e-SIC existente — 22/10/2026

Projeto Supabase **Manari conectado** inspecionado apenas em leitura.

## Achado de segurança
Tabela `public.citizen_requests` já serve Ouvidoria/e-SIC e contém dados identificadores dos requerentes. As políticas **`citizen_requests_staff_read`** e **`citizen_requests_staff_update`** atualmente condicionam o acesso somente à existência de registro **ativo** em `portal_staff_members`, sem verificação de secretaria, módulo ou competência. Isso significa que um funcionário autenticado ativo pode potencialmente ler/alterar solicitações de diferentes secretarias (a depender das concessões de tabela).

Além disso, a política de inserção contempla `anon` e `authenticated`: análise de abuso de protocolo, autenticação, integridade, spam e proteção de dados é necessária. Um pedido com `anonymous=true` é permitido somente para `request_type='ouvidoria'`.

Não exibir dados pessoais para diagnosticar. Nenhuma policy alterada no ambiente ativo.

## Correções antes de usar em produção
1. Confirmar papéis válidos (e.g. `role` e `modules`) e o significado exato de `department`; verificar autenticação administrativa.
2. Criar área de homologação ou migração reversível, com backup.
3. Restringir leitura por função e secretaria; assegurar anonimato/confidencialidade de denúncias, com direitos distintos de pedidos LAI.
4. Remover UPDATE indiscriminado via cliente e implementar RPC com whitelist de mudanças e auditoria imutável.
5. Revisar INSERT anônimo e regras contra abuso; usar autenticação sem exigir justificativa do pedido de informação.
6. Validar que cidadão A não consulta protocolo/cadastro de B.
7. Testar regressão da Ouvidoria antes de qualquer mudança.
8. Após testes, planejar ativação com reversão, sem desligar serviço externo prematuramente.

Arquivo de proposta sem execução: `supabase/plans/esic_hardening_citizen_requests.sql`.

**Nota:** scripts esic_*.sql anteriores propõem um schema novo e não devem ser executados junto ao ambiente `Manari conectado` sem decisão arquitetural; preferência atual é aproveitar `citizen_requests` e `portal_staff_members`.
