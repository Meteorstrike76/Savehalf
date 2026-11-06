-- Read-only PostgreSQL fixture test. No retailer data is inserted.
-- Derived from the migration body; regenerate this test if the body changes.
begin;
set local role anon;
with fixtures as (
 select 'Groceries'::text category,'Aldi'::text store_category,'Rice 1kg'::text title,2::numeric discount_price,50::int discount_pct,to_tsvector('english','Rice 1kg') search_document from generate_series(1,140)
 union all select 'Fashion','Best & Less','Shirt',10,75,to_tsvector('english','Shirt') from generate_series(1,10)
 union all select 'Home & Living','Aldi','Sofa',6001,0,to_tsvector('english','Sofa')
), cases(name,p_query,p_stores,p_sale,p_discount,p_max,p_min,p_sort,expected) as (values
 ('all','',array['Aldi','Best & Less'],false,0,null::numeric,0::numeric,'price',151),
 ('sale','',array['Aldi','Best & Less'],true,0,null,0,'price',150),
 ('maximum','',array['Aldi','Best & Less'],false,0,5,0,'price',140),
 ('minimum-range','',array['Aldi','Best & Less'],false,0,null,5,'price',10),
 ('unit-range','',array['Aldi','Best & Less'],false,0,null,0,'unit',150),
 ('search','rice',array['Aldi','Best & Less'],false,0,null,0,'price',140),
 ('literal-percent','%',array['Aldi','Best & Less'],false,0,null,0,'price',0),
 ('empty-stores','',array[]::text[],false,0,null,0,'price',0),
 ('discount','',array['Aldi','Best & Less'],false,75,null,0,'price',10),
 ('store','',array['Best & Less'],false,0,null,0,'price',10)
)
select c.name,c.expected,coalesce(sum(f.products),0) as actual,
 coalesce(sum(f.products),0)=c.expected as passed
from cases c left join lateral (
with parameters as (
  select left(trim(coalesce(c.p_query,'')),60) as term,
   (trim(coalesce(c.p_query,''))<>'' or c.p_sort='unit' or coalesce(c.p_min,0)<>0) as use_range
 )
 select d.category,count(*) as products
 from fixtures d cross join parameters p
 where d.store_category=any(c.p_stores[1:7])
 and (not c.p_sale or d.discount_pct>0)
 and case when p.use_range then
   d.discount_price>=greatest(0,least(5000,coalesce(c.p_min,0)))
   and d.discount_price<=greatest(0,least(5000,coalesce(c.p_max,5000)))
   and d.discount_pct>=greatest(0,least(100,coalesce(c.p_discount,0)))
 else
   (c.p_max is null or d.discount_price<=c.p_max)
   and (coalesce(c.p_discount,0)=0 or d.discount_pct>=c.p_discount)
 end
 and (p.term='' or d.search_document@@websearch_to_tsquery('english',p.term)
  or d.title ilike '%'||replace(replace(p.term,'%','\%'),'_','\_')||'%'
  or (length(p.term)>=3 and extensions.word_similarity(p.term,d.title)>=0.45))
 group by d.category order by d.category
) f on true group by c.name,c.expected order by c.name;
rollback;
