import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Users2, RefreshCw } from 'lucide-react';
import { useTeams } from '../../hooks/useQueryes';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthContext } from '../../contexts/AuthContext';

interface TeamTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  organizationId: string;
  currentTeamId?: string;
  onTransfer: () => void;
  currentTitle?: string;
}

export function TeamTransferModal({ 
  isOpen, 
  onClose, 
  chatId,
  organizationId,
  currentTeamId,
  onTransfer,
  currentTitle = ''
}: TeamTransferModalProps) {
  const { t } = useTranslation(['chats', 'common']);
  const [selectedTeamId, setSelectedTeamId] = useState(currentTeamId || '');
  const [isTransferring, setIsTransferring] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const hasGeneratedTitleRef = useRef(false);
  const { currentOrganizationMember } = useAuthContext();
  
  const { data: teams, isLoading: isLoadingTeams } = useTeams(organizationId);

  useEffect(() => {
    if (isOpen && !currentTitle && !hasGeneratedTitleRef.current) {
      generateTitle();
    }
  }, [isOpen, currentTitle]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeamId) {
      toast.error(t('chats:teamTransfer.selectTeamError'));
      return;
    }

    if (!currentOrganizationMember) {
      toast.error(t('common:error'));
      return;
    }

    setIsTransferring(true);
    
    try {
      const response = await api.post(`/api/${organizationId}/chat/${chatId}/transfer-to-team`, {
        oldTeamId: currentTeamId,
        newTeamId: selectedTeamId,
        title: title.trim()
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao transferir chat');
      }

      toast.success(t('chats:teamTransfer.success'));
      onTransfer();
      onClose();
    } catch (error: unknown) {
      console.error('Erro ao transferir chat para outra equipe:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'response' in error
          ? (error.response as { data?: { error?: string } })?.data?.error || t('common:error')
          : t('common:error');
      toast.error(errorMessage);
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

            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                id="title"
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
              disabled={isTransferring || !selectedTeamId || selectedTeamId === currentTeamId || isGeneratingTitle}
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isTransferring || !selectedTeamId || selectedTeamId === currentTeamId || isGeneratingTitle
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