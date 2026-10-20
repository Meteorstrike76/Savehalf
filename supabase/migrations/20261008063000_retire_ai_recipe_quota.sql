create or replace function public.reserve_meal_request(p_user uuid) returns boolean
language sql security definer set search_path='' as $$select false;$$;
revoke all on function public.reserve_meal_request(uuid) from public,anon,authenticated,service_role;
comment on function public.reserve_meal_request(uuid) is 'Retired: token-consuming recipe generation was removed.';
