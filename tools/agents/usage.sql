-- Owner-only dashboard queries; do not expose service_role or these tables in the browser.
select enabled,daily_tokens,primary_model,fallback_enabled from public.agent_config;
select pg_database_size(current_database()) as db_bytes;
select bucket,calls,tokens from public.agent_counters where bucket !~ '^[ui]:' order by bucket;
select agent,status,count(*) as requests,sum(reserved_tokens) as reserved_tokens,round(avg(latency_ms)) as mean_latency_ms from public.agent_events where created_at>now()-interval '1 day' group by agent,status;
select provider,failures,blocked_until from public.agent_provider_state;
select status,count(*) from public.agent_quality_review group by status;
select store,finished_at,status,agent_summary from public.scrape_runs where run_kind='quality' order by finished_at desc limit 20;
