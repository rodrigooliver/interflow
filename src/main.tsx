import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n'; // Import i18n configuration before App
import App from './App.tsx';
import './index.css';
import { LoadingScreen } from './components/LoadingScreen.tsx';

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