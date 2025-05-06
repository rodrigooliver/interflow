import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Stethoscope, Search, Edit, Trash2, X, User, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useMedicalAppointments, useDeleteMedicalAppointment, useMedicalConsultationTypes } from '../../hooks/useMedicalHooks';
import { EmrConsultationFilters, MedicalAppointment } from '../../types/medicalRecord';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MedicalConsultationForm from '../../components/medical/MedicalConsultationForm';
import { useAuthContext } from '../../contexts/AuthContext';
import { useAgents } from '../../hooks/useQueryes';
import { Link } from 'react-router-dom';

const EmrConsultations = () => {
  const { t } = useTranslation(['common', 'medical', 'schedules']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;
  const currentUserId = currentOrganizationMember?.profile_id;
  
  // Estado inicial dos filtros com o usuário atual como padrão
  const [filters, setFilters] = useState<EmrConsultationFilters>({
    provider_id: currentUserId
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<MedicalAppointment | null>(null);
  
  // Estado para o modal de confirmação de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [consultationToDelete, setConsultationToDelete] = useState<string | null>(null);
  
  // Adicionar paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Consultas React Query
  const { data: consultationsData, isLoading } = useMedicalAppointments(filters);
  const { data: consultationTypes } = useMedicalConsultationTypes();
  const { data: agents } = useAgents(organizationId, ['agent', 'admin', 'owner']);
  const deleteMedicalAppointment = useDeleteMedicalAppointment();
  
  // Extrair dados e contagem
  const consultations = consultationsData?.data || [];
  const totalCount = consultationsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // Aplicar paginação do lado do cliente
  const paginatedConsultations = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return consultations.slice(startIndex, endIndex);
  }, [consultations, currentPage, pageSize]);
  
  // Efeito para definir o provider_id quando o usuário logado mudar
  useEffect(() => {
    if (currentUserId) {
      setFilters(prev => ({ ...prev, provider_id: currentUserId }));
    }
  }, [currentUserId]);
  
  // Manipuladores de eventos
  const handleSearch = () => {
    setCurrentPage(1); // Resetar para a primeira página ao buscar
    setFilters((prev) => ({ ...prev, search_term: searchTerm }));
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleFilterChange = (key: keyof EmrConsultationFilters, value: string) => {
    setCurrentPage(1); // Resetar para a primeira página ao filtrar
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Manipulador para iniciar o processo de exclusão
  const handleDeleteClick = (id: string) => {
    setConsultationToDelete(id);
    setShowDeleteModal(true);
  };
  
  // Manipulador para confirmar a exclusão
  const handleConfirmDelete = async () => {
    if (consultationToDelete) {
      try {
        await deleteMedicalAppointment.mutateAsync(consultationToDelete);
        setShowDeleteModal(false);
        setConsultationToDelete(null);
      } catch (error) {
        console.error('Erro ao excluir consulta:', error);
      }
    }
  };
  
  // Manipulador para cancelar a exclusão
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setConsultationToDelete(null);
  };
  
  const handleEdit = (consultation: MedicalAppointment) => {
    setSelectedConsultation(consultation);
    setShowForm(true);
  };
  
  const handleCreate = () => {
    setSelectedConsultation(null);
    setShowForm(true);
  };
  
  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedConsultation(null);
  };
  
  const formatDateTime = (date?: string, time?: string) => {
    if (!date) return '-';
    try {
      const dateStr = date;
      const timeStr = time || '00:00:00';
      return format(new Date(`${dateStr}T${timeStr}`), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return date;
    }
  };

  // Função para obter a classe de cor baseada no status
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'canceled':
      case 'no_show':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Componente do Modal de Confirmação de Exclusão
  const DeleteConfirmationModal = () => {
    if (!showDeleteModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
        <div className="w-full max-w-md p-6 mx-4 bg-white rounded-lg shadow-lg dark:bg-gray-800">
          <div className="flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-12 h-12" />
          </div>
          <h3 className="mb-4 text-xl font-bold text-center text-gray-900 dark:text-white">
            {t('common:confirmAction')}
          </h3>
          <p className="mb-6 text-center text-gray-600 dark:text-gray-300">
            {t('medical:cancelConsultationConfirmation')}
          </p>
          <div className="flex justify-center space-x-4">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              onClick={handleCancelDelete}
            >
              {t('common:cancel')}
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-600"
              onClick={handleConfirmDelete}
            >
              {t('common:confirm')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Componente de paginação
  const Pagination = () => {
    // Se não tem páginas ou apenas uma página, não mostrar paginação
    if (totalPages <= 1) return null;
    
    // Função para gerar os itens da paginação
    const getPaginationItems = () => {
      const items = [];
      
      // Sempre mostrar a primeira página
      items.push(
        <button
          key="first"
          onClick={() => handlePageChange(1)}
          className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
            currentPage === 1
              ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
              : 'text-gray-500 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          1
        </button>
      );
      
      // Se temos muitas páginas, mostrar elipses
      if (currentPage > 3) {
        items.push(
          <span key="ellipsis1" className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            ...
          </span>
        );
      }
      
      // Mostrar páginas ao redor da página atual
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (i !== 1 && i !== totalPages) { // Não duplicar primeira e última páginas
          items.push(
            <button
              key={i}
              onClick={() => handlePageChange(i)}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                currentPage === i
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-500 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {i}
            </button>
          );
        }
      }
      
      // Mais elipses se necessário
      if (currentPage < totalPages - 2) {
        items.push(
          <span key="ellipsis2" className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            ...
          </span>
        );
      }
      
      // Sempre mostrar a última página
      if (totalPages > 1) {
        items.push(
          <button
            key="last"
            onClick={() => handlePageChange(totalPages)}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
              currentPage === totalPages
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-500 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {totalPages}
          </button>
        );
      }
      
      return items;
    };
    
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md 
              ${currentPage === 1 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700'}`}
          >
            {t('common:previous')}
          </button>
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
              ${currentPage === totalPages 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700'}`}
          >
            {t('common:next')}
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-400">
              {t('common:showingPagination', { 
                from: ((currentPage - 1) * pageSize) + 1, 
                to: Math.min(currentPage * pageSize, totalCount), 
                total: totalCount 
              })}
            </p>
          </div>
          <div>
            <nav className="inline-flex shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium 
                  ${currentPage === 1 
                    ? 'text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-600' 
                    : 'text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'}`}
              >
                <span className="sr-only">{t('common:previous')}</span>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              
              {getPaginationItems()}
              
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium 
                  ${currentPage === totalPages 
                    ? 'text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-600' 
                    : 'text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'}`}
              >
                <span className="sr-only">{t('common:next')}</span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 py-6 mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
              <Stethoscope className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('medical:consultations')}
            </h1>
          </div>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
            onClick={handleCreate}
          >
            {t('medical:newConsultation')}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {t('medical:consultationsDescription')}
        </p>
      </div>

      {/* Filtros */}
      <div className="p-4 mb-6 bg-white rounded-lg shadow dark:bg-gray-800">
        <div className="flex flex-wrap items-center gap-4">
          {/* Busca */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('common:search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              {searchTerm && (
                <button
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => {
                    setSearchTerm('');
                    setFilters((prev) => ({ ...prev, search_term: undefined }));
                  }}
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>
          </div>
          
          {/* Filtro por Profissional */}
          <div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={filters.provider_id || ''}
              onChange={(e) => handleFilterChange('provider_id', e.target.value)}
            >
              <option value="">{t('common:allProviders')}</option>
              {agents?.map((agent) => (
                <option key={agent.id} value={agent.profile?.id}>
                  {agent.profile?.full_name || agent.profile?.email}
                </option>
              ))}
            </select>
          </div>
          
          {/* Filtro por Tipo */}
          <div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={filters.consultation_type || ''}
              onChange={(e) => handleFilterChange('consultation_type', e.target.value)}
            >
              <option value="">{t('common:allTypes')}</option>
              {consultationTypes?.map((type) => (
                <option key={type} value={type}>
                  {t(`medical:consultationType.${type}`, { defaultValue: type })}
                </option>
              ))}
            </select>
          </div>
          
          {/* Filtro por Status */}
          <div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">{t('common:allStatuses')}</option>
              <option value="scheduled">{t('medical:status.scheduled')}</option>
              <option value="confirmed">{t('medical:status.confirmed')}</option>
              <option value="completed">{t('medical:status.completed')}</option>
              <option value="canceled">{t('medical:status.canceled')}</option>
              <option value="no_show">{t('medical:status.no_show')}</option>
            </select>
          </div>
          
          {/* Botão de Busca */}
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
            onClick={handleSearch}
          >
            {t('common:filter')}
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="overflow-hidden bg-white rounded-lg shadow dark:bg-gray-800">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-300">{t('common:loading')}</span>
          </div>
        ) : consultations.length === 0 ? (
          <div className="p-6">
            <div className="p-8 text-center">
              <Stethoscope className="w-16 h-16 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                {t('medical:noConsultationsYet')}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('medical:startByCreatingConsultation')}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
                  onClick={handleCreate}
                >
                  {t('medical:createFirstConsultation')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-3">{t('medical:patient')}</th>
                    <th scope="col" className="px-6 py-3">{t('medical:provider')}</th>
                    <th scope="col" className="px-6 py-3">{t('schedules:schedule')}</th>
                    <th scope="col" className="px-6 py-3">{t('schedules:service')}</th>
                    <th scope="col" className="px-6 py-3">{t('medical:type')}</th>
                    <th scope="col" className="px-6 py-3">{t('medical:date')}</th>
                    <th scope="col" className="px-6 py-3">{t('medical:statusTitle')}</th>
                    <th scope="col" className="px-6 py-3">{t('common:actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedConsultations.map((consultation) => (
                    <tr 
                      key={consultation.id} 
                      className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                        {consultation.customer?.name || consultation.customer_id}
                      </td>
                      <td className="px-6 py-4">
                        {consultation.provider?.full_name || consultation.provider_id}
                      </td>
                      <td className="px-6 py-4">
                        {consultation.schedule?.title || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {consultation.service?.title || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {consultation.consultation_type ? t(`medical:consultationType.${consultation.consultation_type}`, { defaultValue: consultation.consultation_type }) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {formatDateTime(consultation.date, consultation.start_time)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColorClass(consultation.status)}`}>
                          {t(`medical:status.${consultation.status}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <button
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            onClick={() => handleEdit(consultation)}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => handleDeleteClick(consultation.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {consultation.customer_id && (
                            <Link
                              to={`/app/medical/patients/${consultation.customer_id}?tab=appointments`}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title={t('medical:viewPatientAppointments')}
                            >
                              <User className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Paginação */}
            <Pagination />
          </>
        )}
      </div>

      {/* Modal de formulário */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
          <div className="w-full max-w-4xl p-6 m-4 my-8 bg-white rounded-lg shadow-lg dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between mb-4 bg-white dark:bg-gray-800 pb-2 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedConsultation 
                  ? t('medical:editConsultation') 
                  : t('medical:newConsultation')
                }
              </h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                onClick={handleCloseForm}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <MedicalConsultationForm 
              consultation={selectedConsultation}
              onClose={handleCloseForm}
              customer={selectedConsultation?.customer || null}
            />
          </div>
        </div>
      )}
      
      {/* Modal de confirmação de exclusão */}
      <DeleteConfirmationModal />
    </div>
  );
};

export default EmrConsultations; 