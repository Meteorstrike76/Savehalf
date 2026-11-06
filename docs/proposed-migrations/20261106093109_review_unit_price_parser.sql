-- B04: PROPOSED ONLY. No data updates, backfills, cron changes or history writes.
-- Stored generated columns do not recalculate when an immutable function changes.
-- A separately reviewed backfill is required after any future deployment.
create or replace function public.pack_measure(p_title text)
returns jsonb language plpgsql immutable set search_path='' as $$
declare
 m text[]; n integer; qty numeric; prefix text; suffix text;
 before_multi text[]; after_multi text[]; basis text;
begin
 -- Capacity, variable weight and ambiguous ranges are not package quantities.
 if p_title~*'(approx|random[ -]*weight|per[ ]*(kg|kilo)|[0-9][ ]*[-–][ ]*[0-9]|air[ -]*fryer|microwave|fridge|freezer|oven|kettle|washing[ -]*machine|capacity)' then return null;end if;
 select count(*) into n from regexp_matches(p_title,'\m([0-9]+(?:\.[0-9]+)?)[ ]*(kg|g|ml|l)\M','gi');
 if n=1 then
  m:=regexp_match(p_title,'\m([0-9]+(?:\.[0-9]+)?)[ ]*(kg|g|ml|l)\M','i');
  qty:=m[1]::numeric;
  -- Remove the actual SIZE match, not the first occurrence of its digits.
  prefix:=regexp_replace(p_title,'\m[0-9]+(?:\.[0-9]+)?[ ]*(kg|g|ml|l)\M.*$','','i');
  suffix:=regexp_replace(p_title,'^.*?\m[0-9]+(?:\.[0-9]+)?[ ]*(kg|g|ml|l)\M','','i');
  before_multi:=regexp_match(prefix,'\m([0-9]+)[ ]*[x×][ ]*$','i');
  after_multi:=regexp_match(suffix,'^[ ]*[x×][ ]*([0-9]+)\M','i');
  if before_multi is not null and after_multi is not null then return null;end if;
  if before_multi is not null then qty:=qty*before_multi[1]::numeric;
  elsif after_multi is not null then qty:=qty*after_multi[1]::numeric;
  elsif p_title~*'\m(pack|pk|count)\M|[x×]' then return null;end if;
  if lower(m[2]) in ('kg','l') then qty:=qty*1000;end if;
  basis:=case when lower(m[2]) in ('g','kg') then '100g' else '100ml' end;
 elsif n=0 then
  m:=regexp_match(p_title,'\m([0-9]+)[ -]*(?:pack|pk|count)\M','i');
  if m is null then m:=regexp_match(p_title,'^[ ]*([0-9]+)[ ]+(?:(?:small|medium|large|extra[ -]large)[ ]+)?eggs\M','i');end if;
  if m is null then return null;end if;
  qty:=m[1]::numeric;basis:='each';
 else return null;end if;
 if qty<=0 or qty>100000 then return null;end if;
 return jsonb_build_object('quantity',qty,'basis',basis);
end $$;
