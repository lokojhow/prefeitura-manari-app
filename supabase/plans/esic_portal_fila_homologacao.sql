-- CONTRATO FUTURO: fila somente a funcionários do módulo e-SIC.
-- Arquivo para avaliação em HOMOLOGAÇÃO. Não executar no projeto ativo sem auditoria.
-- Pressupõe compatibilizar as políticas amplas existentes de citizen_requests.
create or replace function public.esic_portal_fila()
returns table (
  id uuid, protocol text, subject text, status text,
  department text, created_at timestamptz, updated_at timestamptz
)
language plpgsql stable security definer set search_path=''
as $$
begin
  if auth.uid() is null then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.portal_staff_members s
    where s.user_id=auth.uid() and s.active=true
      and (s.role='admin' or (s.department='Ouvidoria e LAI' and 'esic'=any(s.modules)))
  ) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  return query
    select c.id,c.protocol,c.subject,c.status,c.department,c.created_at,c.updated_at
    from public.citizen_requests c
    where c.request_type='esic'
    order by c.created_at desc
    limit 200;
end;
$$;
revoke all on function public.esic_portal_fila() from public,anon;
grant execute on function public.esic_portal_fila() to authenticated;
-- Checklist: testar papel admin, operador com módulo, operador sem módulo,
-- cidadão comum e anônimo; evitar publicar campos pessoais ou de ouvidoria.
