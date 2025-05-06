import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateCertificate, useUpdateCertificate, useCertificateTypes } from '../../hooks/useMedicalHooks';
import CustomerSelectModal from '../customers/CustomerSelectModal';
import ProviderSelectModal from '../providers/ProviderSelectModal';
import { User, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthContext } from '../../contexts/AuthContext';

// Interface para cliente com informações adicionais (compatível com CustomerSelectModal)
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
  [key: string]: unknown; // Para outros campos que possam existir
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
  id?: string;
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

interface CertificateFormProps {
  certificate: Certificate | null;
  onClose: () => void;
  customer: CustomerWithDetails | null;
}

const CertificateForm: React.FC<CertificateFormProps> = ({ certificate, onClose, customer }) => {
  const { t } = useTranslation(['common', 'medical']);
  const { profile } = useAuthContext();
  const createCertificate = useCreateCertificate();
  const updateCertificate = useUpdateCertificate();
  const { data: certificateTypes = [] } = useCertificateTypes();
  
  const isEditing = !!certificate;
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    customer_id: customer?.id || '',
    provider_id: '',
    appointment_id: '',
    certificate_type: 'sick_leave',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    start_date: '',
    end_date: '',
    days_of_leave: undefined as number | undefined,
    reason: '',
    recommendations: '',
  });
  
  // Para mensagens de erro e status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderWithDetails | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  
  // Calcular dias de afastamento automaticamente
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia final
      
      setFormData(prev => ({
        ...prev,
        days_of_leave: diffDays
      }));
    }
  }, [formData.start_date, formData.end_date]);
  
  // Carregar dados do atestado quando for edição
  useEffect(() => {
    if (certificate) {
      setFormData({
        customer_id: certificate.customer_id || '',
        provider_id: certificate.provider_id || '',
        appointment_id: certificate.appointment_id || '',
        certificate_type: certificate.certificate_type || 'sick_leave',
        issue_date: certificate.issue_date || format(new Date(), 'yyyy-MM-dd'),
        start_date: certificate.start_date || '',
        end_date: certificate.end_date || '',
        days_of_leave: certificate.days_of_leave,
        reason: certificate.reason || '',
        recommendations: certificate.recommendations || '',
      });
      
      if (certificate.customer) {
        setSelectedCustomer(certificate.customer);
      }
      
      if (certificate.provider) {
        setSelectedProvider(certificate.provider);
      }
    } else if (customer) {
      setFormData(prev => ({ ...prev, provider_id: profile?.id || '' }));
      // Converter Customer para CustomerWithDetails
      const customerWithDetails: CustomerWithDetails = {
        id: customer.id,
        name: customer.name,
        organization_id: customer.organization_id,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        profile_picture: customer.profile_picture,
        avatar_url: customer.profile_picture, // Mapear o profile_picture para avatar_url também
        customer_contacts: customer.contacts ? customer.contacts.map(c => ({
          type: c.type,
          value: c.value,
          id: c.id
        })) : [],
      };
      
      // Adicionar outros campos que possam existir em customer
      Object.keys(customer).forEach(key => {
        if (!['id', 'name', 'organization_id', 'created_at', 'updated_at', 'profile_picture', 'contacts'].includes(key)) {
          customerWithDetails[key] = customer[key];
        }
      });
      
      setSelectedCustomer(customerWithDetails);
      setSelectedProvider(profile as unknown as ProviderWithDetails);
    } else {
      setSelectedProvider(profile as unknown as ProviderWithDetails);
    }
  }, [certificate, customer, profile]);
  
  // Manipular mudanças no formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Função para abrir o modal de seleção de pacientes
  const handleOpenCustomerModal = () => {
    setIsCustomerModalOpen(true);
  };
  
  // Função para lidar com a seleção de um paciente
  const handleSelectCustomer = (customer: CustomerWithDetails) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setIsCustomerModalOpen(false);
  };
  
  // Função para abrir o modal de seleção de profissionais
  const handleOpenProviderModal = () => {
    setIsProviderModalOpen(true);
  };
  
  // Função para lidar com a seleção de um profissional
  const handleSelectProvider = (provider: ProviderWithDetails) => {
    setSelectedProvider(provider);
    setFormData(prev => ({ ...prev, provider_id: provider.profile_id || '' }));
    setIsProviderModalOpen(false);
  };
  
  // Manipular dias de afastamento manualmente
  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = parseInt(e.target.value);
    if (!isNaN(days) && days >= 0) {
      setFormData(prev => ({ ...prev, days_of_leave: days }));
      
      // Se tiver data de início, calcular a data de fim baseada nos dias
      if (formData.start_date) {
        const start = new Date(formData.start_date);
        const end = new Date(start);
        end.setDate(start.getDate() + days - 1); // -1 porque contamos o dia inicial
        
        setFormData(prev => ({
          ...prev,
          end_date: format(end, 'yyyy-MM-dd')
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, days_of_leave: undefined }));
    }
  };
  
  // Enviar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    if (!formData.customer_id) {
      setError(t('medical:patientRequired'));
      setIsSubmitting(false);
      return;
    }
    
    if (!formData.provider_id) {
      setError(t('medical:providerRequired'));
      setIsSubmitting(false);
      return;
    }
    
    try {
      const dataToSubmit = {
        customer_id: formData.customer_id,
        provider_id: formData.provider_id,
        appointment_id: formData.appointment_id || undefined,
        certificate_type: formData.certificate_type,
        issue_date: formData.issue_date,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        days_of_leave: formData.days_of_leave,
        reason: formData.reason || undefined,
        recommendations: formData.recommendations || undefined,
      };
      
      if (isEditing && certificate?.id) {
        await updateCertificate.mutateAsync({
          id: certificate.id,
          ...dataToSubmit
        });
      } else {
        await createCertificate.mutateAsync(dataToSubmit);
      }
      
      onClose();
    } catch (err: unknown) {
      console.error('Erro ao salvar atestado:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage || t('common:errorSaving'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-300">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Paciente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:patient')} *
            </label>
            <div className="flex mt-1">
              {selectedCustomer ? (
                <div className="flex items-center w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                    <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="ml-3 flex-grow">
                    <p className="text-sm font-medium">{selectedCustomer.name}</p>
                  </div>
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setFormData(prev => ({ ...prev, customer_id: '' }));
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                  onClick={handleOpenCustomerModal}
                >
                  <User className="w-4 h-4 mr-2" />
                  {t('medical:selectPatient')}
                </button>
              )}
            </div>
          </div>
          
          {/* Profissional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:provider')} *
            </label>
            <div className="flex mt-1">
              {selectedProvider ? (
                <div className="flex items-center w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                    {selectedProvider.avatar_url ? (
                      <img
                        src={selectedProvider.avatar_url}
                        alt={selectedProvider.full_name}
                        className="rounded-full w-8 h-8 object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <div className="ml-3 flex-grow">
                    <p className="text-sm font-medium">{selectedProvider.full_name}</p>
                  </div>
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    onClick={() => {
                      setSelectedProvider(null);
                      setFormData(prev => ({ ...prev, provider_id: '' }));
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                  onClick={handleOpenProviderModal}
                >
                  <User className="w-4 h-4 mr-2" />
                  {t('medical:selectProvider')}
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Data de Emissão */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:issueDate')} *
            </label>
            <input
              type="date"
              name="issue_date"
              value={formData.issue_date}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          
          {/* Tipo de Atestado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:certificateType.label')} *
            </label>
            <select
              name="certificate_type"
              value={formData.certificate_type}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            >
              {certificateTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`medical:certificateType.${type}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Data de Início */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:startDate')}
            </label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          {/* Data de Término */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:endDate')}
            </label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          {/* Dias de Afastamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:daysOfLeave')}
            </label>
            <input
              type="number"
              name="days_of_leave"
              value={formData.days_of_leave || ''}
              onChange={handleDaysChange}
              min="0"
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
        
        {/* Motivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:reason')}
          </label>
          <div className="mt-1">
            <textarea
              name="reason"
              rows={3}
              value={formData.reason}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:reasonPlaceholder')}
            ></textarea>
          </div>
        </div>
        
        {/* Recomendações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:recommendations')}
          </label>
          <div className="mt-1">
            <textarea
              name="recommendations"
              rows={2}
              value={formData.recommendations}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:recommendationsPlaceholder')}
            ></textarea>
          </div>
        </div>
        
        {/* Botões do formulário */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            onClick={onClose}
          >
            {t('common:cancel')}
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-purple-700 dark:hover:bg-purple-600"
            disabled={isSubmitting || !formData.customer_id || !formData.provider_id}
          >
            {isSubmitting ? t('common:saving') : isEditing ? t('common:update') : t('common:save')}
          </button>
        </div>
      </form>
      
      {/* Modal de seleção de paciente */}
      <CustomerSelectModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelectCustomer={handleSelectCustomer}
      />
      
      {/* Modal de seleção de profissional */}
      <ProviderSelectModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        onSelectProvider={handleSelectProvider}
      />
    </>
  );
};

export default CertificateForm; 