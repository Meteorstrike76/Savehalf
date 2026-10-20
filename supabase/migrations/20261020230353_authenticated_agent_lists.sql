create table public.agent_lists (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,items jsonb not null check(pg_column_size(items)<12000),
 budget_cents integer not null check(budget_cents between 0 and 500000),created_at timestamptz not null default now(),
 unique(user_id,request_id)
);
create index agent_list_owner on public.agent_lists(user_id,created_at desc);
alter table public.agent_lists enable row level security;
revoke all on public.agent_lists from public,anon,authenticated;
grant select,delete on public.agent_lists to authenticated;
grant select,insert,update,delete on public.agent_lists to service_role;
create policy agent_list_read_own on public.agent_lists for select to authenticated using((select auth.uid())=user_id);
create policy agent_list_delete_own on public.agent_lists for delete to authenticated using((select auth.uid())=user_id);
create function public.agent_save_list(p_user uuid,p_request uuid,p_items jsonb,p_budget integer) returns uuid
language plpgsql set search_path='' as $$
declare result uuid; canonical jsonb; n integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select id into result from public.agent_lists where user_id=p_user and request_id=p_request;
 if result is not null then return result;end if;
 if (select count(*) from public.agent_lists where user_id=p_user)>=20 then raise exception 'List limit reached (20)';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 12 then raise exception 'Invalid items';end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where jsonb_typeof(x->'quantity')<>'number' or (x->>'quantity')::numeric<>trunc((x->>'quantity')::numeric) or (x->>'quantity')::integer not between 1 and 20) then raise exception 'Invalid quantity';end if;
 select jsonb_agg(jsonb_build_object('id',d.id,'title',d.title,'quantity',(x->>'quantity')::integer,'price_cents',round(d.discount_price*100),'store',d.store_category,'checked',d.last_seen_at)),count(*) into canonical,n
 from jsonb_array_elements(p_items) x join public.current_deals d on d.id=(x->>'id')::uuid;
 if n<>jsonb_array_length(p_items) then raise exception 'Some prices are no longer current';end if;
 insert into public.agent_lists(user_id,request_id,items,budget_cents) values(p_user,p_request,canonical,p_budget) returning id into result;
 return result;
end $$;
revoke all on function public.agent_save_list(uuid,uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.agent_save_list(uuid,uuid,jsonb,integer) to service_role;
