"""Emit only the proposed parser under an isolated test name; never deploy SQL."""
import json
import re
from pathlib import Path

proposal = Path('docs/proposed-migrations/20261106093109_review_unit_price_parser.sql')
source = proposal.read_text()
match = re.search(r'create or replace function public\.pack_measure\([\s\S]*?end \$\$;', source, re.I)
if not match:
    raise SystemExit('Expected parser definition missing')
function = match[0].replace('public.pack_measure', 'review_native.pack_measure', 1)
cases = [
    ('Rice 2 x 2kg', {'quantity': 4000, 'basis': '100g'}),
    ('12 x 25g', {'quantity': 300, 'basis': '100g'}),
    ('2 large eggs', {'quantity': 2, 'basis': 'each'}),
    ('Air fryer 5L', None),
    ('500ml', {'quantity': 500, 'basis': '100ml'}),
    ('1.5L x 6', {'quantity': 9000, 'basis': '100ml'}),
    ('2 x 500g x 3', None),
    ('Rice approx 1kg', None),
    ('400g + 100g bonus', None),
]

def literal(value):
    return "'" + value.replace("'", "''") + "'"

rows = ',\n'.join('(' + literal(name) + ', ' +
                  ('null::jsonb' if expected is None else literal(json.dumps(expected)) + '::jsonb') + ')'
                  for name, expected in cases)
print("""\\set ON_ERROR_STOP on
begin;
select version() as native_engine;
do $$ begin assert current_setting('server_version_num')::int between 170000 and 179999, 'PostgreSQL 17 required'; end $$;
create schema review_native;
""")
print(function)
print("""
do $$
declare c record; actual jsonb; failures integer := 0;
begin
 for c in select * from (values
""" + rows + """
 ) as fixtures(input, expected) loop
  actual := review_native.pack_measure(c.input);
  if actual is not distinct from c.expected then
   raise notice 'PASS % -> %', c.input, actual;
  else
   failures := failures + 1;
   raise notice 'FAIL % -> %, expected %', c.input, actual, c.expected;
  end if;
 end loop;
 assert failures = 0, format('%s parser fixtures failed', failures);
 raise notice 'PASS: all 9 B04 fixtures on native PostgreSQL';
end $$;
rollback;
""")
