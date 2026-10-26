# Publicação isolada do e-SIC — 26/10/2026

Configuração confirmada no painel do usuário: projeto Cloudflare “aplicativo manari”, repositório `lokojhow/prefeitura-manari-app`, produção `main`, diretório raiz `/www`, sem comando de build, implantação `npx wrangler deploy --name prefeitura-manari-app --assets . --compatibility-date 2026-08-10`. Instalação de dependências desativada pela variável `SKIP_DEPENDENCY_INSTALL=1`.

Esta mudança acrescenta somente quatro assets em `www/esic/`, servidos no caminho `/esic/`, além de testes, CI e este registro. Os 60 arquivos existentes do portal foram comparados byte a byte com a branch main antes da alteração e permanecem iguais. Não muda homepage, navegação, links de Ouvidoria/W3, configurações existentes, DNS ou credenciais. A página permanece identificada como homologação.

O código da aplicação foi validado na branch `feature/esic-manari-base`, commit `78cfb32f67d8f1dab27c23eaecb37828521a09b3`. Este commit de publicação copia somente os assets executáveis, sem incorporar os protótipos ou migrações experimentais daquela branch. A função administrativa aplicada ao Supabase já recusa ação nula; as demais funcionalidades do banco não são modificadas por esta publicação.

Verificação anterior: 73 testes automatizados, teste existente de retorno de e-mail e testes transacionais no Supabase real passaram. Nesta árvore de publicação, os dez testes da aplicação e o teste de retorno de e-mail foram executados novamente com sucesso. A implantação remota precisa ser verificada na URL efetiva retornada pelo botão “Visita”, junto com a preservação da homepage.

Pendências para conclusão: verificar assets publicados e cadastro/login/recuperação com entrega real de e-mail, acrescentar a URL HTTPS efetiva de `/esic/` à lista de retornos permitidos no Supabase Auth sem alterar o retorno global do portal, testar atendimento ponta a ponta; recursos, anexos e notificações automáticas de andamento. Não declarar serviço concluído apenas por ter assets publicados ou CI aprovado.

Reversão: reverter exclusivamente o commit desta publicação com `git revert`, preservando outras alterações posteriores. Não substituir a raiz de assets por um ZIP contendo somente o e-SIC.
