# Manari Comunicação — Gestão de Demandas

Sistema interno para organizar as demandas de comunicação da Prefeitura Municipal de Manari.

## Fluxo de trabalho

1. Cadastrar a ação recebida da secretaria.
2. Informar data, horário, local, prioridade e tipo de cobertura.
3. Definir equipe ou responsável.
4. Atualizar o status durante a produção.
5. Gerar título, legenda, texto para portal, Story e roteiro de Reels.
6. Revisar e publicar.
7. Marcar a demanda como publicada.
8. Exportar backup periodicamente.

## Status

- Recebida
- Agendada
- Em cobertura
- Em edição
- Aguardando aprovação
- Pronta para publicar
- Publicada

## Armazenamento

A versão inicial usa armazenamento local do navegador/aplicativo. Nenhuma demanda é enviada automaticamente para um banco externo. O menu Backup permite exportar e restaurar um arquivo JSON.

## Identidade visual

O sistema reutiliza os ícones oficiais existentes no aplicativo da Prefeitura e as cores institucionais do projeto.

## Android

O APK da Gestão de Demandas é gerado por um workflow próprio e usa o identificador `br.gov.pe.manari.gestaodemandas`, separado do aplicativo público da Prefeitura.

## Validação

O workflow `test-gestao-demandas.yml` verifica automaticamente a sintaxe do JavaScript, o manifesto e a presença das referências/arquivos essenciais.
