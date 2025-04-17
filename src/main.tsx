import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/react";
import './i18n'; // Import i18n configuration before App
import App from './App.tsx';
import './index.css';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import OneSignal from 'react-onesignal';

// Chave usada para armazenar URL de navegação no localStorage
const ONESIGNAL_NAVIGATION_KEY = 'onesignal_navigation_url';

// Nome do evento personalizado para navegação
const ONESIGNAL_NAVIGATION_EVENT = 'onesignal_navigation';

// Canal de comunicação entre abas
let broadcastChannel: BroadcastChannel | null = null;

// Flag para indicar se esta aba está "viva" (ativa e visível)
let isTabAlive = false;

// Inicializar canal de comunicação entre abas
const initBroadcastChannel = () => {
  try {
    // Verificar se o navegador suporta BroadcastChannel
    if ('BroadcastChannel' in window) {
      // Criar ou recuperar o canal para o app
      broadcastChannel = new BroadcastChannel('interflow_app_channel');
      
      // Quando receber uma mensagem
      broadcastChannel.onmessage = (event) => {
        const { type, url } = event.data;
        
        // Se receber um ping e esta aba estiver ativa, responder
        if (type === 'ping' && isTabAlive) {
          broadcastChannel?.postMessage({
            type: 'pong',
            tabId: Date.now().toString(),
            url: url
          });
        }
        
        // Se receber um comando para navegar e a URL corresponder
        else if (type === 'navigate' && isTabAlive) {
          console.log('Recebendo comando para navegar para:', url);
          
          // Armazenar URL para navegação
          localStorage.setItem(ONESIGNAL_NAVIGATION_KEY, url);
          
          // Focar nesta janela
          window.focus();
          
          // Recarregar a página atual para processar a navegação
          if (window.location.pathname !== url) {
            window.location.href = url;
          }
        }
      };
      
      // Marcar esta aba como "viva" quando estiver visível
      const handleVisibilityChange = () => {
        isTabAlive = document.visibilityState === 'visible';
      };
      
      // Inicializar estado de visibilidade
      isTabAlive = document.visibilityState === 'visible';
      
      // Adicionar listeners para eventos de visibilidade
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', () => { isTabAlive = true; });
      window.addEventListener('blur', () => { isTabAlive = false; });
      
      console.log('Canal de comunicação entre abas inicializado');
    }
  } catch (error) {
    console.error('Erro ao inicializar canal de comunicação:', error);
    Sentry.captureException(error, {
      tags: {
        location: 'initBroadcastChannel'
      }
    });
  }
};

// Verificar se o app está aberto em outra aba
const checkAppOpenInOtherTab = async (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Se não há suporte a BroadcastChannel, retornar false
    if (!broadcastChannel) {
      resolve(false);
      return;
    }
    
    // Flag para indicar se alguma aba respondeu
    let hasResponse = false;
    
    // Timeout para caso nenhuma aba responda
    const timeout = setTimeout(() => {
      if (!hasResponse) {
        resolve(false);
      }
    }, 300); // 300ms deve ser suficiente para uma resposta local
    
    // Listener para respostas
    const messageHandler = (event: MessageEvent) => {
      const { type } = event.data;
      
      if (type === 'pong') {
        hasResponse = true;
        clearTimeout(timeout);
        
        // Enviar comando para navegar para a aba que respondeu
        broadcastChannel?.postMessage({
          type: 'navigate',
          url: url
        });
        
        // Resolver como true (app aberto em outra aba)
        resolve(true);
        
        // Remover listener após receber resposta
        broadcastChannel?.removeEventListener('message', messageHandler);
      }
    };
    
    // Adicionar listener temporário para a resposta
    broadcastChannel.addEventListener('message', messageHandler);
    
    // Enviar ping para outras abas
    broadcastChannel.postMessage({
      type: 'ping',
      url: url
    });
  });
};

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
    OneSignal.Notifications.addEventListener('click', async function(event) {
      try {
        // console.log('Notificação clicada:', event);
        
        // Verificar se existe uma URL na notificação
        const additionalData = event.notification?.additionalData as Record<string, unknown> | undefined;
        const url = additionalData?.url;
        
        if (url && typeof url === 'string') {
          // console.log('Redirecionando para:', url);
          
          // Verificar se a URL é absoluta
          if (url.startsWith('http://') || url.startsWith('https://')) {
            // Verificar se é do mesmo domínio
            try {
              const currentDomain = window.location.origin;
              const urlObj = new URL(url);
              const urlOrigin = urlObj.origin;
              
              if (urlOrigin === currentDomain) {
                // Mesmo domínio - extrair o caminho relativo
                const path = urlObj.pathname + urlObj.search + urlObj.hash;
                console.log('Navegação interna para:', path);
                
                // Verificar se o app já está aberto em outra aba
                const isOpenInOtherTab = await checkAppOpenInOtherTab(path);
                
                if (isOpenInOtherTab) {
                  console.log('App já está aberto em outra aba, redirecionando lá.');
                  // Não precisamos fazer nada aqui, a outra aba já recebeu o comando para navegar
                  return;
                }
                
                // Armazenar a URL para navegação após inicialização do app (para compatibilidade)
                localStorage.setItem(ONESIGNAL_NAVIGATION_KEY, path);
                
                // Disparar evento personalizado para navegação
                const navigationEvent = new CustomEvent(ONESIGNAL_NAVIGATION_EVENT, {
                  detail: { url: path }
                });
                window.dispatchEvent(navigationEvent);
                
                // Não redirecionamos mais diretamente aqui
                // window.location.href = path;
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
            // URL relativa - verificar se o app já está aberto em outra aba
            const isOpenInOtherTab = await checkAppOpenInOtherTab(url);
            
            if (isOpenInOtherTab) {
              // console.log('App já está aberto em outra aba, redirecionando lá.');
              // Não precisamos fazer nada aqui, a outra aba já recebeu o comando para navegar
              return;
            }
            
            // URL relativa - redirecionar diretamente
            // console.log('Navegação interna para URL relativa:', url);
            
            // Armazenar a URL para navegação após inicialização do app (para compatibilidade)
            localStorage.setItem(ONESIGNAL_NAVIGATION_KEY, url);
            
            // Disparar evento personalizado para navegação
            const navigationEvent = new CustomEvent(ONESIGNAL_NAVIGATION_EVENT, {
              detail: { url: url }
            });
            window.dispatchEvent(navigationEvent);
            
            // Não redirecionamos mais diretamente aqui
            // window.location.href = url;
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

// Inicializar canal de comunicação entre abas
initBroadcastChannel();

// Inicializar OneSignal
initOneSignal();

// Inicialização do Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
  enabled: true,
  integrations: [
    browserTracingIntegration({
      idleTimeout: 5000, // Aumenta o tempo limite para não iniciar tantas transações
    }),
  ],
  // Performance Monitoring - reduz significativamente a amostragem
  tracesSampleRate: 0.05, // Reduzido de 0.2 para 0.05
  // Session Replay - desativado
  replaysSessionSampleRate: 0, // Reduzido de 0.05 para 0
  replaysOnErrorSampleRate: 0.1, // Reduzido de 0.2 para 0.1
  // Função beforeSend para adiar processamento de eventos durante carregamento inicial
  beforeSend: (event) => {
    // Durante carregamento inicial da página, adia o envio de eventos não críticos
    if (document.readyState !== 'complete' && event.level !== 'fatal') {
      return null;
    }
    // Filtra eventos de baixa prioridade
    if (event.level === 'info' || event.level === 'debug') {
      return null;
    }
    return event;
  },
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