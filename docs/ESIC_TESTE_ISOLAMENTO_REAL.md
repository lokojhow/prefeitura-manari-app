# Teste RLS entre dois cidadãos — ambiente de homologação

Criado o verificador de isolamento de leitura em `esic-rls-homologacao.js` e seus testes unitários simulados.

## Pré-requisitos para execução REAL
- Supabase de homologação separado do ambiente municipal ativo.
- Duas contas fictícias autenticadas em clientes distintos, A e B.
- Um pedido e-SIC criado por A e outro por B, ambos fictícios.
- A RLS da tabela `citizen_requests` implantada e auditada no ambiente de homologação.

O verificador lê os pedidos com as duas sessões e **só aprova** quando A acessa A, B acessa B, A não acessa B e B não acessa A. Não executa INSERT, UPDATE ou DELETE.

Importante: os testes automatizados do GitHub usam mocks e **não comprovam** que a RLS do Supabase ativo está segura. A autorização administrativa, a Ouvidoria e as operações de escrita exigem suites próprias. Não introduzir credenciais de teste em arquivos versionados ou logs.
