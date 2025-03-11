import { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, Organization } from '../types/database';
import { useTranslation } from 'react-i18next';
import { reloadTranslations } from '../i18n';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
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

  const loadOrganization = useCallback(async (userId: string) => {
    try {
      const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select(`
          organization:organizations (
            id,
            name,
            slug,
            logo_url,
            status,
            created_at,
            updated_at,
            storage_limit,
            storage_used,
            settings
          )
        `)
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (membershipError) throw membershipError;

      if (memberships?.organization) {
        setCurrentOrganization(memberships.organization as Organization);
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
        loadOrganization(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
        loadOrganization(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, loadOrganization]);

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
      setCurrentOrganization(null);

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
      setCurrentOrganization(null);
      const projectId = import.meta.env.VITE_SUPABASE_URL.match(/(?:\/\/|^)(.*?)\.supabase/)?.[1];
      if (projectId) {
        localStorage.removeItem(`sb-${projectId}-auth-token`);
      }
    }
  }

  return { session, profile, currentOrganization, loading, signIn, signOut };
}