create or replace function public.catalogue_run_due(p_store text) returns boolean language plpgsql stable set search_path='' as $$
declare r public.collection_status;minutes integer;daily integer;
begin
 select * into r from public.collection_status where store=p_store;if not found then return false;end if;
 minutes:=public.catalogue_interval(p_store);daily:=case when p_store='OzBargain' then 96 when p_store in ('Coles','Woolworths') then 18 when p_store='Aldi' then 2 when p_store='Best & Less' then 4 else 1 end;
 if r.status='running' and r.last_started>now()-interval '10 minutes' then return false;end if;
 if r.status in ('failed','empty') and r.last_started is not null then minutes:=greatest(minutes,case when r.drift_flag then 2880 when p_store='OzBargain' then least(360,15*power(2,least(5,greatest(1,r.failure_count))))::integer else least(2880,360*power(2,least(3,greatest(0,r.failure_count-1))))::integer end);end if;
 if r.last_started>now()-make_interval(mins=>minutes)+interval '30 seconds' then return false;end if;
 if r.run_day=(now() at time zone 'Australia/Sydney')::date and r.attempts>=daily then return false;end if;
 return true;
end $$;
revoke all on function public.catalogue_run_due(text) from public,anon,authenticated;
grant execute on function public.catalogue_run_due(text) to service_role;


