import React, { useEffect, useState } from 'react';
import { Building2, Package, Plus, Loader2, X, Edit, CreditCard, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Organization, SubscriptionPlan } from '../../types/database';
import api from '../../lib/api';
import { useAuthContext } from '../../contexts/AuthContext';

interface OrganizationWithDetails extends Organization {
  _count: {
    members: number;
  };
  subscription?: {
    status: string;
    plan: SubscriptionPlan;
  }[];
}

export default function Organizations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [organizations, setOrganizations] = useState<OrganizationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithDetails | null>(null);
  const [editingOrg, setEditingOrg] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para paginação
  const [totalOrganizations, setTotalOrganizations] = useState(0);
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = 10;
  const [editForm, setEditForm] = useState<Organization>({
    name: '',
    slug: '',
    email: '',
    whatsapp: '',
    logo_url: '',
    status: 'active',
    usage: {
      users: {
        used: 0,
        limit: 0
      },
      customers: {
        used: 0,
        limit: 0
      },
      channels: {
        used: 0,
        limit: 0
      },
      flows: {
        used: 0,
        limit: 0
      },
      teams: {
        used: 0,
        limit: 0
      },
      storage: {
        used: 0,
        limit: 0
      },
      tokens: {
        used: 0,
        limit: 0
      }
    }
  });

  // Estados separados para os valores de exibição dos campos com máscara
  const [displayValues, setDisplayValues] = useState({
    usage_storage: '',
    usage_tokens: '',
    used_storage: '',
    used_tokens: ''
  });
  const { currentOrganizationMember } = useAuthContext();
  
  // Adicionar novos estados para exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState(false);
  
  // Estado para controlar a aba ativa no modal de edição
  const [activeTab, setActiveTab] = useState<'general' | 'usage'>('general');

  // Calcular total de páginas
  const totalPages = Math.ceil(totalOrganizations / itemsPerPage);

  // Funções de navegação
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      const newSearchParams = new URLSearchParams(searchParams);
      if (page === 1) {
        newSearchParams.delete('page');
      } else {
        newSearchParams.set('page', page.toString());
      }
      setSearchParams(newSearchParams);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, [currentPage]);

  async function loadOrganizations() {
    try {
      // Primeiro, obter o total de organizações
      const { count: totalCount, error: countError } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setTotalOrganizations(totalCount || 0);

      // Calcular offset para paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data: orgs, error } = await supabase
        .from('organizations')
        .select(`
          *,
          members:organization_members(count),
          subscription:subscriptions(
            status,
            plan:subscription_plans(name_pt, name_en, name_es)
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      // Transform the data to ensure _count exists
      const transformedOrgs = (orgs || []).map(org => ({
        ...org,
        _count: {
          members: org.members?.[0]?.count || 0
        }
      }));
      
      setOrganizations(transformedOrgs);
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleEditOrg(org: OrganizationWithDetails) {
    setSelectedOrg(org);
    const usage = {
      users: org.usage?.users || { used: 0, limit: 0 },
      customers: org.usage?.customers || { used: 0, limit: 0 },
      channels: org.usage?.channels || { used: 0, limit: 0 },
      flows: org.usage?.flows || { used: 0, limit: 0 },
      teams: org.usage?.teams || { used: 0, limit: 0 },
      storage: org.usage?.storage || { used: 0, limit: 0 },
      tokens: org.usage?.tokens || { used: 0, limit: 0 }
    };
    
    setEditForm({
      name: org.name || '',
      slug: org.slug || '',
      email: org.email || '',
      whatsapp: org.whatsapp || '',
      logo_url: org.logo_url || '',
      status: org.status as 'active' | 'inactive' | 'suspended',
      usage
    });

    // Inicializar valores de exibição
    setDisplayValues({
      usage_storage: usage.storage.limit > 0 ? (usage.storage.limit / 1024 / 1024 / 1024).toString() : '',
      usage_tokens: usage.tokens.limit > 0 ? (usage.tokens.limit / 1000000).toString() : '',
      used_storage: usage.storage.used > 0 ? (usage.storage.used / 1024 / 1024 / 1024).toString() : '',
      used_tokens: usage.tokens.used > 0 ? (usage.tokens.used / 1000000).toString() : ''
    });
    
    setActiveTab('general');
    setShowEditModal(true);
  }

  // Função para lidar com a solicitação de exclusão
  function handleDeleteOrg(org: OrganizationWithDetails) {
    setSelectedOrg(org);
    setShowDeleteModal(true);
  }

  // Função para confirmar e executar a exclusão
  async function confirmDeleteOrg() {
    if (!selectedOrg || !currentOrganizationMember) return;
    
    setDeletingOrg(true);
    setError('');
    
    try {
      await api.delete(`/api/organizations/${selectedOrg.id}`);
      
      // Se a exclusão for bem-sucedida, recarregue as organizações e feche o modal
      await loadOrganizations();
      setShowDeleteModal(false);
      setSelectedOrg(null);
    } catch (error: unknown) {
      console.error('Erro ao excluir organização:', error);
      setError(typeof error === 'object' && error !== null && 'message' in error 
        ? (error as { message: string }).message 
        : 'Ocorreu um erro ao excluir a organização');
    } finally {
      setDeletingOrg(false);
    }
  }

  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrg) return;

    setEditingOrg(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/api/organizations/${selectedOrg.id}`, {
        name: editForm.name,
        slug: editForm.slug,
        email: editForm.email,
        whatsapp: editForm.whatsapp,
        logo_url: editForm.logo_url,
        status: editForm.status,
        usage: editForm.usage
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Falha ao atualizar organização');
      }
      
      await loadOrganizations();
      setSuccess('Organização atualizada com sucesso!');
      setTimeout(() => {
        setShowEditModal(false);
        setSelectedOrg(null);
        setSuccess('');
      }, 1500);
    } catch (error: unknown) {
      console.error('Error updating organization:', error);
      setError(typeof error === 'object' && error !== null && 'message' in error 
        ? (error as { message: string }).message 
        : 'Ocorreu um erro ao atualizar a organização');
    } finally {
      setEditingOrg(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organizações</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organizações</h1>
        <div className="flex space-x-3">
          <Link
            to="/app/admin/wapi-instances"
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Package className="w-4 h-4 mr-2" />
            Ver Instâncias WAPI
          </Link>
          <Link
            to="/app/admin/organizations/add"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Organização
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {organizations.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Nenhuma organização encontrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Organização
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    USO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {org.logo_url ? (
                          <img
                            src={org.logo_url}
                            alt={org.name}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {org.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {org.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        org.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                          : org.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                      }`}>
                        {org.status === 'active' ? 'Ativo' : 
                         org.status === 'inactive' ? 'Inativo' : 'Suspenso'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                        <div className="w-full">
                          {org.subscription && org.subscription.length > 0 ? (
                            <div className="space-y-2">
                              {org.subscription.map((sub, index) => (
                                <div key={index} className="flex items-center">
                                  <div className="flex items-center space-x-2">
                                    <div className="text-sm text-gray-900 dark:text-white">
                                      {sub.plan?.name_pt || 'Sem plano'}
                                    </div>
                                    {sub.status && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                        sub.status === 'active' 
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                          : sub.status === 'trialing'
                                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                      }`}>
                                        {sub.status === 'active' ? 'Ativo' :
                                        sub.status === 'trialing' ? 'Trial' :
                                        sub.status === 'canceled' ? 'Cancelado' : 
                                        sub.status === 'past_due' ? 'Pendente' : 
                                        sub.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-900 dark:text-white">
                              Sem plano
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs space-y-1">
                        <div className={`${
                          (org.usage?.users?.used || 0) > (org.usage?.users?.limit || 0) && (org.usage?.users?.limit || 0) > 0
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          Usuários: <Link
                            to={`/app/member?organizationId=${org.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                          >
                            {org.usage?.users?.used || 0}/{org.usage?.users?.limit || 0}
                          </Link>
                        </div>
                        <div className={`${
                          (org.usage?.customers?.used || 0) > (org.usage?.customers?.limit || 0) && (org.usage?.customers?.limit || 0) > 0
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          Clientes: {org.usage?.customers?.used || 0}/{org.usage?.customers?.limit || 0}
                        </div>
                        <div className={`${
                          (org.usage?.channels?.used || 0) > (org.usage?.channels?.limit || 0) && (org.usage?.channels?.limit || 0) > 0
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          Canais: <Link
                            to={`/app/channels?organizationId=${org.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                          >
                            {org.usage?.channels?.used || 0}/{org.usage?.channels?.limit || 0}
                          </Link>
                        </div>
                        <div className={`${
                          (org.usage?.flows?.used || 0) > (org.usage?.flows?.limit || 0) && (org.usage?.flows?.limit || 0) > 0
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          Fluxos: {org.usage?.flows?.used || 0}/{org.usage?.flows?.limit || 0}
                        </div>
                        <div className={`${
                          (org.usage?.teams?.used || 0) > (org.usage?.teams?.limit || 0) && (org.usage?.teams?.limit || 0) > 0
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          Times: {org.usage?.teams?.used || 0}/{org.usage?.teams?.limit || 0}
                        </div>
                        <div className={`${
                          (org.usage?.tokens?.used || 0) > (org.usage?.tokens?.limit || 0) && (org.usage?.tokens?.limit || 0) > 0
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          Tokens: {((org.usage?.tokens?.used || 0) / 1000000).toFixed(1)}M/{((org.usage?.tokens?.limit || 0) / 1000000).toFixed(1)}M
                        </div>
                        <div className={`${
                          (org.usage?.storage?.used || 0) > (org.usage?.storage?.limit || 0) && (org.usage?.storage?.limit || 0) > 0
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          Storage: {((org.usage?.storage?.used || 0) / 1024 / 1024 / 1024).toFixed(1)}GB/{((org.usage?.storage?.limit || 0) / 1024 / 1024 / 1024).toFixed(1)}GB
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {org.created_at ? new Date(org.created_at).toLocaleDateString('pt-BR') : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <button
                          onClick={() => handleEditOrg(org)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Editar organização"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <Link
                          to={`/app/admin/organizations/${org.id}/subscriptions`}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                          title="Gerenciar assinaturas"
                        >
                          <CreditCard className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteOrg(org)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Excluir organização"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} até {Math.min(currentPage * itemsPerPage, totalOrganizations)} de {totalOrganizations} organizações
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Anterior</span>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {/* Números das páginas */}
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                    let pageNumber;
                    
                    if (totalPages <= 5) {
                      pageNumber = idx + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = idx + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + idx;
                    } else {
                      pageNumber = currentPage - 2 + idx;
                    }
                    
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNumber
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-500'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Próximo</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Organization Modal */}
      {showEditModal && selectedOrg && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Editar Organização
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrg} className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-400 p-3 rounded-md">
                  {success}
                </div>
              )}

              {/* Abas */}
              <div className="mb-6">
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      type="button"
                      onClick={() => setActiveTab('general')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'general'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      Geral
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('usage')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'usage'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      Uso
                    </button>
                  </nav>
                </div>
              </div>

              {/* Conteúdo das abas */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome da Organização
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Slug
                    </label>
                    <input
                      type="text"
                      id="slug"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                      value={editForm.slug}
                      onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      id="whatsapp"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                      value={editForm.whatsapp}
                      onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                      placeholder="+55 (11) 98765-4321"
                    />
                  </div>

                  <div>
                    <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL do Logo
                    </label>
                    <input
                      type="url"
                      id="logo_url"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                      value={editForm.logo_url}
                      onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' | 'suspended' })}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                      <option value="suspended">Suspenso</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'usage' && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Uso e Limites da Organização
                  </h4>
                  
                  {/* Usuários */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Usuários</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="used_users" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Utilizados
                        </label>
                        <input
                          type="number"
                          id="used_users"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={editForm.usage.users.used || ''}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            usage: { 
                              ...editForm.usage, 
                              users: { 
                                ...editForm.usage.users, 
                                used: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
                              }
                            }
                          })}
                        />
                      </div>
                      <div>
                        <label htmlFor="max_users" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Limite
                        </label>
                        <input
                          type="number"
                          id="max_users"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={editForm.usage.users.limit || ''}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            usage: { 
                              ...editForm.usage, 
                              users: { 
                                ...editForm.usage.users, 
                                limit: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
                              }
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clientes */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Clientes</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="used_customers" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Utilizados
                        </label>
                        <input
                          type="number"
                          id="used_customers"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={editForm.usage.customers.used || ''}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            usage: { 
                              ...editForm.usage, 
                              customers: { 
                                ...editForm.usage.customers, 
                                used: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
                              }
                            }
                          })}
                        />
                      </div>
                      <div>
                        <label htmlFor="max_customers" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Limite
                        </label>
                        <input
                          type="number"
                          id="max_customers"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={editForm.usage.customers.limit || ''}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            usage: { 
                              ...editForm.usage, 
                              customers: { 
                                ...editForm.usage.customers, 
                                limit: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
                              }
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Canais */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Canais</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="used_channels" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Utilizados
                        </label>
                        <input
                          type="number"
                          id="used_channels"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={editForm.usage.channels.used || ''}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            usage: { 
                              ...editForm.usage, 
                              channels: { 
                                ...editForm.usage.channels, 
                                used: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
                              }
                            }
                          })}
                        />
                      </div>
                      <div>
                        <label htmlFor="max_channels" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Limite
                        </label>
                        <input
                          type="number"
                          id="max_channels"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={editForm.usage.channels.limit || ''}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            usage: { 
                              ...editForm.usage, 
                              channels: { 
                                ...editForm.usage.channels, 
                                limit: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
                              }
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fluxos */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Fluxos</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="used_flows" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Utilizados
                        </label>
                        <input
                          type="number"
                          id="used_flows"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={editForm.usage.flows.used || ''}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            usage: { 
                              ...editForm.usage, 
                              flows: { 
                                ...editForm.usage.flows, 
                                used: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
                              }
                            }
                          })}
                        />
                      </div>
                      <div>
                        <label htmlFor="max_flows" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Limite
                        </label>
                        <input
                          type="number"
                          id="max_flows"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={editForm.usage.flows.limit || ''}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            usage: { 
                              ...editForm.usage, 
                              flows: { 
                                ...editForm.usage.flows, 
                                limit: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
                              }
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Times */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Times</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="used_teams" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Utilizados
                        </label>
                        <input
                          type="number"
                          id="used_teams"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={editForm.usage.teams.used || ''}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            usage: { 
                              ...editForm.usage, 
                              teams: { 
                                ...editForm.usage.teams, 
                                used: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
                              }
                            }
                          })}
                        />
                      </div>
                      <div>
                        <label htmlFor="max_teams" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Limite
                        </label>
                        <input
                          type="number"
                          id="max_teams"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={editForm.usage.teams.limit || ''}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            usage: { 
                              ...editForm.usage, 
                              teams: { 
                                ...editForm.usage.teams, 
                                limit: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
                              }
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Storage */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Storage (GB)</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="used_storage" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Utilizados
                        </label>
                        <input
                          type="number"
                          id="used_storage"
                          min="0"
                          step="0.1"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={displayValues.used_storage || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDisplayValues({ ...displayValues, used_storage: value });
                            setEditForm({ 
                              ...editForm, 
                              usage: { 
                                ...editForm.usage, 
                                storage: { 
                                  ...editForm.usage.storage, 
                                  used: value === '' ? 0 : Math.round((parseFloat(value) || 0) * 1024 * 1024 * 1024)
                                }
                              }
                            });
                          }}
                        />
                      </div>
                      <div>
                        <label htmlFor="usage_storage" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Limite
                        </label>
                        <input
                          type="number"
                          id="usage_storage"
                          min="0"
                          step="0.1"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={displayValues.usage_storage}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDisplayValues({ ...displayValues, usage_storage: value });
                            setEditForm({ 
                              ...editForm, 
                              usage: { 
                                ...editForm.usage, 
                                storage: { 
                                  ...editForm.usage.storage, 
                                  limit: value === '' ? 0 : Math.round((parseFloat(value) || 0) * 1024 * 1024 * 1024)
                                }
                              }
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tokens */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Tokens (Milhões)</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="used_tokens" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Utilizados
                        </label>
                        <input
                          type="number"
                          id="used_tokens"
                          min="0"
                          step="0.1"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={displayValues.used_tokens || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDisplayValues({ ...displayValues, used_tokens: value });
                            setEditForm({ 
                              ...editForm, 
                              usage: { 
                                ...editForm.usage, 
                                tokens: { 
                                  ...editForm.usage.tokens, 
                                  used: value === '' ? 0 : Math.round((parseFloat(value) || 0) * 1000000)
                                }
                              }
                            });
                          }}
                        />
                      </div>
                      <div>
                        <label htmlFor="usage_tokens" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Limite
                        </label>
                        <input
                          type="number"
                          id="usage_tokens"
                          min="0"
                          step="0.1"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                          value={displayValues.usage_tokens}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDisplayValues({ ...displayValues, usage_tokens: value });
                            setEditForm({ 
                              ...editForm, 
                              usage: { 
                                ...editForm.usage, 
                                tokens: { 
                                  ...editForm.usage.tokens, 
                                  limit: value === '' ? 0 : Math.round((parseFloat(value) || 0) * 1000000)
                                }
                              }
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editingOrg}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingOrg && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && selectedOrg && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                Excluir Organização
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                Tem certeza que deseja excluir a organização "{selectedOrg.name}"? Esta ação não poderá ser desfeita.
              </p>
              
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deletingOrg}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteOrg}
                  disabled={deletingOrg}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingOrg && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}