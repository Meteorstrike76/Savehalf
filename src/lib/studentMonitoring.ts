import {analyticsAllowed} from './analytics';
export function studentMonitoringAllowed(config:{enabled?:string;dsn?:string;verifiedUntil?:string},href:string,now=Date.now(),dnt?:string|null,gpc?:boolean){
 if(config.enabled!=='true'||!config.verifiedUntil||!/^\d{4}-\d{2}-\d{2}$/.test(config.verifiedUntil)||!analyticsAllowed(href,dnt,gpc))return false;
 try{const u=new URL(href),dsn=new URL(config.dsn||'');return u.pathname==='/'&&!u.search&&!u.hash&&dsn.protocol==='https:'&&/^[a-f0-9]+$/i.test(dsn.username)&&!dsn.password&&/^(?:[a-z0-9-]+\.)*ingest(?:\.[a-z]+)?\.sentry\.io$/.test(dsn.hostname)&&/^\/\d+$/.test(dsn.pathname)&&Date.parse(config.verifiedUntil+'T00:00:00Z')>now;}catch{return false;}
}
