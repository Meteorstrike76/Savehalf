-- Keep the first real inference test private; public access requires an explicit release.
alter table public.agent_config add column owner_only boolean not null default true;
