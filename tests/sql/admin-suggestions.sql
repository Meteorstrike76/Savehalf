-- Run using an owner SQL connection; every synthetic submission is rolled back.
begin;
select set_config('request.jwt.claims',json_build_object('sub',(select user_id from public.site_administrators limit 1),'role','authenticated','aal','aal1')::text,true);
set local role authenticated;
do $$
declare i integer; remaining integer;
begin
 assert public.site_is_admin(false),'Assigned administrator must be recognised';
 assert not public.site_is_admin(true),'MFA must be required for admin operations';
 assert not has_table_privilege('authenticated','public.site_administrators','INSERT'),'Users must not grant roles';
 assert not has_table_privilege('authenticated','public.deal_suggestions','INSERT'),'Direct inserts must be denied';
 assert not has_table_privilege('authenticated','public.deal_suggestions','UPDATE'),'Direct reviews must be denied';
 assert not has_table_privilege('anon','public.deal_suggestions','SELECT'),'Anonymous reads must be denied';
 begin
  perform public.review_suggestion(gen_random_uuid(),'approved','test');
  raise exception 'MFA review bypass';
 exception when raise_exception then assert sqlerrm='Administrator MFA required',sqlerrm;
 end;
 begin
  perform public.suggest_deal('deal','Test retailer','Validation test',' ',1,'');
  raise exception 'Blank source accepted';
 exception when raise_exception then assert sqlerrm in ('A deal needs a source link and price','Daily limit reached: three submissions'),sqlerrm;
 end;
 select greatest(0,3-count(*)) into remaining from public.deal_suggestions where user_id=auth.uid() and created_at>=date_trunc('day',now());
 for i in 1..remaining loop
  perform public.suggest_deal('product','Test retailer','Rollback test '||gen_random_uuid()::text,null,null,'transaction test');
 end loop;
 begin
  perform public.suggest_deal('product','Test retailer','Over daily cap',null,null,'');
  raise exception 'Daily quota bypass';
 exception when raise_exception then assert sqlerrm='Daily limit reached: three submissions',sqlerrm;
 end;
end $$;
select set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,'{aal}','"aal2"')::text,true);
do $$ begin assert public.site_is_admin(true),'MFA session should authorise assigned administrator'; end $$;
-- A different identity cannot read the owner's records or become an administrator.
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',true);
do $$ begin assert not public.site_is_admin(false),'Other identity must not be admin'; assert (select count(*)=0 from public.deal_suggestions),'RLS must isolate submissions'; end $$;
rollback;
select 'PASS: admin MFA, RLS isolation, no direct writes, source validation and daily cap; synthetic rows rolled back' as result;
