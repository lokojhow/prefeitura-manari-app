# e-SIC Manari — verificação de 25/10/2026

## Alterações concretas

- Aplicação real isolada em `publicacao/esic/`, destinada ao caminho `/esic/` do Worker existente. Não houve mudança em `www/`, na branch `main`, no portal oficial, DNS ou atendimento W3.
- Corrigida a falha do pacote anterior: o JavaScript referenciava `admin`, `queue`, `action` e outros controles ausentes no HTML, impedindo a inicialização. O painel agora contém os elementos e a fila mostra descrição, setor, resposta e histórico.
- Consulta pessoal filtra o titular explicitamente, mesmo quando a conta é administradora. Fila administrativa requer `is_portal_admin()`; a RPC do banco verifica novamente o papel.
- Autenticação isolada do portal (`manari-esic-auth-v1`), tratamento de sessão expirada, formulários com bloqueio durante envio, cadastro e recuperação com retorno sem parâmetros e fragmentos. Logout e troca de conta limpam os dados privados e invalidam renderizações assíncronas anteriores.
- Migração remota `manari_digital_reject_null_admin_action` aplicada ao projeto `dxvqiiawthxwkypvsxci`. Mudança exclusiva: a condição `if p_action not in (...)` passou a `if p_action is null or p_action not in (...)`, preservando definição e privilégios restantes. Antes, `NULL` escapava da validação e caía na ação de reabrir. A validação corrigida foi exercitada no banco.

## Evidências e limites

- Supabase “Manari conectado”: `ACTIVE_HEALTHY` na consulta desta execução.
- **73 testes automatizados passaram:** 63 testes anteriores e 10 da aplicação de publicação. Também passou o teste de retorno de e-mail já existente do aplicativo Android.
- Banco real: `tests/esic-live-rls.sql` executado com dois cidadãos e um administrador fictícios. Verificados criação, acesso do titular, isolamento, tentativa de forjar dono/status, alteração direta de resposta negada, RPC negada ao cidadão, encaminhamento, resposta, arquivamento, reabertura, ações nula/inválida negadas, auditoria e acesso anônimo negado. Todos os fixtures e efeitos de triggers sofreram `ROLLBACK`; conferência posterior retornou zero usuários de teste restantes.
- Navegador conectado ao Supabase real, sem autenticação: página inicial carregou, permaneceu no estado anônimo correto, controles privados ocultos, abertura de recuperação funcionando. Nenhum erro da aplicação no console observado.
- Navegador com fixture em memória: lista pessoal não incluiu o pedido de outro cidadão, mas a fila administrativa incluiu; resposta via formulário mudou a situação, exibiu o texto e alimentou o histórico; logout ocultou painéis e zerou listas privadas. Isto testa a interface, **não** substitui teste ponta a ponta autenticado no backend.
- Advisors de segurança e desempenho consultados. O alerta sobre a RPC administrativa `SECURITY DEFINER` permanece por desenho: a função necessita atualizar tabelas sem conceder UPDATE direto aos cidadãos e valida `auth.uid()` e `is_portal_admin()` antes de qualquer ação. Testes reais negaram a execução a cidadão e anônimo. Demais alertas preexistentes de módulos alheios não foram alterados.

## Estado da publicação

O painel do Cloudflare abriu na tela de login. A solicitação de autenticação segura retornou `declined`. Não houve implantação e a URL exata/configuração do Worker “aplicativo manari” não foi inspecionada. Não foi usado outro projeto ou endereço no lugar do destino solicitado.

Antes de concluir, ainda é necessário autenticar no Cloudflare, identificar o Worker e seus assets, acrescentar `/esic/` preservando a aplicação existente, configurar o retorno HTTPS específico no Supabase Auth e testar cadastro/confirmação por e-mail, recuperação e fluxo completo na URL publicada. Recursos do cidadão, anexos e notificações automáticas de andamento continuam pendentes. O serviço não está declarado pronto ou publicado.
