begin;
alter table public.deals drop constraint deals_store_category_check;
alter table public.deals add constraint deals_store_category_check check(store_category in ('Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less'));
alter table public.collection_status drop constraint collection_status_store_check;
alter table public.collection_status add constraint collection_status_store_check check(store in ('Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less'));
insert into public.collection_status(store,status) values ('Best & Less','pending') on conflict(store) do nothing;
create or replace function public.start_catalogue_run(p_token text,p_store text) returns boolean language plpgsql security definer set search_path='' as $fn$
declare v_row public.collection_status; d date:=(now() at time zone 'Australia/Sydney')::date;
begin
 if p_token is null or p_token is distinct from (select decrypted_secret from vault.decrypted_secrets where name='savehalf_collection_token' limit 1) then return false;end if;
 select * into v_row from public.collection_status where store=p_store for update;
 if not found then return false;end if;
 if v_row.status='running' and v_row.last_started>now()-interval '10 minutes' then return false;end if;
 if p_store='Best & Less' and v_row.status='failed' and v_row.last_started>now()-interval '3 days' then return false;end if;
 if v_row.run_day=d and v_row.attempts>=(case when p_store='Best & Less' then 1 else 2 end) then return false;end if;
 update public.collection_status set status='running',last_started=now(),run_day=d,attempts=case when run_day=d then attempts+1 else 1 end where store=p_store;
 return true;
end $fn$;
revoke all on function public.start_catalogue_run(text,text) from public,anon,authenticated;
grant execute on function public.start_catalogue_run(text,text) to service_role;
create or replace function public.invoke_catalogue_collection(p_store text) returns bigint language plpgsql security definer set search_path='' as $fn$
declare token text;req bigint;
begin
 if p_store not in ('Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less') then raise exception 'Unknown store';end if;
 -- Skip the network invocation too while a pilot source is paused.
 if p_store='Best & Less' and exists(select 1 from public.collection_status where store=p_store and ((status='failed' and last_started>now()-interval '3 days') or (run_day=(now() at time zone 'Australia/Sydney')::date and attempts>=1))) then return null;end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='savehalf_collection_token' limit 1;
 select net.http_post(url:='https://mdbqlcnzbakimfjrfczz.supabase.co/functions/v1/catalogue-collect',headers:=jsonb_build_object('Content-Type','application/json','x-collection-token',token),body:=jsonb_build_object('store',p_store),timeout_milliseconds:=120000) into req;
 return req;
end $fn$;
revoke all on function public.invoke_catalogue_collection(text) from public,anon,authenticated;
commit;

-- Enabled after the successful hosted test:
select cron.schedule('savehalf-bestless','35 19 * * *',$$select public.invoke_catalogue_collection('Best & Less');$$);
