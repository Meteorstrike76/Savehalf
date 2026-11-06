-- Additive sibling-category counts. Match useDeals' direct and range paths.
-- No category argument: selecting a department must not hide sibling totals.
create or replace function public.catalogue_facets(
 p_query text default '',
 p_stores text[] default array['Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less'],
 p_sale boolean default false,
 p_discount integer default 0,
 p_max numeric default null,
 p_min numeric default 0,
 p_sort text default 'price'
)
returns table(category text, products bigint)
language sql stable security invoker
set search_path = ''
set statement_timeout = '5s'
as $function$
 with parameters as (
  select left(trim(coalesce(p_query,'')),60) as term,
   (trim(coalesce(p_query,''))<>'' or p_sort='unit' or coalesce(p_min,0)<>0) as use_range
 )
 select d.category,count(*)
 from public.current_deals d cross join parameters p
 where d.store_category=any(p_stores[1:7])
 and (not p_sale or d.discount_pct>0)
 and case when p.use_range then
   d.discount_price>=greatest(0,least(5000,coalesce(p_min,0)))
   and d.discount_price<=greatest(0,least(5000,coalesce(p_max,5000)))
   and d.discount_pct>=greatest(0,least(100,coalesce(p_discount,0)))
 else
   (p_max is null or d.discount_price<=p_max)
   and (coalesce(p_discount,0)=0 or d.discount_pct>=p_discount)
 end
 and (p.term='' or d.search_document@@websearch_to_tsquery('english',p.term)
  or d.title ilike '%'||replace(replace(p.term,'%','\%'),'_','\_')||'%'
  or (length(p.term)>=3 and extensions.word_similarity(p.term,d.title)>=0.45))
 group by d.category order by d.category;
$function$;
revoke all on function public.catalogue_facets(text,text[],boolean,integer,numeric,numeric,text) from public;
grant execute on function public.catalogue_facets(text,text[],boolean,integer,numeric,numeric,text) to anon,authenticated,service_role;
