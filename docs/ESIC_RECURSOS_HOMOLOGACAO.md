# Recurso do e-SIC — proposta isolada

Foi criado um contrato de frontend para apresentação de recursos e testes com cliente simulado.

- A implementação **não cria** tabela de recursos nem RPC real; requer `esic_apresentar_recurso` a ser homologada.
- Somente cidadão autenticado pode iniciar envio após ativação explícita.
- A função de banco deverá confirmar que o requerente é titular do pedido, que o pedido comporta recurso, que o prazo é válido e que há autoridade recursal competente.
- A interface nunca define `user_id`, `status`, data, decisão ou autor do recurso.
- Nenhum prazo específico de recurso foi presumido: depende do regulamento municipal.
- Respostas e recursos precisam de log imutável e segregação funcional entre autoridade que respondeu e aquela que julgará.
- A ativação depende de Supabase de homologação, RLS auditada e portal web correto.
