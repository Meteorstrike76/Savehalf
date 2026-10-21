-- Owner creates a short-lived, one-use validation job through the management connection.
-- The job ID is a bearer capability; results remain private, never returned publicly.
create table public.agent_checks (
 id uuid primary key default gen_random_uuid(),status text not null default 'queued' check(status in ('queued','running','complete','failed')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '5 minutes',
 result jsonb check(pg_column_size(result)<20000)
);
alter table public.agent_checks enable row level security;
revoke all on public.agent_checks from public,anon,authenticated;
grant select,insert,update,delete on public.agent_checks to service_role;
create function public.claim_agent_check(p_id uuid) returns boolean language plpgsql set search_path='' as $$
declare n integer;
begin
 if not exists(select 1 from public.agent_config where id and owner_only) then return false;end if;
 update public.agent_checks set status='running' where id=p_id and status='queued' and expires_at>now();
 get diagnostics n=row_count;return n=1;
end $$;
revoke all on function public.claim_agent_check(uuid) from public,anon,authenticated;
grant execute on function public.claim_agent_check(uuid) to service_role;
select cron.schedule('savehalf-agent-check-prune','35 3 * * *',$job$delete from public.agent_checks where created_at<now()-interval '1 day';$job$);
