/** Offline CSV intake. No network or database access. */
const COLUMNS = ['store', 'externalId', 'title', 'price', 'was', 'url', 'sourceUrl', 'region', 'checkedAt', 'promotionEndsAt', 'reviewed', 'image'];
const REQUIRED = ['store', 'externalId', 'title', 'price', 'url', 'sourceUrl', 'region', 'checkedAt', 'reviewed'];

function records(text) {
  const rows = [];
  let row = [], field = '', quoted = false, closed = false, atStart = true;
  const finishField = () => { row.push(field); field = ''; atStart = true; closed = false; };
  const finishRow = () => { finishField(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === ',' || c === '\r' || c === '\n') {
      if (c === ',') finishField();
      else { finishRow(); if (c === '\r' && text[i + 1] === '\n') i++; }
    } else if (c === '"' && atStart) {
      quoted = true; atStart = false;
    } else {
      if (c === '"' || closed) throw Error('Malformed CSV field near character ' + (i + 1));
      field += c; atStart = false;
    }
  }
  if (quoted) throw Error('CSV contains an unclosed quoted field');
  if (row.length || field || closed || !atStart) finishRow();
  return rows;
}

function aud(value, column, row) {
  if (!/^\d{1,4}(?:\.\d{1,2})?$/.test(value)) throw Error('Row ' + row + ': ' + column + ' must be an AUD amount such as 4.50 (no currency symbols)');
  const amount = Number(value);
  if (amount <= 0 || amount > 5000) throw Error('Row ' + row + ': invalid ' + column);
  return amount;
}

export function parseReviewedCsv(source) {
  if (typeof source !== 'string' || new TextEncoder().encode(source).length > 128 * 1024) throw Error('CSV must be text under 128 KiB');
  const parsed = records(source.replace(/^\uFEFF/, ''));
  if (parsed.length < 2) throw Error('CSV needs a header and at least one product');
  const header = parsed.shift().map(value => value.trim());
  if (new Set(header).size !== header.length || header.some(value => !COLUMNS.includes(value)) || REQUIRED.some(value => !header.includes(value))) throw Error('CSV has duplicate, unsupported or missing required columns');
  if (parsed.length > 150) throw Error('At most 150 reviewed products per batch');
  return parsed.map((cells, index) => {
    const line = index + 2;
    if (cells.length !== header.length) throw Error('Row ' + line + ': expected ' + header.length + ' fields, received ' + cells.length);
    const row = Object.fromEntries(header.map((name, i) => [name, cells[i].trim()]));
    if (row.reviewed !== 'true') throw Error('Row ' + line + ': reviewed must be exactly true after manual verification');
    const price = aud(row.price, 'price', line);
    const was = row.was ? aud(row.was, 'was', line) : undefined;
    if (was !== undefined && was <= price) throw Error('Row ' + line + ': was must be greater than price or left blank');
    return {...row, price, was, reviewed: true};
  });
}
