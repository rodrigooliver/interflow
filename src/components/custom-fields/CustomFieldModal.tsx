import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, XCircle } from 'lucide-react';
import { CustomFieldFormData, CustomFieldDefinition } from '../../types/database';
import { createCustomFieldDefinition } from '../../services/customFieldsService';
import { useTranslation } from 'react-i18next';
import { ConfirmationModal } from './ConfirmationModal';

interface CustomFieldModalProps {
  field: CustomFieldFormData | null;
  isCreating: boolean;
  organizationFields: CustomFieldDefinition[];
  organizationId: string;
  onSave: (field: CustomFieldFormData, index?: number) => void;
  onDelete?: (field: CustomFieldFormData) => void;
  onClose: () => void;
}

export function CustomFieldModal({
  field,
  isCreating,
  organizationFields,
  organizationId,
  onSave,
  onDelete,
  onClose
}: CustomFieldModalProps) {
  const { t } = useTranslation(['customers']);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState<CustomFieldFormData>({
    field_id: '',
    field_name: '',
    type: 'text',
    options: [],
    mask_type: undefined,
    custom_mask: undefined,
    description: ''
  });
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (field) {
      setFormData({
        field_id: field.field_id,
        field_name: field.field_name,
        type: field.type || 'text',
        options: field.options || [],
        mask_type: field.mask_type,
        custom_mask: field.custom_mask,
        description: field.description || ''
      });
    }
  }, [field]);

  useEffect(() => {
    console.log('Tipo atual mudou:', formData.type);
  }, [formData.type]);

  const handleSubmit = async () => {
    // Validação básica
    if (!formData.field_name.trim()) {
      return;
    }
    
    // Validação para campos do tipo select
    if (formData.type === 'select' && (!formData.options || formData.options.length === 0)) {
      return;
    }

    // Validar se temos o organization_id
    if (!organizationId) {
      return;
    }
    
    try {
      // Verificar se já existe um campo com este nome (apenas para novos campos)
      if (isCreating) {
        const existingField = organizationFields.find(
          f => f.name.toLowerCase() === formData.field_name.toLowerCase() && f.id !== formData.field_id
        );
        
        if (existingField) {
          // Se o campo já existe, usar a definição existente
          onSave({
            ...formData,
            field_id: existingField.id,
            type: existingField.type,
            options: existingField.options
          });
          onClose();
          return;
        }

        // Criar nova definição de campo
        const newFieldDef = await createCustomFieldDefinition({
          name: formData.field_name.trim(),
          organization_id: organizationId,
          type: formData.type as 'text' | 'number' | 'date' | 'datetime' | 'select',
          options: formData.options,
          mask_type: formData.mask_type,
          custom_mask: formData.custom_mask,
          description: formData.description
        });
        
        if (newFieldDef) {
          // Salvar com a nova definição
          onSave({
            ...formData,
            field_id: newFieldDef.id
          });
          onClose();
        }
      } else {
        // Apenas salvar a definição do campo
        onSave(formData);
        onClose();
      }
    } catch (error) {
      console.error('Erro ao salvar campo:', error);
    }
  };

  const handleDelete = () => {
    setShowConfirmation(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete && field) {
      onDelete(field);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isCreating ? t('customFields.addField') : t('customFields.edit')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Nome do Campo */}
            <div>
              <label htmlFor="field_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('customFields.fieldName')}
              </label>
              <input
                type="text"
                id="field_name"
                value={formData.field_name}
                onChange={(e) => setFormData(prev => ({ ...prev, field_name: e.target.value }))}
                className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                required
              />
            </div>

            {/* Descrição do Campo */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('customFields.description')}
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full h-20 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                placeholder={t('customFields.descriptionPlaceholder')}
              />
            </div>

            {/* Tipo do Campo */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('customFields.fieldType')}
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => {
                  console.log('Tipo selecionado:', e.target.value);
                  setFormData(prev => {
                    const newData = { ...prev, type: e.target.value as 'text' | 'number' | 'date' | 'datetime' | 'select' };
                    console.log('Novo estado:', newData);
                    return newData;
                  });
                }}
                className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                required
              >
                <option value="text">{t('customFields.fieldTypes.text')}</option>
                <option value="number">{t('customFields.fieldTypes.number')}</option>
                <option value="date">{t('customFields.fieldTypes.date')}</option>
                <option value="datetime">{t('customFields.fieldTypes.datetime')}</option>
                <option value="select">{t('customFields.fieldTypes.select')}</option>
              </select>
            </div>

            {/* Opções do Campo (apenas para tipo select) */}
            {formData.type === 'select' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('customFields.fieldTypes.select')}
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newOption.trim()) {
                        e.preventDefault();
                        setFormData(prev => ({
                          ...prev,
                          options: [...(prev.options || []), newOption.trim()]
                        }));
                        setNewOption('');
                      }
                    }}
                    placeholder={t('customFields.selectOption')}
                    className="flex-1 h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newOption.trim()) {
                        setFormData(prev => ({
                          ...prev,
                          options: [...(prev.options || []), newOption.trim()]
                        }));
                        setNewOption('');
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Lista de opções */}
                <div className="mt-2 space-y-2">
                  {formData.options?.map((option, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md"
                    >
                      <span className="text-gray-900 dark:text-white">{option}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            options: prev.options?.filter((_, i) => i !== index) || []
                          }));
                        }}
                        className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                {(!formData.options || formData.options.length === 0) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {t('customFields.noOptions')}
                  </p>
                )}
              </div>
            )}

            {/* Máscara do Campo */}
            {formData.type === 'text' && (
              <div>
                <label htmlFor="mask_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('customFields.masks.title')}
                </label>
                <select
                  id="mask_type"
                  value={formData.mask_type || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, mask_type: e.target.value as 'cpf' | 'cnpj' | 'phone' | 'cep' | 'rg' | 'custom' | undefined }))}
                  className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                >
                  <option value="">{t('customFields.masks.none')}</option>
                  <option value="cpf">{t('customFields.masks.cpf')}</option>
                  <option value="cnpj">{t('customFields.masks.cnpj')}</option>
                  <option value="phone">{t('customFields.masks.phone')}</option>
                  <option value="cep">{t('customFields.masks.cep')}</option>
                  <option value="rg">{t('customFields.masks.rg')}</option>
                  <option value="custom">{t('customFields.masks.custom')}</option>
                </select>
              </div>
            )}

            {/* Máscara Customizada */}
            {formData.type === 'text' && formData.mask_type === 'custom' && (
              <div>
                <label htmlFor="custom_mask" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('customFields.masks.custom')}
                </label>
                <input
                  type="text"
                  id="custom_mask"
                  value={formData.custom_mask || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_mask: e.target.value }))}
                  className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                  placeholder="(\\d{3})\\.(\\d{3})\\.(\\d{3})-(\\d{2})"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('customFields.customMaskHint')}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center mt-6">
              {!isCreating && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t('common:delete')}
                </button>
              )}
              <div className="flex justify-end space-x-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isCreating ? t('common:add') : t('common:save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfirmation && (
        <ConfirmationModal
          title={t('customFields.deleteTitle')}
          message={t('customFields.deleteMessage', { fieldName: field?.field_name })}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowConfirmation(false)}
        />
      )}
    </>
  );
} 