import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreatePrescription, useUpdatePrescription } from '../../hooks/useMedicalHooks';
import CustomerSelectModal from '../customers/CustomerSelectModal';
import ProviderSelectModal from '../providers/ProviderSelectModal';
import { User, X, Plus } from 'lucide-react';
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
  id?: string;
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

interface PrescriptionFormProps {
  prescription: Prescription | null;
  onClose: () => void;
  customer: CustomerWithDetails | null;
}

const PrescriptionForm: React.FC<PrescriptionFormProps> = ({ prescription, onClose, customer }) => {
  const { t } = useTranslation(['common', 'medical']);
  const { profile } = useAuthContext();
  const createPrescription = useCreatePrescription();
  const updatePrescription = useUpdatePrescription();
  
  const isEditing = !!prescription;
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    customer_id: customer?.id || '',
    provider_id: '',
    appointment_id: '',
    prescription_date: format(new Date(), 'yyyy-MM-dd'),
    valid_until: '',
    medications: [] as Medication[],
    instructions: '',
    notes: '',
    is_controlled_substance: false,
    controlled_substance_type: '',
  });
  
  // Estado para novo medicamento
  const [newMedication, setNewMedication] = useState<Medication>({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    quantity: undefined,
    is_controlled: false,
  });
  
  // Para mensagens de erro e status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderWithDetails | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  
  // Carregar dados da prescrição quando for edição
  useEffect(() => {
    if (prescription) {
      setFormData({
        customer_id: prescription.customer_id || '',
        provider_id: prescription.provider_id || '',
        appointment_id: prescription.appointment_id || '',
        prescription_date: prescription.prescription_date || format(new Date(), 'yyyy-MM-dd'),
        valid_until: prescription.valid_until || '',
        medications: prescription.medications || [],
        instructions: prescription.instructions || '',
        notes: prescription.notes || '',
        is_controlled_substance: prescription.is_controlled_substance || false,
        controlled_substance_type: prescription.controlled_substance_type || '',
      });
      
      if (prescription.customer) {
        setSelectedCustomer(prescription.customer);
      }
      
      if (prescription.provider) {
        setSelectedProvider(prescription.provider);
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
  }, [prescription, customer, profile]);
  
  // Manipular mudanças no formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
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
  
  // Funções para manipular medicamentos
  const handleMedicationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewMedication(prev => ({ ...prev, [name]: value }));
  };
  
  const handleMedicationCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNewMedication(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleAddMedication = () => {
    if (newMedication.name && newMedication.dosage && newMedication.frequency) {
      setFormData(prev => ({
        ...prev,
        medications: [...prev.medications, { ...newMedication }]
      }));
      setNewMedication({
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        quantity: undefined,
        is_controlled: false,
      });
    }
  };
  
  const handleRemoveMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
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
    
    if (formData.medications.length === 0) {
      setError(t('medical:medicationsRequired'));
      setIsSubmitting(false);
      return;
    }
    
    try {
      const dataToSubmit = {
        customer_id: formData.customer_id,
        provider_id: formData.provider_id,
        appointment_id: formData.appointment_id || undefined,
        prescription_date: formData.prescription_date,
        valid_until: formData.valid_until || undefined,
        medications: formData.medications,
        instructions: formData.instructions || undefined,
        notes: formData.notes || undefined,
        is_controlled_substance: formData.is_controlled_substance,
        controlled_substance_type: formData.is_controlled_substance ? formData.controlled_substance_type || undefined : undefined,
      };
      
      if (isEditing && prescription?.id) {
        await updatePrescription.mutateAsync({
          id: prescription.id,
          ...dataToSubmit
        });
      } else {
        await createPrescription.mutateAsync(dataToSubmit);
      }
      
      onClose();
    } catch (err: unknown) {
      console.error('Erro ao salvar prescrição:', err);
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
          {/* Data da Prescrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:prescriptionDate')} *
            </label>
            <input
              type="date"
              name="prescription_date"
              value={formData.prescription_date}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          
          {/* Validade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:validUntil')}
            </label>
            <input
              type="date"
              name="valid_until"
              value={formData.valid_until}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
        
        {/* Medicamento Controlado */}
        <div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_controlled_substance"
              name="is_controlled_substance"
              checked={formData.is_controlled_substance}
              onChange={handleCheckboxChange}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="is_controlled_substance" className="block ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('medical:controlledSubstance')}
            </label>
          </div>
          
          {formData.is_controlled_substance && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('medical:controlledSubstanceType')}
              </label>
              <input
                type="text"
                name="controlled_substance_type"
                value={formData.controlled_substance_type}
                onChange={handleChange}
                className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('medical:controlledSubstanceTypePlaceholder')}
              />
            </div>
          )}
        </div>
        
        {/* Medicamentos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:medications')} *
          </label>
          
          <div className="grid grid-cols-1 gap-4 mt-1 md:grid-cols-2 lg:grid-cols-3">
            <input
              type="text"
              name="name"
              value={newMedication.name}
              onChange={handleMedicationChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:medicationName')}
            />
            <input
              type="text"
              name="dosage"
              value={newMedication.dosage}
              onChange={handleMedicationChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:medicationDosage')}
            />
            <input
              type="text"
              name="frequency"
              value={newMedication.frequency}
              onChange={handleMedicationChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:medicationFrequency')}
            />
          </div>
          
          <div className="grid grid-cols-1 gap-4 mt-2 md:grid-cols-2 lg:grid-cols-3">
            <input
              type="text"
              name="duration"
              value={newMedication.duration}
              onChange={handleMedicationChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:medicationDuration')}
            />
            <input
              type="number"
              name="quantity"
              value={newMedication.quantity || ''}
              onChange={handleMedicationChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:medicationQuantity')}
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_controlled"
                name="is_controlled"
                checked={newMedication.is_controlled}
                onChange={handleMedicationCheckboxChange}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="is_controlled" className="block ml-2 text-sm text-gray-700 dark:text-gray-300">
                {t('medical:medicationControlled')}
              </label>
            </div>
          </div>
          
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:medicationInstructions')}
            </label>
            <textarea
              name="instructions"
              value={newMedication.instructions}
              onChange={handleMedicationChange}
              rows={2}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:medicationInstructionsPlaceholder')}
            ></textarea>
          </div>
          
          <div className="mt-2">
            <button
              type="button"
              onClick={handleAddMedication}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-700 dark:hover:bg-green-600"
              disabled={!newMedication.name || !newMedication.dosage || !newMedication.frequency}
            >
              <Plus className="w-4 h-4 mr-1" /> {t('medical:addMedication')}
            </button>
          </div>
          
          {formData.medications.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('medical:medicationsAdded')}
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">
                        {t('medical:medicationName')}
                      </th>
                      <th scope="col" className="px-4 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">
                        {t('medical:medicationDosage')}
                      </th>
                      <th scope="col" className="px-4 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">
                        {t('medical:medicationFrequency')}
                      </th>
                      <th scope="col" className="px-4 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">
                        {t('common:actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {formData.medications.map((medication, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-300">{medication.name}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-300">{medication.dosage}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-300">{medication.frequency}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(index)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Instruções Gerais */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:instructions')}
          </label>
          <div className="mt-1">
            <textarea
              name="instructions"
              rows={3}
              value={formData.instructions}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:instructionsPlaceholder')}
            ></textarea>
          </div>
        </div>
        
        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:notes')}
          </label>
          <div className="mt-1">
            <textarea
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:notesPlaceholder')}
            ></textarea>
          </div>
        </div>
        
        {/* Botões do formulário */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            onClick={onClose}
          >
            {t('common:cancel')}
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-700 dark:hover:bg-green-600"
            disabled={isSubmitting || !formData.customer_id || !formData.provider_id || formData.medications.length === 0}
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

export default PrescriptionForm; 