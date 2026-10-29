create or replace function public.suggest_deal(p_kind text,p_retailer text,p_title text,p_url text default null,p_price numeric default null,p_conditions text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();result uuid;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'Confirmed sign-in required';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,73501));
 if pg_database_size(current_database())>100663296 or (select count(*) from public.deal_suggestions)>=20000 then raise exception 'Submissions temporarily full';end if;
 if (select count(*) from public.deal_suggestions where user_id=u and created_at>=date_trunc('day',now()))>=3 then raise exception 'Daily limit reached: three submissions';end if;
 if p_kind='deal' and (nullif(trim(p_url),'') is null or p_price is null) then raise exception 'A deal needs a source link and price';end if;
 if exists(select 1 from public.deal_suggestions where user_id=u and title=trim(p_title) and retailer=trim(p_retailer) and created_at>now()-interval '1 day') then raise exception 'You already submitted this today';end if;
 insert into public.deal_suggestions(user_id,kind,retailer,title,source_url,price,conditions) values(u,p_kind,trim(p_retailer),trim(p_title),nullif(trim(p_url),''),p_price,trim(p_conditions)) returning id into result;
 return result;
end $$;
