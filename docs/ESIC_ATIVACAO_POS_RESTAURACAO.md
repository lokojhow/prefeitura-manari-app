# Checklist de ativação — Manari conectado

## Verificação da restauração
Em 24/10/2026, após solicitar restore_project, o projeto dxvqiiawthxwkypvsxci constava COMING_UP. A tentativa de SELECT current_database() falhou: database possibly not accessible. Não executar migrações enquanto inacessível.

## Assim que o banco ficar ACTIVE
1. Validar acesso via consulta somente leitura e tirar inventário atualizado de public.citizen_requests, portal_staff_members, portal_modules e políticas RLS.
2. Examinar fluxos existentes da Ouvidoria, sem ler ou copiar dados pessoais para logs/repositório.
3. Preparar homologação isolada; corrigir políticas de acesso excessivamente amplas.
4. Testar cadastro e login com confirmação de e-mail, protocolos, fila administrativa, encaminhamento, respostas, recursos e anexos.
5. Localizar o código-fonte verdadeiro do portal web e seu ambiente de implantação.
6. Somente após aceitação institucional, substituir links W3, com plano de reversão e preservação dos dados antigos.

## Contatos institucionais a preservar
Ouvidoria: ouvidoria-manari-pe2023@outlook.com, 0800 666 9090; atendimento de segunda a sexta, das 8 às 13h. Endereço deverá vir da configuração atual do portal. Não usar identidade visual da W3.

## Aviso
Nenhuma alteração em banco, domínio ou portal público foi realizada nesta etapa.
