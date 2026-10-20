create table public.agent_quality_seen(hash text primary key check(length(hash)=64),created_at timestamptz not null default now());
create table public.agent_quality_review(hash text primary key references public.agent_quality_seen(hash),deal_id uuid references public.deals(id) on delete set null,flags jsonb not null check(pg_column_size(flags)<2000),suggestion jsonb check(pg_column_size(suggestion)<2000),status text not null default 'quarantined' check(status in ('quarantined','dismissed','reviewed')),created_at timestamptz not null default now());
alter table public.agent_quality_seen enable row level security;
alter table public.agent_quality_review enable row level security;
revoke all on public.agent_quality_seen,public.agent_quality_review from public,anon,authenticated;
grant select,insert,update,delete on public.agent_quality_seen,public.agent_quality_review to service_role;
create index agent_quality_expiry on public.agent_quality_review(created_at);
create or replace function public.prune_agents() returns void language plpgsql set search_path='' as $$
begin
 delete from public.agent_cache where expires_at<now();
 delete from public.agent_counters where expires_at<now();
 delete from public.agent_events where created_at<now()-interval '7 days';
 delete from public.agent_quality_review where created_at<now()-interval '30 days';
 -- Hash-only ledger retained to prevent repeat inference. Runner stops at 10,000 hashes.
end $$;
