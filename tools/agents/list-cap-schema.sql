create or replace function public.agent_save_list(p_user uuid,p_request uuid,p_items jsonb,p_budget integer) returns uuid
language plpgsql set search_path='' as $$
declare result uuid; canonical jsonb; n integer;
begin
 perform pg_advisory_xact_lock(71426483);
 if pg_database_size(current_database())>67108864 or (select count(*) from public.agent_lists)>=1000 then raise exception 'Free storage guardrail reached';end if;
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
