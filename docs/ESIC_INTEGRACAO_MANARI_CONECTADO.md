# Integração com o Supabase REAL do portal de Manari — descoberta (22/10/2026)

**Projeto localizado:** `Manari conectado` — ref `dxvqiiawthxwkypvsxci`. Inspeção de metadados em modo leitura, **nenhuma modificação aplicada**.

## Estruturas já existentes

- `public.citizen_requests` (0 registros): `id`, `protocol`, `request_type`, `subject`, `message`, `requester_name`, `requester_email`, `requester_phone`, `anonymous`, `user_id`, `status`, `response_text`, `response_at`, `department`, timestamps.
- `public.portal_staff_members` (1 registro): perfil do servidor, setor, papel, módulos e status.
- `public.portal_departments` (16 registros): códigos e nomes das secretarias.
- `public.portal_modules` (13 registros): módulos do portal.
- `public.app_portal_links` e `public.app_services`: menus e links atuais.
- `public.portal_access_requests`: solicitações de acesso de equipe (não confundir com pedido LAI).

Existe migração `ouvidoria_esic_internos` (10/09/2026) — o portal JÁ TEM um protótipo de solicitações. Por isso, NÃO adicionar outra tabela de pedidos em produção sem compatibilização.

## Decisão técnica provisória

1. **Suspender aplicação das migrações da pasta `supabase/migrations/20261022_esic_*.sql`**: elas são proposta isolada e podem causar duplicidade de solicitações ou identidades.
2. Integrar a interface e-SIC à tabela `citizen_requests` ou criar uma migração de evolução dela somente após ler policies, triggers, funções, constraints e verificar necessidade de migração do legado.
3. Separar e-SIC de ouvidoria em `request_type`, preservando regras legais diferentes e confidencialidade especial das denúncias.
4. Unificar autenticação administrativa com `portal_staff_members`; evitar tabela concorrente de perfis.
5. Usar `portal_departments` para encaminhamento e `portal_modules` para controle de navegação.
6. Quando homologado, atualizar `app_portal_links` para rotas internas; não alterar links agora.
7. Verificar o frontend institucional verdadeiro antes de importar os protótipos.

## Limitações e bloqueadores

- Esquema observado apenas no nível de tabelas/colunas; ainda é necessário examinar RLS, triggers, RPCs existentes e autenticação.
- Dados de cidadãos e funcionários não foram extraídos.
- Sem testes em ambiente isolado, sem publicar e sem substituir sistema ativo.
- Antes de produção: simular pedidos LAI de duas identidades, testar segregação por setor, LGPD, recurso e prazos.

O trabalho anterior na branch permanece como protótipo independente, não como instalação pronta.
