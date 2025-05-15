import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, UserPlus, Check, Edit2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { ProjectRole, ProjectMember } from '../../types/tasks';
import { 
  useProjectMembers, 
  useProjectPotentialMembers, 
  useAddProjectMember, 
  useUpdateProjectMemberRole, 
  useRemoveProjectMember 
} from '../../hooks/useTasks';

interface ProjectMembersModalProps {
  onClose: () => void;
  projectId: string;
  organizationId: string;
}

// Interface para usuários que podem ser adicionados ao projeto
interface PotentialMember {
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
}

export function ProjectMembersModal({ onClose, projectId, organizationId }: ProjectMembersModalProps) {
  const { t } = useTranslation('tasks');
  
  // Estado para ações no modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('editor');
  const [editingRole, setEditingRole] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hooks para obter e manipular dados
  const { data: members = [], isLoading: isLoadingMembers } = useProjectMembers(projectId);
  const { data: potentialMembers = [], isLoading: isLoadingPotential } = useProjectPotentialMembers(organizationId, projectId) as { data: PotentialMember[], isLoading: boolean };
  const addMember = useAddProjectMember();
  const updateRole = useUpdateProjectMemberRole();
  const removeMember = useRemoveProjectMember();

  // Função para adicionar um membro ao projeto
  const handleAddMember = (userId: string, role: ProjectRole = 'editor') => {
    addMember.mutate({
      projectId,
      userId,
      role
    }, {
      onSuccess: () => {
        setShowAddMember(false);
      }
    });
  };

  // Função para atualizar a função de um membro
  const handleUpdateRole = (memberId: string, role: ProjectRole) => {
    updateRole.mutate({
      memberId,
      projectId,
      role
    }, {
      onSuccess: () => {
        setSelectedMember(null);
        setEditingRole(false);
      }
    });
  };

  // Função para remover um membro do projeto
  const handleRemoveMember = (memberId: string, role: ProjectRole) => {
    if (role === 'admin') {
      setErrorMessage(t('projects.cannotRemoveAdmin'));
      setTimeout(() => setErrorMessage(null), 3000);
      setSelectedMember(null);
      setConfirmDelete(false);
      return;
    }
    
    removeMember.mutate({
      memberId,
      projectId
    }, {
      onSuccess: () => {
        setSelectedMember(null);
        setConfirmDelete(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('projects.manageMembers')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de membros atuais */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">
              {t('projects.members')}
            </h3>
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              {t('projects.addMember')}
            </button>
          </div>

          {isLoadingMembers ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              {t('projects.noMembers')}
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {members.map(member => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      {member.profile?.avatar_url ? (
                        <img 
                          src={member.profile.avatar_url} 
                          alt={member.profile.full_name || ''}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 dark:text-white">
                        {member.profile?.full_name || member.user_id}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t(`projects.roles.${member.role}`)}
                      </div>
                    </div>
                  </div>

                  {selectedMember?.id === member.id && editingRole ? (
                    <div className="flex space-x-2">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      >
                        <option value="reader">{t('projects.roles.reader')}</option>
                        <option value="editor">{t('projects.roles.editor')}</option>
                        <option value="admin">{t('projects.roles.admin')}</option>
                      </select>
                      <button
                        onClick={() => handleUpdateRole(member.id, selectedRole)}
                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                        disabled={updateRole.isPending}
                      >
                        {updateRole.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingRole(false);
                          setSelectedMember(null);
                        }}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : selectedMember?.id === member.id && confirmDelete ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRemoveMember(member.id, member.role)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        disabled={removeMember.isPending}
                      >
                        {removeMember.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDelete(false);
                          setSelectedMember(null);
                        }}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setSelectedRole(member.role);
                          setEditingRole(true);
                          setConfirmDelete(false);
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {member.role !== 'admin' && (
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setConfirmDelete(true);
                            setEditingRole(false);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mensagem de erro */}
        {errorMessage && (
          <div className="mb-4 p-2 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {errorMessage}
          </div>
        )}

        {/* Modal para adicionar novos membros */}
        {showAddMember && (
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('projects.addMember')}
            </h3>
            
            {isLoadingPotential ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : potentialMembers.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                {t('assignees.noAgents')}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {potentialMembers.map(user => (
                  <div 
                    key={user.user_id} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.full_name || ''}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white">
                          {user.full_name || user.user_id}
                        </div>
                        {user.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      >
                        <option value="reader">{t('projects.roles.reader')}</option>
                        <option value="editor">{t('projects.roles.editor')}</option>
                        <option value="admin">{t('projects.roles.admin')}</option>
                      </select>
                      <button
                        onClick={() => handleAddMember(user.user_id, selectedRole)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md text-xs"
                        disabled={addMember.isPending}
                      >
                        {addMember.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t('projects.addMember')
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowAddMember(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {t('form.cancel')}
              </button>
            </div>
          </div>
        )}

        {!showAddMember && (
          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {t('form.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 