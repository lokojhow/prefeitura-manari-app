-- Transactional integration test: every fixture is rolled back.
begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
 ('76c046c7-78dd-4b73-8d53-c93f4c4da001','authenticated','authenticated','esic-panel-a@example.invalid','{}','{}'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da002','authenticated','authenticated','esic-panel-b@example.invalid','{}','{}'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da003','authenticated','authenticated','esic-panel-admin@example.invalid','{}','{}');
insert into public.portal_staff_members(user_id,role,active) values('76c046c7-78dd-4b73-8d53-c93f4c4da003','admin',true);
set local role authenticated;
set local request.jwt.claims='{"sub":"76c046c7-78dd-4b73-8d53-c93f4c4da001","role":"authenticated"}';
insert into public.manari_digital_requests(citizen_id,module,subject,description,requested_department_code)
 values(auth.uid(),'esic','PAINEL TESTE CIDADÃO','Registro fictício com secretaria escolhida.','educacao');
do $test$ begin
 if not exists(select 1 from public.manari_digital_requests where citizen_id=auth.uid() and requested_department_code='educacao') then raise exception 'FAIL: selected department not saved';end if;
 begin
  perform public.manari_digital_admin_dashboard();raise exception 'FAIL: citizen can read dashboard';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.manari_digital_requests(citizen_id,module,subject,description,requested_department_code) values(auth.uid(),'esic','Secretaria falsa','Tentativa fictícia de escolher secretaria inexistente.','__inexistente__');raise exception 'FAIL: unknown department accepted';
 exception when foreign_key_violation then null;end;
 begin
  update public.manari_digital_requests set requested_department_code='obras' where citizen_id=auth.uid();raise exception 'FAIL: citizen can change original department';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.manari_digital_requests(citizen_id,module,subject,description,requested_department_code) values('76c046c7-78dd-4b73-8d53-c93f4c4da002','esic','Titular forjado','Tentativa fictícia de forjar titularidade.','educacao');raise exception 'FAIL: forged owner accepted';
 exception when insufficient_privilege then null;end;
end $test$;
reset role;
insert into public.manari_digital_requests(citizen_id,module,subject,description,requested_department_code,status,created_at) values
 ('76c046c7-78dd-4b73-8d53-c93f4c4da001','esic','PAINEL LIMITE ANTES','Teste fictício antes da meia-noite local.','educacao','recebido','2030-01-02T02:59:59Z'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da001','esic','PAINEL LIMITE INÍCIO','Teste fictício na primeira hora do dia.','educacao','recebido','2030-01-02T03:00:00Z'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da001','esic','PAINEL LIMITE FIM','Teste fictício no último segundo do dia.','obras','em_analise','2030-01-03T02:59:59Z'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da001','esic','PAINEL DIA SEGUINTE','Teste fictício fora da data escolhida.','educacao','recebido','2030-01-03T03:00:00Z'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da001','esic','PAINEL RESPONDIDO','Teste fictício de chamado respondido.','educacao','respondido','2030-01-02T12:00:00Z'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da001','esic','PAINEL ARQUIVADO','Teste fictício de chamado arquivado.','agricultura','arquivado','2030-01-02T13:00:00Z'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da002','esic','PAINEL LEGADO','Teste fictício de secretaria não informada.',null,'recebido','2030-01-02T14:00:00Z'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da001','ouvidoria','PAINEL OUTRO MÓDULO','Este registro fictício não entra no painel e-SIC.','educacao','recebido','2030-01-02T15:00:00Z');
insert into public.manari_digital_requests(citizen_id,module,subject,description,requested_department_code,created_at)
 select '76c046c7-78dd-4b73-8d53-c93f4c4da001','esic','PAINEL PAGINAÇÃO '||i,'Registro fictício para testar mais de mil chamados.','educacao','2030-01-05T12:00:00Z'::timestamptz+i*interval '1 second' from generate_series(1,1003) i;
set local role authenticated;
set local request.jwt.claims='{"sub":"76c046c7-78dd-4b73-8d53-c93f4c4da002","role":"authenticated"}';
do $test$ begin
 if exists(select 1 from public.manari_digital_requests where citizen_id='76c046c7-78dd-4b73-8d53-c93f4c4da001') then raise exception 'FAIL: owner isolation';end if;
end $test$;
set local request.jwt.claims='{"sub":"76c046c7-78dd-4b73-8d53-c93f4c4da003","role":"authenticated"}';
do $test$ declare d jsonb;v_id uuid;begin
 d:=public.manari_digital_admin_dashboard('2030-01-02','2030-01-02');
 if (d->>'total')::integer<>5 or (d->'totals'->>'open')::integer<>3 or (d->'totals'->>'answered')::integer<>1 or (d->'totals'->>'archived')::integer<>1 then raise exception 'FAIL: date boundaries, module isolation or totals: %',d;end if;
 if jsonb_array_length(d->'departments')<>3 then raise exception 'FAIL: open department chart';end if;
 if d->'rows'->0->>'subject'<>'PAINEL LIMITE FIM' then raise exception 'FAIL: newest first';end if;
 d:=public.manari_digital_admin_dashboard('2030-01-02','2030-01-02','educacao','respondido');
 if (d->>'total')::integer<>1 or jsonb_array_length(d->'departments')<>0 then raise exception 'FAIL: combined department/status filters';end if;
 d:=public.manari_digital_admin_dashboard('2030-01-02','2030-01-02','__unassigned__');
 if (d->>'total')::integer<>1 or d->'departments'->0->>'name'<>'Secretaria não informada' then raise exception 'FAIL: legacy unassigned';end if;
 d:=public.manari_digital_admin_dashboard('2030-01-05','2030-01-05',null,null,41,25);
 if (d->>'total')::integer<>1003 or (d->'totals'->>'open')::integer<>1003 or jsonb_array_length(d->'rows')<>3 or (d->'departments'->0->>'open')::integer<>1003 then raise exception 'FAIL: paginated data or full aggregate above 1000 rows';end if;
 select id into strict v_id from public.manari_digital_requests where subject='PAINEL LIMITE INÍCIO';
 perform public.manari_digital_admin_action(v_id,'encaminhar','Agricultura',null);
 if (select requested_department_code from public.manari_digital_requests where id=v_id)<>'educacao' then raise exception 'FAIL: routing changed original department';end if;
 if not exists(select 1 from public.manari_digital_events where request_id=v_id and event_type='encaminhado') then raise exception 'FAIL: routing lost audit';end if;
 begin perform public.manari_digital_admin_dashboard('2030-01-03','2030-01-02');raise exception 'FAIL: invalid interval allowed';exception when invalid_parameter_value then null;end;
 begin perform public.manari_digital_admin_dashboard(null,null,null,'invalido');raise exception 'FAIL: invalid status allowed';exception when invalid_parameter_value then null;end;
 begin perform public.manari_digital_admin_dashboard(null,null,'invalida');raise exception 'FAIL: invalid department allowed';exception when invalid_parameter_value then null;end;
end $test$;
set local role anon;
set local request.jwt.claims='{}';
do $test$ begin
 begin perform public.manari_digital_admin_dashboard();raise exception 'FAIL: anonymous dashboard access';exception when insufficient_privilege then null;end;
end $test$;
reset role;
rollback;
select 'PASS: department selection, RLS, admin-only aggregates, local date boundaries, original department retained, full counts above 1000 rows, pagination and audit. Fixtures rolled back.' as result;
