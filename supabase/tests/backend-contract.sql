begin;
select set_config('barbell.test_owner',gen_random_uuid()::text,true);
select set_config('barbell.test_other',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at) values(current_setting('barbell.test_owner')::uuid,'barbell-test-owner@example.invalid',now()),(current_setting('barbell.test_other')::uuid,'barbell-test-other@example.invalid',now());
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('barbell.test_owner'),'role','authenticated','email','barbell-test-owner@example.invalid')::text,true);
set local role authenticated;
do $$ declare token uuid:=gen_random_uuid(); r jsonb; e jsonb:='{"id":"verification-only","date":"2026-10-31","session":"Solo","base":"Snatch","weight":50,"sets":1,"reps":1,"structure":[{"base":"Snatch","position":["Hang Above Knee"],"reps":1}]}'; begin
 r:=public.barbell_apply_change(token,'updateEntry',e,null);
 if r->>'success'<>'true' or (r->>'revision')::int<>1 then raise exception 'Initial save failed';end if;
 r:=public.barbell_apply_change(token,'updateEntry',e,null);
 if (select count(*) from public.barbell_records)<>1 then raise exception 'Retry duplicated row';end if;
 r:=public.barbell_apply_change(gen_random_uuid(),'updateEntry',e||'{"weight":55}',1);
 if (r->>'revision')::int<>2 then raise exception 'Edit failed';end if;
 r:=public.barbell_apply_change(gen_random_uuid(),'updateEntry',e||'{"weight":60}',1);
 if r->>'conflict'<>'true' then raise exception 'Stale edit was not detected';end if;
 if (select weight from public.barbell_records where id='verification-only')<>55 then raise exception 'Conflict overwrote row';end if;
 r:=public.barbell_apply_change(gen_random_uuid(),'deleteEntry','{"id":"verification-only"}',2);
 if r->>'deleted'<>'true' then raise exception 'Delete failed';end if;
 if jsonb_array_length(public.barbell_get_all()->'entries')<>0 then raise exception 'Deleted row still visible';end if;
 r:=public.barbell_apply_change(gen_random_uuid(),'updateEntry',e,null);
 if r->>'conflict'<>'true' then raise exception 'Stale client resurrected deleted row';end if;
 token:=gen_random_uuid();perform public.barbell_save_snapshot(token,'device/test','{"version":4,"data":{"barbell_workout_v3":{"id":"test-plan"}}}');perform public.barbell_save_snapshot(token,'device/test','{"version":4,"data":{}}');
 if (select count(*) from public.barbell_snapshots)<>1 then raise exception 'Snapshot retry duplicated or overwrote';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('barbell.test_other'),'role','authenticated','email','barbell-test-other@example.invalid')::text,true);
do $$ begin
 if (select count(*) from public.barbell_records)<>0 or (select count(*) from public.barbell_snapshots)<>0 then raise exception 'Account isolation failed';end if;
 begin
  insert into public.barbell_records(owner_id,kind,id,data) values(current_setting('barbell.test_owner')::uuid,'lift','forbidden','{}');
  raise exception 'Cross-account insert was allowed';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 if has_table_privilege('anon','public.barbell_records','SELECT') or has_function_privilege('anon','public.barbell_get_all()','EXECUTE') or has_table_privilege('authenticated','barbell_private.legacy_imports','SELECT') then raise exception 'Unexpected public privilege';end if;
end $$;
rollback;
select 'Verified save/retry/edit/conflict/delete/tombstone/snapshot isolation; all fixtures rolled back' as result;
