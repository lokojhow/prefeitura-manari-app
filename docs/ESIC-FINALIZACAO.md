# Finalização do fluxo e-SIC — pendente de implantação

Esta alteração adiciona controle de prazo, prorrogação justificada, ciência da resposta, recursos em até três instâncias configuráveis, análise por autoridade distinta do autor da resposta e fila de avisos por e-mail com tentativas limitadas. O responsável pelo SIC e as autoridades recursais ficam sem designação até confirmação da prefeitura.

## Validação realizada

- 41 testes Node aprovados, incluindo regressões de autenticação, portal, filtros e cadastro, validação recursal e tratamento do envio de e-mail.
- Migração compilada em PostgreSQL local via PGlite; testes transacionais de prazos, RLS, ciência, recursos, segregação de julgamento, fila de envio e retentativas aprovados.
- No teste local, Vault, cron, rede e criptografia foram substituídos por stubs. Isso não valida a infraestrutura gerenciada nem a entrega de e-mails.
- Sintaxe dos módulos JavaScript e `git diff --check` aprovados.

## Antes de mesclar e publicar

1. Aplicar `supabase/plans/esic_fluxo_completo.sql` com a ferramenta de migração do Supabase. As tentativas desta sessão não concluíram a confirmação. Consultar primeiro se o schema `manari_esic_private` existe para evitar reaplicação parcial.
2. Executar `tests/esic-fluxo-rls.sql` entre BEGIN e ROLLBACK no Supabase real. Não modificar os protocolos reais nos testes.
3. Implantar a função `manari-esic-mailer`, com os três arquivos em `supabase/functions/manari-esic-mailer`. A função deve usar `verify_jwt=false` porque autentica a chamada do cron pelo token privado X-Esic-Job, validado pelo servidor. Os RPCs de runtime, claim e finish são exclusivos do service_role.
4. Conferir avisos de segurança, negar acesso anônimo aos RPCs e verificar que o token do cron e a senha SMTP não são legíveis por cidadãos.
5. Atualizar a fixture de navegador para as novas consultas de snapshot/histórico e testar as telas de cidadão e administrador, incluindo celular, logout, recurso e retorno de decisões. A interface nova ainda não passou por esse teste nesta etapa.
6. Mesclar somente após validar o banco e o navegador. O merge em main dispara a publicação existente no Cloudflare; não criar outro projeto nem alterar o portal fora de `www/esic`.
7. Inserir manualmente a chave SMTP no painel administrativo (Avisos por e-mail), sem exibir a chave em logs, capturas, repositório ou conversa. A chave já configurada no Supabase Auth continua exclusiva do serviço de autenticação; esta integração de avisos precisa da própria configuração protegida.
8. Enviar teste para a conta administrativa, verificar aceitação SMTP e recebimento na caixa de entrada. Depois conferir aviso de pedido, resposta e decisão com contas de teste autorizadas.

## Definições administrativas pendentes

Os parâmetros 20 dias de resposta, 10 de extensão, 10 de recurso e 5 de decisão são valores de homologação configuráveis. Confirmar a norma municipal, calendário de expediente/feriados e instâncias antes de operação oficial. Não declarar conformidade legal ou produção concluída apenas porque o código foi publicado.

O painel apresenta os 100 recursos mais recentes; a ampliação com paginação e busca na fila recursal deve ser avaliada antes de operação com volume maior. A migração do histórico do fornecedor antigo não faz parte desta alteração.
