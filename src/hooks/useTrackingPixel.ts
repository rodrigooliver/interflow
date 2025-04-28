import { useEffect, useState, useCallback } from 'react';
import { TrackingEventType } from '../types/tracking';
import { initFacebookPixel, initGooglePixel, initTikTokPixel } from '../lib/pixels';
import { useReferral } from './useReferral';

interface TrackingPixelHookReturn {
  trackEvent: (eventName: TrackingEventType, params?: Record<string, unknown>) => Promise<void>;
  loading: boolean;
  error: string | null;
}

// Mapeamento de eventos para cada plataforma
const EVENT_MAPPING: Record<'facebook' | 'google' | 'tiktok', Record<TrackingEventType, string>> = {
  facebook: {
    PageView: 'PageView',
    SignUp: 'CompleteRegistration',
    CompleteRegistration: 'CompleteRegistration',
    Lead: 'Lead',
    Contact: 'Contact',
    Subscribe: 'Subscribe',
    StartTrial: 'StartTrial',
    Purchase: 'Purchase',
    AddToCart: 'AddToCart',
    InitiateCheckout: 'InitiateCheckout',
    Search: 'Search',
    ViewContent: 'ViewContent',
    AddPaymentInfo: 'AddPaymentInfo',
    CustomEvent: 'CustomEvent'
  },
  google: {
    PageView: 'page_view',
    SignUp: 'sign_up',
    CompleteRegistration: 'sign_up',
    Lead: 'generate_lead',
    Contact: 'contact',
    Subscribe: 'subscribe',
    StartTrial: 'begin_trial',
    Purchase: 'purchase',
    AddToCart: 'add_to_cart',
    InitiateCheckout: 'begin_checkout',
    Search: 'search',
    ViewContent: 'view_item',
    AddPaymentInfo: 'add_payment_info',
    CustomEvent: 'custom_event'
  },
  tiktok: {
    PageView: 'PageView',
    SignUp: 'CompleteRegistration',
    CompleteRegistration: 'CompleteRegistration',
    Lead: 'SubmitForm',
    Contact: 'Contact',
    Subscribe: 'Subscribe',
    StartTrial: 'StartTrial',
    Purchase: 'Purchase',
    AddToCart: 'AddToCart',
    InitiateCheckout: 'InitiateCheckout',
    Search: 'Search',
    ViewContent: 'ViewContent',
    AddPaymentInfo: 'AddPaymentInfo',
    CustomEvent: 'CustomEvent'
  }
};

export function useTrackingPixel(): TrackingPixelHookReturn {
  // Usar os pixels já carregados pelo hook useReferral
  const { trackingPixels: referralPixels, loading: referralLoading, referral } = useReferral();
  
  const [error, setError] = useState<string | null>(null);
  const [initializedPixels, setInitializedPixels] = useState<Set<string>>(new Set());
  const [pixelsReady, setPixelsReady] = useState(false);

  // Inicializar os pixels de rastreamento
  useEffect(() => {
    // Se o referral ainda está carregando ou não há pixels, não fazer nada ainda
    if (referralLoading || !referralPixels?.length) {
      return;
    }

    setPixelsReady(false);
    
    try {
      // Inicializar os pixels que ainda não foram inicializados
      referralPixels.forEach(pixel => {
        // Usar pixel_id que é o ID do serviço externo (Facebook, Google, TikTok)
        if (pixel.pixel_id && !initializedPixels.has(pixel.pixel_id)) {
          try {
            switch (pixel.type) {
              case 'facebook':
                initFacebookPixel(pixel.pixel_id);
                break;
              case 'google':
                initGooglePixel(pixel.pixel_id);
                break;
              case 'tiktok':
                initTikTokPixel(pixel.pixel_id);
                break;
            }
            setInitializedPixels(prev => new Set([...prev, pixel.pixel_id]));
          } catch (err) {
            console.error(`Erro ao inicializar pixel ${pixel.type}:`, err);
          }
        }
      });
      
      // Marcar os pixels como prontos para uso
      setPixelsReady(true);
    } catch (err) {
      console.error('Erro ao inicializar pixels de rastreamento:', err);
      setError('Falha ao inicializar pixels de rastreamento');
    }
    
    // Adicionar um pequeno delay para garantir que os scripts de pixels foram carregados
    const pixelInitTimeout = setTimeout(() => {
      setPixelsReady(true);
    }, 1000);
    
    return () => clearTimeout(pixelInitTimeout);
  }, [referralPixels, referralLoading, initializedPixels]);

  // Função para disparar eventos para todos os pixels ativos
  const trackEvent = useCallback(async (eventName: TrackingEventType, params?: Record<string, unknown>) => {
    // Não disparar eventos se os pixels não estiverem prontos ou se não houver pixels
    if (!pixelsReady || !referralPixels?.length) return;

    try {
      // Adicionar informações do referral aos parâmetros
      const eventParams = {
        ...params,
        referral_code: referral?.code || null,
        user_id: referral?.user_id || null
      };

      // Disparar evento para cada pixel ativo
      referralPixels.forEach(pixel => {
        // Verificar se temos o pixel_id antes de tentar disparar eventos
        if (!pixel.pixel_id) {
          console.warn(`Pixel ${pixel.id} não tem pixel_id definido, pulando evento ${eventName}`);
          return;
        }

        switch (pixel.type) {
          case 'facebook':
            if (window.fbq) {
              const fbEvent = EVENT_MAPPING.facebook[eventName];
              window.fbq('track', fbEvent, eventParams);
              console.log(`[Facebook Pixel] Evento ${eventName} enviado para pixel ${pixel.pixel_id}`);
            }
            break;
          case 'google':
            if (window.gtag) {
              const gaEvent = EVENT_MAPPING.google[eventName];
              window.gtag('event', gaEvent, eventParams);
              console.log(`[Google Tag] Evento ${eventName} enviado para pixel ${pixel.pixel_id}`);
            }
            break;
          case 'tiktok':
            if (window.ttq) {
              const ttEvent = EVENT_MAPPING.tiktok[eventName];
              window.ttq.track(ttEvent, eventParams);
              console.log(`[TikTok Pixel] Evento ${eventName} enviado para pixel ${pixel.pixel_id}`);
            }
            break;
          case 'custom':
            // Implementar lógica para pixels customizados se necessário
            break;
        }
      });
    } catch (err) {
      console.error('Erro ao disparar eventos:', err);
      setError('Falha ao disparar eventos de rastreamento');
    }
  }, [referralPixels, pixelsReady, referral]);

  return { 
    trackEvent, 
    loading: referralLoading, 
    error 
  };
} 