-- Additive retailer coverage only; public freshness and write policies unchanged.
alter table public.provider_products drop constraint provider_products_store_check;
alter table public.provider_products add constraint provider_products_store_check check(store in ('Coles','Woolworths','Big W','Kmart','Chemist Warehouse','Priceline'));
