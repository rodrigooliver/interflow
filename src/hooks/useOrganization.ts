import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Organization, OrganizationMember, Subscription } from '../types/database';
import { useAuth } from './useAuth';

export function useOrganization() {
  const { session } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      loadOrganizations();
    }
  }, [session?.user?.id]);

  async function loadOrganizations() {
    try {
      const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations (*)
        `)
        .eq('user_id', session?.user?.id);

      if (membershipError) throw membershipError;

      if (memberships && memberships.length > 0) {
        const orgs = memberships.map((m: any) => m.organizations);
        setOrganizations(orgs);
        
        // Set first organization as current if none selected
        if (!currentOrganization) {
          setCurrentOrganization(orgs[0]);
          setMembership({
            id: memberships[0].id,
            organization_id: memberships[0].organization_id,
            user_id: session?.user?.id || '',
            role: memberships[0].role,
            created_at: memberships[0].created_at
          });
          loadSubscription(orgs[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSubscription(organizationId: string) {
    try {
      // Remove .single() and handle the array result
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      // Set the first subscription if available, otherwise null
      setSubscription(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Error loading subscription:', error);
      setSubscription(null);
    }
  }

  async function switchOrganization(organizationId: string) {
    const org = organizations.find(o => o.id === organizationId);
    if (org) {
      setCurrentOrganization(org);
      const { data: membership } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', session?.user?.id)
        .single();

      setMembership(membership);
      loadSubscription(organizationId);
    }
  }

  return {
    organizations,
    currentOrganization,
    membership,
    subscription,
    loading,
    switchOrganization
  };
}