import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Search, Plus, Calendar, ClipboardList, ChevronLeft, ChevronRight as ChevronRightIcon, FileText, Edit2, FileCheck, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';
import { CustomerAddModal } from '../../components/customers/CustomerAddModal';

// Tipo de paciente
interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  profile_picture?: string;
  created_at: string;
  organization_id: string;
  stage_id: string | null;
  updated_at: string;
}

// Interface de paginação
interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

const EmrPatients = () => {
  const { t } = useTranslation(['common', 'medical', 'customers']);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentOrganizationMember } = useAuthContext();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  // Obter valores iniciais da URL
  const pageFromUrl = Number(searchParams.get('page')) || 1;
  const searchTermFromUrl = searchParams.get('q') || '';
  
  // Estados
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchTermFromUrl);
  const [pagination, setPagination] = useState<Pagination>({
    page: pageFromUrl,
    pageSize: 10,
    total: 0
  });
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Calcular total de páginas
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  
  // Atualizar URL quando os parâmetros mudarem
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    
    // Atualizar parâmetros na URL
    if (pagination.page !== 1) {
      newSearchParams.set('page', pagination.page.toString());
    } else {
      newSearchParams.delete('page');
    }
    
    if (searchTerm) {
      newSearchParams.set('q', searchTerm);
    } else {
      newSearchParams.delete('q');
    }
    
    // Só atualizar se houve mudança
    if (newSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(newSearchParams);
    }
  }, [pagination.page, searchTerm, setSearchParams, searchParams]);
  
  // Função para buscar pacientes
  const fetchPatients = async () => {
    if (!currentOrganizationMember?.organization_id) return;
    
    setLoading(true);
    try {
      // Criar query base
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('organization_id', currentOrganizationMember.organization_id)
        .order('name');
        
      // Adicionar filtro de busca se fornecido
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%`);
      }
      
      // Adicionar paginação
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);
      
      // Executar query
      const { data, error, count } = await query;
        
      if (error) throw error;
      setPatients(data || []);
      setPagination(prev => ({
        ...prev,
        total: count || 0
      }));
    } catch (error: unknown) {
      console.error('Erro ao buscar pacientes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Efeito para buscar pacientes
  useEffect(() => {
    fetchPatients();
  }, [pagination.page, pagination.pageSize, searchTerm, currentOrganizationMember?.organization_id]);
  
  // Controlar pesquisa com debounce
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Limpar timeout anterior se existir
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    // Criar novo timeout
    const timeout = setTimeout(() => {
      // Não é necessário fazer nada aqui, pois o efeito será acionado pela mudança em searchTerm
    }, 500);
    
    setDebounceTimeout(timeout);
    
    // Resetar para página 1 quando pesquisar
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };
  
  // Formatar data
  const formatDate = (date?: string) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return date;
    }
  };
  
  // Navegar para página de detalhes do paciente
  const handleViewPatient = (patientId: string, tab?: string) => {
    if (!patientId) return;
    
    try {
      const path = `/app/medical/patients/${patientId}`;
      navigate(tab ? `${path}?tab=${tab}` : path);
    } catch (error) {
      console.error("Erro ao navegar:", error);
    }
  };
  
  // Navegar para a criação de novo paciente
  const handleAddPatient = () => {
    setShowAddModal(true);
  };
  
  // Mudar página
  const changePage = (newPage: number) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
    
    // Rolar para o topo da página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Função para lidar com erro de carregamento de imagem
  const handleImageError = (patientId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [patientId]: true
    }));
  };

  // Função para abrir o modal de edição
  const handleEditPatient = (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation(); // Impedir que o clique propague para a linha
    setSelectedPatient(patient);
    setShowEditModal(true);
  };

  // Função para fechar o modal
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedPatient(null);
  };

  // Função para atualizar após edição
  const handleEditSuccess = (silentRefresh?: boolean) => {
    if (!silentRefresh) {
      handleCloseEditModal();
    }
    // Recarregar a lista de pacientes
    fetchPatients();
  };

  // Função para fechar o modal de adição
  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  // Função para atualizar após adição
  const handleAddSuccess = async (silentRefresh?: boolean, customerId?: string) => {
    handleCloseAddModal();
    
    // Recarregar a lista de pacientes
    await fetchPatients();
    
    if (!silentRefresh && customerId) {
      // Buscar o cliente recém-adicionado pelo ID
      const { data: recentCustomer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      
      if (!error && recentCustomer) {
        // Configurar o cliente selecionado e abrir o modal de edição
        setSelectedPatient(recentCustomer);
        setShowEditModal(true);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Cabeçalho com título e ações */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {t('medical:patients')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('medical:managePatients')}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              placeholder={t('common:search')}
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          
          <button
            onClick={handleAddPatient}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('customers:addCustomer')}
          </button>
        </div>
      </div>
      
      {/* Estatísticas de pacientes - Visível apenas quando não está carregando */}
      {!loading && patients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('medical:totalPatients')}</h2>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{pagination.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-900">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('medical:thisMonth')}</h2>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {patients.filter(p => {
                    const createdDate = new Date(p.created_at);
                    const now = new Date();
                    return createdDate.getMonth() === now.getMonth() && 
                           createdDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900">
                <ClipboardList className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('medical:recentRecords')}</h2>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {patients.filter(p => {
                    const updatedDate = new Date(p.updated_at);
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - updatedDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 7;
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mostrar indicador de pesquisa ativa */}
      {searchTerm && (
        <div className="mb-4 flex items-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 p-2 rounded-md">
          <span className="mr-2">{t('common:searchResults')}:</span>
          <span className="font-medium text-gray-900 dark:text-white">"{searchTerm}"</span>
          <button 
            onClick={() => setSearchTerm('')}
            className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            {t('common:clear')}
          </button>
        </div>
      )}
      
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="w-16 h-16 mb-4 relative">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 dark:border-blue-900 rounded-full animate-pulse"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
            {t('common:loading')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
            {t('medical:loadingPatients')}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg transition-colors">
          {patients.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                {searchTerm ? t('customers:noSearchResults') : t('customers:noCustomersYet')}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? t('customers:tryAnotherSearch') : t('customers:getStartedByAddingCustomer')}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <button
                    onClick={handleAddPatient}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    {t('customers:addFirstCustomer')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t('customers:name')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        {t('customers:detailedInfo')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {patients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors" onClick={() => handleViewPatient(patient.id)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {patient.profile_picture && !imageErrors[patient.id] ? (
                                <img 
                                  className="h-10 w-10 rounded-full" 
                                  src={patient.profile_picture} 
                                  alt={patient.name}
                                  onError={() => handleImageError(patient.id)}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                  <User className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {patient.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(patient.date_of_birth)} 
                                {patient.gender && ` • ${t(`customers:genders.${patient.gender}`)}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-4">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPatient(e, patient);
                              }}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              {t('common:edit')}
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPatient(patient.id, 'appointments');
                              }}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              {t('medical:consultations')}
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPatient(patient.id, 'records');
                              }}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                            >
                              <ClipboardList className="h-3 w-3 mr-1" />
                              {t('medical:records')}
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPatient(patient.id, 'prescriptions');
                              }}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {t('medical:prescriptions')}
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPatient(patient.id, 'certificates');
                              }}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                            >
                              <FileCheck className="h-3 w-3 mr-1" />
                              {t('medical:certificates')}
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPatient(patient.id, 'attachments');
                              }}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                            >
                              <Paperclip className="h-3 w-3 mr-1" />
                              {t('medical:attachments.title')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Paginação */}
              {totalPages > 1 && (
                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {t('common:showingResults', { count: pagination.page, total: totalPages })}
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => changePage(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm font-medium ${
                            pagination.page === 1 
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                              : 'text-gray-500 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer'
                          } transition-colors`}
                        >
                          <span className="sr-only">{t('common:previous')}</span>
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        
                        {/* Numeração das páginas */}
                        {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                          let pageNumber;
                          
                          // Lógica para determinar quais números de página mostrar
                          if (totalPages <= 5) {
                            pageNumber = idx + 1;
                          } else if (pagination.page <= 3) {
                            pageNumber = idx + 1;
                          } else if (pagination.page >= totalPages - 2) {
                            pageNumber = totalPages - 4 + idx;
                          } else {
                            pageNumber = pagination.page - 2 + idx;
                          }
                          
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => changePage(pageNumber)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pagination.page === pageNumber
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-500'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                              } transition-colors`}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => changePage(pagination.page + 1)}
                          disabled={pagination.page === totalPages}
                          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm font-medium ${
                            pagination.page === totalPages 
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                              : 'text-gray-500 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer'
                          } transition-colors`}
                        >
                          <span className="sr-only">{t('common:next')}</span>
                          <ChevronRightIcon className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                  
                  {/* Versão móvel da paginação */}
                  <div className="flex sm:hidden justify-between w-full">
                    <button
                      onClick={() => changePage(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        pagination.page === 1 
                          ? 'text-gray-300 dark:text-gray-600 bg-gray-100 dark:bg-gray-900 cursor-not-allowed' 
                          : 'text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-600 cursor-pointer'
                      } transition-colors`}
                    >
                      {t('common:previous')}
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                      {pagination.page} / {totalPages}
                    </span>
                    <button
                      onClick={() => changePage(pagination.page + 1)}
                      disabled={pagination.page === totalPages}
                      className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        pagination.page === totalPages 
                          ? 'text-gray-300 dark:text-gray-600 bg-gray-100 dark:bg-gray-900 cursor-not-allowed' 
                          : 'text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-600 cursor-pointer'
                      } transition-colors`}
                    >
                      {t('common:next')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal de edição */}
      {showEditModal && selectedPatient && (
        <CustomerEditModal
          customerId={selectedPatient.id}
          onClose={handleCloseEditModal}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Modal de adição */}
      {showAddModal && (
        <CustomerAddModal
          onClose={handleCloseAddModal}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
};

export default EmrPatients; 