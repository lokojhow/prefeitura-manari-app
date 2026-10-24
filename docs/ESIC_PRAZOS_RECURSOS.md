# e-SIC — Etapa de prazos e recursos (22/10/2026)

## Entregue
- `prototipos/esic-prazos.js`: funções puras que calculam janelas de 20/30 dias e realizam validação preliminar de recursos.
- `prototipos/esic-prazos.test.mjs`: testes automáticos para virada de mês, ano bissexto, datas inválidas, prorrogação e elegibilidade inicial de recurso.

## Limitações importantes
- Cálculo ilustrativo em **dias corridos**, sem regras de feriados, termo inicial e legislação municipal. Não é prazo oficial a ser usado para decisões legais.
- Nenhum recurso real é enviado, recebido ou decidido.
- Não há notificação, auditoria recursal, anexos, hierarquia de julgamento nem migração do sistema anterior.
- Antes da produção, determinar prazo e instâncias de recurso e registrar decisões motivadas, inclusive negativa de acesso.
- O frontend do portal web ainda não foi identificado no repositório Android/Capacitor.
- O ambiente de produção da Prefeitura de Manari permanece inalterado.
