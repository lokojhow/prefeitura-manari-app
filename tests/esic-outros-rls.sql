-- Every test fixture is rolled back, without changing existing protocols.
begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
 ('76c046c7-78dd-4b73-8d53-c93f4c4da001','authenticated','authenticated','esic-other-a@example.invalid','{}','{}'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da002','authenticated','authenticated','esic-other-b@example.invalid','{}','{}'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da003','authenticated','authenticated','esic-other-admin@example.invalid','{}','{}');
insert into public.portal_staff_members(user_id,role,active) values('76c046c7-78dd-4b73-8d53-c93f4c4da003','admin',true);
set local role authenticated;
set local request.jwt.claims='{"sub":"76c046c7-78dd-4b73-8d53-c93f4c4da001","role":"authenticated"}';
insert into public.manari_digital_requests(citizen_id,module,subject,description,requested_department_other)
 values(auth.uid(),'esic','OUTROS TESTE','Pedido fictício para testar triagem.','Não sei qual secretaria atende este serviço.');
do $test$ begin
 if not exists(select 1 from public.manari_digital_requests where citizen_id=auth.uid() and requested_department_code is null and requested_department_other='Não sei qual secretaria atende este serviço.') then raise exception 'FAIL: free-text triage not saved';end if;
 begin
  insert into public.manari_digital_requests(citizen_id,module,subject,description,requested_department_other) values(auth.uid(),'esic','OUTROS VAZIO','Teste fictício inválido.','   ');raise exception 'FAIL: blank triage accepted';
 exception when check_violation then null;end;
 begin
  insert into public.manari_digital_requests(citizen_id,module,subject,description,requested_department_other) values(auth.uid(),'esic','OUTROS LONGO','Teste fictício inválido.',repeat('x',501));raise exception 'FAIL: excessive triage accepted';
 exception when check_violation then null;end;
 begin
  insert into public.manari_digital_requests(citizen_id,module,subject,description,requested_department_code,requested_department_other) values(auth.uid(),'esic','OUTROS AMBÍGUO','Teste fictício inválido.','educacao','Explicação contraditória.');raise exception 'FAIL: ambiguous triage accepted';
 exception when check_violation then null;end;
 begin
  update public.manari_digital_requests set requested_department_other='Outra explicação' where citizen_id=auth.uid();raise exception 'FAIL: citizen can alter triage';
 exception when insufficient_privilege then null;end;
end $test$;
reset role;
update public.manari_digital_requests set created_at='2034-08-01T12:00:00Z' where citizen_id='76c046c7-78dd-4b73-8d53-c93f4c4da001';
insert into public.manari_digital_requests(citizen_id,module,subject,description,requested_department_code,created_at) values
 ('76c046c7-78dd-4b73-8d53-c93f4c4da001','esic','OUTROS LEGADO','Pedido fictício de teste sem secretaria.',null,'2034-08-01T13:00:00Z'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da001','esic','OUTROS EDUCAÇÃO','Pedido fictício de teste com secretaria.','educacao','2034-08-01T14:00:00Z');
set local role authenticated;
set local request.jwt.claims='{"sub":"76c046c7-78dd-4b73-8d53-c93f4c4da002","role":"authenticated"}';
do $test$ begin
 if exists(select 1 from public.manari_digital_requests where requested_department_other is not null and citizen_id='76c046c7-78dd-4b73-8d53-c93f4c4da001') then raise exception 'FAIL: other citizen can read triage';end if;
end $test$;
set local request.jwt.claims='{"sub":"76c046c7-78dd-4b73-8d53-c93f4c4da003","role":"authenticated"}';
do $test$ declare d jsonb;v_id uuid;begin
 d:=public.manari_digital_admin_dashboard('2034-08-01','2034-08-01');
 if (d->>'total')::integer<>3 or jsonb_array_length(d->'departments')<>3 then raise exception 'FAIL: legacy and Others mixed';end if;
 d:=public.manari_digital_admin_dashboard('2034-08-01','2034-08-01','__other__');
 if (d->>'total')::integer<>1 or d->'departments'->0->>'code'<>'__other__' or d->'rows'->0->>'requested_department_other'<>'Não sei qual secretaria atende este serviço.' then raise exception 'FAIL: Others filter, chart or detail';end if;
 v_id:=(d->'rows'->0->>'id')::uuid;
 perform public.manari_digital_admin_action(v_id,'encaminhar','Agricultura',null);
 if not exists(select 1 from public.manari_digital_requests where id=v_id and requested_department_other='Não sei qual secretaria atende este serviço.' and department='Agricultura') then raise exception 'FAIL: forwarding lost triage';end if;
 d:=public.manari_digital_admin_dashboard('2034-08-01','2034-08-01','__unassigned__');
 if (d->>'total')::integer<>1 or d->'rows'->0->>'subject'<>'OUTROS LEGADO' then raise exception 'FAIL: legacy filter includes Others';end if;
end $test$;
reset role;
rollback;
select 'PASS: Others saved, validation, owner isolation, separate filter/chart, administrative detail and routing. Fixtures rolled back.' as result;
