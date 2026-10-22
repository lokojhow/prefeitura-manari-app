# e-SIC — anexos e notificações: etapa preparatória

Artefatos:
- `prototipos/esic-anexos-notificacoes.js`: validação preliminar de arquivos PDF/JPG/PNG até 10 MB e gerador de notificação sem dados pessoais ou conteúdo do pedido.
- `prototipos/esic-anexos-notificacoes.test.mjs`: testes de validação para tipos e limites.

O módulo **NÃO realiza upload nem envia e-mails**. Nenhum bucket, tabela ou permissão foi alterado no projeto de produção.

## Arquitetura necessária antes da implementação final
- Criar bucket privado na instância de homologação.
- Guardar metadados do anexo com vínculo ao pedido e autoria auditável.
- Aprovar upload com credencial de curta duração emitida pelo servidor após verificar titularidade ou permissão administrativa; não confiar no nome ou MIME informado pelo navegador.
- Validar tipo real, tamanho e conteúdo do arquivo no servidor, incluindo análise antimalware.
- Testar RLS no registro do documento e policies de Storage para impedir leitura por terceiros.
- Disponibilizar downloads via URL temporária após autorização.
- Notificações assíncronas por serviço institucional, com opt-in/canal adequado e histórico, sem informações sigilosas no e-mail.
- Definir retenção, exclusão segura, backup e tratamento de dados pela LGPD.
- Integrar ao frontend web verdadeiro e testar com contas segregadas, após validar regulamento LAI de Manari.

**Bloqueios:** sem banco de homologação identificado e sem aprovação das políticas de acesso, não enviar arquivos reais e não desativar o e-SIC atual.
