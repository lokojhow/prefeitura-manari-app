# ENCERRAMENTO DA REVISÃO — e-SIC Manari

## O que existe de fato
- Protótipos de e-SIC e atendimento e contrato de APIs, em `feature/esic-manari-base`, PR #1.
- Versão de demonstração **independente, um único arquivo**: `prototipos/esic-demo-offline.html`. Baixar e abrir no navegador; não requer Node, Supabase ou internet.
- Em demonstração as informações existem apenas na memória da aba e desaparecem ao recarregar. É proibido inserir dados reais.
- Os testes GitHub Actions anteriores passaram, mas não são testes reais de backend.

## Bloqueadores externos verificados em 23/10/2026
1. Projeto Supabase `Manari conectado` (ref dxvqiiawthxwkypvsxci) aparece **INACTIVE**. O projeto `click` também aparece INACTIVE. Não restaurados automaticamente: restaurar serviço pode reativar cobrança e sistemas dependentes.
2. Repositório `lokojhow/prefeitura-manari-app` é um wrapper Android Capacitor, `www/index.html` vazio. O código-fonte completo do portal web não está identificado no GitHub conectado.
3. Migrações, RPCs e RLS foram propostas mas não aplicadas. Permissões antigas da tabela `citizen_requests` eram amplas em verificações anteriores.
4. Nenhum histórico do e-SIC externo foi conectado ou reconciliado. Não desligar atendimento existente.

## Ações necessárias para conclusão REAL
- Proprietário da conta reativar ou autorizar explicitamente a restauração do Supabase `Manari conectado`, compreendendo impacto operacional/cobrança.
- Identificar origem/hospedagem do frontend verdadeiro (por exemplo site de implantação Cloudflare Pages, projeto e branch).
- Criar projeto separado de homologação com **dados fictícios** para execução de migrações, aplicação segura de RLS e RPCs, recursos, anexos e testes de papéis.
- Conectar autenticação, frontend e backend homologados, testar todas jornadas (incluindo ouvidoria, recursos e notificações).
- Homologação jurídica/LGPD, aceite formal, migração de dados históricos e plano de rollback antes de publicar em produção.

## Aprovação
Nenhuma mudança no app Android publicado, domínio público ou Supabase ativo.
Não considerar o e-SIC pronto para uso público.
