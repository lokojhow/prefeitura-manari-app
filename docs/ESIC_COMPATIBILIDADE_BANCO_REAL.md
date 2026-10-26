# Adaptação do e-SIC às tabelas existentes — 22/10/2026

Foi verificado diretamente em modo leitura no Supabase **Manari conectado**:
- `citizen_requests.request_type` aceita somente `ouvidoria` / `esic`.
- `citizen_requests.status` aceita somente `recebido`, `em_analise`, `respondido`, `arquivado`.
- `protocol` é texto com valor padrão `MAN-AAAAMMDD-XXXXXXXX`, UNIQUE; não numérico como no protótipo inicial.
- Os pedidos são autenticáveis via `user_id` e RLS de leitura do titular.
- Não existem triggers na tabela.
- A política de inserção atual permite pedidos identificados com nome/e-mail e anonimato só para ouvidoria.
- O risco de acesso amplo dos servidores foi registrado na auditoria anterior.

## Módulo novo
`prototipos/esic-legado-adapter.js` disponibiliza:
1. `solicitar`: abre pedido identificado usando tabela existente, com protocolo automático.
2. `meusPedidos`: lista apenas pedidos do titular autenticado.
3. `detalhe`: retorna apenas os dados do pedido do próprio titular.

A interface ainda não foi ligada ao portal web principal e o adaptador não foi testado com usuários. **Não inserir dados reais em produção para experimentar**.

## Bloqueios
- RLS INSERT existente ainda permite a clientes escolherem alguns campos administrativos, dependendo de grants e validações adicionais; exigir RPC segura antes da publicação.
- RLS staff SELECT/UPDATE atual é ampla; corrigir e testar regressão de Ouvidoria em homologação.
- Registrar prazos, recursos, anexos, notificações e auditoria adequados à legislação municipal.
- Localizar fonte do frontend web e integrar com rotas institucionais.
- Não aplicar `supabase/migrations/20261022_esic_*.sql` originais ao banco real sem reconciliar modelo; são propostas independentes.

## Exemplo de uso no portal
```js
import { criarEsicLegado } from './esic-legado-adapter.js'
const esic = criarEsicLegado(supabase)
const pedidos = await esic.meusPedidos()
```
