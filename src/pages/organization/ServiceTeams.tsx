import React, { useState, useEffect } from 'react';
import { Users, Plus, Loader2, X, UserPlus, UserCog, AlertTriangle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ServiceTeam, ServiceTeamMember, Profile } from '../../types/database';

interface TeamMemberWithProfile extends ServiceTeamMember {
  profile: Profile;
}

interface TeamWithMembers extends ServiceTeam {
  members: TeamMemberWithProfile[];
  _count?: {
    members: number;
  };
}

interface LoadingState {
  userId: string;
  role: 'leader' | 'member';
}

export default function ServiceTeams() {
  const { t } = useTranslation(['serviceTeams', 'common']);
  const { currentOrganizationMember, membership } = useAuthContext();
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showRemoveTeamModal, setShowRemoveTeamModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<ServiceTeam | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberWithProfile | null>(null);
  const [addingMember, setAddingMember] = useState<LoadingState | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [removingTeam, setRemovingTeam] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentOrganizationMember) {
      loadTeams();
      loadAvailableUsers();
    }
  }, [currentOrganizationMember]);

  // Limpar mensagem de erro após 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function loadTeams() {
    if (!currentOrganizationMember) return;

    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('service_teams')
        .select('*, members:service_team_members(count)')
        .eq('organization_id', currentOrganizationMember.organization.id)
        .order('name');

      if (teamsError) throw teamsError;

      const teamsWithMembers = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { data: members } = await supabase
            .rpc('get_service_team_members', {
              team_id_param: team.id
            });

          return {
            ...team,
            members: members || [],
            _count: {
              members: team.members?.[0]?.count || 0
            }
          };
        })
      );

      setTeams(teamsWithMembers);
    } catch (error) {
      console.error('Error loading teams:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailableUsers() {
    if (!currentOrganizationMember) return;

    try {
      const { data, error } = await supabase
        .rpc('get_organization_users', {
          org_id: currentOrganizationMember.organization.id
        });

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setError(t('common:error'));
    }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganizationMember) return;
    
    setCreatingTeam(true);
    setError('');

    try {
      const { error } = await supabase
        .from('service_teams')
        .insert([
          {
            organization_id: currentOrganizationMember.organization.id,
            name: formData.name,
            description: formData.description,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      await loadTeams();
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating team:', error);
      setError(t('common:error'));
    } finally {
      setCreatingTeam(false);
    }
  }

  async function handleAddMember(userId: string, role: 'leader' | 'member') {
    if (!selectedTeam) return;
    setAddingMember({ userId, role });

    try {
      const { error } = await supabase
        .from('service_team_members')
        .insert([
          {
            team_id: selectedTeam.id,
            user_id: userId,
            role,
          },
        ]);

      if (error) throw error;

      await loadTeams();
      setShowAddMemberModal(false);
    } catch (error) {
      console.error('Error adding team member:', error);
      setError(t('common:error'));
    } finally {
      setAddingMember(null);
    }
  }

  async function handleRemoveMember(memberId: string) {
    setRemovingMember(true);
    try {
      const { error } = await supabase
        .from('service_team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      await loadTeams();
      setShowRemoveModal(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Error removing team member:', error);
      setError(t('common:error'));
    } finally {
      setRemovingMember(false);
    }
  }

  async function handleRemoveTeam(teamId: string) {
    setRemovingTeam(true);
    try {
      const { error } = await supabase
        .from('service_teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
      await loadTeams();
      setShowRemoveTeamModal(false);
      setSelectedTeam(null);
    } catch (error) {
      console.error('Error removing team:', error);
      setError(t('common:error'));
    } finally {
      setRemovingTeam(false);
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
          {t('serviceTeams:title')}
        </h1>
        {(membership?.role === 'owner' || membership?.role === 'admin') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('serviceTeams:newTeam')}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {team.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {(membership?.role === 'owner' || membership?.role === 'admin') && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedTeam(team);
                            setShowAddMemberModal(true);
                          }}
                          className="inline-flex items-center p-1 border border-transparent rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                          <UserPlus className="w-5 h-5" />
                        </button>
                        {team._count?.members === 0 && (
                          <button
                            onClick={() => {
                              setSelectedTeam(team);
                              setShowRemoveTeamModal(true);
                            }}
                            className="inline-flex items-center p-1 border border-transparent rounded-full text-red-400 hover:text-red-500"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    {t('serviceTeams:members')} ({team._count?.members || 0})
                  </h4>
                  <div className="space-y-3">
                    {team.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            {member.profile.avatar_url ? (
                              <img
                                src={member.profile.avatar_url}
                                alt=""
                                className="h-8 w-8 rounded-full"
                              />
                            ) : (
                              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {member.profile.full_name[0]}
                              </span>
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {member.profile.full_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {t(`serviceTeams:${member.role}`)}
                            </p>
                          </div>
                        </div>
                        {(membership?.role === 'owner' || membership?.role === 'admin') && (
                          <button
                            onClick={() => {
                              setMemberToRemove(member);
                              setShowRemoveModal(true);
                            }}
                            className="text-sm text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            {t('common:confirmDelete')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              {t('serviceTeams:noTeamsYet')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {t('serviceTeams:noTeamsDescription')}
            </p>
            {(membership?.role === 'owner' || membership?.role === 'admin') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('serviceTeams:createFirstTeam')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('serviceTeams:newTeam')}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('serviceTeams:form.name')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('serviceTeams:form.description')}
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingTeam}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:back')}
                </button>
                <button
                  type="submit"
                  disabled={creatingTeam}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingTeam ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common:saving')}
                    </>
                  ) : (
                    t('serviceTeams:newTeam')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedTeam && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('serviceTeams:addMember')}
              </h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {availableUsers
                  .filter(user => !selectedTeam.members.some(member => member.user_id === user.id))
                  .map(user => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {user.full_name[0]}
                            </span>
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAddMember(user.id, 'member')}
                          disabled={addingMember?.userId === user.id}
                          className="flex items-center space-x-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {addingMember?.userId === user.id && addingMember?.role === 'member' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                          <span>{t('serviceTeams:member')}</span>
                        </button>
                        <button
                          onClick={() => handleAddMember(user.id, 'leader')}
                          disabled={addingMember?.userId === user.id}
                          className="flex items-center space-x-2 px-3 py-1.5 text-sm text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 border border-green-200 dark:border-green-800 rounded-md hover:bg-green-50 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {addingMember?.userId === user.id && addingMember?.role === 'leader' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserCog className="w-4 h-4" />
                          )}
                          <span>{t('serviceTeams:leader')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {showRemoveModal && memberToRemove && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('serviceTeams:removeMember.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('serviceTeams:removeMember.confirmation', { name: memberToRemove.profile.full_name })}
                <br />
                {t('serviceTeams:removeMember.warning')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRemoveModal(false);
                    setMemberToRemove(null);
                  }}
                  disabled={removingMember}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common:back')}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(memberToRemove.id)}
                  disabled={removingMember}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {removingMember ? (
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

      {/* Remove Team Confirmation Modal */}
      {showRemoveTeamModal && selectedTeam && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('serviceTeams:removeTeam.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('serviceTeams:removeTeam.confirmation', { name: selectedTeam.name })}
                <br />
                {t('serviceTeams:removeTeam.warning')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRemoveTeamModal(false);
                    setSelectedTeam(null);
                  }}
                  disabled={removingTeam}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common:back')}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveTeam(selectedTeam.id)}
                  disabled={removingTeam}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {removingTeam ? (
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