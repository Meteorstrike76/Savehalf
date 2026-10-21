import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile,appendFile} from 'node:fs/promises';
const url=process.env.AUDIT_URL||'http://127.0.0.1:4173';const prefix=process.env.AUDIT_PREFIX||'audit';
if(!/^https:\/\/savehalf(?:-au)?\.vercel\.app\/?$|^http:\/\/127\.0\.0\.1:4173\/?$/.test(url))throw Error('Audit URL must be a known production or local host');
await mkdir(prefix,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox']});const results=[];
try{for(const width of [375,768,1280]){const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url,{waitUntil:'networkidle'});if(!(await page.title()).includes('SaveHalf'))throw Error('Wrong page');await page.screenshot({path:`${prefix}/${width}.png`,fullPage:true});const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();results.push({width,pageErrors:errors,violations:accessibility.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}))});await page.close();}}finally{await browser.close();}
await writeFile(`${prefix}/accessibility.json`,JSON.stringify(results,null,2));if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'\n## Accessibility and console\n```json\n'+JSON.stringify(results,null,2)+'\n```\n');
if(results.some(r=>r.pageErrors.length||r.violations.some(v=>['serious','critical'].includes(v.impact))))process.exitCode=1;
