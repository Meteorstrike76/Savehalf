-- Read-only operational report. Does not invoke collectors, change schedules,
-- consume provider credits, extend timestamps, or modify schema/RLS.
with direct_fresh as (
 select store_category as store,count(*) as fresh_records
 from public.current_deals group by store_category
), provider_health as (
 select store,count(*) as stored_records,
 count(*) filter(where source_updated_at<=retrieved_at and retrieved_at<=now()
  and retrieved_at>now()-interval '72 hours'
  and source_updated_at>now()-interval '7 days') as fresh_records,
 max(retrieved_at) as last_import,
 min(retrieved_at) filter(where source_updated_at<=retrieved_at and retrieved_at<=now()
  and retrieved_at>now()-interval '72 hours' and source_updated_at>now()-interval '7 days') as oldest_fresh_retrieval,
 min(source_updated_at) filter(where source_updated_at<=retrieved_at and retrieved_at<=now()
  and retrieved_at>now()-interval '72 hours' and source_updated_at>now()-interval '7 days') as oldest_fresh_source_update
 from public.provider_products group by store
), direct_health as (
 select s.store,s.status as last_run_status,s.review_required,s.failure_kind,
 s.last_started,s.last_finished,s.last_success_at,
 s.saved as previous_import_count,coalesce(f.fresh_records,0) as fresh_records,
 s.request_count,s.body_bytes,s.failure_count,s.diagnostics,
 coalesce(s.next_run_after,s.last_started+make_interval(mins=>s.refresh_minutes)) as expected_next,
 case
  when s.review_required then 'paused'
  when s.status='running' then 'running'
  when exists(select 1 from jsonb_array_elements(s.diagnostics) d where d->>'stage'='probe' and d->>'kind'='probe') then 'recovering'
  when s.status='ok' and coalesce(f.fresh_records,0)>0 then 'current'
  when s.status='ok' then 'stale'
  when coalesce(f.fresh_records,0)>0 then 'degraded'
  else s.status
 end as coverage_state
 from public.collection_status s left join direct_fresh f using(store)
), audits as (
 select store,count(*) as runs,count(*) filter(where status='ok') as successful_imports,
 count(*) filter(where status='probe_ok') as successful_probes,
 count(*) filter(where status='failed') as failed,
 count(*) filter(where status='quarantined') as quarantined,
 sum(requests) as requests,sum(body_bytes) as body_bytes
 from public.collection_audit where at>now()-interval '7 days' group by store
)
select jsonb_build_object(
 'checked_at',now(),
 'direct',(select jsonb_agg(to_jsonb(d)||jsonb_build_object('overdue',
  not d.review_required and d.last_run_status<>'running' and d.expected_next is not null
  and now()>d.expected_next+interval '30 minutes') order by d.store) from direct_health d),
 'provider',(select jsonb_agg(to_jsonb(p)||jsonb_build_object('coverage_state',
  case when p.fresh_records>0 then 'current' else 'stale' end) order by p.store) from provider_health p),
 'audit_7days',(select jsonb_agg(to_jsonb(a) order by a.store) from audits a)
) as collection_health;
