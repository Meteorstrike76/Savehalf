-- Read-only contract for the 34-table schema inspected 6 November 2026.
-- This checks effective TABLE grants separately from row policy behaviour.
-- Run as database owner; it deliberately fails on an unknown/new public table.
begin read only;
do $$
declare t record;r text;op text;expected boolean;
 public_read text[]:=array['cheap_eats','cheap_eats_sources','collection_daily','collection_status','deals','feature_flags','price_changes','price_monthly','provider_products'];
 owner_read text[]:=array['saved_deals','user_preferences','agent_lists','price_feedback','price_reports','deal_suggestions','admin_audit'];
 server_only text[]:=array['agent_cache','agent_checks','agent_config','agent_counters','agent_events','agent_feedback','agent_provider_state','agent_quality_review','agent_quality_seen','cheap_eats_run','collection_audit','collection_budget','community_feeds','integration_counters','meal_ai_usage','product_enrichment','scrape_runs','site_administrators'];
begin
 for t in select c.oid,c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' loop
  assert t.relname=any(public_read||owner_read||server_only),'Unreviewed table: '||t.relname;
  assert t.relrowsecurity,'RLS disabled: '||t.relname;
  foreach r in array array['anon','authenticated','service_role'] loop
   foreach op in array array['SELECT','INSERT','UPDATE','DELETE'] loop
    expected:=r='service_role'
     or(op='SELECT' and t.relname=any(public_read))
     or(r='authenticated' and op='SELECT' and t.relname=any(owner_read))
     or(r='authenticated' and t.relname=any(array['saved_deals','user_preferences']))
     or(r='authenticated' and op='DELETE' and t.relname='agent_lists');
    assert has_table_privilege(r,t.oid,op)=expected,format('Grant drift: %s %s %s',r,op,t.relname);
   end loop;
  end loop;
 end loop;
 assert (select count(*)=34 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),'Missing reviewed table';
 -- Supabase default UPDATE grant is present, but NO saved-deal UPDATE policy.
 assert not exists(select 1 from pg_policies where schemaname='public' and tablename='saved_deals' and cmd in ('ALL','UPDATE')),'Unexpected saved-deal UPDATE policy';
 assert exists(select 1 from pg_policies where schemaname='public' and tablename='saved_deals' and cmd='INSERT' and with_check='(auth.uid() = user_id)'),'Saved insert ownership changed';
 assert exists(select 1 from pg_policies where schemaname='public' and tablename='user_preferences' and cmd='UPDATE' and qual='(( SELECT auth.uid() AS uid) = user_id)' and with_check=qual),'Preference ownership changed';
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
do $$
declare t text;n bigint;
begin
 foreach t in array array['saved_deals','user_preferences','agent_lists','price_feedback','price_reports','deal_suggestions'] loop
  execute format('select count(*) from public.%I where user_id <> auth.uid()',t) into n;
  assert n=0,'Cross-user read: '||t;
 end loop;
 assert not public.site_is_admin(true),'Synthetic identity has admin access';
end $$;
reset role;
-- Non-row privileges are NOT protected by RLS. Report rather than hide them.
select c.relname as table_name,r as role,'TRUNCATE bypasses RLS; review separately' as warning
from pg_class c join pg_namespace n on n.oid=c.relnamespace
cross join unnest(array['anon','authenticated']) r
where n.nspname='public' and c.relkind='r' and has_table_privilege(r,c.oid,'TRUNCATE');
select 'PASS: 34-table grants and synthetic-user read isolation; warnings are separate' as result;
rollback;
