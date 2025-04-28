import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLocation } from 'react-router-dom';
import { TrackingPixel } from '../types/tracking';

interface Referral {
  id: string;
  code: string;
  user_id: string;
  organization_id: string;
  status: 'active' | 'inactive';
  tracking_pixels?: TrackingPixel[];
}

export interface ReferralData {
  referral: Referral | null;
  tracking_pixels: TrackingPixel[];
}

const STORAGE_KEY = '@interflow:referral';
const PIXELS_STORAGE_KEY = '@interflow:tracking_pixels';

export function useReferral() {
  const [referral, setReferral] = useState<Referral | null>(null);
  const [trackingPixels, setTrackingPixels] = useState<TrackingPixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    async function loadReferral() {
      try {
        setLoading(true);
        
        // Primeiro, verificar se há um novo referral na URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlCode = urlParams.get('ref');

        // Se houver código na URL, verificar se é diferente do armazenado
        if (urlCode) {
          const storedReferral = localStorage.getItem(STORAGE_KEY);
          const currentReferral = storedReferral ? JSON.parse(storedReferral) : null;

          // Se o código da URL for diferente do armazenado, buscar o novo
          if (!currentReferral || currentReferral.code !== urlCode) {
            // Buscar o referral com join na visualização segura de tracking_pixels
            const { data: referralData, error: referralError } = await supabase
              .from('referrals')
              .select(`
                *,
                tracking_pixels:tracking_pixels_public(*)
              `)
              .eq('code', urlCode)
              .eq('status', 'active')
              .single();

            if (referralError) {
              console.warn(`Referral code "${urlCode}" não encontrado ou inválido:`, referralError);
              // Se não encontrar o referral, não definimos como erro para o usuário
              // Apenas mantemos o atual ou limpamos
              if (!currentReferral) {
                setReferral(null);
                setTrackingPixels([]);
              } else {
                setReferral(currentReferral);
                // Carregar pixels do localStorage
                const storedPixels = localStorage.getItem(PIXELS_STORAGE_KEY);
                if (storedPixels) {
                  setTrackingPixels(JSON.parse(storedPixels));
                }
              }
            } else if (referralData) {
              // Extrair referral e pixels do resultado
              const newReferral = {
                ...referralData,
                tracking_pixels: undefined // Remove o campo tracking_pixels do objeto referral
              };
              
              // Filtrar apenas pixels ativos (embora a política já faça isso no banco)
              const pixels = referralData.tracking_pixels || [];
              
              // Atualizar o storage com o novo referral e seus pixels
              localStorage.setItem(STORAGE_KEY, JSON.stringify(newReferral));
              localStorage.setItem(PIXELS_STORAGE_KEY, JSON.stringify(pixels));
              
              setReferral(newReferral);
              setTrackingPixels(pixels);
            }
            
            setLoading(false);
            return;
          } else if (currentReferral) {
            // O código da URL é o mesmo do armazenado, usamos o armazenado
            setReferral(currentReferral);
            
            // Carregar pixels do localStorage
            const storedPixels = localStorage.getItem(PIXELS_STORAGE_KEY);
            if (storedPixels) {
              setTrackingPixels(JSON.parse(storedPixels));
            }
            
            setLoading(false);
            return;
          }
        }

        // Se não houver novo referral na URL, usar o do storage
        const storedReferral = localStorage.getItem(STORAGE_KEY);
        if (storedReferral) {
          const savedReferral = JSON.parse(storedReferral);
          setReferral(savedReferral);
          
          // Carregar pixels do localStorage
          const storedPixels = localStorage.getItem(PIXELS_STORAGE_KEY);
          if (storedPixels) {
            setTrackingPixels(JSON.parse(storedPixels));
          }
        } else {
          setReferral(null);
          setTrackingPixels([]);
        }
        
        setLoading(false);

      } catch (err) {
        console.error('Erro ao carregar referral:', err);
        setError('Falha ao carregar código de referência');
        setLoading(false);
      }
    }

    loadReferral();
  }, [location.search]); // Reativa quando a query string da URL mudar

  // Função para limpar o referral do storage
  const clearReferral = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PIXELS_STORAGE_KEY);
    setReferral(null);
    setTrackingPixels([]);
  };

  return { referral, trackingPixels, loading, error, clearReferral };
} 