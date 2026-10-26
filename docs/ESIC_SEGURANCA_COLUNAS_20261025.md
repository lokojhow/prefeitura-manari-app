# Segurança da abertura de protocolos — 25/10/2026

Implementado no Supabase de homologação: revogação de INSERT genérico em `public.manari_digital_requests` e concessão apenas às colunas `citizen_id`, `module`, `category`, `subject`, `description` para o papel `authenticated`.

Verificação real de privilégios: `subject` pode ser enviado, `protocol` e `status` não podem ser definidos pelo cidadão, e `anon` não tem permissão de leitura.

O banco gera o protocolo automaticamente e a RLS exige `citizen_id = auth.uid()`.

**Pendente:** testes ponta a ponta no navegador com contas reais de homologação; abertura HTTP pública da função não confirmada neste ambiente; integração com o Worker Cloudflare não disponível para edição pelas conexões atuais.
