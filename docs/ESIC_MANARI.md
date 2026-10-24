# e-SIC Manari — início da implementação

**Situação:** estrutura inicial de dados para revisão; **não está implantado nem operacional**.

Este repositório está configurado como projeto Android/Capacitor, com `webDir: www`. O frontend do portal institucional e o Supabase de produção ainda precisam ser identificados antes de integrar rotas reais.

## Fluxos previstos

1. Cidadão autenticado registra pedido sem precisar justificar o motivo; recebe protocolo único.
2. Servidor do SIC tria e encaminha à unidade competente.
3. Setor prepara resposta, que passa pelo fluxo de autorização municipal.
4. Cidadão acompanha protocolo, recebe resposta, anexa documentação e pode recorrer.
5. Gestores consultam indicadores agregados; dados pessoais não são publicados.

## Banco de dados

Migração inicial em `supabase/migrations/20261022_esic_base.sql`.

Inclui: unidades, perfis de servidores, pedidos, interações, recursos e auditoria. RLS limita leitura dos pedidos a seus titulares e servidores autorizados. **Nenhum cidadão pode autoatribuir-se papel de servidor.** Sem alteração direta de prazos ou envio de respostas oficiais pelo browser.

## Próximas tarefas antes de disponibilizar

- Identificar repositório do portal web, ambiente Supabase e regulamentação municipal do SIC/LAI.
- Criar RPC de abertura do pedido: gerar protocolo e prazos no servidor; prevenir preenchimento de campos administrativos por clientes.
- Criar telas públicas: informar, cadastrar, acompanhar e recorrer.
- Criar painel autenticado para servidores com papéis por órgão, despacho, prazo e publicação de resposta.
- Criar RPCs transacionais de despacho, prorrogação justificada, resposta, recurso e auditoria imutável.
- Implementar anexos em bucket privado, URLs temporárias, validação de extensão/tamanho e antivírus.
- Configurar notificação, acessibilidade, minimização de dados pessoais, CAPTCHA/rate limit e política de retenção.
- Homologar com SIC/controladoria/jurídico, testar fluxos e realizar avaliação de segurança antes de publicar.

**Atenção:** esquema preliminar; a contagem de prazos e instâncias recursais depende do regulamento de Manari e de revisão jurídica. Não substituir atendimento presencial pelo eletrônico.
