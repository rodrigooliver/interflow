import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileCheck, Search, Edit, Trash2, User, X, Calendar, FileText } from 'lucide-react';
import { useCertificates, useDeleteCertificate, useCertificateTypes } from '../../hooks/useMedicalHooks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CertificateForm from '../../components/medical/CertificateForm';
import { useAuthContext } from '../../contexts/AuthContext';
import { useAgents } from '../../hooks/useQueryes';
import DocumentProcessor from '../../components/medical/DocumentProcessor';
import { Link } from 'react-router-dom';

// Interface para filtros
interface CertificateFilters {
  customer_id?: string;
  provider_id?: string;
  appointment_id?: string;
  certificate_type?: string;
  search_term?: string;
  date_from?: string;
  date_to?: string;
}

// Interface para cliente com informações adicionais
interface CustomerWithDetails {
  id: string;
  name: string;
  avatar_url?: string;
  profile_picture?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  customer_contacts?: { type: string; value: string; id?: string }[];
  contacts?: { type: string; value: string; id?: string }[];
  [key: string]: unknown;
}

// Interface para profissional de saúde
interface ProviderWithDetails {
  id: string;
  user_id?: string;
  profile_id?: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  organization_id?: string;
  role: string;
  [key: string]: unknown;
}

// Interface para o atestado médico
interface Certificate {
  id: string;
  customer_id: string;
  provider_id: string;
  appointment_id?: string;
  certificate_type: string;
  issue_date: string;
  start_date?: string;
  end_date?: string;
  days_of_leave?: number;
  reason?: string;
  recommendations?: string;
  document_url?: string;
  document_generated_at?: string;
  customer?: CustomerWithDetails;
  provider?: ProviderWithDetails;
  [key: string]: unknown;
}

interface DocumentProcessingState {
  isOpen: boolean;
  certificate: Certificate | null;
}

const EmrCertificates = () => {
  const { t } = useTranslation(['common', 'medical']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;
  const currentUserId = currentOrganizationMember?.profile_id;
  
  // Estado inicial dos filtros com o usuário atual como padrão
  const [filters, setFilters] = useState<CertificateFilters>({
    provider_id: currentUserId
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [documentProcessing, setDocumentProcessing] = useState<DocumentProcessingState>({
    isOpen: false,
    certificate: null,
  });
  
  // Consultas React Query
  const { data: certificatesData, isLoading } = useCertificates(filters);
  const { data: agents } = useAgents(organizationId, ['agent', 'admin', 'owner']);
  const { data: certificateTypes = [] } = useCertificateTypes();
  const deleteCertificate = useDeleteCertificate();
  
  // Extrair dados e contagem
  const certificates = certificatesData?.data || [];
  const totalCount = certificatesData?.count || 0;
  
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
  
  const handleFilterChange = (key: keyof CertificateFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm(t('common:confirmDelete'))) {
      try {
        await deleteCertificate.mutateAsync(id);
      } catch (error) {
        console.error('Erro ao excluir atestado:', error);
      }
    }
  };
  
  const handleEdit = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setShowForm(true);
  };
  
  const handleCreate = () => {
    setSelectedCertificate(null);
    setShowForm(true);
  };
  
  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedCertificate(null);
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

  // Função para traduzir o tipo de atestado
  const getCertificateTypeLabel = (type: string) => {
    return t(`medical:certificateType.${type}`, { defaultValue: type });
  };

  const handleGenerateDocument = (certificate: Certificate) => {
    setDocumentProcessing({
      isOpen: true,
      certificate,
    });
  };

  const handleCloseDocumentProcessor = () => {
    setDocumentProcessing({
      isOpen: false,
      certificate: null,
    });
  };

  const getDocumentVariables = (certificate: Certificate) => {
    return {
      certificate: {
        ...certificate,
        issue_date_formatted: formatDate(certificate.issue_date),
        start_date_formatted: formatDate(certificate.start_date),
        end_date_formatted: formatDate(certificate.end_date),
      },
      customer: certificate.customer,
      provider: certificate.provider,
      organization: currentOrganizationMember?.organization,
      current_date: formatDate(new Date().toISOString()),
    };
  };

  return (
    <div className="container px-4 py-6 mx-auto">
      {/* Modal para criar/editar atestados médicos */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-4xl p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedCertificate ? t('medical:editCertificate') : t('medical:newCertificate')}
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
              {t('medical:certificateFormDescription')}
            </p>
            {/* Incluir o componente de formulário */}
            <CertificateForm 
              certificate={selectedCertificate} 
              onClose={handleCloseForm} 
              customer={selectedCertificate?.customer || null}
            />
          </div>
        </div>
      )}
      
      {/* Modal do Processador de Documentos */}
      {documentProcessing.isOpen && documentProcessing.certificate && (
        <DocumentProcessor
          template={{
            id: '852dad18-0fde-4ae8-ae35-721e04366000',
            name: t('medical:certificateType.medical'),
            description: t('medical:certificatesDescription'),
            content: '', // TODO: Usar template real do banco de dados
            format: 'html',
            document_type: 'certificate',
            is_default: true,
            is_active: true,
            variables_schema: {
              properties: {}
            },
          }}
          variables={getDocumentVariables(documentProcessing.certificate)}
          onClose={handleCloseDocumentProcessor}
        />
      )}
      
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900">
              <FileCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('medical:certificates')}
            </h1>
          </div>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:bg-purple-700 dark:hover:bg-purple-600"
            onClick={handleCreate}
          >
            {t('medical:newCertificate')}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {t('medical:certificatesDescription')}
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
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={filters.certificate_type || ''}
              onChange={(e) => handleFilterChange('certificate_type', e.target.value)}
            >
              <option value="">{t('common:allTypes')}</option>
              {certificateTypes?.map((type) => (
                <option key={type} value={type}>
                  {t(`medical:certificateType.${type}`, { defaultValue: type })}
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={filters.date_to || ''}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>
          </div>
          
          {/* Botão de Busca */}
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-purple-700 dark:hover:bg-purple-600"
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
            <div className="w-6 h-6 border-2 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-300">{t('common:loading')}</span>
          </div>
        ) : certificates.length === 0 ? (
          <div className="p-6">
            <div className="p-8 text-center">
              <FileCheck className="w-16 h-16 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                {t('medical:noCertificatesYet')}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('medical:startByCreatingCertificate')}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:bg-purple-700 dark:hover:bg-purple-600"
                  onClick={handleCreate}
                >
                  {t('medical:createFirstCertificate')}
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
                  <th scope="col" className="px-6 py-3">{t('medical:certificateType.label')}</th>
                  <th scope="col" className="px-6 py-3">{t('medical:issueDate')}</th>
                  <th scope="col" className="px-6 py-3">{t('medical:validDates')}</th>
                  <th scope="col" className="px-6 py-3">{t('medical:daysOfLeave')}</th>
                  <th scope="col" className="px-6 py-3">{t('common:actions')}</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((certificate: Certificate) => (
                  <tr 
                    key={certificate.id} 
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                          {certificate.customer?.profile_picture ? (
                            <img
                              src={certificate.customer.profile_picture}
                              alt={certificate.customer?.name || ''}
                              className="rounded-full w-8 h-8 object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">{certificate.customer?.name || certificate.customer_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {certificate.provider?.full_name || certificate.provider_id}
                    </td>
                    <td className="px-6 py-4">
                      {getCertificateTypeLabel(certificate.certificate_type)}
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(certificate.issue_date)}
                    </td>
                    <td className="px-6 py-4">
                      {certificate.start_date && certificate.end_date 
                        ? `${formatDate(certificate.start_date)} - ${formatDate(certificate.end_date)}`
                        : certificate.start_date 
                          ? `${formatDate(certificate.start_date)} -` 
                          : certificate.end_date 
                            ? `- ${formatDate(certificate.end_date)}`
                            : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {certificate.days_of_leave || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleGenerateDocument(certificate)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          title={t('medical:generateDocument')}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(certificate)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title={t('common:edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(certificate.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title={t('common:delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {certificate.customer_id && (
                          <Link
                            to={`/app/medical/patients/${certificate.customer_id}?tab=certificates`}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title={t('medical:viewPatientCertificates')}
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
                  {t('common:showingResults', { count: certificates.length, total: totalCount })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmrCertificates; 