import React, { useState, useEffect } from 'react';
import { Users, Plus, Loader2, X, Mail, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '../../hooks/useOrganization';
import { supabase } from '../../lib/supabase';
import { OrganizationMember, Profile } from '../../types/database';

interface TeamMemberWithProfile extends OrganizationMember {
  profile: Profile | null;
}

interface InviteFormData {
  email: string;
  fullName: string;
  password: string;
  role: 'admin' | 'agent';
}

export default function TeamMembers() {
  const { t } = useTranslation(['team', 'common']);
  const { currentOrganization, membership } = useOrganization();
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberWithProfile | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [deletingMember, setDeletingMember] = useState(false);
  const [error, setError] = useState('');
  const [inviteForm, setInviteForm] = useState<InviteFormData>({
    email: '',
    fullName: '',
    password: '',
    role: 'agent',
  });

  useEffect(() => {
    if (currentOrganization) {
      loadMembers();
    }
  }, [currentOrganization]);

  async function loadMembers() {
    if (!currentOrganization) return;

    try {
      // First get organization members
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrganization.id);

      if (membersError) throw membersError;

      // Then get profiles for each member
      const membersWithProfiles = await Promise.all((membersData || []).map(async (member) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', member.user_id)
          .single();

        return {
          ...member,
          profile: profile || null
        };
      }));

      setMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error loading members:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setError('');

    if (!currentOrganization) {
      setError(t('team:errors.noOrganization'));
      setInviteLoading(false);
      return;
    }

    try {
      // 1. Create user with sign up
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: inviteForm.email,
        password: inviteForm.password,
        email_confirm: true
      });

      if (authError) {
        if (authError.message === 'User already registered') {
          setError(t('team:errors.userExists'));
          return;
        }
        throw authError;
      }
      
      if (!authData.user) throw new Error('Failed to create user');

      // 2. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: inviteForm.email,
            full_name: inviteForm.fullName,
            role: inviteForm.role,
            is_superadmin: false,
          },
        ]);

      if (profileError) throw profileError;

      // 3. Add to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([
          {
            organization_id: currentOrganization.id,
            user_id: authData.user.id,
            role: inviteForm.role,
          },
        ]);

      if (memberError) throw memberError;

      // 4. Refresh member list
      await loadMembers();
      setShowInviteModal(false);
      setInviteForm({ email: '', fullName: '', password: '', role: 'agent' });
    } catch (err: any) {
      console.error('Error registering user:', err);
      setError(t('common:error'));
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRemoveMember() {
    if (!selectedMember) return;
    
    setDeletingMember(true);
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', selectedMember.id);

      if (error) throw error;

      await loadMembers();
      setShowDeleteModal(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Error removing member:', error);
      setError(t('common:error'));
    } finally {
      setDeletingMember(false);
    }
  }

  if (!currentOrganization) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-gray-500 dark:text-gray-400">
            {t('common:loading')}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Users className="w-6 h-6 mr-2" />
          {t('team:title')}
        </h1>
        {(membership?.role === 'owner' || membership?.role === 'admin') && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('team:addUser')}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('team:user.title')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('team:user.role')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('team:user.email')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('team:user.since')}
              </th>
              {membership?.role === 'owner' && (
                <th className="relative px-6 py-3">
                  <span className="sr-only">{t('team:actions.register')}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {member.profile?.avatar_url ? (
                        <img
                          src={member.profile.avatar_url}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {member.profile?.full_name?.[0] || '?'}
                        </span>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.profile?.full_name || t('team:user.unknown')}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                    {t(`team:roles.${member.role}`)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Mail className="w-4 h-4 mr-2" />
                    {member.profile?.email || t('team:user.emailNotAvailable')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(member.created_at).toLocaleDateString()}
                </td>
                {membership?.role === 'owner' && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        {t('team:actions.remove')}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Register User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('team:addUser')}
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('team:form.fullName')}
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={inviteForm.fullName}
                    onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('team:form.email')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('team:form.password')}
                  </label>
                  <input
                    type="password"
                    id="password"
                    required
                    minLength={6}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={inviteForm.password}
                    onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('team:form.role')}
                  </label>
                  <select
                    id="role"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as 'admin' | 'agent' })}
                  >
                    <option value="agent">{t('team:roles.agent')}</option>
                    <option value="admin">{t('team:roles.admin')}</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('team:actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('team:actions.register')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMember && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('team:delete.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('team:delete.confirmation', { name: selectedMember.profile?.full_name })}
                <br />
                {t('team:delete.warning')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedMember(null);
                  }}
                  disabled={deletingMember}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common:back')}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveMember}
                  disabled={deletingMember}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingMember ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common:deleting')}
                    </>
                  ) : (
                    t('common:confirmDelete')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}