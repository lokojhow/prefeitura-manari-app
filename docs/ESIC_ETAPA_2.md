# e-SIC Manari — etapa 2: operações seguras

Dependência: `supabase/migrations/20261022_esic_base.sql`.

Esta etapa adiciona `20261022_esic_operacoes.sql` com três funções RPC, ainda **não executadas no Supabase**:

| RPC (schema public) | Papel | Resultado |
| --- | --- | --- |
| `esic_abrir_pedido(assunto, descricao)` | cidadão autenticado | ID + protocolo gerados no servidor; trilha de auditoria |
| `esic_encaminhar_pedido(pedido, unidade)` | gestor/admin | Atribui unidade ativa e audita |
| `esic_responder_pedido(pedido, resposta)` | servidor responsável/admin | Registra resposta visível, status e auditoria |

Regras: autenticação por `auth.uid()`; SQL transacional; sem credenciais de serviço no navegador; funcionários não podem cadastrar seus próprios privilégios. Políticas de leitura restringem acesso dos servidores pela unidade, exceto administrador.

**Pontos pendentes e bloqueantes:** identificar backend do portal e organização do Supabase; autenticação pública (inclusive alternativa adequada para quem não tem conta); modelo de identificação e dados mínimos; contagem de prazos e feriados; recursos, indeferimento fundamentado e graus hierárquicos; tratamento de informações sigilosas; notificações e anexos privados; acessibilidade; testes de segurança RLS e revisão jurídica. Não rodar em produção.

Exemplo após aplicar SQL em homologação:
```ts
const { data, error } = await supabase.rpc('esic_abrir_pedido', {
  p_assunto: 'Dados de uma obra pública',
  p_descricao: 'Solicito informação sobre o cronograma físico-financeiro da obra X.'
})
```

O projeto acessível neste repositório tem `package.json` de Capacitor/Android e não foi identificado o frontend institucional web. A integração visual depende de identificar o repo do portal.
