import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const url=process.env.AUDIT_URL,dir=process.env.AUDIT_PREFIX||'audit';if(!url||!/^https:\/\/|^http:\/\/127\.0\.0\.1:/.test(url))throw Error('Set a public audit URL or local build URL');
await fs.mkdir(dir,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox']});
try{for(const width of [375,768,1280]){const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});await page.goto(url,{waitUntil:'networkidle',timeout:30000});if(!(await page.title()).includes('SaveHalf'))throw Error('Audit reached a different page');await page.screenshot({path:`${dir}/viewport-${width}.png`,fullPage:true});await page.close();}}finally{await browser.close();}
