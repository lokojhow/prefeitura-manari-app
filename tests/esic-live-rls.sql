-- Run as the database owner. All fixtures and their trigger effects are rolled back.
begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
values
('76c046c7-78dd-4b73-8d53-c93f4c4da001','authenticated','authenticated','esic-test-a@example.invalid','{}','{}'),
('76c046c7-78dd-4b73-8d53-c93f4c4da002','authenticated','authenticated','esic-test-b@example.invalid','{}','{}'),
('76c046c7-78dd-4b73-8d53-c93f4c4da003','authenticated','authenticated','esic-test-admin@example.invalid','{}','{}');
insert into public.portal_staff_members(user_id,role,active)
values('76c046c7-78dd-4b73-8d53-c93f4c4da003','admin',true);

set local role authenticated;
set local request.jwt.claims = '{"sub":"76c046c7-78dd-4b73-8d53-c93f4c4da001","role":"authenticated"}';
insert into public.manari_digital_requests(citizen_id,module,subject,description)
values(auth.uid(),'esic','TESTE TRANSACIONAL A','Solicitação fictícia para validar isolamento.');
do $$ begin
 if (select count(*) from public.manari_digital_requests where citizen_id=auth.uid()) <> 1 then raise exception 'FAIL: own request not visible'; end if;
 begin
  insert into public.manari_digital_requests(citizen_id,module,subject,description)
  values('76c046c7-78dd-4b73-8d53-c93f4c4da002','esic','TESTE FORJADO','Tentativa fictícia de forjar titularidade.');
  raise exception 'FAIL: forged ownership allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.manari_digital_requests(citizen_id,module,subject,description,status)
  values(auth.uid(),'esic','TESTE STATUS','Tentativa fictícia de forjar resposta.','respondido');
  raise exception 'FAIL: status spoofing allowed';
 exception when insufficient_privilege then null; end;
 begin
  update public.manari_digital_requests set response_text='Resposta forjada' where citizen_id=auth.uid();
  raise exception 'FAIL: direct response update allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.manari_digital_admin_action((select id from public.manari_digital_requests limit 1),'responder',null,'Resposta não autorizada.');
  raise exception 'FAIL: citizen can run admin action';
 exception when insufficient_privilege then null; end;
end $$;

set local request.jwt.claims = '{"sub":"76c046c7-78dd-4b73-8d53-c93f4c4da002","role":"authenticated"}';
do $$ begin
 if exists(select 1 from public.manari_digital_requests where citizen_id='76c046c7-78dd-4b73-8d53-c93f4c4da001') then raise exception 'FAIL: citizen B reads A'; end if;
 if exists(select 1 from public.manari_digital_events where actor_id='76c046c7-78dd-4b73-8d53-c93f4c4da001') then raise exception 'FAIL: citizen B reads A history'; end if;
end $$;

set local request.jwt.claims = '{"sub":"76c046c7-78dd-4b73-8d53-c93f4c4da003","role":"authenticated"}';
do $$ declare v_id uuid; begin
 select id into strict v_id from public.manari_digital_requests where citizen_id='76c046c7-78dd-4b73-8d53-c93f4c4da001';
 perform public.manari_digital_admin_action(v_id,'encaminhar','Saúde',null);
 if (select status from public.manari_digital_requests where id=v_id) <> 'em_analise' then raise exception 'FAIL: routing'; end if;
 begin
  perform public.manari_digital_admin_action(v_id,'arquivar');
  raise exception 'FAIL: archive without response';
 exception when invalid_parameter_value then null; end;
 perform public.manari_digital_admin_action(v_id,'responder',null,'Resposta fictícia para o teste transacional.');
 begin
  perform public.manari_digital_admin_action(v_id,null);
  raise exception 'FAIL: null action reopened request';
 exception when invalid_parameter_value then null; end;
 begin
  perform public.manari_digital_admin_action(v_id,'acao_invalida');
  raise exception 'FAIL: invalid action allowed';
 exception when invalid_parameter_value then null; end;
 if (select status from public.manari_digital_requests where id=v_id) <> 'respondido' then raise exception 'FAIL: rejected action changed state'; end if;
 perform public.manari_digital_admin_action(v_id,'arquivar');
 perform public.manari_digital_admin_action(v_id,'reabrir');
 if (select status from public.manari_digital_requests where id=v_id) <> 'em_analise' then raise exception 'FAIL: reopen'; end if;
 if (select count(*) from public.manari_digital_events where request_id=v_id and event_type in ('encaminhado','respondido','arquivado','reaberto')) <> 4 then raise exception 'FAIL: admin audit'; end if;
end $$;

set local request.jwt.claims = '{"sub":"76c046c7-78dd-4b73-8d53-c93f4c4da001","role":"authenticated"}';
do $$ begin
 if not exists(select 1 from public.manari_digital_requests where citizen_id=auth.uid() and response_text='Resposta fictícia para o teste transacional.') then raise exception 'FAIL: citizen cannot read response'; end if;
 if (select count(*) from public.manari_digital_events where event_type in ('encaminhado','respondido','arquivado','reaberto')) <> 4 then raise exception 'FAIL: citizen cannot read history'; end if;
end $$;

set local role anon;
set local request.jwt.claims = '{}';
do $$ begin
 begin
  perform id from public.manari_digital_requests limit 1;
  raise exception 'FAIL: anonymous table access';
 exception when insufficient_privilege then null; end;
 begin
  perform public.manari_digital_admin_action('76c046c7-78dd-4b73-8d53-c93f4c4da001','reabrir');
  raise exception 'FAIL: anonymous admin access';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: own request, owner isolation, forged owner/status denied, admin authorization, routing, response, archive, reopen, audit and anonymous access. All fixtures rolled back.' as result;
