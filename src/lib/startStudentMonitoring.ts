import {studentMonitoringAllowed} from './studentMonitoring';
// Dormant until a free Education account and disabled overages are verified.
export async function startStudentMonitoring(){
 const config={enabled:import.meta.env.VITE_SENTRY_ENABLED,dsn:import.meta.env.VITE_SENTRY_DSN,verifiedUntil:import.meta.env.VITE_STUDENT_PACK_VERIFIED_UNTIL};
 if(!studentMonitoringAllowed(config,location.href,Date.now(),navigator.doNotTrack,(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl))return;
 const Sentry=await import('@sentry/react');let sent=0;
 Sentry.init({dsn:config.dsn,environment:'production',defaultIntegrations:false,integrations:[Sentry.globalHandlersIntegration(),Sentry.dedupeIntegration()],sendDefaultPii:false,sendClientReports:false,maxBreadcrumbs:0,sampleRate:0.1,tracesSampleRate:0,replaysSessionSampleRate:0,replaysOnErrorSampleRate:0,
 beforeSend(event){if(++sent>5||!studentMonitoringAllowed(config,location.href,Date.now(),navigator.doNotTrack,(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl))return null;
 // Allowlist only diagnostic types and same-origin asset line numbers. No
 // messages, identifiers, request URLs, headers, breadcrumbs, replay or user data.
 return {type:event.type,event_id:event.event_id,timestamp:event.timestamp,platform:'javascript',environment:'production',exception:{values:(event.exception?.values||[]).slice(0,1).map(v=>({type:/^[A-Za-z]{1,40}$/.test(v.type||'')?v.type:'Error',value:'Application error (message omitted)',stacktrace:{frames:(v.stacktrace?.frames||[]).filter(f=>{try{return new URL(f.filename||'',location.origin).origin===location.origin&&new URL(f.filename||'',location.origin).pathname.startsWith('/assets/');}catch{return false;}}).slice(-8).map(f=>({filename:new URL(f.filename!,location.origin).origin+new URL(f.filename!,location.origin).pathname,lineno:f.lineno,colno:f.colno}))}}))}};
 }});
}
