import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Users2 } from 'lucide-react';
import { useTeams } from '../../hooks/useQueryes';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface TeamTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  organizationId: string;
  currentTeamId?: string;
  onTransfer: () => void;
}

export function TeamTransferModal({ 
  isOpen, 
  onClose, 
  chatId,
  organizationId,
  currentTeamId,
  onTransfer
}: TeamTransferModalProps) {
  const { t } = useTranslation(['chats', 'common']);
  const [selectedTeamId, setSelectedTeamId] = useState(currentTeamId || '');
  const [isTransferring, setIsTransferring] = useState(false);
  
  const { data: teams, isLoading: isLoadingTeams } = useTeams(organizationId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeamId) {
      toast.error(t('chats:teamTransfer.selectTeamError'));
      return;
    }

    setIsTransferring(true);
    
    try {
      // Atualizar o team_id do chat
      const { error } = await supabase
        .from('chats')
        .update({ team_id: selectedTeamId })
        .eq('id', chatId);
      
      if (error) throw error;
      
      toast.success(t('chats:teamTransfer.success'));
      onTransfer();
      onClose();
    } catch (error) {
      console.error('Erro ao transferir chat para outra equipe:', error);
      toast.error(t('common:error'));
    } finally {
      setIsTransferring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Users2 className="w-5 h-5 mr-2" />
            {t('chats:teamTransfer.title')}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <div className="mb-4">
              <label htmlFor="team" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('chats:teamTransfer.selectTeam')}
              </label>
              
              {isLoadingTeams ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : teams && teams.length > 0 ? (
                <select
                  id="team"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">{t('chats:teamTransfer.selectTeamPrompt')}</option>
                  {teams.map((team) => (
                    <option 
                      key={team.id} 
                      value={team.id}
                      disabled={team.id === currentTeamId}
                    >
                      {team.name} {team.id === currentTeamId ? `(${t('chats:teamTransfer.current')})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('chats:teamTransfer.noTeams')}
                </p>
              )}
            </div>
          </div>
          
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 flex justify-end space-x-2 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common:cancel')}
            </button>
            <button
              type="submit"
              disabled={isTransferring || !selectedTeamId || selectedTeamId === currentTeamId}
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isTransferring || !selectedTeamId || selectedTeamId === currentTeamId 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-blue-700'
              }`}
            >
              {isTransferring ? (
                <span className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common:processing')}
                </span>
              ) : (
                t('chats:teamTransfer.transferButton')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 