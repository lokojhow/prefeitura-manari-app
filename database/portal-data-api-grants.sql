do $$ declare t text; begin for t in select tablename from pg_tables where schemaname='public' and tablename like 'portal_%' loop execute format('revoke truncate, references, trigger on public.%I from anon, authenticated',t); end loop; end $$;
grant select on public.portal_records,public.portal_documents,public.portal_module_schemas to anon,authenticated;
grant select on public.portal_departments,public.portal_audit_log,public.portal_record_audit to authenticated;
grant insert,update,delete on public.portal_records,public.portal_documents,public.portal_departments,public.portal_modules to authenticated;
grant update,delete on public.portal_staff_members to authenticated;
alter function public.portal_set_updated_at() set search_path='';
revoke execute on function public.portal_records_touch_audit(),public.portal_audit_structured_change() from public,anon,authenticated;
