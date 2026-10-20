begin;
insert into auth.users(id,email) values('aaaaaaaa-1111-4111-8111-111111111111','savehalf-rls-a@example.invalid'),('bbbbbbbb-1111-4111-8111-111111111111','savehalf-rls-b@example.invalid');
insert into public.user_preferences(user_id,stores) values('bbbbbbbb-1111-4111-8111-111111111111',array['Coles']);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-1111-4111-8111-111111111111","role":"authenticated"}',true);
do $$declare n integer;d uuid;begin
 insert into public.user_preferences(user_id,stores) values('aaaaaaaa-1111-4111-8111-111111111111',array['Aldi']);
 update public.user_preferences set stores=array['Kmart'] where user_id='aaaaaaaa-1111-4111-8111-111111111111';get diagnostics n=row_count;if n<>1 then raise exception 'Own update failed';end if;
 select count(*) into n from public.user_preferences where user_id='bbbbbbbb-1111-4111-8111-111111111111';if n<>0 then raise exception 'RLS exposed another account';end if;
 begin insert into public.user_preferences(user_id,stores) values('bbbbbbbb-1111-4111-8111-111111111111',array['Aldi']);raise exception 'Foreign write unexpectedly allowed';exception when insufficient_privilege then null;end;
 update public.user_preferences set stores=array['Kmart'] where user_id='bbbbbbbb-1111-4111-8111-111111111111';get diagnostics n=row_count;if n<>0 then raise exception 'Foreign update allowed';end if;
 delete from public.user_preferences where user_id='bbbbbbbb-1111-4111-8111-111111111111';get diagnostics n=row_count;if n<>0 then raise exception 'Foreign delete allowed';end if;
 delete from public.user_preferences where user_id='aaaaaaaa-1111-4111-8111-111111111111';get diagnostics n=row_count;if n<>1 then raise exception 'Own delete failed';end if;
 select id into d from public.deals where source_feed<>'seed' limit 1;
 perform public.report_stale_price(d,'Temporary transaction-only test report one');perform public.report_stale_price(d,'Temporary transaction-only test report two');perform public.report_stale_price(d,'Temporary transaction-only test report three');
 begin perform public.report_stale_price(d,'Temporary fourth report must be denied');raise exception 'Feedback quota failed';exception when raise_exception then if sqlerrm not like 'Three reports%' then raise;end if;end;
 begin insert into public.price_feedback(user_id,deal_id,note) values('aaaaaaaa-1111-4111-8111-111111111111',d,'Direct insert should be denied');raise exception 'Direct insert allowed';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
do $$begin
 begin perform public.report_stale_price('11111111-1111-4111-8111-111111111111','Anonymous report should be denied');raise exception 'Anonymous report allowed';exception when insufficient_privilege then null;end;
 begin perform 1 from public.collection_budget;raise exception 'Private collection budget exposed';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'Owner preferences, foreign-write denial, private reports, three-per-day quota and anonymous denial passed; all fixtures rolled back' as verification;
