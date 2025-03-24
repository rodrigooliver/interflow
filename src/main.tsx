import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import { browserTracingIntegration, replayIntegration } from "@sentry/react";
import './i18n'; // Import i18n configuration before App
import App from './App.tsx';
import './index.css';
import { LoadingScreen } from './components/LoadingScreen.tsx';

// Inicialização do Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
  enabled: true,
  integrations: [
    browserTracingIntegration(),
    replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0,
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Create root element
const root = createRoot(document.getElementById('root')!);

// Render app with Suspense
root.render(
  <StrictMode>
    <Suspense fallback={<LoadingScreen />}>
      <App />
    </Suspense>
  </StrictMode>
);