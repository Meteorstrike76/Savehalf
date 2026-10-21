-- Public configuration is explicitly non-secret. Provider keys never belong here.
create table public.feature_flags(key text primary key check(key in ('assistant.v2','security.turnstile','enrichment.off','analytics.cloudflare','input.barcode')),enabled boolean not null default false,public_config jsonb not null default '{}' check(pg_column_size(public_config)<2048),updated_at timestamptz not null default now());
alter table public.feature_flags enable row level security;
revoke all on public.feature_flags from public,anon,authenticated;
grant select on public.feature_flags to anon,authenticated;
grant all on public.feature_flags to service_role;
create policy flags_public_read on public.feature_flags for select to anon,authenticated using(true);
insert into public.feature_flags(key) values('assistant.v2'),('security.turnstile'),('enrichment.off'),('analytics.cloudflare'),('input.barcode');
create table public.integration_counters(bucket text primary key,calls integer not null default 0,expires_at timestamptz not null);
alter table public.integration_counters enable row level security;
revoke all on public.integration_counters from public,anon,authenticated;
grant all on public.integration_counters to service_role;
create function public.integration_reserve(p_scope text,p_subject text,p_signed boolean default false) returns boolean language plpgsql set search_path='' as $$
declare d text:=to_char(now() at time zone 'UTC','YYYY-MM-DD');m text:=to_char(now() at time zone 'UTC','YYYY-MM-DD-HH24-MI');k text; lim integer;
begin
 if p_scope not in ('assistant','off','report') or length(p_subject)<>64 then return false;end if;
 perform pg_advisory_xact_lock(71426483);
 if pg_database_size(current_database())>100663296 then return false;end if;
 lim:=case when p_scope='assistant' then case when p_signed then 50 else 20 end when p_scope='report' then 10 else 20 end;
 if coalesce((select calls from public.integration_counters where bucket=p_scope||':user:'||d||':'||p_subject),0)>=lim then return false;end if;
 if coalesce((select calls from public.integration_counters where bucket=p_scope||':day:'||d),0)>=(case when p_scope='off' then 500 when p_scope='report' then 200 else 6000 end) then return false;end if;
 if p_scope='off' and coalesce((select calls from public.integration_counters where bucket='off:minute:'||m),0)>=12 then return false;end if;
 foreach k in array array[p_scope||':user:'||d||':'||p_subject,p_scope||':day:'||d,p_scope||':minute:'||m] loop
 insert into public.integration_counters(bucket,calls,expires_at) values(k,1,now()+interval '2 days') on conflict(bucket) do update set calls=integration_counters.calls+1;
 end loop;return true;
end; $$;
revoke all on function public.integration_reserve(text,text,boolean) from public,anon,authenticated;
grant execute on function public.integration_reserve(text,text,boolean) to service_role;
create table public.price_reports(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,deal_id uuid not null references public.deals(id) on delete cascade,reason text not null check(reason in ('price','expired','image','conditions')),status text not null default 'pending' check(status in ('pending','reviewed','dismissed')),created_at timestamptz not null default now());
alter table public.price_reports enable row level security;
revoke all on public.price_reports from public,anon,authenticated;
grant select on public.price_reports to authenticated;
grant all on public.price_reports to service_role;
create policy reports_owner_read on public.price_reports for select to authenticated using((select auth.uid())=user_id);
create index price_reports_review on public.price_reports(status,created_at);
create index price_reports_owner on public.price_reports(user_id,created_at);
create table public.product_enrichment(barcode text primary key check(barcode ~ '^[0-9]{8,14}$'),payload jsonb not null check(pg_column_size(payload)<4096),expires_at timestamptz not null,created_at timestamptz not null default now());
alter table public.product_enrichment enable row level security;
revoke all on public.product_enrichment from public,anon,authenticated;
grant all on public.product_enrichment to service_role;
alter table public.deals add column barcode text check(barcode is null or barcode ~ '^[0-9]{8,14}$');
create index deals_barcode_current on public.deals(barcode) where barcode is not null and is_active;
select cron.schedule('savehalf-integration-prune','45 3 * * *',$job$delete from public.integration_counters where expires_at<now();delete from public.product_enrichment where expires_at<now();delete from public.price_reports where created_at<now()-interval '90 days';$job$);
create function public.integration_cache_write(p_barcode text,p_payload jsonb,p_expires timestamptz) returns boolean language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(71426484);
 if pg_column_size(p_payload)>=4096 or p_expires>now()+interval '8 days' or p_expires<now() then return false;end if;
 if not exists(select 1 from public.product_enrichment where barcode=p_barcode) and (select count(*) from public.product_enrichment)>=2000 then return false;end if;
 insert into public.product_enrichment(barcode,payload,expires_at) values(p_barcode,p_payload,p_expires) on conflict(barcode) do update set payload=excluded.payload,expires_at=excluded.expires_at;return true;
end; $$;
revoke all on function public.integration_cache_write(text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.integration_cache_write(text,jsonb,timestamptz) to service_role;
create function public.integration_health() returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object('db_bytes',pg_database_size(current_database()),'pending_reports',(select count(*) from public.price_reports where status='pending'),'enrichment_rows',(select count(*) from public.product_enrichment),'agent_last_7_days',(select jsonb_agg(x) from (select status,count(*) as count from public.agent_events where created_at>now()-interval '7 days' group by status)x),'scrapes_last_7_days',(select jsonb_agg(x) from (select store,status,count(*) as count from public.scrape_runs where started_at>now()-interval '7 days' group by store,status)x),'low_rated',(select count(*) from public.agent_feedback where vote=-1));
$$;
revoke all on function public.integration_health() from public,anon,authenticated;
grant execute on function public.integration_health() to service_role;
