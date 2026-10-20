// RFC-style longest matching rule for our declared agent, with Allow winning ties.
export function robotsAllows(text,url,agent='savehalf'){
 const groups=[];let current=null,hasRules=false;
 for(const line of String(text).split(/\r?\n/)){
  const m=line.replace(/#.*/,'').match(/^\s*([^:]+):\s*(.*?)\s*$/);if(!m)continue;
  const key=m[1].toLowerCase(),value=m[2];
  if(key==='user-agent'){if(!current||hasRules){current={agents:[],rules:[]};groups.push(current);hasRules=false;}current.agents.push(value.toLowerCase());}
  else if(current&&['allow','disallow'].includes(key)){hasRules=true;if(value)current.rules.push({allow:key==='allow',path:value});}
 }
 const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&agent.includes(a)));
 const selected=specific.length?specific:groups.filter(g=>g.agents.includes('*'));const u=new URL(url),path=u.pathname+u.search;let best=null;
 for(const g of selected)for(const rule of g.rules){const source=rule.path.split('*').map(s=>s.replace(/[.+?^${}()|[\]\\]/g,'\\$&')).join('.*').replace(/\\\$$/,'$');if(new RegExp('^'+source).test(path)){const length=rule.path.replace(/[*$]/g,'').length;if(!best||length>best.length||length===best.length&&rule.allow)best={length,allow:rule.allow};}}
 return best?.allow??true;
}
