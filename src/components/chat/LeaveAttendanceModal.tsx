import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, RefreshCw } from 'lucide-react';
import { useTeams } from '../../hooks/useQueryes';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuthContext } from '../../contexts/AuthContext';
import api from '../../lib/api';

interface LeaveAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  organizationId: string;
  currentTeamId?: string;
  onLeave: () => void;
}

export function LeaveAttendanceModal({ 
  isOpen, 
  onClose, 
  chatId,
  organizationId,
  currentTeamId,
  onLeave
}: LeaveAttendanceModalProps) {
  const { t } = useTranslation(['chats', 'common']);
  const [selectedTeamId, setSelectedTeamId] = useState(currentTeamId || '');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);
  const [title, setTitle] = useState('');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const hasGeneratedTitleRef = useRef(false);
  const { currentOrganizationMember } = useAuthContext();
  
  const { data: teams, isLoading: isLoadingTeams } = useTeams(organizationId);

  // Resetar o agente selecionado quando o modal for aberto
  useEffect(() => {
    if (isOpen) {
      setSelectedAgentId('');
      if (!hasGeneratedTitleRef.current) {
        generateTitle();
      }
    }
  }, [isOpen]);

  // Atualizar selectedTeamId quando currentTeamId mudar
  useEffect(() => {
    setSelectedTeamId(currentTeamId || '');
    setSelectedAgentId(''); // Resetar o agente selecionado quando a equipe mudar
  }, [currentTeamId]);

  const generateTitle = async (force = false) => {
    if (!currentOrganizationMember) return;
    
    if (!force && hasGeneratedTitleRef.current) return;
    
    setIsGeneratingTitle(true);
    hasGeneratedTitleRef.current = true;
    
    try {
      const response = await api.post(
        `/api/${currentOrganizationMember.organization.id}/chat/${chatId}/generate-summary`
      );

      if (!response.data.success) {
        throw new Error(response.data.error || t('common:error'));
      }

      setTitle(response.data.data.summary);
    } catch (error: unknown) {
      console.error('Erro ao gerar título:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'response' in error
          ? (error.response as { data?: { error?: string } })?.data?.error || t('common:error')
          : t('common:error');
      toast.error(errorMessage);
      hasGeneratedTitleRef.current = false;
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleLeave = async () => {
    if (!chatId || !selectedTeamId) return;
    
    setIsLeaving(true);
    
    try {
      // Se apenas a equipe está sendo alterada e é diferente da atual
      if (selectedTeamId !== currentTeamId && !selectedAgentId) {
        const response = await api.post(`/api/${organizationId}/chat/${chatId}/transfer-to-team`, {
          oldTeamId: currentTeamId,
          newTeamId: selectedTeamId,
          title: title.trim()
        });

        if (!response.data.success) {
          throw new Error(response.data.error || 'Erro ao transferir chat');
        }
      } else if (selectedTeamId === currentTeamId && !selectedAgentId) {
        //Apenas saindo do atendimento
        const response = await api.post(`/api/${organizationId}/chat/${chatId}/leave-attendance`, {
          title: title.trim()
        });

        if (!response.data.success) {
          throw new Error(response.data.error || 'Erro ao sair do atendimento');
        }
      } else if (selectedAgentId) {
        //Transferir para pessoas específicas
        const response = await api.post(`/api/${organizationId}/chat/${chatId}/transfer-to-agent`, {
          oldTeamId: currentTeamId,
          newTeamId: selectedTeamId,
          title: title.trim(),
          agentId: selectedAgentId
        });

        if (!response.data.success) {
          throw new Error(response.data.error || 'Erro ao transferir para pessoas específicas');
        }
      } else {
        throw new Error('Erro ao sair do atendimento');
      }
      
      toast.success(t('chats:collaborator.leaveAttendanceSuccess'));
      onLeave();
      onClose();
    } catch (error) {
      console.error('Erro ao sair do atendimento:', error);
      toast.error(t('chats:collaborator.leaveAttendanceError'));
    } finally {
      setIsLeaving(false);
    }
  };

  // Encontrar a equipe selecionada
  const selectedTeam = teams?.find(team => team.id === selectedTeamId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('chats:leaveAttendance.title', 'Sair do Atendimento')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('chats:teamTransfer.chatTitle')}
                </label>
                <button
                  type="button"
                  onClick={() => generateTitle(true)}
                  disabled={isGeneratingTitle}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 disabled:opacity-50"
                >
                  {isGeneratingTitle ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('chats:teamTransfer.generating')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      {t('chats:teamTransfer.generateNew')}
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border rounded-md 
                  bg-white dark:bg-gray-700 
                  border-gray-300 dark:border-gray-600
                  text-gray-900 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 
                  focus:border-transparent
                  transition-colors"
                rows={3}
                placeholder={isGeneratingTitle ? t('chats:teamTransfer.generatingTitle') : t('chats:teamTransfer.titlePlaceholder')}
                disabled={isGeneratingTitle}
              />
            </div>

            <div>
              <select
                value={selectedTeamId}
                onChange={(e) => {
                  setSelectedTeamId(e.target.value);
                  setSelectedAgentId(''); // Resetar o agente quando mudar de equipe
                }}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={isLoadingTeams || isLeaving}
              >
                <option value="">{t('chats:leaveAttendance.selectTeam', 'Selecione uma equipe')}</option>
                {teams?.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.id === currentTeamId 
                      ? `${t('chats:leaveAttendance.keepInTeam', 'Manter na equipe')} ${team.name}`
                      : `${t('chats:leaveAttendance.transferToTeam', 'Transferir para equipe')} ${team.name}`
                    }
                  </option>
                ))}
              </select>
            </div>

            {selectedTeam && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('chats:leaveAttendance.selectAgent', 'Selecione um agente (opcional)')}
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={isLeaving}
                >
                  <option value="">
                    {t('chats:leaveAttendance.pendingOption', 'Deixar pendente aguardando atendimento')}
                  </option>
                  {selectedTeam.members.map((member) => {
                    if (!member.profile) return null;
                    
                    return (
                      <option key={member.id} value={member.profile.id}>
                        {member.profile.full_name}
                      </option>
                    );
                  })}
                </select>

                {selectedAgentId && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {t('chats:leaveAttendance.assignmentInfo', 'O atendimento será transferido diretamente para este agente')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 p-6 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isLeaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            {t('common:cancel')}
          </button>
          <button
            onClick={handleLeave}
            disabled={!selectedTeamId || isLeaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 flex items-center"
          >
            {isLeaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common:leaving')}
              </>
            ) : (
              t('common:confirm')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}