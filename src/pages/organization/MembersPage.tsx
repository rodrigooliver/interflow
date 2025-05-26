import React, { useState } from 'react';
import { Users, Loader2, X, Mail, AlertTriangle, Edit, Link } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { useAgents, useOrganizationById, useOrganizationMemberByOrgId } from '../../hooks/useQueryes';
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
    nickname?: string;
  } | null;
};

interface InviteFormData {
  email: string;
  fullName: string;
  role: 'admin' | 'agent';
}

interface EditProfileFormData {
  fullName: string;
  nickname: string;
  whatsapp: string;
  email: string;
}

export default function OrganizationMembers() {
  const { t, i18n } = useTranslation(['member', 'common']);
  const { currentOrganizationMember, profile } = useAuthContext();
  const { organizationId: paramOrganizationId } = useParams<{ organizationId?: string }>();
  const [searchParams] = useSearchParams();
  const queryOrganizationId = searchParams.get('organizationId');
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithProfile | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [deletingMember, setDeletingMember] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [resendingInvite, setResendingInvite] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [inviteForm, setInviteForm] = useState<InviteFormData>({
    email: '',
    fullName: '',
    role: 'agent',
  });
  const [editProfileForm, setEditProfileForm] = useState<EditProfileFormData>({
    fullName: '',
    nickname: '',
    whatsapp: '',
    email: ''
  });

  // Determinar qual organização usar - da URL, query string ou da organização atual
  const organizationId = paramOrganizationId || queryOrganizationId;
  const targetOrganizationId = organizationId || currentOrganizationMember?.organization.id;
  
  // Buscar dados da organização específica se vier da URL
  const { data: urlOrganization } = useOrganizationById(organizationId || undefined);
  
  // Buscar membro da organização específica se vier da URL
  const { data: urlOrganizationMember } = useOrganizationMemberByOrgId(
    organizationId || undefined, 
    profile?.id
  );
  
  // Usando o hook useAgents para buscar os membros
  const { data: members = [], isLoading } = useAgents(
    targetOrganizationId,
    ['agent', 'admin', 'owner', 'member']
  );

  // Verificar limite de usuários - usar dados da URL se disponível, senão usar currentOrganizationMember
  const organizationData = urlOrganization || currentOrganizationMember?.organization;
  const userUsage = organizationData?.usage?.users;
  const isUserLimitReached = userUsage && userUsage.used >= userUsage.limit;

  // Determinar qual membro da organização usar para verificações de permissão
  const effectiveOrganizationMember = urlOrganizationMember || currentOrganizationMember;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setError('');
    setSuccessMessage('');

    if (!targetOrganizationId) {
      setError(t('member:errors.noOrganization'));
      setInviteLoading(false);
      return;
    }

    // Verificar se o usuário tem permissão para enviar convites
    const hasPermission = (effectiveOrganizationMember?.role === 'owner' || effectiveOrganizationMember?.role === 'admin') || profile?.is_superadmin;
    if (!hasPermission) {
      setError(t('member:errors.noPermission', 'Você não tem permissão para enviar convites.'));
      setInviteLoading(false);
      return;
    }

    // Verificar limite de usuários
    if (isUserLimitReached ) {
      setError(t('member:errors.userLimitReached', 'Limite de usuários atingido. Faça upgrade do seu plano para adicionar mais membros.'));
      setInviteLoading(false);
      return;
    }

    try {
      // Obter o idioma atual da aplicação
      const currentLanguage = i18n.language || 'pt';
      
      const response = await api.post(`/api/${targetOrganizationId}/member/invite`, {
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
      await queryClient.invalidateQueries({ queryKey: ['agents', targetOrganizationId] });
      
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
    if (!selectedMember?.profile || !targetOrganizationId) return;
    
    // Verificar se o usuário tem permissão para remover membros
    const hasPermission = effectiveOrganizationMember?.role === 'owner' || profile?.is_superadmin;
    if (!hasPermission) {
      setError(t('member:errors.noPermission', 'Você não tem permissão para remover membros.'));
      return;
    }
    
    setDeletingMember(true);
    setError('');
    
    try {
      const response = await api.delete(`/api/${targetOrganizationId}/member/${selectedMember.profile.id}`);
      
      const data = response.data;
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao remover membro');
      }

      // Invalidar cache dos agents
      await queryClient.invalidateQueries({ queryKey: ['agents', targetOrganizationId] });
      
      setShowDeleteModal(false);
      setSelectedMember(null);
      
      // Mostrar mensagem de sucesso com base na resposta da API
      setSuccessMessage(data.message || t('member:delete.success', 'Membro removido com sucesso!'));
      
      // Esconder mensagem após 5 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err: unknown) {
      console.error('Erro ao remover membro:', err);
      setError(err instanceof Error ? err.message : t('common:error'));
    } finally {
      setDeletingMember(false);
    }
  }

  async function handleEditProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMember?.profile || !targetOrganizationId) return;
    
    // Verificar se o usuário tem permissão para editar perfis
    const hasPermission = (effectiveOrganizationMember?.role === 'owner' || effectiveOrganizationMember?.role === 'admin') || profile?.is_superadmin;
    if (!hasPermission) {
      setError(t('member:errors.noPermission', 'Você não tem permissão para editar perfis.'));
      return;
    }
    
    setEditingProfile(true);
    setError('');
    
    try {
      const response = await api.put(`/api/${targetOrganizationId}/member/${selectedMember.profile.id}`, {
        fullName: editProfileForm.fullName,
        nickname: editProfileForm.nickname,
        whatsapp: editProfileForm.whatsapp,
        email: editProfileForm.email
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao atualizar perfil');
      }
      
      // Invalidar cache dos agents
      await queryClient.invalidateQueries({ queryKey: ['agents', targetOrganizationId] });
      
      setShowEditModal(false);
      setSelectedMember(null);
    } catch (err: unknown) {
      console.error('Erro ao atualizar perfil:', err);
      setError(err instanceof Error ? err.message : t('common:error'));
    } finally {
      setEditingProfile(false);
    }
  }

  async function handleResendInvite(member: MemberWithProfile) {
    if (!targetOrganizationId || !member.profile) return;
    
    // Verificar se o usuário tem permissão para reenviar convites
    const hasPermission = (effectiveOrganizationMember?.role === 'owner' || effectiveOrganizationMember?.role === 'admin') || profile?.is_superadmin;
    if (!hasPermission) {
      setError(t('member:errors.noPermission', 'Você não tem permissão para reenviar convites.'));
      return;
    }
    
    setResendingInvite(true);
    setError('');
    setSuccessMessage('');

    try {
      // Obter o idioma atual da aplicação
      const currentLanguage = i18n.language || 'pt';
      
      const response = await api.post(`/api/${targetOrganizationId}/member/invite`, {
        email: member.profile.email,
        fullName: member.profile.full_name,
        role: member.role,
        language: currentLanguage.substring(0, 2) // Pegar apenas os primeiros 2 caracteres (pt-BR -> pt)
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao reenviar convite');
      }

      // Mostrar mensagem de sucesso
      setSuccessMessage(t('member:invite.resendSuccess', 'Convite reenviado com sucesso! Um novo email foi enviado para {email}.', { email: member.profile.email }));
      
      // Esconder mensagem após 5 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err: unknown) {
      console.error('Error resending invite:', err);
      setError(err instanceof Error ? err.message : t('common:error'));
    } finally {
      setResendingInvite(false);
    }
  }

  if (!targetOrganizationId) {
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
          {userUsage && (
            <span className="ml-3 text-sm font-normal text-gray-500 dark:text-gray-400">
              ({userUsage.used}/{userUsage.limit} usuários)
            </span>
          )}
        </h1>
        {((effectiveOrganizationMember?.role === 'owner' || effectiveOrganizationMember?.role === 'admin') || profile?.is_superadmin) && (
          <button
            onClick={() => setShowInviteModal(true)}
            disabled={isUserLimitReached}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isUserLimitReached
                ? 'text-gray-400 bg-gray-300 cursor-not-allowed'
                : 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            <Mail className="w-4 h-4 mr-2" />
            {t('member:actions.invite', 'Convidar Atendente')}
          </button>
        )}
      </div>

      {/* Mensagem de limite atingido */}
      {isUserLimitReached && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 p-4 rounded-md flex items-start justify-between">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium">
                {t('member:limit.title', 'Limite de usuários atingido')}
              </h3>
              <p className="text-sm mt-1">
                {t('member:limit.message', 'Você atingiu o limite de {{limit}} usuários do seu plano atual. Para adicionar mais membros, faça upgrade do seu plano.', { limit: userUsage?.limit })}
              </p>
            </div>
          </div>
          <div className="ml-4">
            <RouterLink
              to="/app/settings/billing"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              {t('member:limit.upgrade', 'Trocar Plano')}
            </RouterLink>
          </div>
        </div>
      )}

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
                {t('member:user.nickname', 'Como ser chamado')}
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
              {(effectiveOrganizationMember?.role === 'owner' || profile?.is_superadmin) && (
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
                  <span className="text-sm text-gray-900 dark:text-white">
                    {member.profile?.nickname || '-'}
                  </span>
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
                      {((effectiveOrganizationMember?.role === 'owner' || effectiveOrganizationMember?.role === 'admin') || profile?.is_superadmin) && (
                        <button
                          onClick={() => handleResendInvite(member)}
                          disabled={resendingInvite}
                          className="ml-2 text-yellow-800 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-200 focus:outline-none"
                          title={t('member:actions.resendInvite', 'Reenviar convite')}
                        >
                          {resendingInvite ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Mail className="w-3 h-3" />
                          )}
                        </button>
                      )}
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
                    {((effectiveOrganizationMember?.role === 'owner' || effectiveOrganizationMember?.role === 'admin') || profile?.is_superadmin) && (
                      <button
                        onClick={() => {
                          if (member.profile) {
                            setSelectedMember(member);
                            setEditProfileForm({
                              fullName: member.profile.full_name || '',
                              nickname: member.profile.nickname || '',
                              whatsapp: member.profile.whatsapp || '',
                              email: member.profile.email || ''
                            });
                            setShowEditModal(true);
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        title={t('member:actions.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {member.profile && (
                      <RouterLink
                        to={organizationId ? `/app/organization/${organizationId}/member/referrals/${member.profile.id}` : `/app/member/referrals/${member.profile.id}`}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 flex items-center justify-center w-8 h-8 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30"
                        title={t('member:actions.referrals')}
                      >
                        <Link className="w-4 h-4" />
                      </RouterLink>
                    )}
                    {(effectiveOrganizationMember?.role === 'owner' || profile?.is_superadmin) && member.role !== 'owner' && (
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
                {(effectiveOrganizationMember?.role === 'owner' || profile?.is_superadmin) && (
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
                <br /><br />
                <span className="text-red-500 dark:text-red-400">
                  {t('member:delete.permanentWarning', 'Atenção: Se este membro não estiver vinculado a nenhuma outra organização, sua conta será completamente excluída do sistema.')}
                </span>
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
                  <label htmlFor="editNickname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('member:form.nickname', 'Apelido')}
                  </label>
                  <input
                    type="text"
                    id="editNickname"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={editProfileForm.nickname}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, nickname: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('member:form.nicknameHelp', 'Como esta pessoa prefere ser chamada.')}
                  </p>
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

                <div>
                  <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('member:form.email')}
                  </label>
                  <input
                    type="email"
                    id="editEmail"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={editProfileForm.email}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
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