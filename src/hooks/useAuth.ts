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
    if (profile && profile.id === userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        if (data.language && data.language !== i18n.language) {
          await reloadTranslations(data.language);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, [i18n, profile]);

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

      // console.log(error);
      
      // Se houver erro de sessão não encontrada ou AuthSessionMissingError
      const projectId = import.meta.env.VITE_SUPABASE_URL.match(/(?:\/\/|^)(.*?)\.supabase/)?.[1];
      if (projectId) {
        localStorage.removeItem(`sb-${projectId}-auth-token`);
      }
      
      return { error };
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setSession(null);
      setProfile(null);
      const projectId = import.meta.env.VITE_SUPABASE_URL.match(/(?:\/\/|^)(.*?)\.supabase/)?.[1];
      if (projectId) {
        localStorage.removeItem(`sb-${projectId}-auth-token`);
      }
    }
  }

  return { session, profile, loading, signIn, signOut };
}