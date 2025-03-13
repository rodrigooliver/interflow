import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function ConnectionStatus() {
  const { t } = useTranslation();
  const { isOnline, isLoading } = useOnlineStatus();
  const [show, setShow] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const previousOnlineStatus = useRef<boolean | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout>();
  const hideTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Limpa os timers anteriores se existirem
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    // Se estiver offline, mostra a barra grande
    if (!isLoading && !isOnline) {
      setShow(true);
      setIsFading(false);
    }
    // Se voltar online, mostra a notificação temporária
    else if (!isLoading && previousOnlineStatus.current === false && isOnline) {
      setShow(true);
      setIsFading(false);
      
      fadeTimerRef.current = setTimeout(() => {
        setIsFading(true);
        hideTimerRef.current = setTimeout(() => {
          setShow(false);
        }, 500); // Tempo da animação de fade out
      }, 3000); // Tempo total de exibição (3 segundos)
    }

    previousOnlineStatus.current = isOnline;

    // Limpa os timers quando o componente é desmontado ou quando o estado muda
    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [isLoading, isOnline]);

  if (isLoading || !show) {
    return null;
  }

  const baseClasses = "fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center transition-opacity duration-500";
  const fadeClass = isFading ? "opacity-0" : "opacity-100";

  if (!isOnline) {
    return (
      <div className={`${baseClasses} bg-red-500 text-white`}>
        <div className="flex items-center justify-center space-x-2">
          <WifiOff className="h-4 w-4" />
          <span>{t('common:offline')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} ${fadeClass} bg-green-500 text-white`}>
      <div className="flex items-center justify-center space-x-2">
        <Wifi className="h-4 w-4" />
        <span>{t('common:online')}</span>
      </div>
    </div>
  );
} 