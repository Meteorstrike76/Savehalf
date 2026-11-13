// Input: {health: <collection-health.sql result>, balance: {checked_at, credits_remaining}}.
// No network access, credentials, provider calls, reservations or publication.
import {readFile,stat} from 'node:fs/promises';
import {planProviderRefresh} from './lib/provider-refresh-plan.mjs';
const file=process.argv[2];
if(!file||process.argv.length!==3)throw Error('Usage: node scraper/src/provider-refresh-plan.mjs observations.json');
if((await stat(file)).size>2*1024*1024)throw Error('Observation file exceeds 2 MiB');
console.log(JSON.stringify(planProviderRefresh(JSON.parse(await readFile(file,'utf8'))),null,2));
