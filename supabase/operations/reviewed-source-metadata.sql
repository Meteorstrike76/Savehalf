alter table public.deals add column if not exists observed_region text;
alter table public.deals add column if not exists source_url text;
alter table public.deals add column if not exists promotion_ends_at timestamptz;
-- Recreate to include the additive metadata columns and actual known expiries.
create or replace view public.current_deals with (security_invoker=true) as
select * from public.deals
where is_active and source_feed<>'seed' and last_seen_at>now()-interval '72 hours'
and (promotion_ends_at is null or promotion_ends_at>now())
and (store_category not in ('Coles','Woolworths') or
 last_seen_at >= ((date_trunc('day',now() at time zone 'Australia/Sydney')-
 ((extract(isodow from now() at time zone 'Australia/Sydney')::integer+4)%7)*interval '1 day') at time zone 'Australia/Sydney'));
