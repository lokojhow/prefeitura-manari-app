# Conectar e-SIC à interface do portal

Este diretório contém uma interface visual e o adaptador `esic-client.js` para Supabase v2.

**Estado:** integração preparada para homologação, sem publicar e sem ligar a dados reais.

## Plano

1. Localizar o repositório do frontend do portal web de Manari (este repo é Capacitor/Android).
2. Configurar autenticação no site (sessão real de cidadão). Não usar service_role no frontend.
3. Aplicar migrações apenas em Supabase de testes, após revisar RLS e funções.
4. Importar `criarClienteEsic(supabase)` no frontend e ligar à tela de solicitação.
5. No clique enviar: validar autenticação; chamar `abrirPedido`; exibir protocolo real apenas no sucesso. Mostrar falhas sem expor dados internos.
6. Criar endpoint seguro de consulta/listagem de pedidos do titular e acesso por secretaria.
7. Testar independência de contas e autorização por unidade; bloquear produção até auditoria de segurança.

## Exemplo de integração React

```js
import { criarClienteEsic } from './esic-client.js'
const esic = criarClienteEsic(supabase) // supabase-js v2 autenticado
const user = await esic.verificarSessao()
if (!user) throw new Error('Faça login para registrar seu pedido')
const resultado = await esic.abrirPedido({
  assunto: 'Informação sobre obra',
  descricao: 'Solicito cronograma atualizado da obra da praça municipal.'
})
console.log(resultado.protocolo)
```

## Requisitos para uso real

- Tela de autenticação de cidadãos e mecanismo inclusivo de atendimento para não cadastrados, conforme regulamentação local.
- Rotinas de recurso/indeferimento, anexos, notificações e relatórios anonimizados.
- Adequar política de retenção, prazos e feriados, assinatura/autoridade para resposta e fluxos recursais.
- Confirmar integração de identidade e design com o frontend real antes de mesclar o PR.
