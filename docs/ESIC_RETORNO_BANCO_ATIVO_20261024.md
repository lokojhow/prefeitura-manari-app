# Relatório de retomada técnica — 24/10/2026

Confirmado com ferramenta Supabase que o projeto Manari conectado (dxvqiiawthxwkypvsxci) está ACTIVE_HEALTHY e executa consultas SQL.
A tabela public.citizen_requests existe, com 0 registros na consulta desta revisão.

**Problema de segurança confirmado no banco vivo**: policy INSERT identificada não exige auth.uid() para pedido identificado; policy staff_read e staff_update permite a todo servidor ativo ler/atualizar pedidos, independentemente do módulo e da secretaria. Não ativar e-SIC real enquanto não corrigir esse controle de acesso, incluindo testes de regressão da Ouvidoria.

Adicionado `prototipos/esic-app.js`, agregando autenticação, cadastro/consulta, administração e recursos por um ponto de entrada. O modo padrão é bloqueado. Na homologação isolada, exigirá configuração explícita. Nenhuma alteração de DDL, políticas ou dados foi feita no Supabase nesta revisão.

Ainda é preciso encontrar repositório de implantação do portal web e concluir testes de segurança da base, migração dos atendimentos existentes, anexos e recursos antes de retirar o atendimento W3.
