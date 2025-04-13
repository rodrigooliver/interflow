import React, { useState, Suspense, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as Sentry from "@sentry/react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MobileNavBar from './components/MobileNavBar';
import Dashboard from './pages/Dashboard';
import Chats from './pages/chat/Chats';
import Chat from './pages/chat/Chat';
import Customers from './pages/customers/Customers';
import CustomerChats from './pages/customers/CustomerChats';
import SettingsPage from './pages/settings/Settings';
import BillingPage from './pages/settings/Billing';
import IntegrationsPage from './pages/settings/Integrations';
import NotificationsPage from './pages/settings/Notifications';
import ApiKeysPage from './pages/settings/ApiKeysPage';
import UsagePage from './pages/settings/Usage';
import Login from './pages/public/login';
import Organizations from './pages/admin/Organizations';
import AddOrganization from './pages/admin/AddOrganization';
import OrganizationMembers from './pages/organization/MembersPage';
import ServiceTeams from './pages/organization/ServiceTeams';
import Channels from './pages/channels/Channels';
import SelectChannelType from './pages/channels/SelectChannelType';
import EmailChannelForm from './pages/channels/EmailChannelForm';
import WhatsAppOfficialForm from './pages/channels/WhatsAppOfficialForm';
import WhatsAppWApiForm from './pages/channels/WhatsAppWApiForm';
import WhatsAppZApiForm from './pages/channels/WhatsAppZApiForm';
import WhatsAppEvoForm from './pages/channels/WhatsAppEvoForm';
import FacebookForm from './pages/channels/FacebookForm';
import InstagramForm from './pages/channels/InstagramForm';
import WhatsAppTemplates from './pages/channels/WhatsAppTemplates';
import MessageShortcuts from './pages/organization/MessageShortcuts';
import FlowList from './pages/flow/FlowList';
import FlowEditor from './pages/flow/FlowEditor';
import CRMFunnels from './pages/crm/CRMFunnels';
import CRMFunnel from './pages/crm/CRMFunnel';
import Profile from './pages/Profile';
import Tags from './pages/Tags';
import Prompts from './pages/prompts/Prompts';
import PromptFormPage from './pages/prompts/PromptForm';
import { LoadingScreen } from './components/LoadingScreen';
import { ThemeProvider } from './providers/ThemeProvider';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import Home from './pages/public/index';
import SignupPage from './pages/public/signup/page';
import JoinPage from './pages/public/join/page';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ClosureTypesPage } from './pages/ClosureTypesPage';
import { ToastProvider } from './hooks/useToast';

import PrivacyPolicy from './pages/public/privacy-policy';
import TermsOfService from './pages/public/terms-of-service';
import About from './pages/public/about';
import Blog from './pages/public/blog';
import Resources from './pages/public/resources';
import PricingPage from './pages/public/pricing';
import Contact from './pages/public/contact';
import Features from './pages/public/features';
import SubscriptionPlans from './pages/admin/SubscriptionPlans';
import SubscriptionPlanForm from './pages/admin/SubscriptionPlanForm';
import Referrals from './pages/organization/Referrals';
import OrganizationSubscriptions from './pages/admin/OrganizationSubscriptions';
import { useAutoLogin } from './hooks/useAutoLogin';
import { ConnectionStatus } from './components/common/ConnectionStatus';
import OrganizationSelector from './components/auth/OrganizationSelector';
import { NavbarVisibilityProvider } from './contexts/NavbarVisibilityContext';
import AppointmentsPage from './pages/schedules/AppointmentsPage';
import ScheduleManagementPage from './pages/schedules/management/ScheduleManagementPage';
import SchedulesListPage from './pages/schedules/SchedulesListPage';
import ScheduleAvailabilityPage from './pages/schedules/management/ScheduleAvailabilityPage';
import ScheduleHolidaysPage from './pages/schedules/management/ScheduleHolidaysPage';
import Tasks from './pages/Tasks';

// Import das novas páginas do sistema financeiro
import FinancialDashboard from './pages/financial/FinancialDashboard';
import FinancialTransactions from './pages/financial/FinancialTransactions';
import FinancialCashiers from './pages/financial/FinancialCashiers';
import FinancialCashierOperations from './pages/financial/FinancialCashierOperations';
import FinancialCategories from './pages/financial/FinancialCategories';
import FinancialPaymentMethods from './pages/financial/FinancialPaymentMethods';
import FinancialReports from './pages/financial/FinancialReports';

// Adicionar declaração de tipo para a propriedade removeInitialLoader no objeto window
declare global {
  interface Window {
    removeInitialLoader?: () => void;
    isNativeApp?: boolean;
    webkit?: {
      messageHandlers?: Record<string, unknown>;
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

// Criar uma instância do QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 30, // 30 minutos (anteriormente cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Chave usada para armazenar URL de navegação no localStorage
const ONESIGNAL_NAVIGATION_KEY = 'onesignal_navigation_url';

// Nome do evento personalizado para navegação
const ONESIGNAL_NAVIGATION_EVENT = 'onesignal_navigation';

// Componente para verificar e processar navegação pendente do OneSignal
const OneSignalNavigationHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationProcessed = useRef(false);
  
  useEffect(() => {
    // Função para processar navegação
    const processNavigation = (url: string) => {
      try {
        // console.log('[OneSignalNavigationHandler] Processando navegação para:', url);
        
        // Verificar se ainda não estamos na URL de destino
        if (location.pathname !== url) {
          // console.log('[OneSignalNavigationHandler] Navegando para URL:', url);
          navigate(url);
        } else {
          // console.log('[OneSignalNavigationHandler] Já estamos na URL de destino, ignorando navegação.');
        }
      } catch (error) {
        // console.error('[OneSignalNavigationHandler] Erro ao processar navegação:', error);
        Sentry.captureException(error, {
          tags: {
            location: 'OneSignalNavigationHandler.processNavigation'
          }
        });
      }
    };

    // Handler para eventos personalizados de navegação
    const handleNavigationEvent = (event: CustomEvent) => {
      const url = event.detail?.url;
      if (url && typeof url === 'string') {
        processNavigation(url);
      }
    };

    // Adicionar listener para o evento personalizado
    window.addEventListener(ONESIGNAL_NAVIGATION_EVENT, handleNavigationEvent as EventListener);
    
    // Verificar se há uma URL pendente no localStorage (para compatibilidade)
    if (!navigationProcessed.current) {
      navigationProcessed.current = true;
      
      try {
        // Verificar se há uma URL pendente no localStorage
        const pendingUrl = localStorage.getItem(ONESIGNAL_NAVIGATION_KEY);
        
        if (pendingUrl) {
          console.log('[OneSignalNavigationHandler] URL pendente encontrada:', pendingUrl);
          
          // Remover do localStorage para não repetir a navegação
          localStorage.removeItem(ONESIGNAL_NAVIGATION_KEY);
          
          // Aguardar um momento para garantir que o App está totalmente inicializado
          setTimeout(() => {
            processNavigation(pendingUrl);
          }, 500);
        }
      } catch (error) {
        console.error('[OneSignalNavigationHandler] Erro ao processar URL pendente:', error);
        Sentry.captureException(error, {
          tags: {
            location: 'OneSignalNavigationHandler'
          }
        });
        
        // Limpar URL pendente em caso de erro
        localStorage.removeItem(ONESIGNAL_NAVIGATION_KEY);
      }
    }

    // Limpar o listener quando o componente for desmontado
    return () => {
      window.removeEventListener(ONESIGNAL_NAVIGATION_EVENT, handleNavigationEvent as EventListener);
    };
  }, [navigate, location.pathname]);
  
  return null;
};

// Componente para detecção de tela branca
const WhiteScreenDetector = () => {
  const checkIntervalRef = useRef<number | null>(null);
  const lastVisibilityState = useRef<string>(document.visibilityState);
  const isWebView = useRef<boolean>(
    // Detecção de WebView - diversos métodos para diferentes plataformas
    /WebView|wv/.test(navigator.userAgent) || 
    // iOS webview não tem scrollbars
    !/(Chrome|Firefox|Safari)/.test(navigator.userAgent) ||
    // Verificação adicional para iOS
    'webkit' in window && !!window.webkit?.messageHandlers ||
    // Verificar variável isNativeApp que é injetada pelo nosso WebView 
    window.isNativeApp === true
  );
  
  useEffect(() => {
    // Função que verifica se a tela está branca
    const checkWhiteScreen = () => {
      try {
        // Verificar se o body está vazio ou tem apenas elementos vazios
        const body = document.body;
        const hasContent = body.children.length > 0 && 
          Array.from(body.children).some(el => 
            (el as HTMLElement).offsetHeight > 0 && (el as HTMLElement).offsetWidth > 0
          );
        
        // Verificar se há elementos visíveis
        const visibleElements = document.querySelectorAll('*');
        const hasVisibleElements = Array.from(visibleElements).some(el => {
          const style = window.getComputedStyle(el as Element);
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 style.opacity !== '0' &&
                 (el as HTMLElement).offsetHeight > 0 && 
                 (el as HTMLElement).offsetWidth > 0;
        });

        // Verificar se o body está vazio ou só tem um loader
        const hasOnlyLoader = document.body.innerHTML.trim() === '' || 
                            (document.body.children.length <= 2 && 
                             document.body.textContent?.trim() === '');

        // Verificação adicional para detectar conteúdo renderizado mas invisível (problema comum em WebViews)
        const mainRoot = document.getElementById('root');
        const appContainer = document.querySelector('.mobile-container');
        const isRootEmpty = !mainRoot || mainRoot.children.length === 0;
        const isAppContainerInvisible = !appContainer || 
                                      (appContainer as HTMLElement).offsetHeight === 0 ||
                                      window.getComputedStyle(appContainer as Element).display === 'none';

        // Se não houver conteúdo visível, considerar como tela branca
        if (((!hasContent || !hasVisibleElements || hasOnlyLoader || isRootEmpty || isAppContainerInvisible)) && 
             document.readyState === 'complete') {
          console.warn('Tela branca detectada! Recarregando a página...');
          
          // Tenta comunicar com o WebView nativo, se disponível
          if (window.isNativeApp && window.ReactNativeWebView?.postMessage) {
            try {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'whiteScreen',
                timestamp: Date.now(),
                details: {
                  hasContent,
                  hasVisibleElements,
                  hasOnlyLoader,
                  isRootEmpty,
                  isAppContainerInvisible
                }
              }));
            } catch (e) {
              console.error('Erro ao enviar mensagem para WebView nativo:', e);
            }
          }
          
          // Registrar no Sentry
          Sentry.captureMessage('Tela branca detectada', {
            level: 'warning',
            tags: {
              location: 'WhiteScreenDetector',
              type: 'WHITE_SCREEN',
              isWebView: isWebView.current
            },
            extra: {
              url: window.location.href,
              timestamp: new Date().toISOString(),
              visibilityState: document.visibilityState,
              hasContent,
              hasVisibleElements,
              hasOnlyLoader,
              isRootEmpty,
              isAppContainerInvisible,
              userAgent: navigator.userAgent
            }
          });
          
          // Recarregar a página após um breve delay
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      } catch (error) {
        console.error('Erro ao verificar tela branca:', error);
        Sentry.captureException(error, {
          tags: {
            location: 'WhiteScreenDetector',
            type: 'CHECK_ERROR'
          }
        });
      }
    };
    
    // Handler para o evento de visibilidade do documento
    const handleVisibilityChange = () => {
      // Se o documento estava oculto e agora está visível (retornou do background)
      if (lastVisibilityState.current === 'hidden' && document.visibilityState === 'visible') {
        console.log('Aplicação voltou do background, verificando tela branca...');
        
        // Em WebViews, fazemos uma verificação mais agressiva e mais rápida
        if (isWebView.current) {
          // Verificação imediata para "capturar" o estado logo após voltar
          checkWhiteScreen();
          
          // Várias verificações em intervalos curtos para detectar problemas de renderização após retorno
          setTimeout(checkWhiteScreen, 500);
          setTimeout(checkWhiteScreen, 1500);
          setTimeout(checkWhiteScreen, 3000);
        } else {
          // Para browsers normais, basta uma verificação após um tempo razoável
          setTimeout(checkWhiteScreen, 2000);
        }
      }
      
      lastVisibilityState.current = document.visibilityState;
    };
    
    // Handler para pageshow (específico para WebViews e iOS)
    const handlePageShow = (event: PageTransitionEvent) => {
      // event.persisted indica que a página foi restaurada do cache de bfcache
      // comum em iOS WebView quando retorna de background
      if (event.persisted) {
        console.log('Página restaurada do cache (bfcache), verificando integridade...');
        
        // Verificação imediata e sequencial
        checkWhiteScreen();
        setTimeout(checkWhiteScreen, 1000);
        setTimeout(checkWhiteScreen, 2000);
      }
    };
    
    // Verificar pela primeira vez depois de 5 segundos
    const initialTimeout = setTimeout(() => {
      checkWhiteScreen();
      
      // Depois, continuar verificando a cada minuto
      checkIntervalRef.current = window.setInterval(checkWhiteScreen, 60000);
    }, 5000);
    
    // Adicionar event listeners para detecção
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    
    // Limpar os timeouts e intervalos ao desmontar
    return () => {
      clearTimeout(initialTimeout);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);
  
  // Este componente não renderiza nada visível
  return null;
};

function AppContent() {
  const { session, profile, loading, userOrganizations, loadingOrganizations, currentOrganizationMember, setCurrentOrganizationId } = useAuthContext();
  // console.log('userOrganizations', userOrganizations);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOrganization, setModalOrganization] = useState(false);
  const [appInitialized, setAppInitialized] = useState(true);
  
  const location = useLocation();
  
  // Usar o hook de autologin para garantir que a sessão seja estabelecida após o cadastro
  useAutoLogin();
  
  // Inicializar o elemento do portal para o modal
  useEffect(() => {
    // Verificar se já existe um elemento para o portal
    let portalElement = document.getElementById('organization-selector-portal');
    
    // Se não existir, criar um novo
    if (!portalElement) {
      portalElement = document.createElement('div');
      portalElement.id = 'organization-selector-portal';
      document.body.appendChild(portalElement);
    }
    
    setModalRoot(portalElement);
    
    // Limpar o elemento ao desmontar o componente
    return () => {
      if (portalElement && portalElement.parentNode) {
        portalElement.parentNode.removeChild(portalElement);
      }
    };
  }, []);
  
  // Efeito para controlar o estado de inicialização da aplicação
  useEffect(() => {
    try {
      const minLoadingTime = 500;
      const startTime = Date.now();
      
      const finishLoading = () => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        
        if (remainingTime <= 0) {
          setAppInitialized(true);
        } else {
          setTimeout(() => {
            setAppInitialized(true);
          }, remainingTime);
        }
      };
      
      const essentialDataLoaded = !loading && profile !== undefined;
      
      if (essentialDataLoaded) {
        finishLoading();
      }
      
      const maxLoadingTimeout = setTimeout(() => {
        setAppInitialized(true);
      }, 2000);
      
      return () => {
        clearTimeout(maxLoadingTimeout);
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          location: 'appInitializationEffect'
        }
      });
    }
  }, [loading, profile]);

  // Função para lidar com a seleção de organização
  const handleOrganizationSelect = async (orgId: string) => {
    try {
      setIsLoading(true);
      setCurrentOrganizationId(orgId);
      setModalOrganization(false);
    } catch (error) {
      console.error('[AppContent] Erro ao selecionar organização:', error);
      Sentry.captureException(error, {
        tags: {
          location: 'handleOrganizationSelect',
          organizationId: orgId
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Se a aplicação ainda não foi inicializada, mostrar tela de loading
  if (!appInitialized) {
    return <LoadingScreen />;
  }

  // Mostrar loading apenas se os dados essenciais não estiverem disponíveis
  // Agora só mostramos o loading se não tivermos o perfil do usuário
  if (loading && !profile) {
    // console.log('[AppContent] Carregando dados do usuário ou organizações...');
    return <LoadingScreen />;
  }

  // Se não estiver autenticado, permite acesso apenas às rotas públicas
  if (!session) {
    // Se estiver no app nativo, redireciona para login
    if (typeof window.isNativeApp === 'boolean' && window.isNativeApp) {
      return (
        <>
          <ConnectionStatus />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/app" element={<Login />} />
            {/* Redireciona qualquer outra rota para login */}
            <Route path="*" element={<Navigate to="/login" replace state={{ from: location }} />} />
          </Routes>
        </>
      );
    }

    // Se não estiver no app nativo, mostra todas as rotas públicas
    return (
      <>
        <ConnectionStatus />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<Login />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/features" element={<Features />} />
          {/* Redireciona qualquer outra rota para a home */}
          <Route path="*" element={<Navigate to="/" replace state={{ from: location }} />} />
        </Routes>
      </>
    );
  }

  // Se estiver autenticado
  // console.log('[AppContent] Usuário autenticado, mostrando rotas protegidas');
  // console.log('currentOrganizationMember', currentOrganizationMember);
  // console.log('userOrganizations', userOrganizations);
  // console.log('loadingCurrentOrganizationMember', loadingCurrentOrganizationMember);
  return (
    <>
      <ConnectionStatus />
      {/* Detector de tela branca */}
      <WhiteScreenDetector />
      
      {/* Handler de navegação do OneSignal */}
      <OneSignalNavigationHandler />
      
      {/* Modal de seleção de organização */}
      {(modalOrganization || (!currentOrganizationMember && userOrganizations && userOrganizations.length > 0)) && location.pathname.startsWith('/app') && modalRoot && createPortal(
        <>
          {/* Overlay escuro */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40"></div>
          
          <OrganizationSelector
            organizations={userOrganizations}
            isLoading={loadingOrganizations || isLoading}
            isRequired={true}
            onSelect={handleOrganizationSelect}
            onClose={() => {
              // Se o usuário fechar o modal sem selecionar uma organização,
              // redirecionar para a página inicial ou login dependendo se está no app nativo
              if (typeof window.isNativeApp === 'boolean' && window.isNativeApp) {
                window.location.href = '/login';
              } else {
                window.location.href = '/';
              }
            }}
          />
        </>,
        modalRoot
      )}
      
      <Routes>
        {/* Rota pública mesmo quando logado - apenas se não estiver no app nativo */}
        {(!window.isNativeApp) ? (
          <>
            <Route path="/" element={<Home />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/features" element={<Features />} />
          </>
        ) : (
          // Se estiver no app nativo, redireciona a rota raiz para /app
          <Route path="/" element={<Navigate to="/app" replace />} />
        )}

        {/* Redireciona /login e /signup para /app quando já estiver logado */}
        <Route path="/login" element={<Navigate to="/app" replace />} />
        {!window.isNativeApp && <Route path="/signup" element={<Navigate to="/app" replace />} />}

        {/* Rotas protegidas */}
        <Route
          path="/app/*"
          element={
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 mobile-container">
              {/* Sidebar Desktop */}
              <aside className="hidden md:block flex-shrink-0">
                <Sidebar 
                  isCollapsed={isCollapsed} 
                  setIsCollapsed={setIsCollapsed} 
                  isMobile={false} 
                />
              </aside>

              {/* Sidebar Mobile */}
              {sidebarOpen ? (
                 <div className={`md:hidden fixed inset-y-0 left-0 z-50 transform ${
                  sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } transition-transform duration-300 ease-in-out`}>
                  <Sidebar 
                    onClose={() => {setSidebarOpen(false);}} 
                    isMobile={true} 
                  />
                </div>
              ) : null}

              {/* Mobile Overlay */}
              {sidebarOpen && (
                <div
                  className="md:hidden fixed inset-0 z-30 bg-gray-600 bg-opacity-75 transition-opacity"
                  onClick={() => setSidebarOpen(false)}
                />
              )}

              {/* Main Content */}
              <div className="flex-1 relative flex flex-col w-0 overflow-hidden">
                <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
                  <div className="min-h-full h-full">
                    <Suspense fallback={<LoadingScreen />}>
                      <Routes>
                        <Route index element={<Dashboard />} />
                        <Route path="chats" element={<Chats />} />
                        <Route path="chats/:id" element={<Chats />} />
                        <Route path="chat/:id" element={<Chat />} />
                        <Route path="customers" element={<Customers />} />
                        <Route path="customers/:id/chats" element={<CustomerChats />} />
                        <Route path="appointments" element={<AppointmentsPage />} />
                        <Route path="tasks" element={<Tasks />} />
                        <Route path="schedules/list" element={<SchedulesListPage />} />
                        <Route path="schedules/:scheduleId/management" element={<ScheduleManagementPage />} />
                        <Route path="schedules/:scheduleId/availability" element={<ScheduleAvailabilityPage />} />
                        <Route path="schedules/:scheduleId/holidays" element={<ScheduleHolidaysPage />} />
                        <Route path="financial" element={<FinancialDashboard />} />
                        <Route path="financial/transactions" element={<FinancialTransactions />} />
                        <Route path="financial/cashiers" element={<FinancialCashiers />} />
                        <Route path="financial/cashiers/:id/operations" element={<FinancialCashierOperations />} />
                        <Route path="financial/categories" element={<FinancialCategories />} />
                        <Route path="financial/payment-methods" element={<FinancialPaymentMethods />} />
                        <Route path="financial/reports" element={<FinancialReports />} />
                        <Route path="settings" element={<SettingsPage />} />
                        {!window.isNativeApp && (
                          <>
                            <Route path="settings/billing" element={<BillingPage />} />
                            <Route path="settings/usage" element={<UsagePage />} />
                          </>
                        )}
                        <Route path="settings/integrations" element={<IntegrationsPage />} />
                        <Route path="settings/api-keys" element={<ApiKeysPage />} />
                        <Route path="settings/notifications" element={<NotificationsPage />} />
                        <Route path="member" element={<OrganizationMembers />} />
                        <Route path="member/referrals/:profileId" element={<Referrals />} />
                        <Route path="service-teams" element={<ServiceTeams />} />
                        <Route path="channels" element={<Channels />} />
                        <Route path="channels/new" element={<SelectChannelType />} />
                        <Route path="channels/new/email" element={<EmailChannelForm />} />
                        <Route path="channels/new/whatsapp_official" element={<WhatsAppOfficialForm />} />
                        <Route path="channels/new/whatsapp_wapi" element={<WhatsAppWApiForm />} />
                        <Route path="channels/new/whatsapp_zapi" element={<WhatsAppZApiForm />} />
                        <Route path="channels/new/whatsapp_evo" element={<WhatsAppEvoForm />} />
                        <Route path="channels/new/facebook" element={<FacebookForm />} />
                        <Route path="channels/new/instagram" element={<InstagramForm />} />
                        <Route path="channels/:id/edit/email" element={<EmailChannelForm />} />
                        <Route path="channels/:id/edit/whatsapp_official" element={<WhatsAppOfficialForm />} />
                        <Route path="channels/:id/edit/whatsapp_wapi" element={<WhatsAppWApiForm />} />
                        <Route path="channels/:id/edit/whatsapp_zapi" element={<WhatsAppZApiForm />} />
                        <Route path="channels/:id/edit/whatsapp_evo" element={<WhatsAppEvoForm />} />
                        <Route path="channels/:id/edit/facebook" element={<FacebookForm />} />
                        <Route path="channels/:id/edit/instagram" element={<InstagramForm />} />
                        <Route path="channels/:id/templates" element={<WhatsAppTemplates />} />
                        <Route path="shortcuts" element={<MessageShortcuts />} />
                        <Route path="flows" element={<FlowList />} />
                        <Route path="flows/:id" element={<FlowEditor />} />
                        <Route path="crm" element={<CRMFunnels />} />
                        <Route path="crm/:id" element={<CRMFunnel />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="tags" element={<Tags />} />
                        <Route path="prompts" element={<Prompts />} />
                        <Route path="prompts/new" element={<PromptFormPage />} />
                        <Route path="prompts/edit/:id" element={<PromptFormPage />} />
                        <Route path="closure-types" element={<ClosureTypesPage />} />
                        {profile?.is_superadmin && (
                          <>
                            <Route path="admin/organizations" element={<Organizations />} />
                            <Route path="admin/organizations/add" element={<AddOrganization />} />
                            <Route path="admin/organizations/:organizationId/subscriptions" element={<OrganizationSubscriptions />} />
                            <Route path="admin/subscription-plans" element={<SubscriptionPlans />} />
                            <Route path="admin/subscription-plans/new" element={<SubscriptionPlanForm />} />
                            <Route path="admin/subscription-plans/:id" element={<SubscriptionPlanForm />} />
                          </>
                        )}
                      </Routes>
                    </Suspense>
                  </div>
                </main>
              </div>

              {/* Mobile Navigation Bar */}
              <MobileNavBar onOpenSidebar={() => {
                setSidebarOpen(true);
              }} />
            </div>
          }
        />

        {/* Redireciona rotas não encontradas para /app */}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </>
  );
}

function App() {
  const [globalLoading, setGlobalLoading] = useState(true);
  const [contentReady, setContentReady] = useState(false);
  
  // Efeito para garantir que o LoadingScreen seja exibido durante todo o processo de carregamento
  useEffect(() => {
    // Adicionar um estilo global para evitar flash de tela branca
    const style = document.createElement('style');
    style.innerHTML = `
      body {
        background-color: ${window.matchMedia('(prefers-color-scheme: dark)').matches ? '#111827' : '#f9fafb'};
        transition: background-color 0.3s ease;
      }
    `;
    document.head.appendChild(style);
    
    // Remover o estilo quando o componente for desmontado
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Efeito para remover o loader inicial quando o React estiver pronto
  useEffect(() => {
    // Remover o loader inicial
    if (typeof window.removeInitialLoader === 'function') {
      window.removeInitialLoader();
    } else {
      // Fallback para remover o loader se a função não estiver disponível
      const initialLoader = document.getElementById('initial-loader');
      if (initialLoader && initialLoader.parentNode) {
        initialLoader.style.opacity = '0';
        initialLoader.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          if (initialLoader.parentNode) {
            initialLoader.parentNode.removeChild(initialLoader);
          }
        }, 300);
      }
    }
  }, []);
  
  useEffect(() => {
    // Fix para iOS
    const appHeight = () => {
      const doc = document.documentElement;
      doc.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };

    window.addEventListener('resize', appHeight);
    appHeight();
    
    // Tempo mínimo de loading para mostrar a tela inicial
    const minLoadingTime = 800; // Reduzido para 800ms
    
    // Usar requestAnimationFrame para verificar quando o DOM estiver pronto para renderizar
    requestAnimationFrame(() => {
      const startTime = Date.now();
      
      // Função para finalizar o loading após o tempo mínimo
      const finishLoading = () => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        
        // Se já passou o tempo mínimo, finaliza imediatamente
        if (remainingTime <= 0) {
          setGlobalLoading(false);
        } else {
          // Caso contrário, espera apenas o tempo restante
          setTimeout(() => {
            setGlobalLoading(false);
          }, remainingTime);
        }
      };
      
      // Usar o evento 'DOMContentLoaded' para detectar quando o DOM estiver pronto
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        finishLoading();
      } else {
        document.addEventListener('DOMContentLoaded', finishLoading);
      }
      
      // Definir um timeout máximo para evitar que o usuário fique preso na tela de loading
      const maxLoadingTimeout = setTimeout(() => {
        setGlobalLoading(false);
      }, 2000); // 2 segundos no máximo
      
      return () => {
        clearTimeout(maxLoadingTimeout);
      };
    });
    
    return () => {
      window.removeEventListener('resize', appHeight);
      document.removeEventListener('DOMContentLoaded', () => {
        setGlobalLoading(false);
      });
    };
  }, []);

  // Efeito para detectar quando o conteúdo principal estiver pronto
  useEffect(() => {
    if (!globalLoading) {
      // Usar um pequeno timeout para garantir que o conteúdo esteja realmente pronto
      const readyTimeout = setTimeout(() => {
        setContentReady(true);
      }, 100);
      
      return () => clearTimeout(readyTimeout);
    }
  }, [globalLoading]);

  // Se ainda estiver no carregamento global inicial, mostrar tela de loading
  // Nota: Precisamos envolver o LoadingScreen com o ThemeProvider para que o tema seja aplicado
  if (globalLoading || !contentReady) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <LoadingScreen />
        </ToastProvider>
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider>
            <NavbarVisibilityProvider>
              <ToastProvider>
                <Router>
                  <AppContent />
                </Router>
              </ToastProvider>
            </NavbarVisibilityProvider>
          </ThemeProvider>
        </I18nextProvider>
      </AuthProvider>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}

export default App;