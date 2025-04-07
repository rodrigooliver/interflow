import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2 } from 'lucide-react';
import { useTeams } from '../../hooks/useQueryes';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuthContext } from '../../contexts/AuthContext';

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
  const { currentOrganizationMember } = useAuthContext();
  
  const { data: teams, isLoading: isLoadingTeams } = useTeams(organizationId);

  // Resetar o agente selecionado quando o modal for aberto
  useEffect(() => {
    if (isOpen) {
      setSelectedAgentId('');
    }
  }, [isOpen]);

  // Atualizar selectedTeamId quando currentTeamId mudar
  useEffect(() => {
    setSelectedTeamId(currentTeamId || '');
    setSelectedAgentId(''); // Resetar o agente selecionado quando a equipe mudar
  }, [currentTeamId]);

  const handleLeave = async () => {
    if (!chatId || !selectedTeamId) return;
    
    setIsLeaving(true);
    
    try {
      // Atualizar o chat para a nova equipe
      const { error: chatError } = await supabase
        .from('chats')
        .update({
          team_id: selectedTeamId,
          assigned_to: selectedAgentId || null,
          status: selectedAgentId ? 'in_progress' : 'pending',
          arrival_time: selectedAgentId ? new Date().toISOString() : null
        })
        .eq('id', chatId);
        
      if (chatError) throw chatError;

      // Se um agente foi selecionado, criar mensagem de transferência
      if (selectedAgentId) {
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            type: 'user_transferred',
            sender_type: 'system',
            sender_agent_id: selectedAgentId,
            organization_id: organizationId,
            created_at: new Date().toISOString()
          });

        if (messageError) throw messageError;
      } else {
        // Se apenas a equipe foi selecionada, criar mensagem de saída
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            type: 'user_left',
            sender_type: 'system',
            sender_agent_id: currentOrganizationMember?.profile_id,
            organization_id: organizationId,
            created_at: new Date().toISOString()
          });

        if (messageError) throw messageError;
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('chats:leaveAttendance.selectTeam', 'Selecione uma equipe')}
              </label>
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
                    {team.name}
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