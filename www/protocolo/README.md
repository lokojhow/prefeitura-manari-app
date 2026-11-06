# Protocolo Digital — Processos e Tramitações

Módulo independente do portal de Manari, sem identidade visual da Prefeitura ou brasão. Arquivos: `www/protocolo/`.

## Funcionamento
- Login pelo Supabase Auth e autorização pelo vínculo ativo em `portal_staff_members` (administrador ou equipe com `can_manage_documents`).
- Novo processo criado como rascunho e numerado automaticamente. O autor envia; o setor de destino recebe, encaminha, marca pendente e conclui; o autor ou administrador cancela.
- Filtros de caixa, pesquisa, status e prioridade, relatório CSV, anexos PDF/PNG/JPG de até 10 MB, histórico de movimentações.
- e-SIC e Ouvidoria continuam em módulos separados, acessíveis por atalhos.
- Dados reais aparecem apenas quando cadastrados; não há registros demonstrativos injetados.

## Segurança
Banco Supabase: projeto `Manari conectado`; migrações aplicadas `protocolo_digital_processos_v1`, `protocolo_armazenamento_permissoes_v2`, `protocolo_storage_private_checks_v3`. Tabelas no esquema `protocolo_private` com RLS e sem acesso direto à Data API. RPC `manari_protocolo` aceita somente `authenticated` e verifica a equipe em cada operação. Bucket `protocolo-anexos` é privado e utiliza políticas de acesso por processo.

## Publicação
O repositório usa Cloudflare Workers com raiz de assets `www`, conforme a documentação preexistente em `ESIC-CLOUDFLARE.md`. O caminho esperado depois que o deploy da branch principal for concluído é `/protocolo/`. O service worker da homepage exclui explicitamente esse caminho para não reescrever a página.
Verifique o deploy no Cloudflare e o login real antes de liberar uso em produção.

## Validação
Execute `node --check www/protocolo/app.js` e `node --test tests/protocolo.test.cjs`. O workflow `protocolo-digital.yml` realiza as verificações estáticas ao alterar o módulo.

## Primeiro teste
1. Entre com conta autorizada do portal.
2. Abra um rascunho, confira o número e envie ao setor.
3. Use uma conta autorizada do setor de destino para receber, encaminhar e concluir.
4. Adicione anexo de teste e confira histórico, permissões de arquivos e exportação CSV.
5. Teste com conta sem autorização para confirmar bloqueio.
Não use dados pessoais nem documentos verdadeiros na homologação inicial.
