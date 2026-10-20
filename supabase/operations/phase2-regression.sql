-- This fixture rolls back its own subtransaction. No sample products remain.
do $$
declare d uuid;run uuid;old_count integer;check_count integer;
begin
 begin
  insert into public.deals(title,discount_price,original_price,store_category,category,external_id,deal_url,source_feed,last_seen_at)
  values('SAVEHALF TEST Milk 2L',4,5,'Aldi','Groceries','savehalf-transaction-test','https://www.aldi.com.au/','scraper',now()-interval '1 day') returning id into d;
  assert (select count(*) from public.price_changes where deal_id=d)=1,'Initial observation missing';
  update public.deals set last_seen_at=now() where id=d;
  assert (select count(*) from public.price_changes where deal_id=d)=1,'Unchanged checks created history rows';
  assert (select checks from public.price_changes where deal_id=d)=2,'Confirmation counter not updated';
  update public.deals set discount_price=3 where id=d;
  assert (select count(*) from public.price_changes where deal_id=d)=2,'Price change not recorded';
  assert (select unit_price from public.deals where id=d)=0.15,'Unit price mismatch';
  assert (select low from public.price_monthly where deal_id=d)=3,'Monthly low mismatch';
  assert (select count(*) from public.search_deals('SAVEHALF TEST',array['Aldi'],p_sale=>false,p_limit=>1))=1,'Search limit failed';
  assert not has_function_privilege('anon','public.pipeline_metrics()','execute'),'Owner metrics exposed';
  assert not has_function_privilege('authenticated','public.ingest_public_scrape(uuid,jsonb)','execute'),'Ingestion exposed';
  raise exception using errcode='Z0001',message='rollback successful fixture';
 exception when sqlstate 'Z0001' then null;
 end;
 assert not exists(select 1 from public.deals where external_id='savehalf-transaction-test'),'Fixture escaped rollback';
end $$;
