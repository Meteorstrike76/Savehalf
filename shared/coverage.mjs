// Only the freshness-filtered catalogue_counts RPC may supply these rows.
export function coverageSummary(rows) {
 if (!Array.isArray(rows) || rows.length > 100) throw Error('Invalid coverage');
 const counts = new Map();
 for (const row of rows) {
  if (!row || typeof row.store !== 'string' || !/^[\p{L}\p{N} &'&–-]{1,60}$/u.test(row.store) ||
      !Number.isSafeInteger(Number(row.products)) || Number(row.products) < 0) throw Error('Invalid coverage');
  counts.set(row.store, (counts.get(row.store) || 0) + Number(row.products));
 }
 return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([store, products]) => ({store, products}));
}
export function coverageMetadata(rows) {
 const stores = rows === null ? [] : coverageSummary(rows).filter(r => r.products > 0).map(r => r.store);
 const names = stores.join(', ');
 return {
  title: names ? `SaveHalf · Collected prices from ${names}` : 'SaveHalf · Collected prices and source checks',
  description: names ? `Current direct catalogue: ${names}. Retailer-reported reductions, source checks and shopping tools. Confirm prices and conditions with the retailer.` : 'Browse collected prices, retailer-reported reductions and shopping tools. Live retailer coverage is unavailable or empty; confirm prices at the source.'
 };
}
export function applyCoverageMetadata(doc, rows) {
 const {title, description} = coverageMetadata(rows);
 doc.title = title;
 for (const [selector, value] of [
  ['meta[name="description"]',description], ['meta[property="og:title"]',title],
  ['meta[property="og:description"]',description]
 ]) doc.querySelector(selector)?.setAttribute('content', value);
}
export function renderCoverageMetadata(html, rows) {
 const {title,description}=coverageMetadata(rows);
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 return html.replace(/<title>[^<]*<\/title>/,`<title>${escape(title)}</title>`)
  .replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/,(_,a,b)=>a+escape(description)+b)
  .replace(/(<meta property="og:title" content=")[^"]*("\s*\/?>)/,(_,a,b)=>a+escape(title)+b)
  .replace(/(<meta property="og:description" content=")[^"]*("\s*\/?>)/,(_,a,b)=>a+escape(description)+b);
}
