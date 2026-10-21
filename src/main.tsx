import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import CloudflareAnalytics from './components/CloudflareAnalytics';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <CloudflareAnalytics />
  </StrictMode>
);
