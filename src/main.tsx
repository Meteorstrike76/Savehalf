import SiteActivity from './components/SiteActivity';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import CloudflareAnalytics from './components/CloudflareAnalytics';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <CloudflareAnalytics /><SiteActivity/>
  </StrictMode>
);

// Lazy and disabled until student entitlement is verified; never blocks rendering.
void import('./lib/startStudentMonitoring').then(m=>m.startStudentMonitoring()).catch(()=>{});
