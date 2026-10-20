// Kept as a retired endpoint so older cached clients cannot invoke a provider.
// This handler makes no network requests and reads no credentials.
Deno.serve(() => new Response(JSON.stringify({message:'Recipe generation has been removed. Use the built-in planner or free recipe links.'}),{
 status:410,
 headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'https://savehalf.vercel.app','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'}
}));
