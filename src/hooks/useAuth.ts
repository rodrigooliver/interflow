import { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';
import { useTranslation } from 'react-i18next';
import { reloadTranslations } from '../i18n';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        // Load translations for user's preferred language
        if (data.language && data.language !== i18n.language) {
          await reloadTranslations(data.language);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, [i18n]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      
      // Limpa os estados independentemente do resultado
      setSession(null);
      setProfile(null);

      console.log(error)
      
      // Se houver erro de sessão não encontrada, apenas limpamos o estado local
      if (error?.message?.includes('session_not_found')) {
        // Limpa a sessão usando o método correto
        await supabase.auth.signOut();
        return { error: null };
      }
      
      return { error };
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setSession(null);
      setProfile(null);
      await supabase.auth.signOut();
      return { error };
    }
  }

  return { session, profile, loading, signIn, signOut };
}