import React, { useState, useEffect } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CustomFieldFormData, CustomFieldDefinition } from '../../types/database';
import { CustomFieldModal } from './CustomFieldModal';
import { useCustomFieldDefinitions } from '../../hooks/useQueryes';
import { useTranslation } from 'react-i18next';
import { createCustomFieldDefinition } from '../../services/customFieldsService';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

interface CustomFieldsSectionProps {
  customerId: string;
  organizationId?: string;
  onFieldsChange?: (fields: CustomFieldFormData[]) => void;
  readOnly?: boolean;
  preloadedFieldValues?: {
    id: string;
    field_definition_id: string;
    value: string;
    updated_at: string;
    field_definition: CustomFieldDefinition;
  }[];
}

export function CustomFieldsSection({ 
  customerId, 
  organizationId, 
  onFieldsChange,
  readOnly = false,
  preloadedFieldValues
}: CustomFieldsSectionProps) {
  const { t } = useTranslation(['customers']);
  const queryClient = useQueryClient();
  const [customFields, setCustomFields] = useState<CustomFieldFormData[]>([]);
  const [organizationFields, setOrganizationFields] = useState<CustomFieldDefinition[]>([]);
  const [loadingCustomFields, setLoadingCustomFields] = useState(true);
  const [selectedField, setSelectedField] = useState<CustomFieldFormData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});

  const { data: fieldDefinitions, isLoading: loadingDefinitions } = useCustomFieldDefinitions(organizationId);

  // Efeito para processar os dados quando as definições de campos ou valores pré-carregados estiverem disponíveis
  useEffect(() => {
    if (organizationId && fieldDefinitions) {
      setLoadingCustomFields(true);
      
      if (preloadedFieldValues) {
        // Se temos valores pré-carregados, usá-los diretamente
        processPreloadedFieldValues();
      } else {
        // Se não há valores pré-carregados, criar campos vazios para todas as definições
        createEmptyFields();
      }
    }
  }, [customerId, organizationId, preloadedFieldValues, fieldDefinitions]);

  useEffect(() => {
    if (fieldDefinitions) {
      setOrganizationFields(fieldDefinitions);
    }
  }, [fieldDefinitions]);

  // Função para criar campos vazios para todas as definições
  const createEmptyFields = () => {
    if (!fieldDefinitions) return;
    
    try {
      // Criar um campo vazio para cada definição
      const emptyFields = fieldDefinitions.map(definition => {
        return {
          id: '', // Campo novo, sem ID
          field_id: definition.id,
          field_name: definition.name,
          value: '', // Valor vazio
          type: definition.type || 'text',
          options: definition.options || [],
          mask_type: definition.mask_type,
          custom_mask: definition.custom_mask,
          isNew: true
        } as CustomFieldFormData;
      });
      
      setCustomFields(emptyFields);
      
      // Inicializar valores originais (todos vazios)
      const origValues: Record<string, string> = {};
      emptyFields.forEach(field => {
        if (field.field_id) {
          origValues[field.field_id as string] = '';
        }
      });
      setOriginalValues(origValues);
      
      // Notificar o componente pai
      if (onFieldsChange) {
        onFieldsChange(emptyFields);
      }
    } catch (error) {
      console.error('Erro ao criar campos vazios:', error);
    } finally {
      setLoadingCustomFields(false);
    }
  };

  // Função para processar valores de campos pré-carregados
  const processPreloadedFieldValues = () => {
    if (!fieldDefinitions || !preloadedFieldValues) return;
    
    try {
      // Mapear valores pré-carregados por ID de definição para acesso rápido
      type FieldValueType = {
        id: string;
        field_definition_id: string;
        value: string;
        updated_at: string;
        field_definition: CustomFieldDefinition;
      };
      
      const valuesByDefinitionId: Record<string, FieldValueType> = {};
      preloadedFieldValues.forEach(value => {
        valuesByDefinitionId[value.field_definition_id] = value;
      });
      
      // Criar campos para todas as definições, preenchendo valores onde existirem
      const formattedFields = fieldDefinitions.map(definition => {
        const existingValue = valuesByDefinitionId[definition.id];
        
        if (existingValue) {
          return {
            id: existingValue.id,
            field_id: definition.id,
            field_name: definition.name,
            value: existingValue.value || '',
            type: definition.type || 'text',
            options: definition.options || [],
            mask_type: definition.mask_type,
            custom_mask: definition.custom_mask,
            isNew: false
          } as CustomFieldFormData;
        } else {
          // Campo definido mas sem valor para este cliente
          return {
            id: '',
            field_id: definition.id,
            field_name: definition.name,
            value: '',
            type: definition.type || 'text',
            options: definition.options || [],
            mask_type: definition.mask_type,
            custom_mask: definition.custom_mask,
            isNew: true
          } as CustomFieldFormData;
        }
      });
      
      setCustomFields(formattedFields);
      
      // Armazenar valores originais para comparação
      const origValues: Record<string, string> = {};
      formattedFields.forEach(field => {
        if (field.field_id) {
          origValues[field.field_id as string] = field.value || '';
        }
      });
      setOriginalValues(origValues);
      
      // Notificar o componente pai sobre a mudança nos campos
      if (onFieldsChange) {
        onFieldsChange(formattedFields);
      }
    } catch (error) {
      console.error('Erro ao processar campos personalizados:', error);
    } finally {
      setLoadingCustomFields(false);
    }
  };

  // Função para invalidar os caches
  const invalidateCaches = async () => {
    if (!organizationId) return;
    
    // Invalidar cache das definições de campos
    await queryClient.invalidateQueries({
      queryKey: ['custom_field_definitions', organizationId]
    });
  };

  // Função para salvar um campo personalizado
  const handleSaveField = async (field: CustomFieldFormData) => {
    // Se não temos customerId, significa que estamos criando um novo cliente
    // Neste caso, apenas atualizamos o estado local
    if (!customerId || !organizationId || !field.field_id) {
      const updatedFields = [...customFields];
      const fieldIndex = updatedFields.findIndex(f => f.field_id === field.field_id);
      
      if (fieldIndex !== -1) {
        updatedFields[fieldIndex] = {
          ...updatedFields[fieldIndex],
          value: field.value || ''
        };
        setCustomFields(updatedFields);
        
        // Notificar o componente pai
        if (onFieldsChange) {
          onFieldsChange(updatedFields);
        }
      }
      return;
    }
    
    try {
      // Verificar se houve alteração no nome do campo
      const originalField = fieldDefinitions?.find(d => d.id === field.field_id);
      if (originalField && originalField.name !== field.field_name) {
        // Atualizar o nome do campo na definição
        const { error: defError } = await supabase
          .from('custom_fields_definition')
          .update({
            name: field.field_name,
            type: field.type,
            options: field.options,
            mask_type: field.mask_type,
            custom_mask: field.custom_mask,
            description: field.description
          })
          .eq('id', field.field_id);

        if (defError) throw defError;
      }
      
      // Verificar se o valor foi alterado
      const originalValue = originalValues[field.field_id as string] || '';
      const currentValue = field.value || '';
      
      if (originalValue === currentValue) {
        return;
      }
      
      // Atualizar ou inserir o valor do campo na tabela customer_field_values
      const { data, error } = await supabase
        .from('customer_field_values')
        .upsert({
          customer_id: customerId,
          field_definition_id: field.field_id,
          value: currentValue,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'customer_id,field_definition_id'
        })
        .select();
      
      if (error) throw error;
      
      // Atualizar o ID do campo se for um campo novo
      if (data && data[0] && !field.id) {
        const updatedFields = [...customFields];
        const fieldIndex = updatedFields.findIndex(f => f.field_id === field.field_id);
        
        if (fieldIndex !== -1) {
          updatedFields[fieldIndex] = {
            ...updatedFields[fieldIndex],
            id: data[0].id,
            isNew: false
          };
          setCustomFields(updatedFields);
          
          // Notificar o componente pai
          if (onFieldsChange) {
            onFieldsChange(updatedFields);
          }
        }
      }
      
      // Atualizar o valor original após salvar
      setOriginalValues(prev => ({
        ...prev,
        [field.field_id as string]: currentValue
      }));

      
      // Mostrar feedback visual temporário
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = t('customFields.fieldSaved', { fieldName: field.field_name });
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao salvar campo personalizado:', error);
      
      // Mostrar mensagem de erro
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = t('customFields.errorSaving', { fieldName: field.field_name });
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 3000);
    }
  };

  // Função para aplicar máscara ao valor
  const applyMask = (value: string, maskType: string, customMask?: string): string => {
    // Remover todos os caracteres não numéricos
    const digits = value.replace(/\D/g, '');
    
    switch (maskType) {
      case 'cpf':
        return digits
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      
      case 'cnpj':
        return digits
          .replace(/^(\d{2})(\d)/, '$1.$2')
          .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
          .replace(/\.(\d{3})(\d)/, '.$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2');
      
      case 'phone':
        return digits
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
      
      case 'cep':
        return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
      
      case 'rg':
        return digits
          .replace(/(\d{2})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      
      case 'custom':
        if (!customMask) return value;
        try {
          // Extrair os grupos da máscara regex
          const groups = customMask.match(/\([^)]+\)/g) || [];
          let result = '';
          let digitIndex = 0;
          
          // Substituir cada grupo por dígitos
          let maskIndex = 0;
          for (let i = 0; i < customMask.length; i++) {
            if (customMask[i] === '(') {
              const group = groups[maskIndex];
              const groupLength = group.length - 2; // Remover parênteses
              const groupDigits = digits.slice(digitIndex, digitIndex + groupLength);
              result += groupDigits;
              digitIndex += groupLength;
              maskIndex++;
              i += group.length - 1; // Pular o grupo
            } else {
              result += customMask[i];
            }
          }
          
          return result;
        } catch (error) {
          console.error('Erro ao aplicar máscara customizada:', error);
          return value;
        }
      
      default:
        return value;
    }
  };

  // Função para atualizar o valor de um campo no estado local
  const handleFieldValueChange = (index: number, value: string) => {
    const field = customFields[index];
    let newValue = value;

    // Aplicar máscara se o campo tiver uma definida
    if (field.mask_type) {
      newValue = applyMask(value, field.mask_type, field.custom_mask);
    }

    const updatedFields = [...customFields];
    updatedFields[index] = { ...updatedFields[index], value: newValue };
    setCustomFields(updatedFields);
    
    // Notificar o componente pai
    if (onFieldsChange) {
      onFieldsChange(updatedFields);
    }
  };

  // Função para renderizar cada campo personalizado
  const renderCustomField = (field: CustomFieldFormData, index: number) => {
    return (
      <div key={field.id || `new-${index}`} className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label htmlFor={`custom-field-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {field.field_name}
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={() => handleOpenEditModal(field)}
              className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            >
              {t('customFields.edit')}
            </button>
          )}
        </div>
        {field.type === 'select' && field.options && field.options.length > 0 ? (
          <select
            id={`custom-field-${index}`}
            value={field.value || ''}
            onChange={(e) => handleFieldValueChange(index, e.target.value)}
            onBlur={() => handleSaveField(field)}
            className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
          >
            <option value="">{field.description || t('customFields.selectOption')}</option>
            {field.options.map((option, optIndex) => (
              <option key={optIndex} value={option}>{option}</option>
            ))}
          </select>
        ) : field.type === 'date' ? (
          <input
            id={`custom-field-${index}`}
            type="date"
            value={field.value || ''}
            onChange={(e) => handleFieldValueChange(index, e.target.value)}
            onBlur={() => handleSaveField(field)}
            className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
          />
        ) : field.type === 'datetime' ? (
          <input
            id={`custom-field-${index}`}
            type="datetime-local"
            value={field.value || ''}
            onChange={(e) => handleFieldValueChange(index, e.target.value)}
            onBlur={() => handleSaveField(field)}
            className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
          />
        ) : field.type === 'number' ? (
          <input
            id={`custom-field-${index}`}
            type="number"
            value={field.value || ''}
            onChange={(e) => handleFieldValueChange(index, e.target.value)}
            onBlur={() => handleSaveField(field)}
            className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
            placeholder={field.description || t('customFields.enterValue', { fieldName: field.field_name })}
          />
        ) : (
          <input
            id={`custom-field-${index}`}
            type="text"
            value={field.value || ''}
            onChange={(e) => handleFieldValueChange(index, e.target.value)}
            onBlur={() => handleSaveField(field)}
            className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
            placeholder={field.description || t('customFields.enterValue', { fieldName: field.field_name })}
            maxLength={field.mask_type === 'cpf' ? 14 : 
                      field.mask_type === 'cnpj' ? 18 : 
                      field.mask_type === 'phone' ? 15 : 
                      field.mask_type === 'cep' ? 9 : 
                      field.mask_type === 'rg' ? 12 : undefined}
          />
        )}
      </div>
    );
  };

  // Função para adicionar um novo campo
  const handleAddField = async (field: CustomFieldFormData, index?: number) => {
    if (!customerId || !organizationId) {
      return;
    }

    try {
      // Verificar se é uma atualização de campo existente
      const existingField = customFields.find(f => f.field_id === field.field_id);
      
      if (existingField) {
        // Atualizar a definição do campo no banco de dados
        const { error: defError } = await supabase
          .from('custom_fields_definition')
          .update({
            name: field.field_name,
            type: field.type,
            options: field.options,
            mask_type: field.mask_type,
            custom_mask: field.custom_mask,
            description: field.description
          })
          .eq('id', field.field_id);

        if (defError) throw defError;

        // Atualizar o estado local
        const updatedFields = [...customFields];
        if (typeof index === 'number') {
          updatedFields[index] = field;
        } else {
          const fieldIndex = updatedFields.findIndex(f => f.field_id === field.field_id);
          if (fieldIndex !== -1) {
            updatedFields[fieldIndex] = field;
          }
        }
        setCustomFields(updatedFields);
        
        // Notificar o componente pai
        if (onFieldsChange) {
          onFieldsChange(updatedFields);
        }

        // Invalidar os caches após atualizar
        await invalidateCaches();
        return;
      }

      // Se for um novo campo e já tiver field_id, significa que a definição já foi criada
      if (field.field_id) {
        // Adicionar o campo à lista
        const updatedFields = [...customFields];
        if (typeof index === 'number') {
          updatedFields[index] = field;
        } else {
          updatedFields.push(field);
        }
        setCustomFields(updatedFields);
        
        // Notificar o componente pai
        if (onFieldsChange) {
          onFieldsChange(updatedFields);
        }

        // Invalidar os caches após adicionar
        await invalidateCaches();
        return;
      }

      // Se for um novo campo sem field_id, criar a definição
      const newFieldDef = await createCustomFieldDefinition({
        name: field.field_name,
        organization_id: organizationId,
        type: field.type,
        options: field.options,
        mask_type: field.mask_type,
        custom_mask: field.custom_mask,
        description: field.description
      });

      if (newFieldDef) {
        // Adicionar o campo à lista
        const updatedFields = [...customFields];
        if (typeof index === 'number') {
          updatedFields[index] = { ...field, field_id: newFieldDef.id };
        } else {
          updatedFields.push({ ...field, field_id: newFieldDef.id });
        }
        setCustomFields(updatedFields);
        
        // Notificar o componente pai
        if (onFieldsChange) {
          onFieldsChange(updatedFields);
        }

        // Invalidar os caches após criar
        await invalidateCaches();
      }
    } catch (error) {
      console.error('Erro ao adicionar campo:', error);
    }
  };

  // Função para editar um campo existente (usada nos botões de edição)
  const handleOpenEditModal = (field: CustomFieldFormData) => {
    setSelectedField(field);
    setIsCreatingField(false);
    setIsModalOpen(true);
  };

  // Função para abrir o modal de criação
  const handleOpenCreateModal = () => {
    setSelectedField(null);
    setIsCreatingField(true);
    setIsModalOpen(true);
  };

  const handleDeleteField = async (field: CustomFieldFormData) => {
    try {
      const { error } = await supabase
        .from('custom_fields_definition')
        .delete()
        .eq('id', field.field_id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['custom_field_definitions'] });
      toast.success(t('customFields.deleteSuccess'));
    } catch (error) {
      console.error('Erro ao excluir campo:', error);
      toast.error(t('customFields.deleteError'));
    }
  };

  return (
    <div className="border-t dark:border-gray-700 pt-4">
      {/* Lista de campos personalizados */}
      {loadingCustomFields || loadingDefinitions ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : customFields.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
          {t('customFields.noFields')}
        </p>
      ) : (
        <div className="space-y-2">
          {customFields.map((field, index) => renderCustomField(field, index))}
        </div>
      )}

      {/* Botão de adicionar campo */}
      <div className="flex items-center justify-end mt-4">
        {!readOnly && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('customFields.addField')}
          </button>
        )}
      </div>
      
      {/* Modal para criar/editar campo personalizado */}
      {isModalOpen && (
        <CustomFieldModal
          field={selectedField}
          isCreating={isCreatingField}
          organizationFields={organizationFields}
          organizationId={organizationId || ''}
          onSave={handleAddField}
          onDelete={handleDeleteField}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
} 