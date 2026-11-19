alter table public.deals add column if not exists offer_conditions text;
-- Private implementation; public functions are SECURITY INVOKER entry points only.
create schema if not exists admin_private;
revoke all on schema admin_private from public;
grant usage on schema admin_private to anon,authenticated;
create table admin_private.settings(key text primary key,value jsonb not null,updated_at timestamptz not null default now());
insert into admin_private.settings values('analytics','true',now()),('imports','true',now()),('collection','true',now());
create table admin_private.roles(user_id uuid primary key references auth.users(id) on delete cascade,role text not null check(role in ('editor','viewer')));
create table admin_private.products(id uuid primary key default gen_random_uuid(),deal_id uuid references public.deals(id) on delete set null,payload jsonb not null,status text not null default 'draft' check(status in ('draft','approved','published','hidden','archived')),revision integer not null default 1,updated_at timestamptz not null default now());
create unique index managed_deal_identity on admin_private.products(deal_id) where deal_id is not null;
create table admin_private.history(id bigint generated always as identity primary key,product_id uuid not null references admin_private.products(id),revision integer not null,payload jsonb not null,status text not null,created_at timestamptz not null default now(),unique(product_id,revision));
create table admin_private.audit(id bigint generated always as identity primary key,actor uuid,action text not null,target text,created_at timestamptz not null default now());
create table admin_private.sources(retailer text primary key,collection_allowed boolean not null default false,display_allowed boolean not null default false,image_allowed boolean not null default false,paused boolean not null default true,evidence_url text,notes text not null default '',updated_at timestamptz not null default now());
create table admin_private.events(day date not null,event text not null,dimension text not null,entity text not null,store text not null,total integer not null default 1,primary key(day,event,dimension,entity,store));
create table admin_private.limits(day date primary key,events integer not null default 0,last_batch timestamptz);
insert into admin_private.sources(retailer) select unnest(array['Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less','IGA','Adore Beauty','Sephora','McDonald''s','KFC','Hungry Jack''s','Domino''s','Subway','JB Hi-Fi','Officeworks','The Good Guys','Bing Lee','Cotton On','UNIQLO','rebel','Kathmandu','IKEA','Supercheap Auto','Bunnings','Chemist Warehouse','Priceline']);
-- Existing admitted collectors keep their previous operating state; new sources remain paused.
update admin_private.sources set paused=false where retailer in ('Coles','Aldi','Big W','Kmart','Target','Best & Less');
do $$declare t text;begin foreach t in array array['settings','roles','products','history','audit','sources','events','limits'] loop execute format('alter table admin_private.%I enable row level security',t);execute format('revoke all on admin_private.%I from public,anon,authenticated',t);end loop;end$$;
create function admin_private.role() returns text language sql stable security definer set search_path='' as $$
 select case when public.site_is_admin(true) then 'owner' when auth.uid() is not null and auth.jwt()->>'aal'='aal2' then (select role from admin_private.roles where user_id=auth.uid()) else null end;
$$;
revoke all on function admin_private.role() from public,anon;
grant execute on function admin_private.role() to authenticated;
create function admin_private.validate_product(p jsonb) returns jsonb language plpgsql stable set search_path='' as $$
begin
 if jsonb_typeof(p)<>'object' or length(coalesce(p->>'title','')) not between 3 and 200 or coalesce(p->>'store','') not in ('Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less') or coalesce(p->>'category','') not in ('Groceries','Electronics','Home & Living','Fashion','Clearance') then raise exception 'Title, supported product retailer and category required';end if;
 if coalesce(p->>'price','') !~ '^\d{1,5}(\.\d{1,2})?$' or (p->>'price')::numeric<=0 then raise exception 'Invalid AUD price';end if;
 if coalesce(p->>'source_url','') !~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/[^[:space:]<>]*)?$' or length(p->>'source_url')>1000 then raise exception 'Exact HTTPS evidence URL required';end if;
 if length(coalesce(p->>'conditions',''))>1000 then raise exception 'Conditions too long';end if;
 if coalesce(p->>'region','') not in ('NSW','VIC','ACT','QLD','TAS','SA','NT','WA') then raise exception 'Observed region required before publication';end if;
 if coalesce(p->>'checked_at','')='' or (p->>'checked_at')::timestamptz>now() or (p->>'checked_at')::timestamptz<now()-interval '24 hours' then raise exception 'Evidence must be checked within 24 hours';end if;
 if coalesce(p->>'expires_at','')='' or (p->>'expires_at')::timestamptz<=now() or (p->>'expires_at')::timestamptz>now()+interval '60 days' then raise exception 'Future offer expiry required (maximum 60 days)';end if;
 if coalesce(p->>'image_url','')<>'' and ((p->>'image_url') !~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/[^[:space:]<>]*$' or length(p->>'image_url')>1000) then raise exception 'Invalid image URL';end if;
 return p - 'original_price' - 'discount_pct';
end$$;
revoke all on function admin_private.validate_product(jsonb) from public,anon,authenticated;
create function admin_private.console(p_action text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare r text:=admin_private.role(); result jsonb; item admin_private.products; old admin_private.products; d uuid; x jsonb; n integer; start_day date; end_day date;
begin
 if r is null then raise exception 'Administrator MFA required' using errcode='42501';end if;
 if p is null or jsonb_typeof(p)<>'object' or pg_column_size(p)>200000 then raise exception 'Payload too large';end if;
 start_day:=coalesce(nullif(p->>'from','')::date,(now() at time zone 'Australia/Sydney')::date-6);end_day:=coalesce(nullif(p->>'to','')::date,(now() at time zone 'Australia/Sydney')::date);
 if start_day<(now() at time zone 'Australia/Sydney')::date-90 or end_day>(now() at time zone 'Australia/Sydney')::date or end_day<start_day then raise exception 'Choose a valid range within 90 days';end if;
 if p_action='access' then return jsonb_build_object('role',r);end if;
 if p_action='overview' then return jsonb_build_object('role',r,'products',(select count(*) from public.deals),'active',(select count(*) from public.deals where is_active),'drafts',(select count(*) from admin_private.products where status='draft'),'reports',(select count(*) from public.price_reports where status='pending'),'db_bytes',pg_database_size(current_database()),'events_today',coalesce((select events from admin_private.limits where day=(now() at time zone 'Australia/Sydney')::date),0),'event_daily_cap',5000,'settings',(select jsonb_object_agg(key,value) from (select key,value from admin_private.settings union all select 'assistant',to_jsonb(enabled) from public.agent_config) flags));end if;
 if p_action='analytics' then return coalesce((select jsonb_agg(z) from (select event,dimension,entity,store,sum(total) as count from admin_private.events where day between start_day and end_day group by event,dimension,entity,store order by sum(total) desc limit 200)z),'[]');end if;
 if p_action='products' then return coalesce((select jsonb_agg(z) from (select * from admin_private.products where (coalesce(p->>'status','all')='all' or status=p->>'status') and (payload->>'title') ilike '%'||left(coalesce(p->>'search',''),80)||'%' order by updated_at desc,id limit 50 offset least(greatest(coalesce((p->>'page')::int,0),0),200)*50)z),'[]');end if;
 if p_action='catalogue' then return coalesce((select jsonb_agg(z) from (select id,title,store_category,category,discount_price,image_url,source_url,last_seen_at,is_active,promotion_ends_at from public.deals where title ilike '%'||left(coalesce(p->>'search',''),80)||'%' order by title,id limit 50 offset least(greatest(coalesce((p->>'page')::int,0),0),200)*50)z),'[]');end if;
 if p_action='sources' then return coalesce((select jsonb_agg(z) from (select s.*,to_jsonb(c)-'diagnostics' as health from admin_private.sources s left join public.collection_status c on c.store=s.retailer order by s.retailer)z),'[]');end if;
 if p_action='audit' then return coalesce((select jsonb_agg(z) from (select id,action,target,created_at from admin_private.audit order by id desc limit 50 offset least(greatest(coalesce((p->>'page')::int,0),0),200)*50)z),'[]');end if;
 if p_action='reports' then return coalesce((select jsonb_agg(z) from (select id,deal_id,reason,status,created_at from public.price_reports where status='pending' order by created_at limit 50)z),'[]');end if;
 if p_action='history' then return coalesce((select jsonb_agg(z) from (select revision,payload,status,created_at from admin_private.history where product_id=(p->>'id')::uuid order by revision desc limit 20)z),'[]');end if;
 if p_action='roles' then if r<>'owner' then raise exception 'Owner required' using errcode='42501';end if;return coalesce((select jsonb_agg(jsonb_build_object('user_id',user_id,'role',role)) from admin_private.roles),'[]');end if;
 if r='viewer' then raise exception 'Read-only administrator' using errcode='42501';end if;
 perform pg_advisory_xact_lock(7351932);
 if p_action='draft' then
  if (select count(*) from admin_private.products)>10000 or pg_database_size(current_database())>52428800 then raise exception 'Storage guard reached';end if;
  x:=p->'product';if jsonb_typeof(x)<>'object' or length(coalesce(x->>'title','')) not between 3 and 200 then raise exception 'Draft title required';end if;
  if nullif(p->>'id','') is null then insert into admin_private.products(payload) values(x) returning * into item;
  else select * into old from admin_private.products where id=(p->>'id')::uuid for update;if not found or old.revision<>coalesce((p->>'revision')::int,0) then raise exception 'Revision changed; reload before editing';end if;
   if old.status='published' then raise exception 'Hide the published product before editing';end if;
   insert into admin_private.history(product_id,revision,payload,status) values(old.id,old.revision,old.payload,old.status);
   update admin_private.products set payload=x,status='draft',revision=revision+1,updated_at=now() where id=old.id returning * into item;end if;result:=to_jsonb(item);
 elsif p_action='adopt' then
  select * into item from admin_private.products where deal_id=(p->>'deal_id')::uuid;if found then return to_jsonb(item);end if;
  select jsonb_build_object('title',title,'store',store_category,'category',category,'price',discount_price,'source_url',source_url,'image_url',image_url,'region',observed_region,'checked_at',last_seen_at,'expires_at',promotion_ends_at,'conditions','') into x from public.deals where id=(p->>'deal_id')::uuid;
  if x is null then raise exception 'Product not found';end if;
  insert into admin_private.products(payload,deal_id,status) values(x,(p->>'deal_id')::uuid,'published') returning * into item;result:=to_jsonb(item);
 elsif p_action in ('approve','publish','hide','archive','restore') then
  select * into old from admin_private.products where id=(p->>'id')::uuid for update;if not found or old.revision<>coalesce((p->>'revision')::int,0) then raise exception 'Revision changed; reload';end if;
  insert into admin_private.history(product_id,revision,payload,status) values(old.id,old.revision,old.payload,old.status);
  x:=old.payload;
  if p_action='restore' then select payload into x from admin_private.history where product_id=old.id and revision=(p->>'restore_revision')::int;if x is null then raise exception 'Revision unavailable';end if;end if;
  if p_action in ('approve','publish') then
   x:=admin_private.validate_product(x);
   if not exists(select 1 from admin_private.sources where retailer=x->>'store' and display_allowed and (coalesce(x->>'image_url','')='' or image_allowed)) then raise exception 'Display/image permission evidence must be recorded first';end if;
   if exists(select 1 from public.deals where id is distinct from old.deal_id and store_category=x->>'store' and lower(title)=lower(x->>'title') and is_active) then raise exception 'Possible duplicate; review existing product';end if;
  end if;
  if p_action='publish' then
   if old.deal_id is not null and exists(select 1 from public.deals where id=old.deal_id and store_category<>x->>'store') then raise exception 'Existing retailer cannot change';end if;
   if old.status<>'approved' then raise exception 'Approve this revision before publishing';end if;
   if (select value from admin_private.settings where key='imports')<>'true'::jsonb then raise exception 'Imports paused';end if;
   d:=coalesce(old.deal_id,gen_random_uuid());
   insert into public.deals(id,title,store_category,category,discount_price,original_price,discount_pct,image_url,deal_url,source_url,observed_region,last_seen_at,promotion_ends_at,source_feed,is_active,external_id,offer_conditions)
    values(d,x->>'title',x->>'store',x->>'category',(x->>'price')::numeric,null,0,nullif(x->>'image_url',''),x->>'source_url',x->>'source_url',x->>'region',(x->>'checked_at')::timestamptz,(x->>'expires_at')::timestamptz,'direct',true,'admin:'||old.id,x->>'conditions')
    on conflict(id) do update set title=excluded.title,category=excluded.category,discount_price=excluded.discount_price,original_price=null,discount_pct=0,image_url=excluded.image_url,deal_url=excluded.deal_url,source_url=excluded.source_url,observed_region=excluded.observed_region,last_seen_at=excluded.last_seen_at,promotion_ends_at=excluded.promotion_ends_at,is_active=true,offer_conditions=excluded.offer_conditions;
  end if;
  if p_action in ('hide','archive','restore') and old.deal_id is not null then update public.deals set is_active=false where id=old.deal_id;end if;
  update admin_private.products set payload=x,deal_id=coalesce(d,old.deal_id),status=case p_action when 'approve' then 'approved' when 'publish' then 'published' when 'hide' then 'hidden' when 'archive' then 'archived' else 'draft' end,revision=revision+1,updated_at=now() where id=old.id returning * into item;result:=to_jsonb(item);
 elsif p_action='setting' then
  if r<>'owner' or coalesce(p->>'key','') not in ('analytics','imports','collection','assistant') then raise exception 'Owner setting required';end if;
  if jsonb_typeof(p->'enabled')<>'boolean' then raise exception 'Boolean required';end if;
  if p->>'key'='assistant' then update public.agent_config set enabled=(p->>'enabled')::boolean,updated_at=now();else update admin_private.settings set value=p->'enabled',updated_at=now() where key=p->>'key';end if;result:='true';
 elsif p_action='source' then
  if r<>'owner' then raise exception 'Owner required';end if;
  if (coalesce((p->>'display_allowed')::boolean,false) or coalesce((p->>'image_allowed')::boolean,false) or coalesce((p->>'collection_allowed')::boolean,false)) and coalesce(p->>'evidence_url','')='' then raise exception 'Permission evidence URL required';end if;
  if length(coalesce(p->>'notes',''))>1000 or (coalesce(p->>'evidence_url','')<>'' and p->>'evidence_url' !~ '^https://[^[:space:]<>@]+$') then raise exception 'Invalid permission evidence';end if;
  if (coalesce((p->>'display_allowed')::boolean,false) or coalesce((p->>'collection_allowed')::boolean,false) or coalesce((p->>'image_allowed')::boolean,false)) and coalesce(p->>'evidence_url','')='' then raise exception 'Permission evidence URL required';end if;
  update admin_private.sources set collection_allowed=coalesce((p->>'collection_allowed')::boolean,false),display_allowed=coalesce((p->>'display_allowed')::boolean,false),image_allowed=coalesce((p->>'image_allowed')::boolean,false),paused=coalesce((p->>'paused')::boolean,true),evidence_url=nullif(p->>'evidence_url',''),notes=coalesce(p->>'notes',''),updated_at=now() where retailer=p->>'retailer';if not found then raise exception 'Unknown retailer';end if;result:='true';
 elsif p_action='test_collection' then
  if r<>'owner' or not exists(select 1 from admin_private.sources where retailer=p->>'retailer' and collection_allowed and not paused) or p->>'retailer' not in ('Coles','Aldi','Big W','Kmart','Target','Best & Less') then raise exception 'Supported admitted source required';end if;
  -- Existing invocation retains its due-window, request and byte reservation guards.
  perform public.invoke_catalogue_collection(p->>'retailer');result:=jsonb_build_object('queued',true,'note','Requested; inspect saved health for outcome. Existing run guards still apply.');
 elsif p_action='report' then
  if coalesce(p->>'status','') not in ('reviewed','dismissed') then raise exception 'Invalid report status';end if;update public.price_reports set status=p->>'status' where id=(p->>'id')::uuid;result:='true';
 elsif p_action='role' then
  if r<>'owner' or coalesce(p->>'role','') not in ('editor','viewer','remove') then raise exception 'Owner role control required';end if;
  d:=(p->>'user_id')::uuid;if exists(select 1 from public.site_administrators where user_id=d) then raise exception 'Existing owners cannot be modified here';end if;
  if p->>'role'='remove' then delete from admin_private.roles where user_id=d;else insert into admin_private.roles values(d,p->>'role') on conflict(user_id) do update set role=excluded.role;end if;result:='true';
 else raise exception 'Unknown administrator action';end if;
 insert into admin_private.audit(actor,action,target) values(auth.uid(),p_action,coalesce(item.id::text,left(coalesce(p->>'retailer',p->>'key',p->>'id',p->>'user_id',''),100)));
 delete from admin_private.history h where h.product_id=item.id and h.revision<item.revision-50;
 delete from admin_private.audit where created_at<now()-interval '90 days';
 return result;
end$$;
revoke all on function admin_private.console(text,jsonb) from public,anon;
grant execute on function admin_private.console(text,jsonb) to authenticated;
create function public.admin_console(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select admin_private.console(p_action,p_payload)$$;
revoke all on function public.admin_console(text,jsonb) from public,anon;
grant execute on function public.admin_console(text,jsonb) to authenticated;
-- Anonymous aggregate ingestion has no raw logs, user IDs, IPs, search text or arbitrary URLs.
create function admin_private.record_events(p_events jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare e jsonb; ev text; dim text; entity text; st text; amount int:=0;
begin
 if (select value from admin_private.settings where key='analytics')<>'true'::jsonb or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>20 or pg_column_size(p_events)>8000 or pg_database_size(current_database())>52428800 then return false;end if;
 perform pg_advisory_xact_lock(7351933);
 insert into admin_private.limits(day) values((now() at time zone 'Australia/Sydney')::date) on conflict do nothing;
 if (select events from admin_private.limits where day=(now() at time zone 'Australia/Sydney')::date)+jsonb_array_length(p_events)>5000 then return false;end if;
 if exists(select 1 from admin_private.limits where day=(now() at time zone 'Australia/Sydney')::date and last_batch>now()-interval '200 milliseconds') then return false;end if;
 for e in select * from jsonb_array_elements(p_events) loop
  ev:=e->>'event';dim:=e->>'dimension';entity:=left(coalesce(e->>'entity',''),80);st:='';
  if ev in ('product_view','outbound_click','impression','save','list','compare') then
   if entity !~ '^[0-9a-f-]{36}$' then continue;end if;
   select store_category into st from public.deals where id=entity::uuid and source_feed<>'seed';if not found then continue;end if;dim:='product';
  elsif ev in ('page_view','section_view','feature','search','zero_results') then
   if dim not in ('page','section','feature','category') or entity not in ('home','guides','deals','catalogue','saved','eats','watchlist','list','compare','meal','radar','search','Groceries','Electronics','Home & Living','Fashion','Clearance','All') then continue;end if;
  else continue;end if;
  insert into admin_private.events(day,event,dimension,entity,store) values((now() at time zone 'Australia/Sydney')::date,ev,dim,entity,coalesce(st,'')) on conflict on constraint events_pkey do update set total=admin_private.events.total+1;
  amount:=amount+1;
 end loop;
 update admin_private.limits set events=events+amount,last_batch=now() where day=(now() at time zone 'Australia/Sydney')::date;
 delete from admin_private.events where day<(now() at time zone 'Australia/Sydney')::date-90;delete from admin_private.limits where day<(now() at time zone 'Australia/Sydney')::date-90;
 return true;
end$$;
revoke all on function admin_private.record_events(jsonb) from public;
grant execute on function admin_private.record_events(jsonb) to anon,authenticated;
create function public.record_site_events(p_events jsonb) returns boolean language sql security invoker set search_path='' as $$select admin_private.record_events(p_events)$$;
revoke all on function public.record_site_events(jsonb) from public;
grant execute on function public.record_site_events(jsonb) to anon,authenticated;
create function admin_private.collection_gate() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status='running' and ((select value from admin_private.settings where key='collection')<>'true'::jsonb or exists(select 1 from admin_private.sources where retailer=new.store and paused)) then raise exception 'Collection paused by administrator';end if;return new;end$$;
revoke all on function admin_private.collection_gate() from public,anon,authenticated;
create trigger admin_collection_gate before update on public.collection_status for each row execute function admin_private.collection_gate();
-- Protect administrator-hidden products from being reactivated by a scheduled import.
create function admin_private.product_gate() returns trigger language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from admin_private.products where deal_id=new.id and status in ('hidden','archived')) and admin_private.role() is distinct from 'owner' and admin_private.role() is distinct from 'editor' then new.is_active:=false;end if;return new;end$$;
revoke all on function admin_private.product_gate() from public,anon,authenticated;
create trigger admin_product_gate before update on public.deals for each row execute function admin_private.product_gate();
-- Source files stay private; signed links are short-lived and only created by MFA administrators.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('admin-evidence','admin-evidence',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create function admin_private.evidence_capacity() returns boolean language sql stable security definer set search_path='' as $$select coalesce(sum(coalesce((metadata->>'size')::bigint,0)),0)<41943040 from storage.objects where bucket_id='admin-evidence'$$;
revoke all on function admin_private.evidence_capacity() from public,anon;
grant execute on function admin_private.evidence_capacity() to authenticated;
create policy admin_evidence_read on storage.objects for select to authenticated using(bucket_id='admin-evidence' and admin_private.role() in ('owner','editor','viewer'));
create policy admin_evidence_insert on storage.objects for insert to authenticated with check(bucket_id='admin-evidence' and admin_private.role() in ('owner','editor') and (storage.foldername(name))[1]=auth.uid()::text and admin_private.evidence_capacity());
select cron.schedule('savehalf-admin-retention','15 20 * * *',$job$delete from admin_private.events where day<(now() at time zone 'Australia/Sydney')::date-90;delete from admin_private.limits where day<(now() at time zone 'Australia/Sydney')::date-90;delete from admin_private.audit where created_at<now()-interval '90 days';$job$);
