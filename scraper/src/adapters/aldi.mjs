import {collect,getHtml} from '../lib/http-collect.mjs';
export default {http:true,async run(_ctx,log){const result=await collect('Aldi',getHtml);log(`ALDI: verified ${result.rows.length} catalogue products (${result.sales} reductions)`);return result.rows;}};
