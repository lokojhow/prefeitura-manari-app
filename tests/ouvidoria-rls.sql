begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
 ('76c046c7-78dd-4b73-8d53-c93f4c4da001','authenticated','authenticated','ouv-test-a@example.invalid','{}','{}'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da002','authenticated','authenticated','ouv-test-b@example.invalid','{}','{}'),
 ('76c046c7-78dd-4b73-8d53-c93f4c4da003','authenticated','authenticated','ouv-test-admin@example.invalid','{}','{}');
insert into public.portal_staff_members(user_id,role,active) values('76c046c7-78dd-4b73-8d53-c93f4c4da003','admin',true);
set local role anon;
set local request.jwt.claims='{}';
do $$declare receipt jsonb;r jsonb;begin
 receipt:=public.manari_ouvidoria_submit('denuncia','TESTE SEM IDENTIFICAÇÃO','Relato fictício para validar a segurança.','educacao',null,true);
 perform set_config('test.ouv_protocol',receipt->>'protocol',true);perform set_config('test.ouv_key',receipt->>'key',true);
 r:=public.manari_ouvidoria_track(receipt->>'protocol',receipt->>'key');
 if r->>'citizen_id' is not null or not (r->>'is_anonymous')::boolean then raise exception 'FAIL: anonymous account linked';end if;
 begin perform public.manari_ouvidoria_track(receipt->>'protocol',repeat('0',64));raise exception 'FAIL: incorrect key allowed';exception when insufficient_privilege then null;end;
 begin perform public.manari_ouvidoria_submit('elogio','TESTE INVALIDO','Relato fictício válido para teste.','educacao',null,true);raise exception 'FAIL: anonymous praise';exception when insufficient_privilege then null;end;
 begin perform public.manari_ouvidoria_list();raise exception 'FAIL: anonymous listing';exception when insufficient_privilege then null;end;
 begin perform * from public.manari_ouvidoria_requests;raise exception 'FAIL: anonymous direct table access';exception when insufficient_privilege then null;end;
end $$;
set local role authenticated;
set local request.jwt.claims='{"sub":"76c046c7-78dd-4b73-8d53-c93f4c4da001","role":"authenticated"}';
do $$declare d jsonb;begin
 perform public.manari_ouvidoria_submit('reclamacao','TESTE IDENTIFICADO','Relato fictício para validar titularidade.',null,'Não sei o setor.',false);
 d:=public.manari_ouvidoria_list();if (d->>'total')::int<>1 then raise exception 'FAIL: owner list';end if;
 begin perform public.manari_ouvidoria_act((d->'rows'->0->>'id')::uuid,'responder','Resposta não autorizada de teste.');raise exception 'FAIL: citizen admin action';exception when insufficient_privilege then null;end;
 begin update public.manari_ouvidoria_requests set status='respondido';raise exception 'FAIL: direct citizen update';exception when insufficient_privilege then null;end;
end $$;
set local request.jwt.claims='{"sub":"76c046c7-78dd-4b73-8d53-c93f4c4da002","role":"authenticated"}';
do $$declare d jsonb;begin d:=public.manari_ouvidoria_list();if (d->>'total')::int<>0 then raise exception 'FAIL: foreign owner visible';end if;end $$;
set local request.jwt.claims='{"sub":"76c046c7-78dd-4b73-8d53-c93f4c4da003","role":"authenticated"}';
do $$declare d jsonb;rid uuid;begin
 d:=public.manari_ouvidoria_list();if (d->>'total')::int<>2 then raise exception 'FAIL: admin list';end if;
 select id into rid from public.manari_ouvidoria_requests where protocol=current_setting('test.ouv_protocol');
 perform public.manari_ouvidoria_act(rid,'encaminhar','educacao');
 perform public.manari_ouvidoria_act(rid,'responder','Resposta fictícia para validar a consulta segura.');
 perform public.manari_ouvidoria_act(rid,'arquivar',null);
end $$;
set local role anon;
set local request.jwt.claims='{}';
do $$declare r jsonb;begin r:=public.manari_ouvidoria_track(current_setting('test.ouv_protocol'),current_setting('test.ouv_key'));if r->>'status'<>'arquivado' or r->>'response' is null or jsonb_array_length(r->'history')<>4 then raise exception 'FAIL: anonymous response/history';end if;end $$;
reset role;
rollback;
select 'PASS: anonymous receipt, key validation, owner isolation, admin actions and audit; fixtures rolled back' as result;
