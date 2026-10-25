# MANARI DIGITAL — Escopo integrado para homologação única

**Situação real:** projeto Supabase Manari conectado ativo; aplicativo GitHub é wrapper Android/Capacitor e o frontend de produção é um Cloudflare Worker externo, não conectado para escrita. Este documento não autoriza implantação sem revisão de segurança.

## Módulos e critérios de aceite
1. **Identidade e cadastro**: cidadão com cadastro, confirmação de e-mail, login e recuperação; servidores com módulos autorizados; logout e auditoria.
2. **e-SIC/LAI**: abertura, protocolo, acompanhamento, tramitação, resposta, recurso, prazos, anexos privados, notificações sem dados sensíveis.
3. **Ouvidoria**: reclamação, denúncia (inclusive anônima quando cabível), sugestão, elogio, encaminhamento reservado, resposta e proteção especial para denúncias. Preservar e-mail ouvidoria-manari-pe2023@outlook.com, telefone 0800 666 9090, horário 8h-13h em dias úteis; endereço do portal atual.
4. **Protocolo geral**: requerimentos, número, setores, anexos, tramitação e comprovante.
5. **Carta de Serviços**: serviços, canais de atendimento, requisitos, prazos e responsáveis.
6. **Transparência**: receitas, despesas, licitações, contratos, pessoal, planejamento, relatórios e dados abertos, aproveitando integrações/dados existentes.
7. **Painel administrativo**: filas por departamento, papéis, auditoria, notificações, prazos, indicadores e publicação.
8. **Administração do portal**: notícias, secretarias, obras, programas e contatos existentes devem continuar intactos.

## Restrições verificadas
- `public.citizen_requests` existe e suas policies antigas de INSERT/UPDATE e leitura de staff são permissivas. Corrigir em homologação antes de permitir dados reais; preservar fluxos de Ouvidoria.
- A substituição de links W3 em `app_portal_links` exige que haja URLs novas FUNCIONAIS. Não trocar para simulações que não armazenam pedidos.
- A estrutura Android atual não contém o código-fonte completo do portal Cloudflare.
- Não publicar links de transparência vazios como se fossem informação real nem copiar dados de cidadãos do serviço antigo sem processo autorizado.

## Gate de homologação conjunta
- Todas as telas navegáveis e vinculadas às APIs corretas.
- Testes automatizados + ponta a ponta com papéis cidadão, atendimento, secretaria, admin e acesso negado.
- Testes de privacidade, envio/anexo, resposta/recurso e recuperação de login.
- Conferir dados de transparência e integridade de links.
- Aceite administrativo e plano de rollback.
- **Somente depois** liberar versão única de testes no Worker `aplicativo manari`, sem afetar o portal oficial.
