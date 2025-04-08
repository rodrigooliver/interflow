import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import { browserTracingIntegration, replayIntegration } from "@sentry/react";
import './i18n'; // Import i18n configuration before App
import App from './App.tsx';
import './index.css';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import OneSignal from 'react-onesignal';

// Interface para dados adicionais da notificação
interface NotificationAdditionalData {
  url?: string;
  [key: string]: any;
}

// Interface para o objeto notification
interface NotificationData {
  additionalData?: NotificationAdditionalData;
  [key: string]: any;
}

// Interface para o evento de clique na notificação
interface NotificationClickEvent {
  notification?: NotificationData;
  result: any;
  [key: string]: any;
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
    OneSignal.Notifications.addEventListener('click', function(event: NotificationClickEvent) {
      try {
        console.log('Notificação clicada:', event);
        
        // Verificar se existe uma URL na notificação
        const url = event.notification?.additionalData?.url;
        if (url) {
          console.log('Redirecionando para:', url);
          
          // Se a URL for externa (começa com http ou https), abrir em uma nova aba
          if (url.startsWith('http://') || url.startsWith('https://')) {
            window.open(url, '_blank');
          } else {
            // Se for uma URL interna, navegar usando a própria aplicação
            window.location.href = url;
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