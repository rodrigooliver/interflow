import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    // console.log('[useAuth] Inicializando hook de autenticação');

    // Buscar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      // console.log('[useAuth] Sessão inicial obtida:', session ? 'Usuário autenticado' : 'Sem sessão');
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // console.log('[useAuth] Evento de autenticação:', event);
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    return () => {
      // console.log('[useAuth] Limpando hook de autenticação');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // console.log('[useAuth] Tentando fazer login com email:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[useAuth] Erro no login:', error.message);
        throw error;
      }

      // console.log('[useAuth] Login bem-sucedido, usuário:', data.user?.id);
      return { error: null };
    } catch (error) {
      console.error('[useAuth] Exceção no login:', error);
      return { error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    // console.log('[useAuth] Tentando fazer logout');
    try {
      localStorage.removeItem('selectedOrganizationId');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[useAuth] Erro no logout:', error.message);
        throw error;
      }
      // console.log('[useAuth] Logout bem-sucedido');
      queryClient.invalidateQueries();
      setTimeout(() => {
        queryClient.clear();
      }, 1000);
      return { error: null };
    } catch (error) {
      console.error('[useAuth] Exceção no logout:', error); 
      return { error: error as Error };
    }
  }, []);

  return {
    session,
    loading,
    signIn,
    signOut
  };
}