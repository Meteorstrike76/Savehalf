alter table public.scrape_runs add column run_kind text not null default 'scrape' check(run_kind in ('scrape','quality'));
alter table public.scrape_runs add column agent_summary jsonb check(pg_column_size(agent_summary)<2000);
