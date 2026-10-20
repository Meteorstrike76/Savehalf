// Wait for observable UI completion rather than racing fixed sleeps on shared CI CPUs.
module.exports=async function waitFor(check,label='UI condition',timeout=5000){const started=Date.now();while(!check()){if(Date.now()-started>timeout)throw Error(`Timed out waiting for ${label}`);await new Promise(r=>setTimeout(r,20));}};
