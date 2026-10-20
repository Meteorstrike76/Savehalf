create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create table if not exists public.collection_status (
 store text primary key check(store in ('Coles','Woolworths','Aldi','Big W','Kmart','Target')),
 last_started timestamptz,last_finished timestamptz,
 status text not null default 'pending' check(status in ('pending','running','ok','empty','failed')),
 saved integer not null default 0,sales integer not null default 0,
 message text not null default '',run_day date,attempts integer not null default 0
);
alter table public.collection_status enable row level security;
revoke all on public.collection_status from public,anon,authenticated;
grant select on public.collection_status to anon,authenticated;
grant all on public.collection_status to service_role;
create policy "Public collection coverage" on public.collection_status for select to anon,authenticated using(true);
insert into public.collection_status(store) values('Coles'),('Woolworths'),('Aldi'),('Big W'),('Kmart'),('Target') on conflict do nothing;
do $$begin
 if not exists(select 1 from vault.secrets where name='savehalf_collection_token') then
 perform vault.create_secret(gen_random_uuid()::text||gen_random_uuid()::text,'savehalf_collection_token','Private scheduled collector token');
 end if;
end $$;
create or replace function public.start_catalogue_run(p_token text,p_store text) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_row public.collection_status; d date := (now() at time zone 'Australia/Sydney')::date;
begin
 if p_token is null or p_token is distinct from (select decrypted_secret from vault.decrypted_secrets where name='savehalf_collection_token' limit 1) then return false;end if;
 select * into v_row from public.collection_status where store=p_store for update;
 if not found then return false;end if;
 if v_row.status='running' and v_row.last_started>now()-interval '10 minutes' then return false;end if;
 if v_row.run_day=d and v_row.attempts>=2 then return false;end if;
 update public.collection_status set status='running',last_started=now(),run_day=d,attempts=case when run_day=d then attempts+1 else 1 end where store=p_store;
 return true;
end $$;
revoke all on function public.start_catalogue_run(text,text) from public,anon,authenticated;
grant execute on function public.start_catalogue_run(text,text) to service_role;
create or replace function public.invoke_catalogue_collection(p_store text) returns bigint
language plpgsql security definer set search_path='' as $$
declare token text;req bigint;
begin
 if p_store not in ('Coles','Woolworths','Aldi','Big W','Kmart','Target') then raise exception 'Unknown store';end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='savehalf_collection_token' limit 1;
 select net.http_post(url:='https://mdbqlcnzbakimfjrfczz.supabase.co/functions/v1/catalogue-collect',headers:=jsonb_build_object('Content-Type','application/json','x-collection-token',token),body:=jsonb_build_object('store',p_store),timeout_milliseconds:=120000) into req;
 return req;
end $$;
revoke all on function public.invoke_catalogue_collection(text) from public,anon,authenticated;
grant execute on function public.invoke_catalogue_collection(text) to service_role;
select cron.schedule('savehalf-coles','0 19 * * *',$$select public.invoke_catalogue_collection('Coles');$$);
select cron.schedule('savehalf-woolworths','5 19 * * *',$$select public.invoke_catalogue_collection('Woolworths');$$);
select cron.schedule('savehalf-aldi','10 19 * * *',$$select public.invoke_catalogue_collection('Aldi');$$);
select cron.schedule('savehalf-bigw','15 19 * * *',$$select public.invoke_catalogue_collection('Big W');$$);
select cron.schedule('savehalf-kmart','20 19 * * *',$$select public.invoke_catalogue_collection('Kmart');$$);
select cron.schedule('savehalf-target','25 19 * * *',$$select public.invoke_catalogue_collection('Target');$$);
