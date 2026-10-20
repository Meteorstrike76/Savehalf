import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Analytics } from '@vercel/analytics/react';
import { analyticsAllowed, sanitiseAnalyticsEvent } from './lib/analytics';

const showAnalytics = analyticsAllowed(window.location.href, navigator.doNotTrack,
  (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {showAnalytics && <Analytics mode="production" debug={false} beforeSend={sanitiseAnalyticsEvent} />}
  </StrictMode>
);
