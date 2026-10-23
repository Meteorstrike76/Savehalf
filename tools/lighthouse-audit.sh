#!/usr/bin/env bash
set -euo pipefail
# Requires a local Chrome/Chromium executable. Lighthouse is a build tool, not a hosted service.
: "${CHROME_PATH:?Set CHROME_PATH to Chrome or Chromium}"
: "${AUDIT_URL:?Set AUDIT_URL to a public deployment or locally served build}"
case "$AUDIT_URL" in https://savehalf.vercel.app|https://savehalf.vercel.app/|https://savehalf-au.vercel.app|https://savehalf-au.vercel.app/|http://127.0.0.1:4173|http://127.0.0.1:4173/) ;; *) exit 2;; esac
mkdir -p "${AUDIT_PREFIX:-audit}"
for width in 375 768 1280; do
  node_modules/.bin/lighthouse "$AUDIT_URL" --chrome-flags='--headless --no-sandbox' --output=json --output=html --output-path="${AUDIT_PREFIX:-audit}/width-$width" --screenEmulation.width="$width" --screenEmulation.height=900 --screenEmulation.deviceScaleFactor=1 --screenEmulation.mobile=true --quiet
 done
node --input-type=module - <<'JS'
import fs from 'node:fs';
const dir=process.env.AUDIT_PREFIX||'audit';
for(const width of [375,768,1280]){const file=`${dir}/width-${width}.report.json`;const r=JSON.parse(fs.readFileSync(file));if(r.runtimeError||r.finalDisplayedUrl?.includes('vercel.com/login'))throw Error('Audit did not reach the app');const image=r.audits['final-screenshot']?.details?.data;if(image)fs.writeFileSync(`${dir}/width-${width}.jpg`,Buffer.from(image.split(',')[1],'base64'));console.log(width,Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k,Math.round(v.score*100)])));}
JS
