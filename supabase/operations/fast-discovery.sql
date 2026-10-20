begin;
alter table public.collection_status add column if not exists failure_count integer not null default 0;
alter table public.collection_status add column if not exists reserved_bytes bigint not null default 0;
alter table public.collection_status add column if not exists reserved_day date;
alter table public.collection_status add column if not exists next_run_after timestamptz;
alter table public.collection_status add column if not exists refresh_minutes integer;
alter table public.collection_status drop constraint collection_status_store_check;
alter table public.collection_status add constraint collection_status_store_check check(store in ('Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less','OzBargain'));
insert into public.collection_status(store,status,message) values('OzBargain','empty','Awaiting first RSS check') on conflict do nothing;

create table if not exists public.community_feeds(
 feed_key text primary key check(feed_key in ('frontpage','coles','woolworths')),
 label text not null,source_url text not null,status text not null default 'empty',message text not null default '',
 items jsonb not null default '[]'::jsonb check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=20),
 checked_at timestamptz,last_success_at timestamptz,etag text,modified text,
 failure_count integer not null default 0,retry_after timestamptz
);
alter table public.community_feeds enable row level security;
revoke all on public.community_feeds from anon,authenticated;
grant select(feed_key,label,source_url,status,message,items,checked_at,last_success_at,retry_after) on public.community_feeds to anon,authenticated;
drop policy if exists read_community_feeds on public.community_feeds;
create policy read_community_feeds on public.community_feeds for select to anon,authenticated using(true);
grant all on public.community_feeds to service_role;

create or replace function public.catalogue_interval(p_store text) returns integer language sql stable set search_path='' as $$
 select case when p_store='OzBargain' then 15 when p_store='Aldi' then 720 when p_store='Best & Less' then 360
 when p_store in ('Coles','Woolworths') then case when extract(isodow from now() at time zone 'Australia/Sydney')=3 and extract(hour from now() at time zone 'Australia/Sydney') between 5 and 12 then 60 else 120 end else 1440 end;
$$;
revoke all on function public.catalogue_interval(text) from public,anon,authenticated;
grant execute on function public.catalogue_interval(text) to service_role;

create or replace function public.catalogue_run_due(p_store text) returns boolean language plpgsql stable set search_path='' as $$
declare r public.collection_status;minutes integer;daily integer;
begin
 select * into r from public.collection_status where store=p_store;if not found then return false;end if;
 minutes:=public.catalogue_interval(p_store);daily:=case when p_store='OzBargain' then 96 when p_store in ('Coles','Woolworths') then 18 when p_store='Aldi' then 2 when p_store='Best & Less' then 4 else 1 end;
 if r.status='running' and r.last_started>now()-interval '10 minutes' then return false;end if;
 if r.status in ('failed','empty') and r.last_started is not null then minutes:=greatest(minutes,case when r.drift_flag then 2880 when p_store='OzBargain' then least(360,15*power(2,least(5,greatest(1,r.failure_count))))::integer else least(2880,360*power(2,least(3,greatest(0,r.failure_count-1))))::integer end);end if;
 if r.last_started>now()-make_interval(mins=>minutes)+interval '30 seconds' then return false;end if;
 if r.run_day=(now() at time zone 'Australia/Sydney')::date and r.attempts>=daily then return false;end if;
 return true;
end $$;
revoke all on function public.catalogue_run_due(text) from public,anon,authenticated;
grant execute on function public.catalogue_run_due(text) to service_role;

create or replace function public.start_catalogue_run(p_token text,p_store text) returns boolean language plpgsql security definer set search_path='' as $$
declare r public.collection_status;d date:=(now() at time zone 'Australia/Sydney')::date;cap bigint;reserved bigint;
begin
 if p_token is null or p_token is distinct from (select decrypted_secret from vault.decrypted_secrets where name='savehalf_collection_token' limit 1) then return false;end if;
 if p_store not in ('Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less','OzBargain') or pg_database_size(current_database())>67108864 then return false;end if;
 select * into r from public.collection_status where store=p_store for update;
 if not found or not public.catalogue_run_due(p_store) then return false;end if;
 cap:=case when p_store='Aldi' then 12000000 when p_store='Coles' then 4000000 when p_store in ('Woolworths','Best & Less') then 2000000 when p_store='OzBargain' then 250000 else 8000000 end;
 insert into public.collection_budget(day) values(d) on conflict do nothing;
 select reserved_bytes into reserved from public.collection_budget where day=d for update;
 if reserved+cap>100000000 then return false;end if;
 update public.collection_budget set reserved_bytes=reserved_bytes+cap where day=d;
 update public.collection_status set status='running',last_started=now(),run_day=d,attempts=case when run_day=d then attempts+1 else 1 end,reserved_bytes=cap,reserved_day=d,refresh_minutes=public.catalogue_interval(p_store) where store=p_store;return true;
end $$;
revoke all on function public.start_catalogue_run(text,text) from public,anon,authenticated;
grant execute on function public.start_catalogue_run(text,text) to service_role;

create or replace function public.finish_catalogue_run(p_token text,p_store text,p_bytes bigint) returns boolean language plpgsql security definer set search_path='' as $$
declare r public.collection_status;failures integer;minutes integer;
begin
 if p_token is null or p_token is distinct from (select decrypted_secret from vault.decrypted_secrets where name='savehalf_collection_token' limit 1) then return false;end if;
 select * into r from public.collection_status where store=p_store for update;
 if not found or r.reserved_bytes<=0 then return false;end if;
 -- Release only this run's unused reservation. Repeated completion cannot refund twice.
 update public.collection_budget set reserved_bytes=greatest(0,reserved_bytes-greatest(0,r.reserved_bytes-greatest(0,coalesce(p_bytes,r.reserved_bytes)))) where day=r.reserved_day;
 failures:=case when r.status='ok' then 0 else least(8,r.failure_count+1) end;minutes:=public.catalogue_interval(p_store);
 if r.status<>'ok' then minutes:=greatest(minutes,case when r.drift_flag then 2880 when p_store='OzBargain' then least(360,15*power(2,least(5,failures)))::integer else least(2880,360*power(2,least(3,failures-1)))::integer end);end if;
 update public.collection_status set reserved_bytes=0,reserved_day=null,failure_count=failures,next_run_after=last_started+make_interval(mins=>minutes),refresh_minutes=public.catalogue_interval(p_store) where store=p_store;return true;
end $$;
revoke all on function public.finish_catalogue_run(text,text,bigint) from public,anon,authenticated;
grant execute on function public.finish_catalogue_run(text,text,bigint) to service_role;

create or replace function public.invoke_catalogue_collection(p_store text) returns bigint language plpgsql security definer set search_path='' as $$
declare token text;req bigint;
begin
 if not public.catalogue_run_due(p_store) then return null;end if;
 if pg_database_size(current_database())>67108864 then return null;end if;
 if coalesce((select reserved_bytes from public.collection_budget where day=(now() at time zone 'Australia/Sydney')::date),0)>=100000000 then return null;end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='savehalf_collection_token' limit 1;
 select net.http_post(url:='https://mdbqlcnzbakimfjrfczz.supabase.co/functions/v1/catalogue-collect',headers:=jsonb_build_object('Content-Type','application/json','x-collection-token',token),body:=jsonb_build_object('store',p_store),timeout_milliseconds:=120000) into req;return req;
end $$;
revoke all on function public.invoke_catalogue_collection(text) from public,anon,authenticated;
grant execute on function public.invoke_catalogue_collection(text) to service_role;

-- Replace schedules by existing stable names; healthy Coles/Woolworths runs are due every
-- two hours, hourly on Wednesday 05:00–12:59 Sydney. Failed sources skip network calls.
select cron.schedule('savehalf-coles','0 * * * *',$q$select public.invoke_catalogue_collection('Coles');$q$);
select cron.schedule('savehalf-woolworths','5 * * * *',$q$select public.invoke_catalogue_collection('Woolworths');$q$);
select cron.schedule('savehalf-aldi','10 7,19 * * *',$q$select public.invoke_catalogue_collection('Aldi');$q$);
select cron.schedule('savehalf-bestless','35 1,7,13,19 * * *',$q$select public.invoke_catalogue_collection('Best & Less');$q$);
select cron.schedule('savehalf-ozbargain','*/15 * * * *',$q$select public.invoke_catalogue_collection('OzBargain');$q$);
commit;
