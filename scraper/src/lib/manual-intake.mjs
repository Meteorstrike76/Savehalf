import {parseReviewedCsv} from './reviewed-csv.mjs';

export const MANUAL_STORES = ['Coles', 'Woolworths', 'Aldi', 'Big W', 'Kmart', 'Target', 'Best & Less'];
export const MANUAL_COLUMNS = ['store', 'externalId', 'title', 'price', 'was', 'url', 'sourceUrl', 'region', 'checkedAt', 'promotionEndsAt', 'reviewed', 'image'];
const HOSTS = {Coles:'coles.com.au', Woolworths:'woolworths.com.au', Aldi:'aldi.com.au', 'Big W':'bigw.com.au', Kmart:'kmart.com.au', Target:'target.com.au', 'Best & Less':'bestandless.com.au'};
const MAX_AGE_MS = 72 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

function retailerUrl(value, host) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (url.hostname === host || url.hostname.endsWith('.' + host));
  } catch { return false; }
}
function cleanText(value) { return typeof value === 'string' ? value.trim() : ''; }
function safeCell(value) { return !/^[=+\-@\t\r\n]/.test(value) && !/[\u0000-\u001f\u007f]/.test(value); }
function validPrice(value) { return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 5000 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-7; }

export function validateCandidate(row, now = Date.now()) {
  const issues = [];
  if (!MANUAL_STORES.includes(row.store)) issues.push('Select a supported retailer');
  if (!cleanText(row.externalId) || cleanText(row.externalId).length > 120 || !safeCell(cleanText(row.externalId))) issues.push('Use a stable, spreadsheet-safe product ID (maximum 120 characters)');
  if (cleanText(row.title).length < 3 || cleanText(row.title).length > 200 || !safeCell(cleanText(row.title))) issues.push('Use a valid, spreadsheet-safe product title (3–200 characters)');
  if (!validPrice(row.price)) issues.push('Enter an explicit AUD price with at most two decimal places');
  if (row.was !== undefined && row.was !== null && (!validPrice(row.was) || row.was <= row.price)) issues.push('Previous selling price must be higher than the current price, or blank');
  const host = HOSTS[row.store];
  if (!host || !retailerUrl(row.url, host)) issues.push('Product URL must be the exact retailer HTTPS site');
  if (!host || !retailerUrl(row.sourceUrl, host)) issues.push('Source URL must be the exact retailer HTTPS site');
  if (cleanText(row.region).length < 2 || cleanText(row.region).length > 80 || !safeCell(cleanText(row.region))) issues.push('Specify the checked state or store (2–80 characters)');
  const checked = Date.parse(row.checkedAt);
  if (!Number.isFinite(checked) || checked > now || now - checked > MAX_AGE_MS) issues.push('Price must have been checked during the last 72 hours');
  const end = row.promotionEndsAt ? Date.parse(row.promotionEndsAt) : NaN;
  if (row.promotionEndsAt && (!Number.isFinite(end) || end <= now)) issues.push('Promotion end time must be in the future');
  if (['Coles', 'Woolworths'].includes(row.store) && (!Number.isFinite(end) || end <= now || end > now + 8 * DAY_MS)) issues.push('Coles/Woolworths require a verified end time within eight days');
  if (row.image && (!retailerUrl(row.image, host) || row.image.length > 1000)) issues.push('Image must be an authorised retailer HTTPS URL or blank');
  return issues;
}

export function importCandidates(csv, now = Date.now()) {
  const entries = parseReviewedCsv(csv);
  // Imported 'reviewed=true' does not grant approval in a new admin session.
  const candidates = entries.map(item => ({...item, reviewed:false, image:item.image||''}));
  const errors = candidates.flatMap((item, i) => validateCandidate(item, now).map(problem => 'CSV row ' + (i + 2) + ': ' + problem));
  if (errors.length) throw Error(errors.slice(0, 5).join('; ') + (errors.length > 5 ? '; additional invalid rows' : ''));
  return candidates;
}

export function checkedBatch(rows, now = Date.now()) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 150) throw Error('Choose 1–150 verified rows');
  const counts = new Map(), seen = new Set();
  for (const [index, row] of rows.entries()) {
    if (row.reviewed !== true) throw Error('Row ' + (index + 1) + ': explicit review is required');
    const issue = validateCandidate(row, now)[0];
    if (issue) throw Error('Row ' + (index + 1) + ': ' + issue);
    const key = row.store + ':' + row.externalId;
    if (seen.has(key)) throw Error('Duplicate retailer product ID: ' + key);
    seen.add(key);
    const count = (counts.get(row.store) || 0) + 1;
    counts.set(row.store, count);
    if (count > (['Coles', 'Woolworths'].includes(row.store) ? 30 : 20)) throw Error('Per-retailer reviewed import cap exceeded for ' + row.store);
  }
  return rows;
}

function escapeCsv(value) { return '"' + String(value ?? '').replace(/"/g, '""') + '"'; }
export function reviewedCsv(rows, now = Date.now()) {
  checkedBatch(rows, now);
  return [MANUAL_COLUMNS.join(','), ...rows.map(row => MANUAL_COLUMNS.map(column => escapeCsv(row[column] ?? '')).join(','))].join('\r\n') + '\r\n';
}
