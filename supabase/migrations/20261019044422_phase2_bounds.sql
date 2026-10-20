create or replace function public.search_deals_range(p_query text default '',p_stores text[] default array['Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less'],p_category text default 'All',p_sale boolean default true,p_discount integer default 0,p_max numeric default 5000,p_sort text default 'discount',p_offset integer default 0,p_limit integer default 24,p_min numeric default 0)
 returns table(item jsonb,total_count bigint) language sql stable security invoker set search_path='' as $$
 with matches as (
 select d.*,count(*) over() as total from public.current_deals d
 where d.store_category=any(p_stores[1:7]) and (p_category='All' or d.category=p_category) and (not p_sale or d.discount_pct>0)
 and d.discount_price>=greatest(0,least(5000,p_min)) and d.discount_pct>=greatest(0,least(100,p_discount)) and d.discount_price<=greatest(0,least(5000,p_max))
 and (left(trim(p_query),60)='' or d.search_document@@websearch_to_tsquery('english',left(p_query,60))
 or d.title ilike '%'||replace(replace(left(p_query,60),'%','\%'),'_','\_')||'%'
 or (length(trim(p_query))>=3 and extensions.word_similarity(left(trim(p_query),60),d.title)>=0.45))
 ) select to_jsonb(m)-'search_document'-'total',m.total from matches m
 order by case when p_sort='unit' then m.unit_basis end asc nulls last,
 case when p_sort='unit' then m.unit_price end asc nulls last,
 case when p_sort='price' then m.discount_price end asc,
 case when p_sort='discount' then m.discount_pct end desc,
 case when p_sort in ('discount','newest') then m.published_at end desc,m.id
 limit greatest(1,least(48,p_limit)) offset greatest(0,least(5000,p_offset));
$$;

revoke all on function public.search_deals_range(text,text[],text,boolean,integer,numeric,text,integer,integer,numeric) from public;
grant execute on function public.search_deals_range(text,text[],text,boolean,integer,numeric,text,integer,integer,numeric) to anon,authenticated,service_role;
create or replace function public.record_public_retry(p_run uuid,p_seconds integer) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.collection_status s set retry_after_seconds=case when p_seconds>0 then least(172800,p_seconds) else null end from public.scrape_runs r where r.id=p_run and r.status='running' and s.store=r.store;
end $$;
revoke all on function public.record_public_retry(uuid,integer) from public,anon,authenticated;
grant execute on function public.record_public_retry(uuid,integer) to service_role;

-- Keep the original RPC signature for existing callers, without changing session settings.
create or replace function public.search_deals(p_query text default '',p_stores text[] default array['Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less'],p_category text default 'All',p_sale boolean default true,p_discount integer default 0,p_max numeric default 5000,p_sort text default 'discount',p_offset integer default 0,p_limit integer default 24)
 returns table(item jsonb,total_count bigint) language sql stable security invoker set search_path='' as $$
 select * from public.search_deals_range(p_query,p_stores,p_category,p_sale,p_discount,p_max,p_sort,p_offset,p_limit,0);
$$;
