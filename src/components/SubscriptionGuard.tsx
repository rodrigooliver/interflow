import React from 'react';
import { useLocation } from 'react-router-dom';
import { useCurrentSubscription } from '../hooks/useQueryes';
import { useAuthContext } from '../contexts/AuthContext';
import { SubscriptionExpiredScreen } from './SubscriptionExpiredScreen';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ children }) => {
  const { currentOrganizationMember } = useAuthContext();
  const { data: subscription } = useCurrentSubscription(currentOrganizationMember?.organization.id);
  const location = useLocation();

  // Se não há subscription ou organização, permite acesso
  if (!currentOrganizationMember || !subscription) {
    return <>{children}</>;
  }

  // Verificar se é trial
  const isTrial = subscription?.status === 'trialing';

  // Calcular dias do trial
  const trialDays = subscription ? 
    Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  // Verificar se o trial já venceu
  const isTrialExpired = isTrial && trialDays < 0;

  // Verificar se a subscription já venceu (não trial)
  const isSubscriptionExpired = subscription && !isTrial && 
    new Date(subscription.current_period_end).getTime() < Date.now();

  // Calcular dias desde que venceu
  const daysExpired = subscription ? 
    Math.abs(Math.ceil((Date.now() - new Date(subscription.current_period_end).getTime()) / (1000 * 60 * 60 * 24))) : 0;

  // Se estiver no app nativo, não mostrar restrições de billing
  const isNativeApp = typeof window.isNativeApp === 'boolean' && window.isNativeApp;

  // Rotas permitidas mesmo com subscription vencida
  const allowedRoutes = [
    '/app/settings/billing',
    '/app/profile'
  ];

  // Se estiver em uma rota permitida, permite acesso
  if (allowedRoutes.some(route => location.pathname.startsWith(route))) {
    return <>{children}</>;
  }

  // Se o trial ou subscription estiver vencido e não estiver no app nativo
  if ((isTrialExpired || isSubscriptionExpired) && !isNativeApp) {
    // Mostrar a tela de bloqueio em vez de redirecionar
    return (
      <SubscriptionExpiredScreen 
        isTrialExpired={isTrialExpired}
        daysExpired={daysExpired}
      />
    );
  }

  // Se tudo estiver ok, renderizar os children
  return <>{children}</>;
}; 