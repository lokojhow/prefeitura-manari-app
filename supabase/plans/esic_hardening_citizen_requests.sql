-- PROPOSTA PARA HOMOLOGAÇÃO — NÃO APLICAR AO BANCO ATUAL
-- A tabela existente public.citizen_requests atende Ouvidoria e e-SIC.
-- A política atual citizen_requests_staff_update permite UPDATE a qualquer staff ativo.
-- Esta migração remove autorização genérica APÓS teste do fluxo de Ouvidoria.
-- Não assume quais códigos de departamentos nem nomes dos papéis de produção.

-- Em vez de ativar novos privilégios prematuramente, criar diagnóstico:
-- select user_id, department, role, modules from public.portal_staff_members;
-- select code, name from public.portal_departments;
-- select key, name from public.portal_modules;

-- Esboço de política segura (ajustar conforme regras efetivas):
-- BEGIN;
-- DROP POLICY IF EXISTS citizen_requests_staff_read ON public.citizen_requests;
-- DROP POLICY IF EXISTS citizen_requests_staff_update ON public.citizen_requests;
-- CREATE POLICY citizen_requests_staff_read ON public.citizen_requests
-- FOR SELECT TO authenticated USING (
--   EXISTS (SELECT 1 FROM public.portal_staff_members s
--      WHERE s.user_id=(select auth.uid()) AND s.active
--        AND (s.department= citizen_requests.department
--             OR public.is_portal_admin()))
-- );
-- Não criar política UPDATE direto no navegador. Preferir funções transacionais
-- checando autenticação, autorização, status, auditando alterações e restringindo colunas.
-- ROLLBACK;

-- IMPORTANTE: Este arquivo é um plano SQL em comentários, sem alterações executáveis.
