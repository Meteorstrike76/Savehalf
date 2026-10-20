-- Reviewed reproducible setup. Existing pg_cron, pg_net and Vault token are reused.
create table if not exists public.cheap_eats (
 id text primary key,source_key text not null check(source_key in ('friday','bistro','eatclub')),
 venue text not null,area text not null,title text not null,price numeric check(price>0 and price<=15),
 discount_pct integer check(discount_pct>0 and discount_pct<=50),kind text not null check(kind in ('weekly','menu','discount')),
 source_url text not null,venue_url text not null,terms_url text,available_days integer[] not null default '{}',
 expires_on date,conditions text not null,last_verified_at timestamptz not null,is_active boolean not null default true,
 check((kind='discount' and price is null and discount_pct is not null) or (kind<>'discount' and price is not null and discount_pct is null))
);
create index if not exists cheap_eats_fresh on public.cheap_eats(last_verified_at) where is_active;
alter table public.cheap_eats enable row level security;
revoke all on public.cheap_eats from public,anon,authenticated;
grant select on public.cheap_eats to anon,authenticated;
grant all on public.cheap_eats to service_role;
create policy "Public fresh food offers" on public.cheap_eats for select to anon,authenticated using(is_active and last_verified_at>now()-interval '48 hours' and (expires_on is null or expires_on >= (now() at time zone 'Australia/Sydney')::date));
create table if not exists public.cheap_eats_sources(source_key text primary key,status text not null default 'pending',message text not null default '',last_checked_at timestamptz,offers integer not null default 0);
alter table public.cheap_eats_sources enable row level security;
revoke all on public.cheap_eats_sources from public,anon,authenticated;
grant select on public.cheap_eats_sources to anon,authenticated;
grant all on public.cheap_eats_sources to service_role;
create policy "Public food source status" on public.cheap_eats_sources for select to anon,authenticated using(true);
insert into public.cheap_eats_sources(source_key) values('friday'),('bistro'),('eatclub') on conflict do nothing;
create table if not exists public.cheap_eats_run(id integer primary key check(id=1),run_day date,attempts integer not null default 0,status text not null default 'pending',last_started timestamptz,last_finished timestamptz);
insert into public.cheap_eats_run(id) values(1) on conflict do nothing;
alter table public.cheap_eats_run enable row level security;
revoke all on public.cheap_eats_run from public,anon,authenticated;
grant all on public.cheap_eats_run to service_role;
create or replace function public.start_cheap_eats_run(p_token text) returns boolean language plpgsql security definer set search_path='' as $$
declare r public.cheap_eats_run;d date := (now() at time zone 'Australia/Sydney')::date;
begin
 if p_token is null or p_token is distinct from (select decrypted_secret from vault.decrypted_secrets where name='savehalf_collection_token' limit 1) then return false;end if;
 select * into r from public.cheap_eats_run where id=1 for update;
 if r.status='running' and r.last_started>now()-interval '10 minutes' then return false;end if;
 if r.run_day=d and r.attempts>=2 then return false;end if;
 update public.cheap_eats_run set status='running',last_started=now(),run_day=d,attempts=case when run_day=d then attempts+1 else 1 end where id=1;return true;
end $$;
revoke all on function public.start_cheap_eats_run(text) from public,anon,authenticated;
grant execute on function public.start_cheap_eats_run(text) to service_role;
create or replace function public.invoke_cheap_eats_collection() returns bigint language plpgsql security definer set search_path='' as $$
declare req bigint;
begin
 select net.http_post(url:='https://mdbqlcnzbakimfjrfczz.supabase.co/functions/v1/cheap-eats-collect',headers:=jsonb_build_object('Content-Type','application/json','x-collection-token',(select decrypted_secret from vault.decrypted_secrets where name='savehalf_collection_token' limit 1)),body:='{}'::jsonb,timeout_milliseconds:=120000) into req;return req;
end $$;
revoke all on function public.invoke_cheap_eats_collection() from public,anon,authenticated;
grant execute on function public.invoke_cheap_eats_collection() to service_role;
select cron.schedule('savehalf-cheap-eats','30 19 * * *',$$select public.invoke_cheap_eats_collection();$$);
