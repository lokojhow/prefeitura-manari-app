import {test} from 'node:test';import assert from 'node:assert/strict';
import {avaliarPoliticas} from './esic-auditoria-politicas.js';
test('identifica INSERT sem auth.uid',()=>{const r=avaliarPoliticas([{polname:'public_insert',polcmd:'a',check_expr:"requester_email is not null"}]);assert.equal(r.riscoDetectado,true);assert.match(r.riscos.join(' '),/INSERT/);});
test('identifica UPDATE administrativo amplo',()=>{const r=avaliarPoliticas([{polname:'staff_update',polcmd:'w',using_expr:'exists (select 1 from portal_staff_members where active)',check_expr:'true'}]);assert.equal(r.riscoDetectado,true);assert.match(r.riscos.join(' '),/UPDATE/);});
test('não aprova políticas automaticamente',()=>{const r=avaliarPoliticas([{polname:'owner',polcmd:'a',check_expr:'auth.uid() = user_id'}]);assert.equal(r.aprovado,false);});
