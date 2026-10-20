-- Forward-only recovery; retains historical prices and existing auth policies.
alter table public.collection_status add column if not exists failure_kind text;
alter table public.collection_status add column if not exists http_status integer;
alter table public.collection_status add column if not exists retry_after_seconds integer;
alter table public.collection_status add column if not exists review_required boolean not null default false;
alter table public.collection_status add column if not exists diagnostics jsonb not null default '[]';

-- Observations from a previous supermarket promotion week need rechecking.
-- This is a conservative review boundary, not a claimed publisher expiry date.
create or replace view public.current_deals with (security_invoker=true) as
select * from public.deals
where is_active and source_feed<>'seed' and last_seen_at>now()-interval '72 hours'
and (store_category not in ('Coles','Woolworths') or
 last_seen_at >= ((date_trunc('day',now() at time zone 'Australia/Sydney')-
 ((extract(isodow from now() at time zone 'Australia/Sydney')::integer+4)%7)*interval '1 day') at time zone 'Australia/Sydney'));
grant select on public.current_deals to anon,authenticated,service_role;
create or replace function public.catalogue_counts() returns table(store text,category text,products bigint,reductions bigint)
language sql stable set search_path='' as $$
select store_category,category,count(*),count(*) filter(where discount_pct>0)
from public.current_deals group by store_category,category order by store_category,category limit 35;
$$;

create table if not exists public.collection_daily(
 day date not null,store text not null,
 imports integer not null default 0,successful integer not null default 0,failed integer not null default 0,
 processed_rows bigint not null default 0,requests bigint not null default 0,body_bytes bigint not null default 0,
 first_recorded_at timestamptz not null,last_recorded_at timestamptz not null,
 primary key(day,store)
);
alter table public.collection_daily enable row level security;
revoke all on public.collection_daily from public,anon,authenticated;
grant select on public.collection_daily to anon,authenticated;
grant all on public.collection_daily to service_role;
create policy "Public aggregate collection health" on public.collection_daily for select to anon,authenticated using(true);
create or replace function public.record_collection_daily() returns trigger language plpgsql set search_path='' as $$
begin
 insert into public.collection_daily(day,store,imports,successful,failed,processed_rows,requests,body_bytes,first_recorded_at,last_recorded_at)
 values((new.at at time zone 'Australia/Sydney')::date,new.store,1,(new.status='ok')::integer,(new.status<>'ok')::integer,new.rows,new.requests,new.body_bytes,new.at,new.at)
 on conflict(day,store) do update set
 imports=public.collection_daily.imports+1,successful=public.collection_daily.successful+excluded.successful,
 failed=public.collection_daily.failed+excluded.failed,processed_rows=public.collection_daily.processed_rows+excluded.processed_rows,
 requests=public.collection_daily.requests+excluded.requests,body_bytes=public.collection_daily.body_bytes+excluded.body_bytes,
 last_recorded_at=excluded.last_recorded_at;
 return new;
end $$;
revoke all on function public.record_collection_daily() from public,anon,authenticated;
create trigger record_collection_daily after insert on public.collection_audit for each row execute function public.record_collection_daily();

-- Known access failure is paused until a maintainer verifies permitted access.
update public.collection_status set failure_kind='access',http_status=403,review_required=true
where store='Woolworths' and status='failed' and message like '%403%';

create or replace function public.catalogue_run_due(p_store text) returns boolean language plpgsql stable set search_path='' as $$
declare r public.collection_status;minutes integer;daily integer;
begin
 select * into r from public.collection_status where store=p_store;if not found or r.review_required then return false;end if;
 if r.next_run_after is not null and r.next_run_after>now()+interval '30 seconds' then return false;end if;
 minutes:=public.catalogue_interval(p_store);daily:=case when p_store='OzBargain' then 96 when p_store in ('Coles','Woolworths') then 18 when p_store='Aldi' then 2 when p_store='Best & Less' then 4 else 1 end;
 if r.status='running' and r.last_started>now()-interval '10 minutes' then return false;end if;
 if r.status in ('failed','empty') and r.last_started is not null then minutes:=greatest(minutes,case when r.drift_flag then 2880 when p_store='OzBargain' then least(360,15*power(2,least(5,greatest(1,r.failure_count))))::integer else least(2880,360*power(2,least(3,greatest(0,r.failure_count-1))))::integer end);end if;
 if r.last_started>now()-make_interval(mins=>minutes)+interval '30 seconds' then return false;end if;
 if r.run_day=(now() at time zone 'Australia/Sydney')::date and r.attempts>=daily then return false;end if;
 return true;
end $$;

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
 update public.collection_status set reserved_bytes=0,reserved_day=null,failure_count=failures,next_run_after=greatest(last_started+make_interval(mins=>minutes),last_started+make_interval(secs=>coalesce(r.retry_after_seconds,0))),refresh_minutes=public.catalogue_interval(p_store) where store=p_store;return true;
end $$;

revoke all on function public.catalogue_run_due(text) from public,anon,authenticated;
grant execute on function public.catalogue_run_due(text) to service_role;
revoke all on function public.finish_catalogue_run(text,text,bigint) from public,anon,authenticated;
grant execute on function public.finish_catalogue_run(text,text,bigint) to service_role;

create or replace function public.cleanup_planning_records() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.collection_daily where day<(now() at time zone 'Australia/Sydney')::date-30;
 delete from public.price_feedback where created_at<now()-interval '90 days';
 delete from public.collection_audit where at<now()-interval '14 days';
 delete from public.collection_audit where id in (select id from (select id,row_number() over(partition by store order by at desc,id desc) as rank from public.collection_audit) r where rank>30);
 delete from public.collection_budget where day<(now() at time zone 'Australia/Sydney')::date-14;
end $$;
