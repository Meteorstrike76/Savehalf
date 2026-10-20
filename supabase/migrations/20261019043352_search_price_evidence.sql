create extension if not exists pg_trgm with schema extensions;
-- A declaration parser, not product equivalence inference. Ambiguous sizes return NULL.
create or replace function public.pack_measure(p_title text) returns jsonb language plpgsql immutable set search_path='' as $$
declare m text[];n integer;qty numeric;prefix text;multi text[];basis text;
begin
 if p_title~*'(approx|random[ -]*weight|per[ ]*(kg|kilo)|[0-9][ ]*[-–][ ]*[0-9])' then return null;end if;
 select count(*) into n from regexp_matches(p_title,'\m([0-9]+(?:\.[0-9]+)?)[ ]*(kg|g|ml|l)\M','gi');
 if n=1 then
  m:=regexp_match(p_title,'\m([0-9]+(?:\.[0-9]+)?)[ ]*(kg|g|ml|l)\M','i');qty:=m[1]::numeric;
  prefix:=split_part(p_title,m[1],1);multi:=regexp_match(prefix,'\m([0-9]+)[ ]*[x×][ ]*$','i');
  if multi is not null then qty:=qty*multi[1]::numeric;elsif p_title~*'\mpack\M' then return null;end if;
  if lower(m[2]) in ('kg','l') then qty:=qty*1000;end if;
  basis:=case when lower(m[2]) in ('g','kg') then '100g' else '100ml' end;
 elsif n=0 then
  m:=regexp_match(p_title,'\m([0-9]+)[ -]*(?:pack|pk|count)\M','i');if m is null then return null;end if;qty:=m[1]::numeric;basis:='each';
 else return null;end if;
 if qty<=0 or qty>100000 then return null;end if;
 return jsonb_build_object('quantity',qty,'basis',basis);
end $$;
create or replace function public.declared_unit_price(p_title text,p_price numeric) returns numeric language sql immutable set search_path='' as $$
 select case when public.pack_measure(p_title) is not null then round(p_price/( (public.pack_measure(p_title)->>'quantity')::numeric / case when public.pack_measure(p_title)->>'basis'='each' then 1 else 100 end),4) end;
$$;
alter table public.deals add column unit_basis text generated always as (public.pack_measure(title)->>'basis') stored;
alter table public.deals add column unit_price numeric generated always as (public.declared_unit_price(title,discount_price)) stored;
alter table public.deals add column search_document tsvector generated always as (to_tsvector('english'::regconfig,title)) stored;
create index deals_search_document on public.deals using gin(search_document);
create index deals_title_trgm on public.deals using gin(title extensions.gin_trgm_ops);
create index deals_active_price on public.deals(store_category,discount_price,id) where is_active;
create index deals_active_newest on public.deals(published_at desc,id) where is_active;
create index deals_active_units on public.deals(unit_basis,unit_price,id) where is_active and unit_price is not null;
-- Append columns without dropping the existing view or changing product identifiers.
create or replace view public.current_deals with (security_invoker=true) as
 select id,title,original_price,discount_price,store_category,category,image_url,deal_url,published_at,source_feed,upvotes,coupon_code,external_id,last_seen_at,is_active,created_at,discount_pct,observed_region,source_url,promotion_ends_at,unit_basis,unit_price,search_document from public.deals
 where is_active and source_feed<>'seed' and last_seen_at>now()-interval '72 hours'
 and (promotion_ends_at is null or promotion_ends_at>now())
 and (store_category not in ('Coles','Woolworths') or last_seen_at>=((date_trunc('day',now() at time zone 'Australia/Sydney')-((extract(isodow from now() at time zone 'Australia/Sydney')::integer+4)%7)*interval '1 day') at time zone 'Australia/Sydney'));
create or replace function public.search_deals(p_query text default '',p_stores text[] default array['Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less'],p_category text default 'All',p_sale boolean default true,p_discount integer default 0,p_max numeric default 5000,p_sort text default 'discount',p_offset integer default 0,p_limit integer default 24)
 returns table(item jsonb,total_count bigint) language sql stable security invoker set search_path='' set pg_trgm.word_similarity_threshold='0.45' as $$
 with matches as (
 select d.*,count(*) over() as total from public.current_deals d
 where d.store_category=any(p_stores[1:7]) and (p_category='All' or d.category=p_category) and (not p_sale or d.discount_pct>0)
 and d.discount_pct>=greatest(0,least(100,p_discount)) and d.discount_price<=greatest(0,least(5000,p_max))
 and (left(trim(p_query),60)='' or d.search_document@@websearch_to_tsquery('english',left(p_query,60))
 or d.title ilike '%'||replace(replace(left(p_query,60),'%','\%'),'_','\_')||'%'
 or (length(trim(p_query))>=3 and d.title operator(extensions.%>) left(trim(p_query),60)))
 ) select to_jsonb(m)-'search_document'-'total',m.total from matches m
 order by case when p_sort='unit' then m.unit_basis end asc nulls last,
 case when p_sort='unit' then m.unit_price end asc nulls last,
 case when p_sort='price' then m.discount_price end asc,
 case when p_sort='discount' then m.discount_pct end desc,
 case when p_sort in ('discount','newest') then m.published_at end desc,m.id
 limit greatest(1,least(48,p_limit)) offset greatest(0,least(5000,p_offset));
$$;
revoke all on function public.search_deals(text,text[],text,boolean,integer,numeric,text,integer,integer) from public;
grant execute on function public.search_deals(text,text[],text,boolean,integer,numeric,text,integer,integer) to anon,authenticated,service_role;
create table public.price_changes(
 id bigint generated always as identity primary key,deal_id uuid not null references public.deals(id) on delete cascade,
 title text not null,price numeric not null check(price>0),was numeric,observed_at timestamptz not null,last_confirmed_at timestamptz not null,checks integer not null default 1 check(checks>0));
create index price_changes_product_at on public.price_changes(deal_id,observed_at desc);
alter table public.price_changes enable row level security;
revoke all on public.price_changes from public,anon,authenticated;
grant select on public.price_changes to anon,authenticated;
grant all on public.price_changes to service_role;
create policy read_observed_price_changes on public.price_changes for select to anon,authenticated using(exists(select 1 from public.deals d where d.id=deal_id));
create table public.price_monthly(
 deal_id uuid not null references public.deals(id) on delete cascade,month date not null,
 low numeric not null,high numeric not null,checks bigint not null,first_observed timestamptz not null,last_confirmed timestamptz not null,
 primary key(deal_id,month));
alter table public.price_monthly enable row level security;
revoke all on public.price_monthly from public,anon,authenticated;
grant select on public.price_monthly to anon,authenticated;
grant all on public.price_monthly to service_role;
create policy read_monthly_price_rollups on public.price_monthly for select to anon,authenticated using(exists(select 1 from public.deals d where d.id=deal_id));
-- Trigger lives outside the exposed schema; clients cannot manufacture history.
create or replace function savehalf_private.track_price_change() returns trigger language plpgsql security definer set search_path='' as $$
declare prior public.price_changes;
begin
 if new.source_feed='seed' or new.last_seen_at>now()+interval '5 minutes' then return new;end if;
 select * into prior from public.price_changes where deal_id=new.id order by observed_at desc,id desc limit 1 for update;
 if found and new.last_seen_at<prior.last_confirmed_at then raise exception 'Out-of-order product observation';end if;
 if found and prior.title=new.title and prior.price=new.discount_price and prior.was is not distinct from new.original_price and new.last_seen_at=prior.last_confirmed_at then return new;end if;
 if found and prior.title=new.title and prior.price=new.discount_price and prior.was is not distinct from new.original_price then
  if new.last_seen_at>prior.last_confirmed_at then update public.price_changes set last_confirmed_at=new.last_seen_at,checks=checks+1 where id=prior.id;end if;
 else
  insert into public.price_changes(deal_id,title,price,was,observed_at,last_confirmed_at) values(new.id,new.title,new.discount_price,new.original_price,new.last_seen_at,new.last_seen_at);
 end if;
 insert into public.price_monthly(deal_id,month,low,high,checks,first_observed,last_confirmed) values(new.id,date_trunc('month',new.last_seen_at at time zone 'UTC')::date,new.discount_price,new.discount_price,1,new.last_seen_at,new.last_seen_at) on conflict(deal_id,month) do update set low=least(price_monthly.low,excluded.low),high=greatest(price_monthly.high,excluded.high),checks=price_monthly.checks+1,last_confirmed=greatest(price_monthly.last_confirmed,excluded.last_confirmed);
 return new;
end $$;
revoke all on function savehalf_private.track_price_change() from public,anon,authenticated;
create trigger track_price_change after insert or update of discount_price,original_price,last_seen_at,title on public.deals for each row execute function savehalf_private.track_price_change();
-- Retained baseline observations, not reconstructed historic changes.
insert into public.price_changes(deal_id,title,price,was,observed_at,last_confirmed_at)
 select id,title,discount_price,original_price,last_seen_at,last_seen_at from public.deals where source_feed<>'seed' and last_seen_at<=now();
insert into public.price_monthly(deal_id,month,low,high,checks,first_observed,last_confirmed) select deal_id,date_trunc('month',observed_at at time zone 'UTC')::date,min(price),max(price),sum(checks),min(observed_at),max(last_confirmed_at) from public.price_changes group by deal_id,date_trunc('month',observed_at at time zone 'UTC')::date;
create or replace function public.prune_price_evidence() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.price_changes where last_confirmed_at<now()-interval '90 days';
 delete from public.price_monthly where month<(date_trunc('month',now())-interval '12 months')::date;
 delete from public.scrape_runs where started_at<now()-interval '30 days';
end $$;
revoke all on function public.prune_price_evidence() from public,anon,authenticated;
grant execute on function public.prune_price_evidence() to service_role;
select cron.schedule('savehalf-price-retention','50 19 * * *','select public.prune_price_evidence();');
