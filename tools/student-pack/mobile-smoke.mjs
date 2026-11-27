import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
if(process.env.STUDENT_PACK_FREE_PLAN_VERIFIED!=='true')throw Error('Verify the active free Automate Mobile entitlement and disabled paid overages first');
const username=process.env.BROWSERSTACK_USERNAME,key=process.env.BROWSERSTACK_ACCESS_KEY;
if(!username||!key)throw Error('Missing BrowserStack GitHub secrets');
const caps={browser:'chrome',os:'android',device:'Samsung Galaxy S23','real_mobile':'true',name:'SaveHalf browse smoke',build:`student-${process.env.GITHUB_RUN_ID||'manual'}`,'browserstack.username':username,'browserstack.accessKey':key,'client.playwrightVersion':JSON.parse(readFileSync(new URL('../../node_modules/playwright-core/package.json',import.meta.url))).version};
// One sequential session, only the public site, no account or shopper data.
const browser=await chromium.connect({wsEndpoint:`wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(caps))}`,timeout:30000});
try{const page=await browser.newPage();page.setDefaultTimeout(15000);await page.goto('https://savehalf.vercel.app/');await page.getByRole('heading',{name:'Products & recorded deals',exact:true}).waitFor();await page.getByRole('textbox',{name:'Search products',exact:true}).fill('coffee');await page.getByRole('button',{name:'Reset filters',exact:true}).click();await page.getByLabel('Listing source',{exact:true}).selectOption('catalogues');await page.getByLabel('Listing retailer',{exact:true}).selectOption({label:'Priceline'});await page.getByRole('article').first().waitFor();console.log('Public mobile browse smoke passed');}finally{await browser.close();}
