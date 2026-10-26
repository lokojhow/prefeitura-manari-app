# Painel do SIC — requisitos iniciais de interface

Visual: preservar identidade da Prefeitura de Manari (azul/verde, Montserrat, cartões arredondados, responsividade).

## Abas
- **Fila de atendimento:** consulta `esic_fila_atendimento` após sessão autenticada de servidor habilitado.
- **Detalhes do protocolo:** assunto, descrição, secretaria atribuída, status, histórico visível para o papel e data.
- **Encaminhar:** gerentes e administradores podem usar `esic_encaminhar_pedido` após confirmação.
- **Responder:** atendentes autorizados usam `esic_responder_pedido`; registrar resposta oficial requer procedimento municipal de aprovação.
- **Indicadores:** contagens e prazos calculados no servidor, ainda pendentes.
- **Recursos e anexos:** ainda bloqueados até política e segurança completas.

## Avisos
Este repositório ainda não possui o frontend web do portal institucional. As migrações não estão aplicadas em projeto Supabase. É obrigatório revisar a política de interações internas e as permissões antes de homologar. Nenhuma alteração deve ser publicada ou executada em ambiente produtivo.
