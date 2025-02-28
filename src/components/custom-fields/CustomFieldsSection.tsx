import React, { useState, useEffect } from 'react';
import { Settings, Edit, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CustomFieldFormData, CustomFieldDefinition } from '../../types/database';
import { CustomFieldModal } from './CustomFieldModal';
import { 
  loadCustomFieldDefinitions, 
  loadCustomFieldValues, 
  formatCustomFieldsData,
  upsertCustomFieldValue,
  removeCustomFieldValue
} from '../../services/customFieldsService';

interface CustomFieldsSectionProps {
  customerId: string;
  organizationId?: string;
  onFieldsChange?: (fields: CustomFieldFormData[]) => void;
  readOnly?: boolean;
}

export function CustomFieldsSection({ 
  customerId, 
  organizationId, 
  onFieldsChange,
  readOnly = false
}: CustomFieldsSectionProps) {
  const [customFields, setCustomFields] = useState<CustomFieldFormData[]>([]);
  const [organizationFields, setOrganizationFields] = useState<CustomFieldDefinition[]>([]);
  const [loadingCustomFields, setLoadingCustomFields] = useState(true);
  const [selectedField, setSelectedField] = useState<CustomFieldFormData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [showNewFieldForm, setShowNewFieldForm] = useState(false);
  const [newField, setNewField] = useState({
    field_name: '',
    field_id: '',
    value: ''
  });
  const [fieldSuggestions, setFieldSuggestions] = useState<CustomFieldDefinition[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customerId && organizationId) {
      loadCustomFields();
      loadFieldDefinitions();
    }
  }, [customerId, organizationId]);

  // Carregar campos personalizados da organização e do cliente
  const loadCustomFields = async () => {
    if (!organizationId || !customerId) return;
    
    try {
      setLoadingCustomFields(true);
      
      // 1. Carregar definições de campos da organização
      const fieldDefinitions = await loadCustomFieldDefinitions(organizationId);
      setOrganizationFields(fieldDefinitions);
      
      // 2. Carregar valores dos campos para este cliente
      const fieldValues = await loadCustomFieldValues(customerId);
      
      // 3. Formatar os dados para o formulário
      const formattedFields = formatCustomFieldsData(fieldDefinitions, fieldValues);
      setCustomFields(formattedFields);
      
      // 4. Armazenar valores originais para comparação
      const origValues: Record<string, string> = {};
      formattedFields.forEach(field => {
        if (field.field_id) {
          origValues[field.field_id] = field.value || '';
        }
      });
      setOriginalValues(origValues);
      
      // Notificar o componente pai sobre a mudança nos campos
      if (onFieldsChange) {
        onFieldsChange(formattedFields);
      }
      
    } catch (error) {
      console.error('Erro ao carregar campos personalizados:', error);
    } finally {
      setLoadingCustomFields(false);
    }
  };

  // Função para carregar as definições de campos
  const loadFieldDefinitions = async () => {
    if (!organizationId) return;
    
    try {
      const { data, error } = await supabase
        .from('custom_fields_definition')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
        
      if (error) throw error;
      
      setFieldSuggestions(data || []);
    } catch (error) {
      console.error('Erro ao carregar definições de campos:', error);
    }
  };

  // Função para editar um campo personalizado existente
  const handleEditField = (field: CustomFieldFormData) => {
    console.log('CustomFieldsSection - handleEditField chamado', field);
    setSelectedField(field);
    setIsCreatingField(false);
    setIsModalOpen(true);
  };

  // Função para criar um novo campo personalizado
  const handleCreateField = () => {
    console.log('CustomFieldsSection - handleCreateField chamado');
    setSelectedField(null);
    setIsCreatingField(true);
    setIsModalOpen(true);
  };

  // Função para salvar um campo personalizado
  const handleSaveField = async (field: CustomFieldFormData, index: number) => {
    console.log('Verificando se houve alteração no campo:', field.field_name);
    
    if (!customerId || !organizationId || !field.field_id) return;
    
    // Verificar se o valor foi alterado
    const originalValue = originalValues[field.field_id] || '';
    const currentValue = field.value || '';
    
    if (originalValue === currentValue) {
      console.log('Nenhuma alteração detectada para o campo:', field.field_name);
      return;
    }
    
    console.log('Alteração detectada, salvando campo:', field.field_name);
    
    try {
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
      
      console.log('Campo personalizado salvo com sucesso:', field.field_name);
      
      // Atualizar o valor original após salvar
      setOriginalValues(prev => ({
        ...prev,
        [field.field_id]: currentValue
      }));
      
      // Mostrar feedback visual temporário
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = `Campo "${field.field_name}" salvo`;
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao salvar campo personalizado:', error);
      
      // Mostrar mensagem de erro
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = `Erro ao salvar campo "${field.field_name}"`;
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 3000);
    }
  };

  // Função para remover um campo personalizado
  const handleRemoveField = async (index: number) => {
    const field = customFields[index];
    
    if (!customerId || !field || !field.field_id) return;
    
    try {
      setLoadingCustomFields(true);
      
      // Remover o valor do campo da tabela customer_field_values
      const { error } = await supabase
        .from('customer_field_values')
        .delete()
        .eq('customer_id', customerId)
        .eq('field_definition_id', field.field_id);
        
      if (error) throw error;
      
      // Remover o campo do estado local
      const updatedFields = customFields.filter((_, i) => i !== index);
      setCustomFields(updatedFields);
      
      // Atualizar valores originais
      setOriginalValues(prev => {
        const updated = { ...prev };
        delete updated[field.field_id];
        return updated;
      });
      
      // Notificar o componente pai sobre a mudança
      if (onFieldsChange) {
        onFieldsChange(updatedFields);
      }
      
      // Mostrar feedback visual temporário
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = `Campo "${field.field_name}" removido`;
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao remover campo personalizado:', error);
      
      // Mostrar mensagem de erro
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = `Erro ao remover campo "${field.field_name}"`;
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 3000);
    } finally {
      setLoadingCustomFields(false);
    }
  };

  // Função para atualizar o valor de um campo no estado local
  const handleFieldValueChange = (index: number, value: string) => {
    const updatedFields = [...customFields];
    updatedFields[index] = { ...updatedFields[index], value };
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
        <label htmlFor={`custom-field-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {field.field_name}
        </label>
        {field.type === 'select' && field.options && field.options.length > 0 ? (
          <select
            id={`custom-field-${index}`}
            value={field.value || ''}
            onChange={(e) => handleFieldValueChange(index, e.target.value)}
            onBlur={() => handleSaveField(field, index)}
            className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
          >
            <option value="">Selecione uma opção</option>
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
            onBlur={() => handleSaveField(field, index)}
            className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
          />
        ) : field.type === 'number' ? (
          <input
            id={`custom-field-${index}`}
            type="number"
            value={field.value || ''}
            onChange={(e) => handleFieldValueChange(index, e.target.value)}
            onBlur={() => handleSaveField(field, index)}
            className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
          />
        ) : (
          <input
            id={`custom-field-${index}`}
            type="text"
            value={field.value || ''}
            onChange={(e) => handleFieldValueChange(index, e.target.value)}
            onBlur={() => handleSaveField(field, index)}
            className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
            placeholder="Deixe em branco para remover"
          />
        )}
      </div>
    );
  };

  // Função para adicionar um novo campo
  const handleAddField = async () => {
    if (!newField.field_name.trim() || !organizationId || !customerId) return;
    
    try {
      // Verificar se o campo já existe na definição
      let fieldId = newField.field_id;
      const existingDefinition = organizationFields.find(
        def => def.name.toLowerCase() === newField.field_name.toLowerCase()
      );
      
      if (existingDefinition) {
        fieldId = existingDefinition.id;
      } else {
        // Criar nova definição de campo
        const { data: newDefinition, error: defError } = await supabase
          .from('custom_fields_definition')
          .insert({
            name: newField.field_name.trim(),
            organization_id: organizationId,
            type: 'text' // Tipo padrão
          })
          .select()
          .single();
          
        if (defError) throw defError;
        
        fieldId = newDefinition.id;
        
        // Adicionar à lista de definições
        setOrganizationFields(prev => [...prev, newDefinition]);
      }
      
      const valueToSave = newField.value.trim();
      
      // Criar o valor do campo na tabela customer_field_values
      const { data: newFieldValue, error: fieldError } = await supabase
        .from('customer_field_values')
        .upsert({
          customer_id: customerId,
          field_definition_id: fieldId,
          value: valueToSave,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'customer_id,field_definition_id'
        })
        .select();
        
      if (fieldError) throw fieldError;
      
      // Adicionar o campo ao estado local
      const newFieldData: CustomFieldFormData = {
        id: newFieldValue?.[0]?.id,
        field_id: fieldId,
        field_name: newField.field_name.trim(),
        value: valueToSave,
        type: 'text',
        isNew: false
      };
      
      // Atualizar valores originais
      setOriginalValues(prev => ({
        ...prev,
        [fieldId]: valueToSave
      }));
      
      setCustomFields(prev => [...prev, newFieldData]);
      
      // Notificar o componente pai
      if (onFieldsChange) {
        onFieldsChange([...customFields, newFieldData]);
      }
      
      // Limpar o formulário
      setNewField({
        field_name: '',
        field_id: '',
        value: ''
      });
      setShowNewFieldForm(false);
      
      // Mostrar feedback visual
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = `Campo "${newField.field_name}" adicionado`;
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao adicionar campo personalizado:', error);
      
      // Mostrar mensagem de erro
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = `Erro ao adicionar campo`;
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 3000);
    }
  };

  // Função para filtrar sugestões de campos
  const handleFieldNameChange = (value: string) => {
    setNewField(prev => ({ ...prev, field_name: value }));
    
    if (value.trim().length > 0) {
      // Filtrar definições de campos que correspondem à pesquisa
      const filtered = organizationFields.filter(
        def => def.name.toLowerCase().includes(value.toLowerCase())
      );
      setFieldSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFieldSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Função para selecionar uma sugestão de campo
  const handleSelectFieldSuggestion = (field: CustomFieldDefinition) => {
    setNewField(prev => ({
      ...prev,
      field_name: field.name,
      field_id: field.id
    }));
    setShowSuggestions(false);
  };

  return (
    <div className="border-t dark:border-gray-700 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
          <Settings className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
          Campos Personalizados
        </h4>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowNewFieldForm(!showNewFieldForm)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar campo
          </button>
        )}
      </div>
      
      {/* Formulário para adicionar novo campo */}
      {showNewFieldForm && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Novo campo personalizado
          </h5>
          <div className="space-y-3">
            <div className="relative">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Nome do campo
              </label>
              <input
                type="text"
                value={newField.field_name}
                onChange={(e) => handleFieldNameChange(e.target.value)}
                onFocus={() => {
                  if (newField.field_name.trim().length > 0 && fieldSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Pequeno atraso para permitir que o clique na sugestão seja processado
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="w-full h-9 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 text-sm"
                placeholder="Ex: Telefone, Endereço, etc."
              />
              
              {/* Sugestões de campos */}
              {showSuggestions && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 max-h-40 overflow-y-auto">
                  {fieldSuggestions.map(field => (
                    <div
                      key={field.id}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      onMouseDown={() => handleSelectFieldSuggestion(field)}
                    >
                      {field.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Valor
              </label>
              <input
                type="text"
                value={newField.value}
                onChange={(e) => setNewField(prev => ({ ...prev, value: e.target.value }))}
                className="w-full h-9 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 text-sm"
                placeholder="Valor do campo"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowNewFieldForm(false)}
                className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddField}
                disabled={!newField.field_name.trim() || !newField.value.trim() || loadingCustomFields}
                className="px-3 py-1.5 text-xs border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loadingCustomFields && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Lista de campos personalizados */}
      {loadingCustomFields ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : customFields.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
          Nenhum campo personalizado cadastrado
        </p>
      ) : (
        <div className="space-y-2">
          {customFields.map((field, index) => renderCustomField(field, index))}
        </div>
      )}

      {/* Modal para criar/editar campo personalizado */}
      {isModalOpen && (
        <CustomFieldModal
          field={selectedField}
          isCreating={isCreatingField}
          organizationFields={organizationFields}
          organizationId={organizationId || ''}
          onSave={handleSaveField}
          onRemove={selectedField?.id ? () => handleRemoveField(customFields.findIndex(f => f.id === selectedField.id)) : undefined}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
} 