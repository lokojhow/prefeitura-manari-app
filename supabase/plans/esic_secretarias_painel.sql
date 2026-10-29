-- Additive migration. Existing requests retain their protocol and a NULL
-- original department; routing remains in the existing audited department field.
alter table public.manari_digital_requests
 add column requested_department_code text
 references public.portal_departments(code);
grant insert(requested_department_code) on public.manari_digital_requests to authenticated;

create index manari_esic_created_idx on public.manari_digital_requests(created_at desc,id desc) where module='esic';
create index manari_esic_secretariat_created_idx on public.manari_digital_requests(requested_department_code,created_at desc,id desc) where module='esic';

create function public.manari_digital_admin_dashboard(
 p_date_from date default null,p_date_to date default null,
 p_department text default null,p_status text default null,
 p_page integer default 1,p_page_size integer default 25
) returns jsonb language plpgsql stable security invoker set search_path='' as $function$
declare v_from timestamptz;v_until timestamptz;
begin
 if auth.uid() is null or not public.is_portal_admin() then
  raise exception 'Acesso administrativo não autorizado' using errcode='42501';
 end if;
 if p_page is null or p_page<1 or p_page>1000000 or p_page_size is null or p_page_size<1 or p_page_size>100 then
  raise exception 'Página inválida' using errcode='22023';
 end if;
 if p_date_from is not null and p_date_to is not null and p_date_from>p_date_to then
  raise exception 'A data inicial deve ser anterior à data final' using errcode='22023';
 end if;
 if p_status is not null and p_status not in ('recebido','em_analise','respondido','arquivado') then
  raise exception 'Situação inválida' using errcode='22023';
 end if;
 if p_department is not null and p_department<>'__unassigned__'
  and not exists(select 1 from public.portal_departments where code=p_department) then
  raise exception 'Secretaria inválida' using errcode='22023';
 end if;
 v_from:=p_date_from::timestamp at time zone 'America/Sao_Paulo';
 v_until:=(p_date_to+1)::timestamp at time zone 'America/Sao_Paulo';
 return (
  with filtered as materialized (
   select r.* from public.manari_digital_requests r
   where r.module='esic'
    and (v_from is null or r.created_at>=v_from)
    and (v_until is null or r.created_at<v_until)
    and (p_status is null or r.status=p_status)
    and (p_department is null
     or (p_department='__unassigned__' and r.requested_department_code is null)
     or r.requested_department_code=p_department)
  ), totals as (
   select count(*) as total,
    count(*) filter(where status in ('recebido','em_analise')) as open,
    count(*) filter(where status='respondido') as answered,
    count(*) filter(where status='arquivado') as archived
   from filtered
  ), grouped as (
   select f.requested_department_code as code,
    coalesce(d.name,'Secretaria não informada') as name,count(*) as open
   from filtered f left join public.portal_departments d on d.code=f.requested_department_code
   where f.status in ('recebido','em_analise')
   group by f.requested_department_code,d.name
  ), page_rows as (
   select * from filtered order by created_at desc,id desc
   limit p_page_size offset ((p_page-1)::bigint*p_page_size)
  )
  select jsonb_build_object(
   'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc) from page_rows r),'[]'::jsonb),
   'total',t.total,'page',p_page,'page_size',p_page_size,
   'totals',to_jsonb(t),
   'departments',coalesce((select jsonb_agg(to_jsonb(g) order by g.open desc,g.name) from grouped g),'[]'::jsonb)
  ) from totals t
 );
end $function$;
revoke all on function public.manari_digital_admin_dashboard(date,date,text,text,integer,integer) from public,anon;
grant execute on function public.manari_digital_admin_dashboard(date,date,text,text,integer,integer) to authenticated;
