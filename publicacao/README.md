# e-SIC Manari — publicação isolada

Os arquivos em `esic/` constituem uma aplicação real ligada ao projeto Supabase **Manari conectado**. Mantêm a marca de homologação até a validação completa na hospedagem de destino. A dependência Supabase JS está fixada em 2.57.0; somente a chave pública é enviada ao navegador.

## Implantação no Worker “aplicativo manari”

O destino deve ser identificado no painel autenticado do Cloudflare antes de qualquer implantação. Conserve o Worker, bindings, diretório de assets e arquivos da implantação atual. Acrescente a pasta `esic/` ao diretório de assets existente para servir `/esic/`. Não substitua o diretório inteiro de assets por esta pasta, nem altere a página inicial, DNS ou o portal oficial. Se o Worker intercepta todas as rotas, adicione uma regra específica para encaminhar `/esic/*` ao binding de assets existente, conservando o restante do roteamento. Não invente o nome desse binding.

No Supabase Auth, o retorno de cadastro/recuperação deve incluir a URL HTTPS exata publicada em `/esic/`. Não trocar a Site URL global do portal. Autorizar somente o retorno deste e-SIC. Conferir também a entrega real de e-mails de confirmação e recuperação.

## Implementado

Cadastro, confirmação por e-mail, login, recuperação e troca de senha; protocolos persistidos, busca, descrição, resposta, setor e histórico; fila administrativa com autorização no servidor e ações de encaminhar, responder, arquivar e reabrir. O painel inclui os elementos que faltavam no pacote anterior e causavam falha ao iniciar. Listas pessoais filtram explicitamente o titular mesmo para administradores, além das políticas RLS do banco. Limpeza de dados privados no logout e proteção contra renderização de respostas de uma sessão anterior.

## Verificação

`node --test tests/esic-publicacao.test.mjs` testa o código de publicação. `node --test prototipos/*.test.mjs` executa os testes anteriores. `tests/esic-live-rls.sql` exercita o banco real com titulares distintos e um administrador fictício, usando privilégios de cada papel e `ROLLBACK` obrigatório. O teste não verifica a entrega de e-mail nem o navegador publicado.

## Ainda não liberado

Publicação no Cloudflare, confirmação/recuperação com entrega real de e-mail, validação ponta a ponta na URL publicada, recursos administrativos do cidadão, anexos privados e notificações automáticas de andamento. Não apresentar os testes do banco como validação desses fluxos. Não desativar o atendimento oficial existente nem substituir o link W3 antes da homologação.
