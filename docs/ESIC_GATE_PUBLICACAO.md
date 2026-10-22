# Gate de publicação do e-SIC — diagnóstico confirmado 22/10/2026

## Resultados reais
- A busca de repositórios GitHub do proprietário retornou somente `lokojhow/prefeitura-manari-app` com a palavra Manari.
- Seu `package.json` é do **wrapper Android Capacitor**, não o frontend web responsável pelo portal.
- O histórico recente do GitHub Actions confirmou `success` no workflow de testes de contrato da branch em desenvolvimento.
- O Supabase da prefeitura é o `Manari conectado`, já com `public.citizen_requests` e módulos `esic` e `ouvidoria`.

## Gate de segurança (todos obrigatórios antes de publicar)
- [ ] Identificar o repositório e a hospedagem do portal web efetivo.
- [ ] Preparar uma instância de homologação com dados fictícios.
- [ ] Testar todas as policies de cidadão, servidor sem módulo e servidor de setor distinto.
- [ ] Revisar políticas antigas de INSERT e UPDATE em citizen_requests para impedir alteração de campos administrativos.
- [ ] Homologar e auditar RPCs de fila, encaminhamento e resposta.
- [ ] Garantir anexos privados e proteção de dados pessoais.
- [ ] Confirmar recursos e contagem de prazos conforme regulamento municipal.
- [ ] Validar acesso por identidade do requerente com proteção de dados.
- [ ] Testar caminho completo cidadão → secretaria → resposta → recurso.
- [ ] Fazer plano de migração e reconciliação de protocolos antigos.
- [ ] Obter aceite formal municipal e plano de rollback.

A aprovação de testes JavaScript de mocks não é aceitação de segurança do servidor.

## Verificação automatizada
`prototipos/esic-release-gate.test.mjs` valida propriedades básicas do modo de demonstração e o bloqueio padrão. É teste estático, não teste de penetração.

**Não publicar**, não aplicar as migrações experimentais em produção, nem mudar domínio público até todas as etapas serem atendidas.
