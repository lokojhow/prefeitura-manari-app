# Etapa: integração administrativa, sem ativação

Foi criado o serviço `prototipos/esic-atendimento-service.js` como ponto único de integração da fila, encaminhamento e resposta. Ele exige `homologado:true` e uma sessão autenticada; por padrão **bloqueia todas as operações**, evitando chamadas acidentais no projeto ativo.

O contrato de fila está em `supabase/plans/esic_portal_fila_homologacao.sql`. **Ainda não foi aplicado**, assim como as RPCs de encaminhamento/resposta. Não é uma funcionalidade disponível para atendimento da população.

Antes de ativar:
1. Confirmar a política do SIC municipal e mapear os responsáveis.
2. Criar ambiente de homologação separado com banco sem dados pessoais reais.
3. Corrigir políticas atuais amplas de `citizen_requests` sem quebrar a Ouvidoria.
4. Validar autorização e auditoria das três RPCs com contas de diferentes permissões.
5. Conectar a interface visual ao repositório real do portal.
6. Registrar testes automatizados de API/RLS e validação jurídica para recursos, prazos e anexos.
7. Integrar o módulo de e-SIC sem substituir links antigos até aceite.
