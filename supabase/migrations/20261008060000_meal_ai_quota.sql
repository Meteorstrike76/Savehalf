create table if not exists public.meal_ai_usage (
 day date not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 requests integer not null default 0 check(requests>=0),
 primary key(day,user_id)
);
alter table public.meal_ai_usage enable row level security;
revoke all on public.meal_ai_usage from public,anon,authenticated;
grant all on public.meal_ai_usage to service_role;
create or replace function public.reserve_meal_request(p_user uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare d date := (now() at time zone 'Australia/Sydney')::date; n integer; total integer;
begin
 perform pg_advisory_xact_lock(921034,1);
 delete from public.meal_ai_usage where day<d-7;
 select coalesce(sum(requests),0) into total from public.meal_ai_usage where day=d;
 select requests into n from public.meal_ai_usage where day=d and user_id=p_user;
 if total>=100 or coalesce(n,0)>=5 then return false; end if;
 insert into public.meal_ai_usage(day,user_id,requests) values(d,p_user,1)
 on conflict(day,user_id) do update set requests=public.meal_ai_usage.requests+1;
 return true;
end $$;
revoke all on function public.reserve_meal_request(uuid) from public,anon,authenticated;
grant execute on function public.reserve_meal_request(uuid) to service_role;
