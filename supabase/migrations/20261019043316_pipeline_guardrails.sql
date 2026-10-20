-- Service-only runner telemetry. Existing product IDs, favourites and auth users are untouched.
create table public.scrape_runs(
 id uuid primary key default gen_random_uuid(),store text not null references public.collection_status(store),
 started_at timestamptz not null default now(),finished_at timestamptz,
 status text not null check(status in ('running','ok','failed','blocked')),
 rows_added integer not null default 0 check(rows_added>=0),rows_updated integer not null default 0 check(rows_updated>=0),
 rows_failed integer not null default 0 check(rows_failed>=0),request_count integer not null default 0,body_bytes bigint not null default 0,
 snapshot_complete boolean not null default false,message text check(length(message)<=200));
create index scrape_runs_store_started on public.scrape_runs(store,started_at desc);
alter table public.scrape_runs enable row level security;
revoke all on public.scrape_runs from public,anon,authenticated;
grant all on public.scrape_runs to service_role;
create or replace function public.begin_public_scrape(p_store text) returns jsonb language plpgsql security definer set search_path='' as $$
declare token text;allowed boolean;rid uuid;
begin
 if p_store not in ('Aldi','Best & Less','Coles','Big W','Kmart','Target','Woolworths') then raise exception 'Unsupported store';end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='savehalf_collection_token' limit 1;
 allowed:=coalesce(public.start_catalogue_run(token,p_store),false);
 insert into public.scrape_runs(store,status,finished_at,message) values(p_store,case when allowed then 'running' else 'blocked' end,case when allowed then null else now() end,case when allowed then null else 'Paused, overlapping, not due or quota reached; no source request made.' end) returning id into rid;
 return jsonb_build_object('id',rid,'allowed',allowed);
end $$;
revoke all on function public.begin_public_scrape(text) from public,anon,authenticated;
grant execute on function public.begin_public_scrape(text) to service_role;
create or replace function public.finish_public_scrape(p_run uuid,p_status text,p_added integer,p_updated integer,p_failed integer,p_requests integer,p_bytes bigint,p_kind text default null) returns void language plpgsql security definer set search_path='' as $$
declare r public.scrape_runs;token text;ok boolean;
begin
 if p_status not in ('ok','failed') or least(p_added,p_updated,p_failed,p_requests,p_bytes)<0 then raise exception 'Invalid run metrics';end if;
 select * into r from public.scrape_runs where id=p_run for update;
 if not found or r.status<>'running' then raise exception 'Run is not active';end if;
 ok:=p_status='ok';
 update public.scrape_runs set status=p_status,finished_at=now(),rows_added=p_added,rows_updated=p_updated,rows_failed=p_failed,request_count=p_requests,body_bytes=p_bytes,message=case when ok then 'Bounded partial catalogue checked; disappearance expiry disabled.' else 'Source collection failed; prior prices were not refreshed.' end where id=p_run;
 update public.collection_status set status=p_status,last_finished=now(),last_success_at=case when ok then now() else last_success_at end,saved=case when ok then p_added+p_updated else saved end,request_count=p_requests,body_bytes=p_bytes,failure_kind=case when ok then null else coalesce(p_kind,'transport') end,review_required=not ok and coalesce(p_kind,'transport') in ('access','parser','policy'),message=case when ok then 'Public-source GitHub runner completed; partial coverage.' else 'Public-source run failed; see private scrape_runs.' end where store=r.store;
 insert into public.collection_audit(store,status,rows,requests,body_bytes,image_count,drift) values(r.store,p_status,case when ok then p_added+p_updated else 0 end,p_requests,p_bytes,0,false);
 select decrypted_secret into token from vault.decrypted_secrets where name='savehalf_collection_token' limit 1;
 perform public.finish_catalogue_run(token,r.store,p_bytes);
 delete from public.scrape_runs where started_at<now()-interval '30 days';
end $$;
revoke all on function public.finish_public_scrape(uuid,text,integer,integer,integer,integer,bigint,text) from public,anon,authenticated;
grant execute on function public.finish_public_scrape(uuid,text,integer,integer,integer,integer,bigint,text) to service_role;
create or replace function public.pipeline_metrics() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('database_bytes',pg_database_size(current_database()),'measured_at',now(),'tables',(select jsonb_agg(jsonb_build_object('table',c.relname,'estimated_rows',greatest(0,c.reltuples::bigint),'bytes',pg_total_relation_size(c.oid))) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),'last_30_days',(select jsonb_build_object('runs',count(*),'successful',count(*) filter(where status='ok'),'failed',count(*) filter(where status='failed'),'blocked',count(*) filter(where status='blocked')) from public.scrape_runs where started_at>now()-interval '30 days'));
$$;
revoke all on function public.pipeline_metrics() from public,anon,authenticated;
grant execute on function public.pipeline_metrics() to service_role;
create or replace function public.ingest_public_scrape(p_run uuid,p_rows jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.scrape_runs;n integer;added integer;
begin
 select * into r from public.scrape_runs where id=p_run for update;
 if not found or r.status<>'running' then raise exception 'Run is not active';end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 300 then raise exception 'Invalid batch';end if;
 if exists(select 1 from jsonb_array_elements(p_rows) x where x->>'store_category' is distinct from r.store or coalesce(length(x->>'external_id'),0) not between 1 and 200 or coalesce(length(x->>'title'),0) not between 1 and 300 or (x->>'discount_price')::numeric not between 0.01 and 5000) then raise exception 'Invalid product';end if;
 select count(*) into added from jsonb_array_elements(p_rows) x where not exists(select 1 from public.deals d where d.store_category=r.store and d.external_id=x->>'external_id');
 insert into public.deals(title,original_price,discount_price,store_category,category,image_url,deal_url,source_feed,external_id,last_seen_at,is_active,source_url)
 select x.title,x.original_price,x.discount_price,r.store,x.category,x.image_url,x.deal_url,'scraper',x.external_id,now(),true,x.deal_url
 from jsonb_to_recordset(p_rows) as x(title text,original_price numeric,discount_price numeric,category text,image_url text,deal_url text,external_id text)
 on conflict(store_category,external_id) do update set title=excluded.title,original_price=excluded.original_price,discount_price=excluded.discount_price,category=excluded.category,image_url=coalesce(excluded.image_url,deals.image_url),deal_url=excluded.deal_url,source_url=excluded.source_url,last_seen_at=excluded.last_seen_at,is_active=true;
 get diagnostics n=row_count;
 return jsonb_build_object('added',added,'updated',n-added);
end $$;
revoke all on function public.ingest_public_scrape(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.ingest_public_scrape(uuid,jsonb) to service_role;
