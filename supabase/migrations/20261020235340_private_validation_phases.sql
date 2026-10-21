alter table public.agent_checks add column phase text not null default 'search' check(phase in ('search','planner'));
