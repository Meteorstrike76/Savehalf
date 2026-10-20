create table public.provider_products (
 id text primary key check(length(id) between 3 and 120),
 store text not null check(store in ('Coles','Woolworths','Big W','Kmart')),
 title text not null check(length(title) between 3 and 200),
 price numeric(10,2) not null check(price>0 and price<=5000),
 average_30d numeric(12,4) check(average_30d>0),
 product_url text not null check(product_url ~ '^https://'),
 image_url text check(image_url is null or image_url ~ '^https://images.whichgrocer.com/'),
 category text not null,
 source_updated_at timestamptz not null,
 retrieved_at timestamptz not null default now(),
 check(source_updated_at<=retrieved_at)
);
create index provider_products_store_price on public.provider_products(store,price,id);
create index provider_products_expiry on public.provider_products(retrieved_at);
alter table public.provider_products enable row level security;
revoke all on public.provider_products from anon,authenticated;
grant select on public.provider_products to anon,authenticated;
grant all on public.provider_products to service_role;
create policy "Recent attributed provider snapshots" on public.provider_products for select to anon,authenticated using(
 retrieved_at>now()-interval '72 hours' and source_updated_at>now()-interval '7 days' and source_updated_at<=now()
);
select cron.schedule('savehalf-provider-retention','55 19 * * *',$$delete from public.provider_products where retrieved_at<now()-interval '30 days';$$);
comment on table public.provider_products is 'WhichGrocer catalogue snapshots; not retailer was-prices. Remove on provider withdrawal. Public reads expire after 72h retrieval / 7d source age. Service writes only.';
