const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
// Do NOT execute the migration. Compile only its parser definition under a test
// name in disposable in-memory PostgreSQL. No application tables or backfill.
const migration='docs/proposed-migrations/20261106093109_review_unit_price_parser.sql';
test('B04 PostgreSQL parser body handles all requested cases',async()=>{
 const sql=fs.readFileSync(migration,'utf8');
 assert(!/\b(update|insert|delete|alter table|cron\.)\b/i.test(sql.replace(/^--.*$/gm,'')));
 const definition=sql.match(/create or replace function public\.pack_measure\([\s\S]*?end \$\$;/i)?.[0];assert(definition);
 const db=new PGlite();
 try {
  await db.exec('create schema review_test');
  await db.exec(definition.replace('public.pack_measure','review_test.pack_measure'));
  const cases=[
   ['Rice 2 x 2kg',{quantity:4000,basis:'100g'}],
   ['12 x 25g',{quantity:300,basis:'100g'}],
   ['2 large eggs',{quantity:2,basis:'each'}],
   ['Air fryer 5L',null],
   ['500ml',{quantity:500,basis:'100ml'}],
   ['1.5L x 6',{quantity:9000,basis:'100ml'}],
   ['2 x 500g x 3',null],['Rice approx 1kg',null],['400g + 100g bonus',null]
  ];
  const failures=[];
  for(const [input,expected] of cases){
   const {rows}=await db.query('select review_test.pack_measure($1) as measure',[input]);
   try{assert.deepEqual(rows[0].measure,expected);console.log(`PASS ${JSON.stringify(input)} -> ${JSON.stringify(rows[0].measure)}`);}
   catch(error){failures.push(input);console.log(`FAIL ${JSON.stringify(input)} -> ${JSON.stringify(rows[0].measure)}; expected ${JSON.stringify(expected)}`);}
  }
  assert.deepEqual(failures,[]);
 }finally{await db.close();}
});
