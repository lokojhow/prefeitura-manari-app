# Manari Digital — plano de substituição gradual (22/10/2026)

## Objetivo
Integrar serviços municipais ao novo portal com identidade única e reduzir os redirecionamentos para sites externos. Não substituir plataformas oficiais nacionais nem publicar sistemas incompletos.

## Inventário inicial (portal atual)
Fonte: https://manari.pe.gov.br/v1/mapa-do-site/ e https://manari.pe.gov.br/v1/
Serviços citados: Carta de Serviços, Nota Fiscal Eletrônica, Ouvidoria, e-SIC, Contracheque Online, Licitações e Contratos, Transparência COVID-19.

| Serviço | Estratégia técnica | Condições |
| --- | --- | --- |
| e-SIC | módulo próprio com cidadão, gestor, protocolo, recurso e auditoria | regras LAI, histórico, migração de pedidos e homologação |
| Ouvidoria | módulo de manifestações segregado do e-SIC | proteger denunciantes, fluxo e Lei 13.460/2017 |
| Carta de Serviços | catálogo nativo de serviços e pesquisa | validar responsáveis e atualizações |
| Protocolo | motor compartilhado de tramitação e anexos, segregado por domínio | classificação e temporalidade documental |
| Transparência | visualização e filtros nativos alimentados pelos sistemas contábeis oficiais | dados completos, atualizados, exportáveis, íntegros |
| Licitações e Contratos | catálogo local e integração PNCP | manter obrigações da Lei 14.133/2021 |
| Contracheque | área autenticada e integração à folha | autorização e privacidade de dados |
| Nota fiscal | integração ao emissor fiscal autorizado | não recriar emissão sem homologação |
| Diário oficial | índice e pesquisa dos atos | manter veículo oficial e validade legal |
| COVID histórico | acervo pesquisável | preservar integralidade histórica |

## Checklist de descoberta obrigatória
- Identificar fornecedor, URL real, contrato e titularidade de cada serviço.
- Confirmar repositório do frontend web e infraestrutura Supabase usados no novo portal.
- Solicitar acesso autorizado para exportar dados, anexos, recursos, histórico e perfis do sistema atual.
- Definir plano de continuidade, reversão, backup e coexistência sem perda de protocolo.
- Aprovação do SIC, Controladoria, jurídico e encarregado LGPD.
- Testar acessibilidade, privacidade, RLS, relatório e respostas automáticas.
- Validar domínio oficial e atualizar links apenas depois de homologação.

## Fases
1. **e-SIC**: backend, acompanhamento, recursos, notificações e painel de servidores, homologar.
2. **Ouvidoria e Protocolo**: aproveitar componentes visuais e infraestrutura, sem misturar dados sensíveis.
3. **Carta de Serviços e transparência**: integrar informações verificadas e responsáveis.
4. **Serviços transacionais**: contracheque, tributos, notas, licitações com sistemas oficiais.

## Situação em 22/10/2026
Projeto e-SIC em PR draft; código não foi publicado, banco não foi alterado e serviços anteriores permanecem funcionando. Repositório acessível parece Android/Capacitor, sem frontend web identificado. Não afirmar migração concluída.
