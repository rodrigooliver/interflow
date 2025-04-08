import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import { browserTracingIntegration, replayIntegration } from "@sentry/react";
import './i18n'; // Import i18n configuration before App
import App from './App.tsx';
import './index.css';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import OneSignal from 'react-onesignal';

// Declarando um evento customizado para comunicação entre componentes
interface NavigateEventDetail {
  url: string;
}
declare global {
  interface WindowEventMap {
    'onesignal:navigate': CustomEvent<NavigateEventDetail>;
  }
}

// Inicialização do OneSignal
const initOneSignal = () => {
  if (typeof window !== 'undefined') {
    OneSignal.init({
      appId: '7aef872c-3a1d-43db-bb0b-113a55a9f402',
      notifyButton: {
        enable: true,
        size: 'medium',
        position: 'bottom-right',
        prenotify: true,
        showCredit: false,
        text: {
          'tip.state.unsubscribed': 'Inscreva-se para receber notificações',
          'tip.state.subscribed': 'Você está inscrito para notificações',
          'tip.state.blocked': 'Você bloqueou as notificações',
          'message.prenotify': 'Clique para se inscrever em notificações',
          'message.action.subscribed': 'Obrigado por se inscrever!',
          'message.action.resubscribed': 'Você está inscrito para notificações',
          'message.action.unsubscribed': 'Você não receberá mais notificações',
          'message.action.subscribing': 'Inscrevendo...',
          'dialog.main.title': 'Gerenciar notificações do site',
          'dialog.main.button.subscribe': 'INSCREVER-SE',
          'dialog.main.button.unsubscribe': 'CANCELAR INSCRIÇÃO',
          'dialog.blocked.title': 'Desbloquear notificações',
          'dialog.blocked.message': 'Siga estas instruções para permitir notificações:'
        }
      },
    }).catch(error => {
      console.error('Erro ao inicializar o OneSignal:', error);
      Sentry.captureException(error, {
        tags: {
          location: 'OneSignalInit'
        }
      });
    });

    // Adicionar ouvidor para notificações clicadas
    OneSignal.Notifications.addEventListener('click', function(event) {
      try {
        console.log('Notificação clicada:', event);
        
        // Verificar se existe uma URL na notificação
        const additionalData = event.notification?.additionalData as Record<string, unknown> | undefined;
        const url = additionalData?.url;
        
        if (url && typeof url === 'string') {
          console.log('Redirecionando para:', url);
          
          // Verificar se a URL é absoluta
          if (url.startsWith('http://') || url.startsWith('https://')) {
            // Verificar se é do mesmo domínio
            try {
              const currentDomain = window.location.origin;
              const urlObj = new URL(url);
              const urlOrigin = urlObj.origin;
              
              if (urlOrigin === currentDomain) {
                // Mesmo domínio - usar navegação interna para não recarregar a página
                const path = urlObj.pathname + urlObj.search + urlObj.hash;
                console.log('Navegação interna para:', path);
                
                // Disparar evento customizado para o App.tsx capturar e usar o navigate
                const navigateEvent = new CustomEvent('onesignal:navigate', {
                  detail: { url: path }
                });
                window.dispatchEvent(navigateEvent);
              } else {
                // Domínio externo - abrir em nova aba
                window.open(url, '_blank');
              }
            } catch (urlError) {
              // Se houver erro ao analisar a URL, abrir em nova aba como fallback
              console.error('Erro ao analisar URL:', urlError);
              window.open(url, '_blank');
            }
          } else {
            // URL relativa - usar navegação interna
            console.log('Navegação interna para URL relativa:', url);
            
            // Disparar evento customizado para o App.tsx capturar e usar o navigate
            const navigateEvent = new CustomEvent('onesignal:navigate', {
              detail: { url }
            });
            window.dispatchEvent(navigateEvent);
          }
        }
      } catch (error) {
        console.error('Erro ao processar clique na notificação:', error);
        Sentry.captureException(error, {
          tags: {
            location: 'OneSignalNotificationClick'
          },
          extra: {
            event
          }
        });
      }
    });
  }
};

// Inicializar OneSignal
initOneSignal();

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