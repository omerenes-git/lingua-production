import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SupabaseAuthGate } from './components/SupabaseAuthGate';
import { installLegacyApiBridge } from './lib/supabaseWeb';
import { startSupabaseDataSync } from './lib/supabaseDataSync';
import './index.css';

installLegacyApiBridge();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}service-worker.js`)
      .then((registration) => registration.update())
      .catch((error) => console.warn('Service worker registration failed:', error));
  });
}

void startSupabaseDataSync().catch((error) => {
  console.warn('Supabase data synchronization could not start:', error);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SupabaseAuthGate>
        <App />
      </SupabaseAuthGate>
    </ErrorBoundary>
  </React.StrictMode>
);
