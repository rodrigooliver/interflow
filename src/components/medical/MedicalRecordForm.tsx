import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EmrMedicalRecord } from '../../types/medicalRecord';
import { useCreateMedicalRecord, useUpdateMedicalRecord, useMedicalRecordTypes } from '../../hooks/useMedicalHooks';
import CustomerSelectModal from '../customers/CustomerSelectModal';
import { User, X } from 'lucide-react';
import { Customer } from '../../types/database';

// Interface para cliente com informações adicionais
interface CustomerWithDetails {
  id: string;
  name: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  [key: string]: unknown; // Para outros campos que possam existir
}

interface MedicalRecordFormProps {
  medicalRecord: EmrMedicalRecord | null;
  onClose: () => void;
  customer: Customer | null;
}

const MedicalRecordForm: React.FC<MedicalRecordFormProps> = ({ medicalRecord, onClose, customer }) => {
  const { t } = useTranslation(['common', 'medical', 'customers']);
  const { data: recordTypes } = useMedicalRecordTypes();
  const createMedicalRecord = useCreateMedicalRecord();
  const updateMedicalRecord = useUpdateMedicalRecord();
  
  const isEditing = !!medicalRecord;
  
  // Estado do formulário
  const [formData, setFormData] = useState<Partial<EmrMedicalRecord>>({
    customer_id: customer?.id || '',
    record_type: medicalRecord?.record_type || '',
    allergies: medicalRecord?.allergies || [],
    chronic_conditions: medicalRecord?.chronic_conditions || [],
    current_medications: medicalRecord?.current_medications || [],
    family_history: medicalRecord?.family_history || '',
    medical_history: medicalRecord?.medical_history || '',
    specialized_data: medicalRecord?.specialized_data || {},
    is_active: medicalRecord?.is_active !== undefined ? medicalRecord.is_active : true,
  });
  
  // Estado para campos de array
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState<{
    name: string;
    dosage: string;
    frequency: string;
    started_at?: string;
  }>({
    name: '',
    dosage: '',
    frequency: '',
    started_at: '',
  });
  
  // Para mensagens de erro e status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  // Efeito para atualizar o formulário quando o prontuário é carregado
  useEffect(() => {
    if (medicalRecord) {
      setFormData({
        customer_id: medicalRecord.customer_id,
        record_type: medicalRecord.record_type,
        allergies: medicalRecord.allergies || [],
        chronic_conditions: medicalRecord.chronic_conditions || [],
        current_medications: medicalRecord.current_medications || [],
        family_history: medicalRecord.family_history || '',
        medical_history: medicalRecord.medical_history || '',
        specialized_data: medicalRecord.specialized_data || {},
        is_active: medicalRecord.is_active !== undefined ? medicalRecord.is_active : true,
      });
      
      // Se temos um customer_id, podemos buscar os detalhes do cliente
      if (medicalRecord.customer) {
        setSelectedCustomer(medicalRecord.customer as unknown as CustomerWithDetails);
      }
    } else if (customer) {
      setSelectedCustomer(customer as unknown as CustomerWithDetails);
    }
  }, [medicalRecord, customer]);
  
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
  
  // Funções para manipular arrays (alergias, condições crônicas, medicamentos)
  const handleAddAllergy = () => {
    if (newAllergy.trim()) {
      setFormData(prev => ({
        ...prev,
        allergies: [...(prev.allergies || []), newAllergy.trim()]
      }));
      setNewAllergy('');
    }
  };
  
  const handleRemoveAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allergies: (prev.allergies || []).filter((_, i) => i !== index)
    }));
  };
  
  const handleAddCondition = () => {
    if (newCondition.trim()) {
      setFormData(prev => ({
        ...prev,
        chronic_conditions: [...(prev.chronic_conditions || []), newCondition.trim()]
      }));
      setNewCondition('');
    }
  };
  
  const handleRemoveCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      chronic_conditions: (prev.chronic_conditions || []).filter((_, i) => i !== index)
    }));
  };
  
  const handleAddMedication = () => {
    if (newMedication.name.trim() && newMedication.dosage.trim() && newMedication.frequency.trim()) {
      setFormData(prev => ({
        ...prev,
        current_medications: [...(prev.current_medications || []), { ...newMedication }]
      }));
      setNewMedication({
        name: '',
        dosage: '',
        frequency: '',
        started_at: '',
      });
    }
  };
  
  const handleRemoveMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      current_medications: (prev.current_medications || []).filter((_, i) => i !== index)
    }));
  };
  
  const handleMedicationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewMedication(prev => ({ ...prev, [name]: value }));
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
    
    try {
      if (isEditing && medicalRecord) {
        // Atualizar prontuário existente com apenas os campos necessários
        await updateMedicalRecord.mutateAsync({
          id: medicalRecord.id,
          customer_id: formData.customer_id,
          record_type: formData.record_type,
          allergies: formData.allergies,
          chronic_conditions: formData.chronic_conditions,
          current_medications: formData.current_medications,
          family_history: formData.family_history,
          medical_history: formData.medical_history,
          specialized_data: formData.specialized_data,
          is_active: formData.is_active,
        });
      } else {
        // Criar novo prontuário com apenas os campos necessários
        await createMedicalRecord.mutateAsync({
          customer_id: formData.customer_id,
          record_type: formData.record_type || 'medical',
          allergies: formData.allergies,
          chronic_conditions: formData.chronic_conditions,
          current_medications: formData.current_medications,
          family_history: formData.family_history,
          medical_history: formData.medical_history,
          specialized_data: formData.specialized_data,
          is_active: formData.is_active !== undefined ? formData.is_active : true,
        } as Omit<EmrMedicalRecord, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'last_updated_by'>);
      }
      
      // Fechar o formulário
      onClose();
    } catch (err: unknown) {
      console.error('Erro ao salvar prontuário médico:', err);
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
                    {selectedCustomer.avatar_url ? (
                      <img
                        src={selectedCustomer.avatar_url}
                        alt={selectedCustomer.name}
                        className="rounded-full w-8 h-8 object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    )}
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
          
          {/* Tipo de Prontuário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:recordType.label')} *
            </label>
            <select
              name="record_type"
              value={formData.record_type || 'medical'}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            >
              {recordTypes?.map((type) => (
                <option key={type} value={type}>
                  {t(`medical:recordType.${type}`, { defaultValue: type })}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Status */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={formData.is_active ?? true}
            onChange={handleCheckboxChange}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
          />
          <label htmlFor="is_active" className="block ml-2 text-sm text-gray-700 dark:text-gray-300">
            {t('medical:activeRecord')}
          </label>
        </div>
        
        {/* Alergias */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:allergies')}
          </label>
          <div className="flex mt-1">
            <input
              type="text"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:addAllergy')}
            />
            <button
              type="button"
              onClick={handleAddAllergy}
              className="px-4 py-2 ml-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600"
            >
              {t('common:add')}
            </button>
          </div>
          {formData.allergies && formData.allergies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.allergies.map((allergy, index) => (
                <div
                  key={index}
                  className="flex items-center px-3 py-1 text-sm bg-gray-100 rounded-full dark:bg-gray-700"
                >
                  <span>{allergy}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAllergy(index)}
                    className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Condições Crônicas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:chronicConditions')}
          </label>
          <div className="flex mt-1">
            <input
              type="text"
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:addChronicCondition')}
            />
            <button
              type="button"
              onClick={handleAddCondition}
              className="px-4 py-2 ml-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600"
            >
              {t('common:add')}
            </button>
          </div>
          {formData.chronic_conditions && formData.chronic_conditions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.chronic_conditions.map((condition, index) => (
                <div
                  key={index}
                  className="flex items-center px-3 py-1 text-sm bg-gray-100 rounded-full dark:bg-gray-700"
                >
                  <span>{condition}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(index)}
                    className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Medicamentos Atuais */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:currentMedications')}
          </label>
          
          <div className="grid grid-cols-1 gap-4 mt-1 md:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              name="name"
              value={newMedication.name}
              onChange={handleMedicationChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:medicationName')}
            />
            <input
              type="text"
              name="dosage"
              value={newMedication.dosage}
              onChange={handleMedicationChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:medicationDosage')}
            />
            <input
              type="text"
              name="frequency"
              value={newMedication.frequency}
              onChange={handleMedicationChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:medicationFrequency')}
            />
            <input
              type="date"
              name="started_at"
              value={newMedication.started_at || ''}
              onChange={handleMedicationChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:medicationStartDate')}
            />
          </div>
          
          <div className="mt-2">
            <button
              type="button"
              onClick={handleAddMedication}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600"
              disabled={!newMedication.name || !newMedication.dosage || !newMedication.frequency}
            >
              {t('medical:addMedication')}
            </button>
          </div>
          
          {formData.current_medications && formData.current_medications.length > 0 && (
            <div className="mt-4">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">
                      {t('medical:medicationName')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">
                      {t('medical:medicationDosage')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">
                      {t('medical:medicationFrequency')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">
                      {t('medical:medicationStartDate')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">
                      {t('common:actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {formData.current_medications.map((medication, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-300">{medication.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-300">{medication.dosage}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-300">{medication.frequency}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-300">{medication.started_at || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
          )}
        </div>
        
        {/* Histórico Familiar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:familyHistory')}
          </label>
          <div className="mt-1">
            <textarea
              name="family_history"
              rows={3}
              value={formData.family_history || ''}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:familyHistoryPlaceholder')}
            ></textarea>
          </div>
        </div>
        
        {/* Histórico Médico */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:medicalHistory')}
          </label>
          <div className="mt-1">
            <textarea
              name="medical_history"
              rows={5}
              value={formData.medical_history || ''}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('medical:medicalHistoryPlaceholder')}
            ></textarea>
          </div>
        </div>
        
        {/* Botões do formulário */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            onClick={onClose}
          >
            {t('common:cancel')}
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-700 dark:hover:bg-indigo-600"
            disabled={isSubmitting || !formData.customer_id}
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
    </>
  );
};

export default MedicalRecordForm; 