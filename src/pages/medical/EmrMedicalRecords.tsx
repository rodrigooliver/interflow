import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Search, Edit, Trash2, User, X } from 'lucide-react';
import { EmrMedicalRecord, EmrMedicalRecordFilters } from '../../types/medicalRecord';
import { useMedicalRecords, useDeleteMedicalRecord, useMedicalRecordTypes } from '../../hooks/useMedicalHooks';
import MedicalRecordForm from '../../components/medical/MedicalRecordForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const EmrMedicalRecords = () => {
  const { t } = useTranslation(['common', 'medical']);
  const [filters, setFilters] = useState<EmrMedicalRecordFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EmrMedicalRecord | null>(null);
  
  // Consultas React Query
  const { data: recordsData, isLoading } = useMedicalRecords(filters);
  const { data: recordTypes } = useMedicalRecordTypes();
  const deleteMedicalRecord = useDeleteMedicalRecord();
  
  // Extrair dados e contagem
  const records = recordsData?.data || [];
  const totalCount = recordsData?.count || 0;
  
  // Função para verificar se o customer tem avatar_url de forma segura
  const getCustomerAvatarUrl = (customer: unknown): string | undefined => {
    if (!customer) return undefined;
    return typeof customer === 'object' && customer !== null && 'avatar_url' in customer 
      ? (customer as { avatar_url?: string }).avatar_url 
      : undefined;
  };
  
  // Manipuladores de eventos
  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search_term: searchTerm }));
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleFilterChange = (key: keyof EmrMedicalRecordFilters, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm(t('common:confirmDelete'))) {
      try {
        await deleteMedicalRecord.mutateAsync(id);
      } catch (error) {
        console.error('Erro ao excluir prontuário:', error);
      }
    }
  };
  
  const handleEdit = (record: EmrMedicalRecord) => {
    setSelectedRecord(record);
    setShowForm(true);
  };
  
  const handleCreate = () => {
    setSelectedRecord(null);
    setShowForm(true);
  };
  
  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedRecord(null);
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
      {/* Modal para criar/editar prontuários */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-4xl p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedRecord ? t('medical:editRecord') : t('medical:newRecord')}
              </h2>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={handleCloseForm}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <MedicalRecordForm
              medicalRecord={selectedRecord}
              onClose={handleCloseForm}
            />
          </div>
        </div>
      )}
      
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg dark:bg-indigo-900">
              <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('medical:records')}
            </h1>
          </div>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600"
            onClick={handleCreate}
          >
            {t('medical:newRecord')}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {t('medical:recordsDescription')}
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
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
          
          {/* Filtro por Tipo */}
          <div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={filters.record_type || ''}
              onChange={(e) => handleFilterChange('record_type', e.target.value)}
            >
              <option value="">{t('common:allTypes')}</option>
              {recordTypes?.map((type) => (
                <option key={type} value={type}>
                  {t(`medical:recordType.${type}`, { defaultValue: type })}
                </option>
              ))}
            </select>
          </div>
          
          {/* Filtro por Status */}
          <div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={filters.is_active === undefined ? '' : String(filters.is_active)}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'true') handleFilterChange('is_active', true);
                else if (value === 'false') handleFilterChange('is_active', false);
                else handleFilterChange('is_active', '');
              }}
            >
              <option value="">{t('common:allStatuses')}</option>
              <option value="true">{t('medical:active')}</option>
              <option value="false">{t('medical:inactive')}</option>
            </select>
          </div>
          
          {/* Botão de Busca */}
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600"
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
            <div className="w-6 h-6 border-2 border-indigo-600 rounded-full animate-spin border-t-transparent"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-300">{t('common:loading')}</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-6">
            <div className="p-8 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                {t('medical:noRecordsYet')}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('medical:startByCreatingRecord')}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600"
                  onClick={handleCreate}
                >
                  {t('medical:createFirstRecord')}
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
                  <th scope="col" className="px-6 py-3">{t('medical:recordType.label')}</th>
                  <th scope="col" className="px-6 py-3">{t('medical:allergiesCount')}</th>
                  <th scope="col" className="px-6 py-3">{t('medical:chronicConditionsCount')}</th>
                  <th scope="col" className="px-6 py-3">{t('medical:medicationsCount')}</th>
                  <th scope="col" className="px-6 py-3">{t('common:status')}</th>
                  <th scope="col" className="px-6 py-3">{t('medical:lastUpdated')}</th>
                  <th scope="col" className="px-6 py-3">{t('common:actions')}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr 
                    key={record.id} 
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                          {getCustomerAvatarUrl(record.customer) ? (
                            <img
                              src={getCustomerAvatarUrl(record.customer)}
                              alt={record.customer?.name || ''}
                              className="rounded-full w-8 h-8 object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">{record.customer?.name || record.customer_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {t(`medical:recordType.${record.record_type}`, { defaultValue: record.record_type })}
                    </td>
                    <td className="px-6 py-4">
                      {record.allergies?.length || 0}
                    </td>
                    <td className="px-6 py-4">
                      {record.chronic_conditions?.length || 0}
                    </td>
                    <td className="px-6 py-4">
                      {record.current_medications?.length || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        record.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {record.is_active ? t('medical:active') : t('medical:inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(record.updated_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(record)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {record.customer_id && (
                          <Link
                            to={`/app/medical/patients/${record.customer_id}?tab=records`}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title={t('medical:viewPatientRecords')}
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
                  {t('common:showingResults', { count: records.length, total: totalCount })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmrMedicalRecords; 