import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Calendar,
  FileText, 
  Plus,
  User,
  Phone,
  Mail,
  Clock,
  X,
  Edit2,
  Eye,
  Edit,
  Download,
  FileCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  useMedicalAppointments, 
  useMedicalRecords, 
  usePrescriptions,
  useCertificates
} from '../../hooks/useMedicalHooks';
import { supabase } from '../../lib/supabase';
import MedicalConsultationForm from '../../components/medical/MedicalConsultationForm';
import MedicalRecordForm from '../../components/medical/MedicalRecordForm';
import PrescriptionForm from '../../components/medical/PrescriptionForm';
import CertificateForm from '../../components/medical/CertificateForm';
import { MedicalAppointment, EmrMedicalRecord, EmrPrescription, EmrCertificate } from '../../types/medicalRecord';
import { Customer } from '../../types/database';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';

interface Medication {
  name: string;
  dosage: string;
}

// Interface para cliente com informações adicionais
interface CustomerWithDetails extends Customer {
  [key: string]: unknown;
}

// Interface para o provedor com informações adicionais
interface ProviderWithDetails {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  email: string;
  created_at: string;
  is_superadmin: boolean;
  language: string;
  [key: string]: unknown;
}

// Estender o tipo EmrCertificate para usar CustomerWithDetails
interface ExtendedEmrCertificate extends Omit<EmrCertificate, 'customer' | 'provider'> {
  customer?: CustomerWithDetails;
  provider?: ProviderWithDetails;
  [key: string]: unknown;
}

// Estender o tipo EmrPrescription para usar CustomerWithDetails
interface ExtendedEmrPrescription extends Omit<EmrPrescription, 'customer' | 'provider'> {
  customer?: CustomerWithDetails;
  provider?: ProviderWithDetails;
  [key: string]: unknown;
}

// Componente principal
const PatientMedicalView = () => {
  const { t } = useTranslation(['common', 'medical', 'customers']);
  const { customerId } = useParams<{ customerId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Estado para armazenar os dados do paciente
  const [customer, setCustomer] = useState<CustomerWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Obtém a tab do URL ou usa 'appointments' como padrão
  const tabFromUrl = searchParams.get('tab');
  const validTabs = ['appointments', 'records', 'prescriptions', 'certificates'];
  const [activeTab, setActiveTab] = useState<'appointments' | 'records' | 'prescriptions' | 'certificates'>(
    validTabs.includes(tabFromUrl as string) 
      ? (tabFromUrl as 'appointments' | 'records' | 'prescriptions' | 'certificates') 
      : 'appointments'
  );
  
  // Atualizar a URL quando a tab mudar, mas não através do efeito da URL
  const [updatingFromUrl, setUpdatingFromUrl] = useState(false);
  
  // Atualizar a URL quando a tab mudar, mas não se estamos atualizando a partir da URL
  useEffect(() => {
    if (!updatingFromUrl && activeTab) {
      const currentTab = searchParams.get('tab');
      if (currentTab !== activeTab) {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('tab', activeTab);
        setSearchParams(newSearchParams);
      }
    }
    setUpdatingFromUrl(false);
  }, [activeTab, setSearchParams, searchParams]);
  
  // Sincronizar activeTab com o parâmetro da URL quando mudar
  useEffect(() => {
    const tabParam = searchParams.get('tab') as string;
    if (tabParam && validTabs.includes(tabParam)) {
      const normalizedTab = tabParam as 'appointments' | 'records' | 'prescriptions' | 'certificates';
      if (normalizedTab !== activeTab) {
        setUpdatingFromUrl(true);
        setActiveTab(normalizedTab);
      }
    }
  }, [searchParams, validTabs, activeTab]);
  
  // Estados para controlar os modais de formulário
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isMedicalRecordModalOpen, setIsMedicalRecordModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [isCustomerEditModalOpen, setIsCustomerEditModalOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<MedicalAppointment | null>(null);
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState<EmrMedicalRecord | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<ExtendedEmrPrescription | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<ExtendedEmrCertificate | null>(null);
  
  // Memoizar os filtros de appointments para evitar recálculos desnecessários
  const appointmentsFilters = useMemo(() => ({
    customer_id: customerId,
    date_from: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString()
  }), [customerId]);
  
  // Carregar dados de consultas, prontuários, prescrições e atestados
  const { data: appointmentsData } = useMedicalAppointments(appointmentsFilters);
  const { data: medicalRecordsData } = useMedicalRecords({ customer_id: customerId });
  const { data: prescriptionsData } = usePrescriptions({ customer_id: customerId });
  const { data: certificatesData } = useCertificates({ customer_id: customerId });
  
  // Extrair os dados
  const appointments = appointmentsData?.data || [];
  const medicalRecords = medicalRecordsData?.data || [];
  const prescriptions = prescriptionsData?.data || [];
  const certificates = certificatesData?.data || [];
  
  // Função para abrir o modal de edição de paciente
  const handleEditCustomer = () => {
    setIsCustomerEditModalOpen(true);
  };
  
  // Função para quando o modal de edição de paciente é fechado com sucesso
  const handleCustomerEditSuccess = (silentRefresh?: boolean) => {
    setIsCustomerEditModalOpen(false);
    
    // Recarregar os dados do paciente
    if (customerId) {
      fetchCustomerDetails();
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void(silentRefresh); // Silencia o aviso do linter
  };
  
  // Buscar informações do paciente
  const fetchCustomerDetails = async () => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
        
      if (error) throw error;
      setCustomer(data as CustomerWithDetails);
    } catch (error) {
      console.error('Erro ao buscar detalhes do paciente:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Efeito para buscar detalhes do paciente
  useEffect(() => {
    fetchCustomerDetails();
  }, [customerId]);
  
  // Formatação de data
  const formatDate = (date?: string) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return date;
    }
  };
  
  // Formatação de hora
  const formatTime = (time?: string) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };
  
  // Abrir modal de nova consulta
  const handleNewAppointment = () => {
    setSelectedConsultation(null);
    setIsConsultationModalOpen(true);
  };
  
  // Abrir modal de novo prontuário
  const handleNewMedicalRecord = () => {
    setSelectedMedicalRecord(null);
    setIsMedicalRecordModalOpen(true);
  };
  
  // Abrir modal de nova prescrição
  const handleNewPrescription = () => {
    setSelectedPrescription(null);
    setIsPrescriptionModalOpen(true);
  };
  
  // Exibir detalhes de consulta
  const handleViewAppointment = (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
      setSelectedConsultation(appointment);
      setIsConsultationModalOpen(true);
    }
  };
  
  // Exibir detalhes de prontuário
  const handleViewMedicalRecord = (recordId: string) => {
    const record = medicalRecords.find(r => r.id === recordId);
    if (record) {
      setSelectedMedicalRecord(record);
      setIsMedicalRecordModalOpen(true);
    }
  };
  
  // Exibir detalhes de prescrição
  const handleViewPrescription = (prescriptionId: string) => {
    const prescription = prescriptions.find(p => p.id === prescriptionId);
    if (prescription) {
      setSelectedPrescription(prescription);
      setIsPrescriptionModalOpen(true);
    }
  };
  
  // Exibir detalhes de atestado
  const handleViewCertificate = (certificateId: string) => {
    const certificate = certificates.find(c => c.id === certificateId);
    if (certificate) {
      setSelectedCertificate({
        ...certificate,
        customer: certificate.customer as CustomerWithDetails,
        provider: certificate.provider as ProviderWithDetails
      });
      setIsCertificateModalOpen(true);
    }
  };
  
  // Criar novo atestado
  const handleNewCertificate = () => {
    setSelectedCertificate(null);
    setIsCertificateModalOpen(true);
  };
  
  // Fechar modal de atestado
  const handleCloseCertificateModal = () => {
    setIsCertificateModalOpen(false);
    setSelectedCertificate(null);
  };
  
  // Função auxiliar para obter contato do cliente
  const getCustomerContact = (type: 'email' | 'phone'): string | undefined => {
    return customer?.contacts?.find(contact => contact.type === type)?.value;
  };
  
  // Manipuladores das abas - evita problemas de renderização extra
  const handleTabChange = (tab: 'appointments' | 'records' | 'prescriptions' | 'certificates') => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };
  
  // Efeito para lidar com o botão de voltar do navegador
  useEffect(() => {
    const handlePopState = () => {
      // Verificar se estamos na página com ID válido
      if (window.location.pathname.includes('/patients/')) {
        // Extrair a aba da URL
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        
        if (tab && validTabs.includes(tab)) {
          setUpdatingFromUrl(true);
          setActiveTab(tab as 'appointments' | 'records' | 'prescriptions' | 'certificates');
        }
      } else {
        // Se não estamos mais na página de detalhes, redirecionar para a lista
        navigate('/app/medical/patients');
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate, validTabs]);
  
  // Renderização condicional durante o carregamento
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="container px-4 py-8 mx-auto">
      {/* Cabeçalho com informações do paciente */}
      <div className="p-6 mb-6 bg-white rounded-lg shadow-sm dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
              {customer?.profile_picture ? (
                <img
                  src={customer.profile_picture}
                  alt={customer?.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-gray-500 dark:text-gray-400" />
              )}
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {customer?.name || t('customers:unknownCustomer')}
              </h1>
              <div className="flex items-center mt-2 space-x-4">
                {getCustomerContact('email') && (
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Mail className="w-4 h-4 mr-1" />
                    {getCustomerContact('email')}
                  </div>
                )}
                {getCustomerContact('phone') && (
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Phone className="w-4 h-4 mr-1" />
                    {getCustomerContact('phone')}
                  </div>
                )}
                {customer?.created_at && (
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4 mr-1" />
                    {t('customers:customerSince', { date: formatDate(customer.created_at) })}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Botão de editar paciente */}
          {customer && (
            <button
              onClick={handleEditCustomer}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-green-700 border border-green-500 rounded-md hover:bg-green-50 dark:text-green-400 dark:border-green-500 dark:hover:bg-green-900"
            >
              <Edit2 className="w-4 h-4 mr-1.5" />
              {t('customers:edit.title')}
            </button>
          )}
        </div>
      </div>

      {/* Abas de navegação */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => handleTabChange('appointments')}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
            activeTab === 'appointments'
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Calendar className="w-4 h-4 mr-2" />
          {t('medical:consultations')}
        </button>
        <button
          onClick={() => handleTabChange('records')}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
            activeTab === 'records'
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          {t('medical:records')}
        </button>
        <button
          onClick={() => handleTabChange('prescriptions')}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
            activeTab === 'prescriptions'
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <FileText className="w-4 h-4 mr-2" />
          {t('medical:prescriptions')}
        </button>
        <button
          onClick={() => handleTabChange('certificates')}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
            activeTab === 'certificates'
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <FileCheck className="w-4 h-4 mr-2" />
          {t('medical:certificates')}
        </button>
      </div>

      {/* Conteúdo das abas */}
      <div className="bg-white rounded-lg shadow-sm dark:bg-gray-800">
        {/* Aba de Consultas */}
        {activeTab === 'appointments' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('medical:consultations')}
              </h2>
              <button
                onClick={handleNewAppointment}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-700 dark:hover:bg-green-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('medical:newConsultation')}
              </button>
            </div>
            {/* Lista de consultas */}
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center flex-1">
                    <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(appointment.date)}
                      </p>
                      <div className="flex flex-col text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
                        <span>{appointment.status && t(`medical:status.${appointment.status}`)}</span>
                        {appointment.notes && (
                          <span className="mt-1 line-clamp-2">{appointment.notes}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewAppointment(appointment.id)}
                      className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={t('common:view')}
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleViewAppointment(appointment.id)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={t('common:edit')}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {appointments.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('medical:noConsultationsYet')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Aba de Prontuários */}
        {activeTab === 'records' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('medical:records')}
              </h2>
              <button
                onClick={handleNewMedicalRecord}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-700 dark:hover:bg-green-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('medical:newRecord')}
              </button>
            </div>
            {/* Lista de prontuários */}
            <div className="space-y-4">
              {medicalRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center flex-1">
                    <ClipboardList className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t(`medical:recordType.${record.record_type}`, { defaultValue: record.record_type })}
                      </p>
                      <div className="flex flex-col text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatDate(record.created_at)}</span>
                        {record.medical_history && (
                          <span className="mt-1 line-clamp-2">{record.medical_history}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewMedicalRecord(record.id)}
                      className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={t('common:view')}
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleViewMedicalRecord(record.id)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={t('common:edit')}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {medicalRecords.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('medical:noRecords')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Aba de Prescrições */}
        {activeTab === 'prescriptions' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('medical:prescriptions')}
              </h2>
              <button
                onClick={handleNewPrescription}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-700 dark:hover:bg-green-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('medical:newPrescription')}
              </button>
            </div>
            {/* Lista de prescrições */}
            <div className="space-y-4">
              {prescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center flex-1">
                    <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(prescription.prescription_date)}
                      </p>
                      <div className="flex flex-col text-sm text-gray-500 dark:text-gray-400">
                        <span>{prescription.medications?.length} {t('medical:medications')}</span>
                        {prescription.medications?.slice(0, 2).map((med: Medication, index: number) => (
                          <span key={index} className="mt-1 line-clamp-1">
                            {med.name} - {med.dosage}
                          </span>
                        ))}
                        {prescription.medications && prescription.medications.length > 2 && (
                          <span className="mt-1 text-gray-400">
                            +{prescription.medications.length - 2} {t('medical:moreMedications')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewPrescription(prescription.id)}
                      className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={t('common:view')}
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleViewPrescription(prescription.id)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={t('common:edit')}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    {prescription.document_url && (
                      <a
                        href={prescription.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title={t('common:download')}
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {prescriptions.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('medical:noPrescriptions')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Aba de Atestados */}
        {activeTab === 'certificates' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('medical:certificates')}
              </h2>
              <button
                onClick={handleNewCertificate}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-700 dark:hover:bg-green-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('medical:newCertificate')}
              </button>
            </div>
            {/* Lista de atestados */}
            <div className="space-y-4">
              {certificates.map((certificate) => (
                <div
                  key={certificate.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center flex-1">
                    <FileCheck className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t(`medical:certificateType.${certificate.certificate_type}`)}
                      </p>
                      <div className="flex flex-col text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatDate(certificate.issue_date)}</span>
                        {certificate.days_of_leave && (
                          <span>{t('medical:daysOfLeave', { days: certificate.days_of_leave })}</span>
                        )}
                        {certificate.reason && (
                          <span className="mt-1 line-clamp-2">{certificate.reason}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewCertificate(certificate.id)}
                      className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={t('common:view')}
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleViewCertificate(certificate.id)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={t('common:edit')}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    {certificate.document_url && (
                      <a
                        href={certificate.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title={t('common:download')}
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {certificates.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('medical:noCertificates')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modais de formulário */}
      {isConsultationModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setIsConsultationModalOpen(false)} />
            <div className="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 w-full max-w-4xl">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={() => setIsConsultationModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <MedicalConsultationForm
                  consultation={selectedConsultation}
                  onClose={() => setIsConsultationModalOpen(false)}
                  customer={customer}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {isMedicalRecordModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setIsMedicalRecordModalOpen(false)} />
            <div className="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 w-full max-w-4xl">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={() => setIsMedicalRecordModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <MedicalRecordForm
                  medicalRecord={selectedMedicalRecord}
                  onClose={() => setIsMedicalRecordModalOpen(false)}
                  customer={customer}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para criar/editar prescrições */}
      {isPrescriptionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setIsPrescriptionModalOpen(false)} />
            <div className="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 w-full max-w-4xl">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={() => setIsPrescriptionModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <PrescriptionForm
                  prescription={selectedPrescription}
                  onClose={() => setIsPrescriptionModalOpen(false)}
                  customer={customer}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para criar/editar atestados */}
      {isCertificateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={handleCloseCertificateModal} />
            <div className="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 w-full max-w-4xl">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={handleCloseCertificateModal}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <CertificateForm
                  certificate={selectedCertificate}
                  onClose={handleCloseCertificateModal}
                  customer={customer}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição de paciente */}
      {isCustomerEditModalOpen && customer && (
        <CustomerEditModal
          customer={customer}
          onClose={() => setIsCustomerEditModalOpen(false)}
          onSuccess={handleCustomerEditSuccess}
        />
      )}
    </div>
  );
};

export default PatientMedicalView; 