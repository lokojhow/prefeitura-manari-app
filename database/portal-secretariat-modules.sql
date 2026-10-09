insert into public.portal_module_schemas(module,title,department_code,description,fields,sort_order)
select d.code,d.name,d.code,d.description,'[{"key":"conteudo","label":"Informações oficiais","type":"textarea","required":true},{"key":"referencia","label":"Número ou referência","type":"text"},{"key":"data","label":"Data de referência","type":"date"}]'::jsonb,d.sort_order+200
from public.portal_departments d where d.code in ('educacao','saude','assistencia','agricultura','esportes','transportes')
on conflict(module) do nothing;
