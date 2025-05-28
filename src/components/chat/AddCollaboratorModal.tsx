import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, UserPlus, Loader2 } from 'lucide-react';
import { useAgents } from '../../hooks/useQueryes';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface Agent {
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
    nickname: string;
    avatar_url: string;
    whatsapp: string;
    created_at: string;
  } | null;
}

interface AddCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  organizationId: string;
  currentCollaborators: string[]; // IDs dos usuários que já são colaboradores
  assignedUserId?: string; // ID do usuário responsável pelo chat
  onCollaboratorAdded: () => void;
}

export function AddCollaboratorModal({
  isOpen,
  onClose,
  chatId,
  organizationId,
  currentCollaborators,
  assignedUserId,
  onCollaboratorAdded
}: AddCollaboratorModalProps) {
  const { t } = useTranslation('chats');
  const [searchTerm, setSearchTerm] = useState('');
  const [addingCollaborators, setAddingCollaborators] = useState<string[]>([]);
  
  const { data: agents = [], isLoading } = useAgents(organizationId, ['agent', 'admin', 'owner']);

  // Filtrar agentes que não são colaboradores atuais nem o responsável
  const availableAgents = agents.filter((agent: Agent) => {
    // Verificar se é colaborador atual
    const isCurrentCollaborator = currentCollaborators.some(collabId => 
      String(collabId) === String(agent.id)
    );
    
    // Verificar se é o responsável
    const isAssignedUser = assignedUserId && String(assignedUserId) === String(agent.id);
    
    // Verificar se corresponde à busca
    const matchesSearch = !searchTerm || 
      agent.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return !isCurrentCollaborator && !isAssignedUser && matchesSearch;
  });

  const handleAddCollaborator = async (agentId: string) => {
    setAddingCollaborators(prev => [...prev, agentId]);
    
    try {
      // Encontrar o agente para obter o user_id correto
      const agent = agents.find((a: Agent) => a.id === agentId);
      if (!agent) {
        throw new Error('Agente não encontrado');
      }

      await api.post(`/api/${organizationId}/chat/${chatId}/collaborators`, {
        user_id: agent.id, // Usar o ID do agente como user_id
        organization_id: organizationId
      });
      
      toast.success(t('collaborator.addedSuccessfully'));
      onCollaboratorAdded();
    } catch (error) {
      console.error('Erro ao adicionar colaborador:', error);
      toast.error(t('collaborator.addError'));
    } finally {
      setAddingCollaborators(prev => prev.filter(id => id !== agentId));
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('collaborator.addCollaborator')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('collaborator.searchAgents')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Colaboradores atuais */}
          {(currentCollaborators.length > 0 || assignedUserId) && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('collaborator.collaborators')} ({currentCollaborators.length + (assignedUserId ? 1 : 0)})
              </h3>
              <div className="space-y-2">
                {/* Responsável */}
                {assignedUserId && (
                  <div className="flex items-center space-x-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-xs font-medium text-white">R</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {(() => {
                          const assignedAgent = agents.find((agent: Agent) => 
                            String(agent.id) === String(assignedUserId)
                          );
                          return assignedAgent?.profile?.full_name || 'Responsável';
                        })()}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Responsável</p>
                    </div>
                  </div>
                )}
                
                {/* Colaboradores */}
                {currentCollaborators.map((collaboratorId) => {
                  const collaborator = agents.find((agent: Agent) => 
                    String(agent.id) === String(collaboratorId)
                  );
                  return (
                    <div key={collaboratorId} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                      <div className="w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-500 flex items-center justify-center overflow-hidden">
                        {collaborator?.profile?.avatar_url ? (
                          <img
                            src={collaborator.profile.avatar_url}
                            alt={collaborator.profile.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium text-white">
                            {collaborator?.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {collaborator?.profile?.full_name || 'Colaborador'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Colaborador</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agentes disponíveis */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('collaborator.addNewCollaborator')}
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500 dark:text-gray-400">{t('loading')}</span>
              </div>
            ) : availableAgents.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm ? t('collaborator.noAgentsFound') : t('collaborator.allAgentsAreCollaborators')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableAgents.map((agent: Agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                        {agent.profile?.avatar_url ? (
                          <img
                            src={agent.profile.avatar_url}
                            alt={agent.profile.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {agent.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {agent.profile?.full_name || agent.profile?.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {agent.profile?.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddCollaborator(agent.id)}
                      disabled={addingCollaborators.includes(agent.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-lg transition-colors"
                    >
                      {addingCollaborators.includes(agent.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      <span>{t('collaborator.add')}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 