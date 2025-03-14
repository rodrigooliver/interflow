import React, { useState } from 'react';
import { Users, Loader2, X, Mail, AlertTriangle, Edit, Link } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link as RouterLink } from 'react-router-dom';
import { useAgents } from '../../hooks/useQueryes';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

type MemberWithProfile = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  profile: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    whatsapp: string;
    created_at: string;
  } | null;
};

interface InviteFormData {
  email: string;
  fullName: string;
  role: 'admin' | 'agent';
}

interface EditProfileFormData {
  fullName: string;
  email: string;
  avatarUrl: string;
  whatsapp: string;
}

export default function OrganizationMembers() {
  const { t, i18n } = useTranslation(['member', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithProfile | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [deletingMember, setDeletingMember] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [inviteForm, setInviteForm] = useState<InviteFormData>({
    email: '',
    fullName: '',
    role: 'agent',
  });
  const [editProfileForm, setEditProfileForm] = useState<EditProfileFormData>({
    fullName: '',
    email: '',
    avatarUrl: '',
    whatsapp: ''
  });

  // Usando o hook useAgents para buscar os membros
  const { data: members = [], isLoading } = useAgents(
    currentOrganizationMember?.organization.id,
    ['agent', 'admin', 'owner', 'member']
  );

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setError('');
    setSuccessMessage('');

    if (!currentOrganizationMember) {
      setError(t('member:errors.noOrganization'));
      setInviteLoading(false);
      return;
    }

    try {
      // Obter o idioma atual da aplicação
      const currentLanguage = i18n.language || 'pt';
      
      const response = await api.post(`/api/${currentOrganizationMember.organization.id}/member/invite`, {
        email: inviteForm.email,
        fullName: inviteForm.fullName,
        role: inviteForm.role,
        language: currentLanguage.substring(0, 2) // Pegar apenas os primeiros 2 caracteres (pt-BR -> pt)
      });

      const data = response.data;

      if (!data.success) {
        if (data.error === 'Usuário já registrado') {
          setError(t('member:errors.userExists'));
          return;
        }
        throw new Error(data.error || 'Erro ao convidar usuário');
      }

      // Invalidar cache dos agents
      await queryClient.invalidateQueries({ queryKey: ['agents', currentOrganizationMember.organization.id] });
      
      // Fechar modal e limpar form
      setShowInviteModal(false);
      setInviteForm({ email: '', fullName: '', role: 'agent' });
      
      // Mostrar mensagem de sucesso
      setSuccessMessage(t('member:invite.success', 'Convite enviado com sucesso! Um email foi enviado para {email}.', { email: inviteForm.email }));
      
      // Esconder mensagem após 5 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err: unknown) {
      console.error('Error inviting user:', err);
      setError(err instanceof Error ? err.message : t('common:error'));
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRemoveMember() {
    if (!selectedMember || !currentOrganizationMember) return;
    
    setDeletingMember(true);
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', selectedMember.id);

      if (error) throw error;

      // Invalidar cache dos agents
      await queryClient.invalidateQueries({ queryKey: ['agents', currentOrganizationMember.organization.id] });
      
      setShowDeleteModal(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Error removing member:', error);
      setError(t('common:error'));
    } finally {
      setDeletingMember(false);
    }
  }

  async function handleEditProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMember?.profile || !currentOrganizationMember) return;
    
    setEditingProfile(true);
    setError('');
    
    try {
      const response = await api.put(`/api/${currentOrganizationMember.organization.id}/member/${selectedMember.profile.id}`, {
        fullName: editProfileForm.fullName,
        email: editProfileForm.email,
        avatarUrl: editProfileForm.avatarUrl,
        whatsapp: editProfileForm.whatsapp
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao atualizar perfil');
      }
      
      // Invalidar cache dos agents
      await queryClient.invalidateQueries({ queryKey: ['agents', currentOrganizationMember.organization.id] });
      
      setShowEditModal(false);
      setSelectedMember(null);
    } catch (err: unknown) {
      console.error('Erro ao atualizar perfil:', err);
      setError(err instanceof Error ? err.message : t('common:error'));
    } finally {
      setEditingProfile(false);
    }
  }

  if (!currentOrganizationMember) {
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

  if (isLoading) {
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
          {t('member:title')}
        </h1>
        {(currentOrganizationMember?.role === 'owner' || currentOrganizationMember?.role === 'admin') && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Mail className="w-4 h-4 mr-2" />
            {t('member:actions.invite', 'Convidar Atendente')}
          </button>
        )}
      </div>

      {/* Mensagem de sucesso */}
      {successMessage && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-md flex items-start">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('member:user.title')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('member:user.role')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('member:user.email')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('member:user.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('member:user.since')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('member:user.actions')}
              </th>
              {currentOrganizationMember?.role === 'owner' && (
                <th className="relative px-6 py-3">
                  <span className="sr-only">{t('member:actions.register')}</span>
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
                        {member.profile?.full_name || t('member:user.unknown')}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                    {t(`member:roles.${member.role}`)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Mail className="w-4 h-4 mr-2" />
                    {member.profile?.email || t('member:user.emailNotAvailable')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {member.status === 'pending' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                      {t('member:status.pending', 'Aguardando aceitação')}
                    </span>
                  ) : member.status === 'inactive' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      {t('member:status.inactive', 'Inativo')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      {t('member:status.active', 'Ativo')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(member.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        if (member.profile) {
                          setSelectedMember(member);
                          setEditProfileForm({
                            fullName: member.profile.full_name || '',
                            email: member.profile.email || '',
                            avatarUrl: member.profile.avatar_url || '',
                            whatsapp: member.profile.whatsapp || ''
                          });
                          setShowEditModal(true);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      title={t('member:actions.edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {member.profile && (
                      <RouterLink
                        to={`/app/member/referrals/${member.profile.id}`}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 flex items-center justify-center w-8 h-8 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30"
                        title={t('member:actions.referrals')}
                      >
                        <Link className="w-4 h-4" />
                      </RouterLink>
                    )}
                    {currentOrganizationMember?.role === 'owner' && member.role !== 'owner' && (
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center justify-center w-8 h-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
                        title={t('member:actions.remove')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
                {currentOrganizationMember?.role === 'owner' && (
                  <td className="relative px-6 py-3">
                    <span className="sr-only">{t('member:actions.register')}</span>
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
                {t('member:actions.invite', 'Convidar Atendente')}
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

              <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-md">
                <p className="text-sm">
                  {t('member:invite.info', 'Um convite será enviado para o email informado. O usuário precisará clicar no link recebido para ativar sua conta.')}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('member:form.fullName')}
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
                    {t('member:form.email')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('member:form.emailHelp', 'Informe um email válido para o qual o convite será enviado.')}
                  </p>
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('member:form.role')}
                  </label>
                  <select
                    id="role"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as 'admin' | 'agent' })}
                  >
                    <option value="agent">{t('member:roles.agent')}</option>
                    <option value="admin">{t('member:roles.admin')}</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('member:actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('member:actions.invite', 'Enviar Convite')}
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
                {t('member:delete.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('member:delete.confirmation', { name: selectedMember.profile?.full_name })}
                <br />
                {t('member:delete.warning')}
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

      {/* Edit Profile Modal */}
      {showEditModal && selectedMember?.profile && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('member:edit.title')}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditProfile} className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="editFullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('member:form.fullName')}
                  </label>
                  <input
                    type="text"
                    id="editFullName"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={editProfileForm.fullName}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, fullName: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('member:form.email')}
                  </label>
                  <input
                    type="email"
                    id="editEmail"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={editProfileForm.email}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="editAvatarUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('member:form.avatarUrl')}
                  </label>
                  <input
                    type="url"
                    id="editAvatarUrl"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={editProfileForm.avatarUrl}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, avatarUrl: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="editWhatsapp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('member:form.whatsapp')}
                  </label>
                  <input
                    type="text"
                    id="editWhatsapp"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={editProfileForm.whatsapp}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, whatsapp: e.target.value })}
                    placeholder="+55 (11) 98765-4321"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('member:actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={editingProfile}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('member:actions.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}