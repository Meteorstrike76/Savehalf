-- Additive agent infrastructure. Existing catalogue, users and favourites untouched.
create table public.agent_config (
 id boolean primary key default true check(id), enabled boolean not null default false,
 primary_model text not null default 'openai/gpt-oss-20b',
 fallback_model text not null default '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
 fallback_enabled boolean not null default false,
 daily_tokens integer not null default 150000 check(daily_tokens between 0 and 150000),
 updated_at timestamptz not null default now()
);
insert into public.agent_config(id) values(true);
create table public.agent_counters (
 bucket text primary key check(length(bucket)<=150), calls integer not null default 0,
 tokens integer not null default 0, expires_at timestamptz not null
);
create index agent_counter_expiry on public.agent_counters(expires_at);
create table public.agent_cache (
 hash text primary key check(length(hash)=64), plan jsonb not null check(pg_column_size(plan)<=3000),
 expires_at timestamptz not null
);
create index agent_cache_expiry on public.agent_cache(expires_at);
create table public.agent_events (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 subject text not null check(length(subject)=64), agent text not null check(agent in ('deal','quality','planner')),
 tool text, provider text, reserved_tokens integer not null default 0,
 latency_ms integer not null default 0, status text not null check(length(status)<=40)
);
create index agent_event_expiry on public.agent_events(created_at);
create table public.agent_feedback (
 event_id uuid primary key references public.agent_events(id) on delete cascade,
 vote smallint not null check(vote in (-1,1)), created_at timestamptz not null default now()
);
create table public.agent_provider_state (
 provider text primary key check(provider in ('groq','cloudflare')),
 failures integer not null default 0, blocked_until timestamptz
);
insert into public.agent_provider_state(provider) values ('groq'),('cloudflare');
-- Private: only bounded Edge handler may access these; no anon/authenticated policies.
DO $$ declare t text; begin foreach t in array array['agent_config','agent_counters','agent_cache','agent_events','agent_feedback','agent_provider_state'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public, anon, authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to service_role',t);
end loop; end $$;
-- Caller is service_role only; invoker, pinned search_path; lock makes reservations atomic.
create function public.agent_reserve(p_subject text,p_ip text,p_signed boolean,p_provider text default 'request') returns boolean
language plpgsql set search_path='' as $$
declare cfg public.agent_config; k text; lim integer; d text:=to_char(now() at time zone 'UTC','YYYY-MM-DD'); m text:=to_char(now() at time zone 'UTC','YYYY-MM-DD-HH24-MI');
begin
 if length(p_subject)<>64 or length(p_ip)<>64 or p_provider not in ('request','groq','cloudflare') then return false; end if;
 perform pg_advisory_xact_lock(71426482);
 select * into cfg from public.agent_config where id;
 if not cfg.enabled or pg_database_size(current_database())>67108864 then return false; end if;
 if p_provider='request' then
   -- User cap and independent network cap. Unknown network has one shared bucket.
   if coalesce((select calls from public.agent_counters where bucket='u:'||d||':'||p_subject),0)>=(case when p_signed then 10 else 3 end) then return false; end if;
   if coalesce((select calls from public.agent_counters where bucket='i:'||d||':'||p_ip),0)>=20 then return false; end if;
   if coalesce((select calls from public.agent_counters where bucket='r:'||d),0)>=200 then return false; end if;
   foreach k in array array['u:'||d||':'||p_subject,'i:'||d||':'||p_ip,'r:'||d] loop
     insert into public.agent_counters(bucket,calls,expires_at) values(k,1,now()+interval '2 days') on conflict(bucket) do update set calls=agent_counters.calls+1;
   end loop;
 else
   if p_provider='cloudflare' and not cfg.fallback_enabled then return false; end if;
   if exists(select 1 from public.agent_provider_state where provider=p_provider and blocked_until>now()) then return false; end if;
   if coalesce((select tokens from public.agent_counters where bucket='t:'||d),0)+4000>cfg.daily_tokens then return false; end if;
   if coalesce((select calls from public.agent_counters where bucket='m:'||m),0)>=2 then return false; end if;
   lim:=case when p_provider='cloudflare' then 20 else 35 end;
   if coalesce((select calls from public.agent_counters where bucket=p_provider||':'||d),0)>=lim then return false; end if;
   insert into public.agent_counters(bucket,tokens,expires_at) values('t:'||d,4000,now()+interval '2 days') on conflict(bucket) do update set tokens=agent_counters.tokens+4000;
   foreach k in array array['m:'||m,p_provider||':'||d] loop
     insert into public.agent_counters(bucket,calls,expires_at) values(k,1,now()+interval '2 days') on conflict(bucket) do update set calls=agent_counters.calls+1;
   end loop;
 end if;
 return true;
end $$;
revoke all on function public.agent_reserve(text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.agent_reserve(text,text,boolean,text) to service_role;
create function public.agent_circuit(p_provider text,p_failed boolean) returns void language plpgsql set search_path='' as $$
begin
 update public.agent_provider_state set failures=case when p_failed then least(failures+1,3) else 0 end,
 blocked_until=case when p_failed and failures>=2 then now()+interval '10 minutes' else null end where provider=p_provider;
end $$;
revoke all on function public.agent_circuit(text,boolean) from public,anon,authenticated;
grant execute on function public.agent_circuit(text,boolean) to service_role;
create function public.prune_agents() returns void language plpgsql set search_path='' as $$
begin
 delete from public.agent_cache where expires_at<now();
 delete from public.agent_counters where expires_at<now();
 delete from public.agent_events where created_at<now()-interval '7 days';
end $$;
revoke all on function public.prune_agents() from public,anon,authenticated;
grant execute on function public.prune_agents() to service_role;
select cron.schedule('savehalf-agent-prune','25 3 * * *',$job$select public.prune_agents();$job$);
