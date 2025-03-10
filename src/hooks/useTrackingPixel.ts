import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { TrackingPixel, TrackingEventType } from '../types/tracking';
import { initFacebookPixel, initGooglePixel, initTikTokPixel } from '../lib/pixels';

interface TrackingPixelHookReturn {
  trackEvent: (eventName: TrackingEventType, params?: Record<string, unknown>) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const STORAGE_KEY = '@interflow:referral';

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
  const [pixels, setPixels] = useState<TrackingPixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializedPixels, setInitializedPixels] = useState<Set<string>>(new Set());

  // Carregar pixels vinculados ao referral do localStorage
  useEffect(() => {
    async function loadPixels() {
      try {
        // Tentar pegar o referral do localStorage
        const storedReferral = localStorage.getItem(STORAGE_KEY);
        if (!storedReferral) {
          setPixels([]);
          setLoading(false);
          return;
        }

        const referral = JSON.parse(storedReferral);
        if (!referral?.id) {
          setPixels([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('tracking_pixels')
          .select('*')
          .eq('referral_id', referral.id)
          .eq('status', 'active');

        if (error) throw error;
        setPixels(data || []);

        // Inicializar os pixels que ainda não foram inicializados
        data?.forEach(pixel => {
          if (!initializedPixels.has(pixel.pixel_id)) {
            switch (pixel.pixel_type) {
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
          }
        });
      } catch (err) {
        console.error('Erro ao carregar pixels:', err);
        setError('Falha ao carregar pixels de rastreamento');
      } finally {
        setLoading(false);
      }
    }

    loadPixels();
  }, [initializedPixels]);

  // Função para disparar eventos para todos os pixels ativos
  const trackEvent = useCallback(async (eventName: TrackingEventType, params?: Record<string, unknown>) => {
    if (!pixels.length) return;

    try {
      // Pegar o referral do localStorage para incluir nos parâmetros
      const storedReferral = localStorage.getItem(STORAGE_KEY);
      const referral = storedReferral ? JSON.parse(storedReferral) : null;

      // Adicionar informações do referral aos parâmetros
      const eventParams = {
        ...params,
        referral_code: referral?.code || null,
        user_id: referral?.user_id || null
      };

      // Disparar evento para cada pixel ativo
      pixels.forEach(pixel => {
        switch (pixel.pixel_type) {
          case 'facebook':
            if (window.fbq) {
              const fbEvent = EVENT_MAPPING.facebook[eventName];
              window.fbq('track', fbEvent, eventParams);
            }
            break;
          case 'google':
            if (window.gtag) {
              const gaEvent = EVENT_MAPPING.google[eventName];
              window.gtag('event', gaEvent, eventParams);
            }
            break;
          case 'tiktok':
            if (window.ttq) {
              const ttEvent = EVENT_MAPPING.tiktok[eventName];
              window.ttq.track(ttEvent, eventParams);
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
  }, [pixels]);

  return { trackEvent, loading, error };
} 