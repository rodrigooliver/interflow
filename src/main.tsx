import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import { browserTracingIntegration, replayIntegration } from "@sentry/react";
import './i18n'; // Import i18n configuration before App
import App from './App.tsx';
import './index.css';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import OneSignal from 'react-onesignal';

// Chave usada para armazenar URL de navegação no localStorage
const ONESIGNAL_NAVIGATION_KEY = 'onesignal_navigation_url';

// ID único para esta aba
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Canal de comunicação entre abas
let broadcastChannel: BroadcastChannel | null = null;

// Flag para indicar se esta aba está "viva" (ativa e visível)
let isTabAlive = false;

// Debug flag - defina como true para ver logs detalhados
const DEBUG_TABS = true;

// Função para logs de debug
const debugLog = (...args: any[]) => {
  if (DEBUG_TABS) {
    console.log(`[Tab ${TAB_ID.slice(0, 8)}]`, ...args);
  }
};

// Inicializar canal de comunicação entre abas
const initBroadcastChannel = () => {
  try {
    // Verificar se o navegador suporta BroadcastChannel
    if ('BroadcastChannel' in window) {
      debugLog('Iniciando BroadcastChannel');
      
      // Criar ou recuperar o canal para o app
      broadcastChannel = new BroadcastChannel('interflow_app_channel');
      
      // Quando receber uma mensagem
      broadcastChannel.onmessage = (event) => {
        const { type, url, tabId } = event.data;
        
        // Ignorar mensagens da própria aba
        if (tabId === TAB_ID) {
          return;
        }
        
        debugLog('Mensagem recebida:', type, url, tabId);
        
        // Se receber um ping e esta aba estiver ativa, responder
        if (type === 'ping' && isTabAlive) {
          debugLog('Respondendo com pong para:', url);
          broadcastChannel?.postMessage({
            type: 'pong',
            tabId: TAB_ID,
            url: url
          });
        }
        
        // Se receber um comando para navegar
        else if (type === 'navigate' && isTabAlive) {
          debugLog('Comando para navegar para:', url);
          
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
        debugLog('Estado de visibilidade alterado:', isTabAlive ? 'visível' : 'oculto');
      };
      
      // Inicializar estado de visibilidade
      isTabAlive = document.visibilityState === 'visible';
      debugLog('Estado inicial de visibilidade:', isTabAlive ? 'visível' : 'oculto');
      
      // Adicionar listeners para eventos de visibilidade
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', () => { 
        isTabAlive = true; 
        debugLog('Aba recebeu foco');
      });
      window.addEventListener('blur', () => { 
        isTabAlive = false; 
        debugLog('Aba perdeu foco');
      });
      
      // Enviar sinal de que esta aba está ativa quando o site carrega
      if (isTabAlive) {
        broadcastChannel.postMessage({
          type: 'tab_active',
          tabId: TAB_ID
        });
      }
      
      debugLog('Canal de comunicação entre abas inicializado');
    } else {
      debugLog('BroadcastChannel não suportado neste navegador');
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
      debugLog('BroadcastChannel não disponível, não é possível verificar outras abas');
      resolve(false);
      return;
    }
    
    debugLog('Verificando se app está aberto em outra aba para URL:', url);
    
    // Flag para indicar se alguma aba respondeu
    let hasResponse = false;
    
    // Timeout para caso nenhuma aba responda
    const timeout = setTimeout(() => {
      if (!hasResponse) {
        debugLog('Timeout - Nenhuma aba respondeu ao ping');
        resolve(false);
      }
    }, 500); // Aumentado para 500ms para dar mais tempo em redes lentas
    
    // Listener para respostas
    const messageHandler = (event: MessageEvent) => {
      const { type, tabId } = event.data;
      
      // Ignorar mensagens da própria aba
      if (tabId === TAB_ID) {
        return;
      }
      
      if (type === 'pong') {
        debugLog('Recebido pong de outra aba:', tabId);
        hasResponse = true;
        clearTimeout(timeout);
        
        // Enviar comando para navegar para a aba que respondeu
        debugLog('Enviando comando de navegação para aba:', tabId);
        broadcastChannel?.postMessage({
          type: 'navigate',
          tabId: TAB_ID,
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
    debugLog('Enviando ping para outras abas');
    broadcastChannel.postMessage({
      type: 'ping',
      tabId: TAB_ID,
      url: url
    });
    
    // Fazer uma segunda tentativa após 100ms para casos em que a primeira mensagem se perde
    setTimeout(() => {
      if (!hasResponse) {
        debugLog('Reenviando ping para outras abas (segunda tentativa)');
        broadcastChannel?.postMessage({
          type: 'ping',
          tabId: TAB_ID,
          url: url
        });
      }
    }, 100);
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
                // Mesmo domínio - extrair o caminho relativo
                const path = urlObj.pathname + urlObj.search + urlObj.hash;
                console.log('Navegação interna para:', path);
                
                // Verificar se o app já está aberto em outra aba
                debugLog('Notificação clicada - verificando abas existentes para:', path);
                const isOpenInOtherTab = await checkAppOpenInOtherTab(path);
                
                if (isOpenInOtherTab) {
                  debugLog('App detectado em outra aba, dando foco lá.');
                  // Não precisamos fazer nada aqui, a outra aba já recebeu o comando para navegar
                  
                  // Retornamos false para impedir que o OneSignal processe o clique padrão
                  return false;
                }
                
                debugLog('Nenhuma aba existente encontrada, abrindo nova aba.');
                
                // Armazenar a URL para navegação após inicialização do app
                localStorage.setItem(ONESIGNAL_NAVIGATION_KEY, path);
                
                // Redirecionar diretamente
                window.location.href = path;
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
            debugLog('Notificação clicada - verificando abas existentes para URL relativa:', url);
            const isOpenInOtherTab = await checkAppOpenInOtherTab(url);
            
            if (isOpenInOtherTab) {
              debugLog('App detectado em outra aba, dando foco lá.');
              // Não precisamos fazer nada aqui, a outra aba já recebeu o comando para navegar
              
              // Retornamos false para impedir que o OneSignal processe o clique padrão
              return false;
            }
            
            debugLog('Nenhuma aba existente encontrada, abrindo nova aba.');
            
            // URL relativa - redirecionar diretamente
            console.log('Navegação interna para URL relativa:', url);
            
            // Armazenar a URL para navegação após inicialização do app
            localStorage.setItem(ONESIGNAL_NAVIGATION_KEY, url);
            
            // Redirecionar diretamente
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
      
      // Retornar true para permitir que o OneSignal continue processando o clique
      return true;
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