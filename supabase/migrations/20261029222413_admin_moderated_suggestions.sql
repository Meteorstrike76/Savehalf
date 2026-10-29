create table public.site_administrators(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
alter table public.site_administrators enable row level security;
revoke all on public.site_administrators from public,anon,authenticated;
grant all on public.site_administrators to service_role;
create function public.site_is_admin(p_require_mfa boolean default true) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.site_administrators a join auth.users u on u.id=a.user_id where a.user_id=(select auth.uid()) and u.email_confirmed_at is not null) and (not p_require_mfa or coalesce(auth.jwt()->>'aal','')='aal2');
$$;
revoke all on function public.site_is_admin(boolean) from public,anon;
grant execute on function public.site_is_admin(boolean) to authenticated;
create table public.deal_suggestions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,kind text not null check(kind in ('deal','product','store')),retailer text not null check(length(retailer) between 2 and 80),title text not null check(length(title) between 3 and 180),source_url text check(source_url is null or (length(source_url)<=1000 and source_url ~ '^https://[^/@?#[:space:]]+\.[^/@?#[:space:]]+(/[^[:space:]]*)?$')),price numeric(10,2) check(price>0 and price<=5000),conditions text not null default '' check(length(conditions)<=500),status text not null default 'pending' check(status in ('pending','needs_information','approved','rejected')),review_note text not null default '' check(length(review_note)<=500),created_at timestamptz not null default now(),reviewed_at timestamptz);
create index suggestions_owner_date on public.deal_suggestions(user_id,created_at desc);
create index suggestions_queue on public.deal_suggestions(status,created_at desc);
alter table public.deal_suggestions enable row level security;
revoke all on public.deal_suggestions from public,anon,authenticated;
grant select on public.deal_suggestions to authenticated;
grant all on public.deal_suggestions to service_role;
create policy suggestions_private_read on public.deal_suggestions for select to authenticated using(user_id=(select auth.uid()) or (select public.site_is_admin(true)));
create function public.suggest_deal(p_kind text,p_retailer text,p_title text,p_url text default null,p_price numeric default null,p_conditions text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();result uuid;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'Confirmed sign-in required';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,73501));
 if pg_database_size(current_database())>100663296 or (select count(*) from public.deal_suggestions)>=20000 then raise exception 'Submissions temporarily full';end if;
 if (select count(*) from public.deal_suggestions where user_id=u and created_at>=date_trunc('day',now()))>=3 then raise exception 'Daily limit reached: three submissions';end if;
 if p_kind='deal' and (p_url is null or p_price is null) then raise exception 'A deal needs a source link and price';end if;
 if exists(select 1 from public.deal_suggestions where user_id=u and title=trim(p_title) and retailer=trim(p_retailer) and created_at>now()-interval '1 day') then raise exception 'You already submitted this today';end if;
 insert into public.deal_suggestions(user_id,kind,retailer,title,source_url,price,conditions) values(u,p_kind,trim(p_retailer),trim(p_title),nullif(trim(p_url),''),p_price,trim(p_conditions)) returning id into result;
 return result;
end $$;
revoke all on function public.suggest_deal(text,text,text,text,numeric,text) from public,anon;
grant execute on function public.suggest_deal(text,text,text,text,numeric,text) to authenticated;
create table public.admin_audit(id bigint generated always as identity primary key,actor uuid references auth.users(id) on delete set null,suggestion_id uuid,action text not null,created_at timestamptz not null default now());
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from public,anon,authenticated;
grant select on public.admin_audit to authenticated;
grant all on public.admin_audit to service_role;
create policy audit_admin_read on public.admin_audit for select to authenticated using((select public.site_is_admin(true)));
create function public.review_suggestion(p_id uuid,p_status text,p_note text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.site_is_admin(true) then raise exception 'Administrator MFA required';end if;
 if p_status not in ('needs_information','approved','rejected') or length(p_note)>500 then raise exception 'Invalid review';end if;
 update public.deal_suggestions set status=p_status,review_note=p_note,reviewed_at=now() where id=p_id;
 if not found then raise exception 'Suggestion not found';end if;
 insert into public.admin_audit(actor,suggestion_id,action) values(auth.uid(),p_id,p_status);
end $$;
revoke all on function public.review_suggestion(uuid,text,text) from public,anon;
grant execute on function public.review_suggestion(uuid,text,text) to authenticated;
-- Retention is bounded; audit keeps no full submission or search text.
select cron.schedule('savehalf-submission-retention','40 20 * * *',$$delete from public.deal_suggestions where created_at<now()-interval '90 days';delete from public.admin_audit where created_at<now()-interval '90 days';$$);
