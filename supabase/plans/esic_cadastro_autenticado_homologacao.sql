-- PROPOSTA PARA HOMOLOGAÇÃO. NÃO APLICAR EM PRODUÇÃO.
-- Solicitação e-SIC vinculada ao usuário autenticado.
-- IMPORTANTE: mesmo esta função NÃO corrige permissões antigas de INSERT direto:
-- atualizar policies e GRANT da tabela em migração coordenada com a Ouvidoria.
create or replace function public.esic_criar_pedido_autenticado(
  p_assunto text, p_descricao text, p_nome text, p_email text
)
returns table (id uuid, protocol text)
language plpgsql security definer set search_path=''
as $$
declare v_user uuid; v_id uuid; v_protocol text;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Autenticação necessária' using errcode='42501'; end if;
  if char_length(trim(coalesce(p_assunto,''))) not between 5 and 200
     or char_length(trim(coalesce(p_descricao,''))) not between 10 and 10000
     or char_length(trim(coalesce(p_nome,''))) not between 2 and 180
     or char_length(trim(coalesce(p_email,''))) not between 5 and 254
     or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then raise exception 'Dados de solicitação inválidos'; end if;
  insert into public.citizen_requests
    (request_type,subject,message,requester_name,requester_email,anonymous,user_id,status)
  values ('esic',trim(p_assunto),trim(p_descricao),trim(p_nome),trim(p_email),false,v_user,'recebido')
  returning citizen_requests.id,citizen_requests.protocol into v_id,v_protocol;
  return query select v_id,v_protocol;
end; $$;
revoke all on function public.esic_criar_pedido_autenticado(text,text,text,text) from public,anon;
grant execute on function public.esic_criar_pedido_autenticado(text,text,text,text) to authenticated;

-- Checkpoint obrigatório:
-- 1. Ajustar RLS de INSERT/UPDATE/SELECT da citizen_requests.
-- 2. Revogar privilégios diretos indevidos sem interromper a Ouvidoria.
-- 3. Validar titularidade, colunas imutáveis, role e recursos.
-- 4. Testar não autenticado, usuário A/B, operador e admin.
-- 5. Validar política de dados pessoais/LGPD antes da implantação.
