import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Referral {
  id: string;
  code: string;
  user_id: string;
  organization_id: string;
  status: 'active' | 'inactive';
}

const STORAGE_KEY = '@interflow:referral';

export function useReferral() {
  const [referral, setReferral] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReferral() {
      try {
        // Primeiro, verificar se há um novo referral na URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlCode = urlParams.get('ref');

        // Se houver código na URL, verificar se é diferente do armazenado
        if (urlCode) {
          const storedReferral = localStorage.getItem(STORAGE_KEY);
          const currentReferral = storedReferral ? JSON.parse(storedReferral) : null;

          // Se o código da URL for diferente do armazenado, buscar o novo
          if (!currentReferral || currentReferral.code !== urlCode) {
            const { data: newReferral, error } = await supabase
              .from('referrals')
              .select('*')
              .eq('code', urlCode)
              .eq('status', 'active')
              .single();

            if (error) throw error;

            if (newReferral) {
              // Atualizar o storage com o novo referral
              localStorage.setItem(STORAGE_KEY, JSON.stringify(newReferral));
              setReferral(newReferral);
              setLoading(false);
              return;
            }
          }
        }

        // Se não houver novo referral na URL, usar o do storage
        const storedReferral = localStorage.getItem(STORAGE_KEY);
        if (storedReferral) {
          setReferral(JSON.parse(storedReferral));
          setLoading(false);
          return;
        }

        // Se não houver referral nem na URL nem no storage
        setLoading(false);

      } catch (err) {
        console.error('Erro ao carregar referral:', err);
        setError('Falha ao carregar código de referência');
        setLoading(false);
      }
    }

    loadReferral();
  }, []);

  // Função para limpar o referral do storage
  const clearReferral = () => {
    localStorage.removeItem(STORAGE_KEY);
    setReferral(null);
  };

  return { referral, loading, error, clearReferral };
} 