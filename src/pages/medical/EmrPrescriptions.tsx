import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardEdit, Search, Edit, Trash2, User, X, Calendar } from 'lucide-react';
import { usePrescriptions, useDeletePrescription } from '../../hooks/useMedicalHooks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PrescriptionForm from '../../components/medical/PrescriptionForm';
import { useAuthContext } from '../../contexts/AuthContext';
import { useAgents } from '../../hooks/useQueryes';
import { Link } from 'react-router-dom';

// Interface para filtros
interface PrescriptionFilters {
  customer_id?: string;
  provider_id?: string;
  appointment_id?: string;
  search_term?: string;
  date_from?: string;
  date_to?: string;
}

// Interface para cliente com informações adicionais (compatível com PrescriptionForm)
interface CustomerWithDetails {
  id: string;
  name: string;
  avatar_url?: string;
  profile_picture?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  customer_contacts?: { type: string; value: string; id?: string }[];
  [key: string]: unknown; // Para outros campos que possam existir
}

// Interface para profissional de saúde
interface ProviderWithDetails {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  role: string;
  [key: string]: unknown;
}

// Interface para medicamento na prescrição
interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  quantity?: number;
  is_controlled?: boolean;
}

// Interface para a prescrição médica
interface Prescription {
  id: string;
  customer_id: string;
  provider_id: string;
  appointment_id?: string;
  prescription_date: string;
  valid_until?: string;
  medications: Medication[];
  instructions?: string;
  notes?: string;
  is_controlled_substance: boolean;
  controlled_substance_type?: string;
  customer?: CustomerWithDetails;
  provider?: ProviderWithDetails;
  [key: string]: unknown;
}

const EmrPrescriptions = () => {
  const { t } = useTranslation(['common', 'medical']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;
  const currentUserId = currentOrganizationMember?.profile_id;
  
  // Estado inicial dos filtros com o usuário atual como padrão
  const [filters, setFilters] = useState<PrescriptionFilters>({
    provider_id: currentUserId
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  
  // Consultas React Query
  const { data: prescriptionsData, isLoading } = usePrescriptions(filters);
  const { data: agents } = useAgents(organizationId, ['agent', 'admin', 'owner']);
  const deletePrescription = useDeletePrescription();
  
  // Extrair dados e contagem
  const prescriptions = prescriptionsData?.data || [];
  const totalCount = prescriptionsData?.count || 0;
  
  // Efeito para definir o provider_id quando o usuário logado mudar
  useEffect(() => {
    if (currentUserId) {
      setFilters(prev => ({ ...prev, provider_id: currentUserId }));
    }
  }, [currentUserId]);
  
  // Manipuladores de eventos
  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search_term: searchTerm }));
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleFilterChange = (key: keyof PrescriptionFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm(t('common:confirmDelete'))) {
      try {
        await deletePrescription.mutateAsync(id);
      } catch (error) {
        console.error('Erro ao excluir prescrição:', error);
      }
    }
  };
  
  const handleEdit = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowForm(true);
  };
  
  const handleCreate = () => {
    setSelectedPrescription(null);
    setShowForm(true);
  };
  
  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedPrescription(null);
  };
  
  const formatDate = (date?: string) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return date;
    }
  };

  return (
    <div className="container px-4 py-6 mx-auto">
      {/* Modal para criar/editar prescrições médicas */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-4xl p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedPrescription ? t('medical:editPrescription') : t('medical:newPrescription')}
              </h2>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={handleCloseForm}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="mb-4 text-gray-600 dark:text-gray-300">
              {t('medical:prescriptionFormDescription')}
            </p>
            {/* Incluir o componente de formulário */}
            <PrescriptionForm 
              prescription={selectedPrescription} 
              onClose={handleCloseForm} 
              customer={selectedPrescription?.customer || null}
            />
          </div>
        </div>
      )}
      
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900">
              <ClipboardEdit className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('medical:prescriptions')}
            </h1>
          </div>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-700 dark:hover:bg-green-600"
            onClick={handleCreate}
          >
            {t('medical:newPrescription')}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {t('medical:prescriptionsDescription')}
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
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
          
          {/* Filtro por Data De */}
          <div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                type="date"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={filters.date_from || ''}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />
            </div>
          </div>
          
          {/* Filtro por Data Até */}
          <div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                type="date"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={filters.date_to || ''}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>
          </div>
          
          {/* Botão de Busca */}
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-green-700 dark:hover:bg-green-600"
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
            <div className="w-6 h-6 border-2 border-green-600 rounded-full animate-spin border-t-transparent"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-300">{t('common:loading')}</span>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="p-6">
            <div className="p-8 text-center">
              <ClipboardEdit className="w-16 h-16 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                {t('medical:noPrescriptionsYet')}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('medical:startByCreatingPrescription')}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-700 dark:hover:bg-green-600"
                  onClick={handleCreate}
                >
                  {t('medical:createFirstPrescription')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3">{t('medical:patient')}</th>
                  <th scope="col" className="px-6 py-3">{t('medical:provider')}</th>
                  <th scope="col" className="px-6 py-3">{t('medical:prescriptionDate')}</th>
                  <th scope="col" className="px-6 py-3">{t('medical:validUntil')}</th>
                  <th scope="col" className="px-6 py-3">{t('medical:medicationsCount')}</th>
                  <th scope="col" className="px-6 py-3">{t('medical:controlled')}</th>
                  <th scope="col" className="px-6 py-3">{t('common:actions')}</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((prescription: Prescription) => (
                  <tr 
                    key={prescription.id} 
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                          {prescription.customer?.profile_picture ? (
                            <img
                              src={prescription.customer.profile_picture}
                              alt={prescription.customer?.name || ''}
                              className="rounded-full w-8 h-8 object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">{prescription.customer?.name || prescription.customer_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {prescription.provider?.full_name || prescription.provider_id}
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(prescription.prescription_date)}
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(prescription.valid_until) || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {prescription.medications?.length || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        prescription.is_controlled_substance 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {prescription.is_controlled_substance ? t('common:yes') : t('common:no')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(prescription)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(prescription.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {prescription.customer_id && (
                          <Link
                            to={`/app/medical/patients/${prescription.customer_id}?tab=prescriptions`}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title={t('medical:viewPatientPrescriptions')}
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
            
            {/* Paginação (implementação futura) */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {t('common:showingResults', { count: prescriptions.length, total: totalCount })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmrPrescriptions; 