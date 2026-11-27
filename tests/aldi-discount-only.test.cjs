const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261128000000_aldi_discount_only.sql','utf8');
test('ALDI rule checks actual prices and retains security and freshness',()=>{
 assert.match(sql,/original_price > discount_price/);
 assert.match(sql,/discount_price >= 0/);
 assert.match(sql,/security_invoker=true/);
 assert.match(sql,/72:00:00/);
 assert.match(sql,/promotion_ends_at > now/);
 assert.doesNotMatch(sql,/discount_pct\s*>/);
});
test('meal planner uses the central publication view',()=>assert.match(fs.readFileSync('src/components/MealPlanner.tsx','utf8'),/from\('current_deals'\)/));
