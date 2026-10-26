# Integração do painel administrativo do e-SIC

A interface `prototipos/esic-painel.html` é uma prévia sem dados reais.

O módulo `prototipos/esic-painel-app.js` implementa carregamento da fila autorizada, filtros por protocolo/assunto/status e atualização de indicadores a partir de RPC; é reutilizável pelo portal web quando o repositório correto for localizado.

## Como conectar no portal web
- Usar supabase-js v2 com chave pública/anon; jamais usar service_role no frontend.
- Executar migrações SQL em ambiente de testes, com auditoria de segurança e de prazos legais.
- Garantir usuário autenticado e `esic.servidores` cadastrado por administrador.
- Importar a função na interface depois de montar o DOM, passando um cliente Supabase autenticado:

```js
import { montarPainelEsic } from './esic-painel-app.js'
const painel = montarPainelEsic({supabase})
try { await painel.recarregar() } catch(err) { /* mostrar erro genérico de permissão */ }
```

## Limitações conhecidas
- O endpoint retorna no máximo 200 pedidos; números na tela são apenas da lista devolvida, não métricas globais.
- A identificação do projeto web principal e das credenciais de homologação está pendente.
- Falta a UI de detalhe, despachos/recursos, anexos e gerenciamento de servidores.
- O painel **não deve ser publicado** sem testes reais de autenticação, escopo por secretaria, RLS e LGPD.
