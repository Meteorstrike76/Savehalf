import type { BeforeSendEvent } from '@vercel/analytics';

const publicHosts = new Set(['savehalf.vercel.app', 'savehalf-au.vercel.app']);

export function analyticsAllowed(href: string, doNotTrack?: string | null, globalPrivacyControl?: boolean): boolean {
  try {
    const url = new URL(href);
    return url.protocol === 'https:' && publicHosts.has(url.hostname)
      && doNotTrack !== '1' && globalPrivacyControl !== true
      && !url.searchParams.has('code') && !url.searchParams.has('token_hash')
      && !/access_token|refresh_token|type=recovery/.test(url.hash);
  } catch { return false; }
}

// Only the public home page is measured. Never send search terms, auth
// callback values, product/user identifiers or custom events.
export function sanitiseAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  if (event.type !== 'pageview' || !analyticsAllowed(event.url)) return null;
  const url = new URL(event.url);
  if (url.pathname !== '/') return null;
  return { type: 'pageview', url: `${url.origin}/` };
}
