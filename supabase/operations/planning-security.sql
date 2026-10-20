begin;
-- Preference sync extends the existing owner-only table without exposing other users.
grant delete on public.user_preferences to authenticated;
drop policy if exists delete_own_prefs on public.user_preferences;
create policy delete_own_prefs on public.user_preferences for delete to authenticated using((select auth.uid())=user_id);
create or replace function public.validate_store_preferences() returns trigger language plpgsql set search_path='' as $$
begin
 if cardinality(new.stores)>7 or exists(select 1 from unnest(new.stores) s where s not in ('Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less')) then raise exception 'Invalid retailer choices';end if;
 new.updated_at=now();return new;
end $$;
revoke all on function public.validate_store_preferences() from public,anon,authenticated;
drop trigger if exists validate_store_preferences on public.user_preferences;
create trigger validate_store_preferences before insert or update on public.user_preferences for each row execute function public.validate_store_preferences();
-- Feedback is private, authenticated, throttled and never changes product prices.
create table if not exists public.price_feedback(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,deal_id uuid not null references public.deals(id) on delete cascade,note text not null check(length(note) between 10 and 300),created_at timestamptz not null default now());
alter table public.price_feedback enable row level security;
revoke all on public.price_feedback from public,anon,authenticated;
grant select on public.price_feedback to authenticated;
grant all on public.price_feedback to service_role;
drop policy if exists read_own_feedback on public.price_feedback;
create policy read_own_feedback on public.price_feedback for select to authenticated using((select auth.uid())=user_id);
create schema if not exists savehalf_private;
revoke all on schema savehalf_private from public,anon;
grant usage on schema savehalf_private to authenticated,service_role;
create or replace function savehalf_private.report_stale_price(p_deal uuid,p_note text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());result uuid;
begin
 if uid is null then raise exception 'Sign in required';end if;
 if length(trim(p_note)) not between 10 and 300 or p_note ~ '[[:cntrl:]]' then raise exception 'Use 10 to 300 plain-text characters';end if;
 perform pg_advisory_xact_lock(hashtext('savehalf_feedback_global'));
 if (select count(*) from public.price_feedback where user_id=uid and created_at>now()-interval '1 day')>=3 then raise exception 'Three reports per day maximum';end if;
 if (select count(*) from public.price_feedback)>=1000 then raise exception 'Report capacity reached';end if;
 if not exists(select 1 from public.deals where id=p_deal and source_feed<>'seed') then raise exception 'Product unavailable';end if;
 insert into public.price_feedback(user_id,deal_id,note) values(uid,p_deal,trim(p_note)) returning id into result;return result;
end $$;
revoke all on function savehalf_private.report_stale_price(uuid,text) from public,anon,authenticated;
grant execute on function savehalf_private.report_stale_price(uuid,text) to authenticated;
create or replace function public.report_stale_price(p_deal uuid,p_note text) returns uuid language sql security invoker set search_path='' as $$ select savehalf_private.report_stale_price(p_deal,p_note); $$;
revoke all on function public.report_stale_price(uuid,text) from public,anon,authenticated;
grant execute on function public.report_stale_price(uuid,text) to authenticated;
-- Source telemetry is service-only; only safe aggregated status is public.
alter table public.collection_status add column if not exists request_count integer not null default 0;
alter table public.collection_status add column if not exists body_bytes integer not null default 0;
alter table public.collection_status add column if not exists image_count integer not null default 0;
alter table public.collection_status add column if not exists drift_flag boolean not null default false;
create table if not exists public.collection_audit(id bigint generated always as identity primary key,store text not null,at timestamptz not null default now(),status text not null,rows integer not null,requests integer not null,body_bytes integer not null,image_count integer not null,drift boolean not null default false);
alter table public.collection_audit enable row level security;
revoke all on public.collection_audit from public,anon,authenticated;
grant all on public.collection_audit to service_role;
grant usage,select on sequence public.collection_audit_id_seq to service_role;
create table if not exists public.collection_budget(day date primary key,reserved_bytes bigint not null default 0 check(reserved_bytes>=0));
alter table public.collection_budget enable row level security;
revoke all on public.collection_budget from public,anon,authenticated;
grant all on public.collection_budget to service_role;
create or replace function public.catalogue_counts() returns table(store text,category text,products bigint,reductions bigint) language sql stable security invoker set search_path='' as $$
 select store_category,category,count(*),count(*) filter(where discount_pct>0) from public.deals where is_active and source_feed<>'seed' and last_seen_at>now()-interval '72 hours' group by store_category,category order by store_category,category limit 35;
$$;
revoke all on function public.catalogue_counts() from public;
grant execute on function public.catalogue_counts() to anon,authenticated;
create or replace function public.start_catalogue_run(p_token text,p_store text) returns boolean language plpgsql security definer set search_path='' as $$
declare v_row public.collection_status;d date:=(now() at time zone 'Australia/Sydney')::date;cap bigint;reserved bigint;
begin
 if p_token is null or p_token is distinct from (select decrypted_secret from vault.decrypted_secrets where name='savehalf_collection_token' limit 1) then return false;end if;
 if p_store not in ('Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less') then return false;end if;
 if pg_database_size(current_database())>67108864 then return false;end if;
 select * into v_row from public.collection_status where store=p_store for update;
 if not found then return false;end if;
 if v_row.status='running' and v_row.last_started>now()-interval '10 minutes' then return false;end if;
 if v_row.status in ('failed','empty') and v_row.last_started>now()-interval '3 days' then return false;end if;
 if v_row.run_day=d and v_row.attempts>=(case when p_store='Best & Less' then 1 else 2 end) then return false;end if;
 cap:=case when p_store='Aldi' then 12000000 when p_store='Best & Less' then 4000000 else 8000000 end;
 insert into public.collection_budget(day) values(d) on conflict do nothing;
 select reserved_bytes into reserved from public.collection_budget where day=d for update;
 if reserved+cap>100000000 then return false;end if;
 update public.collection_budget set reserved_bytes=reserved_bytes+cap where day=d;
 update public.collection_status set status='running',last_started=now(),run_day=d,attempts=case when run_day=d then attempts+1 else 1 end where store=p_store;return true;
end $$;
revoke all on function public.start_catalogue_run(text,text) from public,anon,authenticated;
grant execute on function public.start_catalogue_run(text,text) to service_role;
create or replace function public.cleanup_planning_records() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.price_feedback where created_at<now()-interval '90 days';
 delete from public.collection_audit where at<now()-interval '14 days';
 delete from public.collection_audit where id in (select id from (select id,row_number() over(partition by store order by at desc,id desc) as rank from public.collection_audit) r where rank>30);
 delete from public.collection_budget where day<(now() at time zone 'Australia/Sydney')::date-14;
end $$;
revoke all on function public.cleanup_planning_records() from public,anon,authenticated;
grant execute on function public.cleanup_planning_records() to service_role;
-- Database maintenance only; no extra Edge invocation or retailer requests.
do $$begin if not exists(select 1 from cron.job where jobname='savehalf-planning-retention') then perform cron.schedule('savehalf-planning-retention','45 19 * * *','select public.cleanup_planning_records();');end if;end $$;
commit;

create index if not exists price_feedback_user_created_idx on public.price_feedback(user_id,created_at);
create index if not exists price_feedback_deal_idx on public.price_feedback(deal_id);
create index if not exists collection_audit_store_at_idx on public.collection_audit(store,at);

-- Cache the caller identity per statement, preserving existing ownership checks.
alter policy select_own_prefs on public.user_preferences using ((select auth.uid())=user_id);
alter policy insert_own_prefs on public.user_preferences with check ((select auth.uid())=user_id);
alter policy update_own_prefs on public.user_preferences using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
