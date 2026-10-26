# Verificação automatizada do módulo e-SIC

Adicionada suíte de contrato `prototipos/esic-atendimento-service.test.mjs`, pacote ES Modules e GitHub Actions em `.github/workflows/esic-tests.yml`.

O pacote local `prototipos/package.json` tem `type: module`, necessário para importar os arquivos `.js` como módulos ECMAScript (sem instalar dependências).

**Como executar localmente:** `cd prototipos && npm test` com Node.js 22.

Os testes verificam: bloqueio por padrão, consulta via RPC, identificadores/respostas inválidos, ausência de autenticação e parâmetros exatos de encaminhamento/resposta.

**Limitações:** isto é uma suíte com mocks. Não verifica o SQL, a RLS, migrações, regulamento municipal nem desempenho. A aprovação da suíte não autoriza publicação nem acesso de servidores reais. Devem ser realizados testes independentes no Supabase de homologação.

Não ativar `homologado:true` no frontend até que as RPCs auditadas estejam implantadas em ambiente isolado e tenham controle de acesso testado no servidor.
