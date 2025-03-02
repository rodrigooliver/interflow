import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertCircle } from 'lucide-react';
import { CustomFieldFormData, CustomFieldDefinition } from '../../types/database';
import { createCustomFieldDefinition } from '../../services/customFieldsService';

interface CustomFieldModalProps {
  field: CustomFieldFormData | null;
  isCreating: boolean;
  organizationFields: CustomFieldDefinition[];
  organizationId: string;
  onSave: (field: CustomFieldFormData, index?: number) => void;
  onRemove?: () => void;
  onClose: () => void;
}

export function CustomFieldModal({
  field,
  isCreating,
  organizationFields,
  organizationId,
  onSave,
  onRemove,
  onClose
}: CustomFieldModalProps) {
  const [formData, setFormData] = useState<CustomFieldFormData>({
    field_name: '',
    value: '',
    type: 'text',
    options: []
  });
  const [newOption, setNewOption] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (field) {
      setFormData({
        id: field.id,
        field_id: field.field_id,
        field_name: field.field_name,
        value: field.value,
        type: field.type || 'text',
        options: field.options || []
      });
    }
  }, [field]);

  const handleSubmit = async () => {
    console.log('CustomFieldModal - handleSubmit chamado');
    
    // Validação básica
    if (!formData.field_name.trim()) {
      setError('O nome do campo é obrigatório');
      return;
    }
    
    // Validação para campos do tipo select
    if (formData.type === 'select' && (!formData.options || formData.options.length === 0)) {
      setError('Campos do tipo lista precisam ter pelo menos uma opção');
      return;
    }

    // Validar se temos o organization_id
    if (!organizationId) {
      setError('ID da organização não encontrado. Não é possível criar o campo.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Verificar se já existe um campo com este nome (apenas para novos campos)
      if (isCreating) {
        const existingField = organizationFields.find(
          f => f.name.toLowerCase() === formData.field_name.toLowerCase() && f.id !== formData.field_id
        );
        
        if (existingField) {
          // Se o campo já existe, usar a definição existente
          setFormData(prev => ({
            ...prev,
            field_id: existingField.id,
            type: existingField.type,
            options: existingField.options
          }));
          
          // Salvar com a definição existente
          onSave({
            ...formData,
            field_id: existingField.id,
            type: existingField.type,
            options: existingField.options
          });
        } else {
          // Criar nova definição de campo
          console.log('Criando nova definição de campo com organization_id:', organizationId);
          const newFieldDef = await createCustomFieldDefinition({
            name: formData.field_name.trim(),
            organization_id: organizationId,
            type: formData.type || 'text',
            options: formData.options
          });
          
          if (newFieldDef) {
            // Salvar com a nova definição
            onSave({
              ...formData,
              field_id: newFieldDef.id
            });
          } else {
            setError('Erro ao criar definição de campo');
          }
        }
      } else {
        // Apenas salvar o valor para um campo existente
        onSave(formData);
      }
    } catch (error) {
      console.error('Erro ao salvar campo:', error);
      setError('Ocorreu um erro ao salvar o campo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    
    // Verificar se a opção já existe
    if (formData.options?.includes(newOption.trim())) {
      setError('Esta opção já existe');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), newOption.trim()]
    }));
    setNewOption('');
    setError('');
  };

  const handleRemoveOption = (option: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter(o => o !== option)
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const updatedOptions = [...(formData.options || [])];
    updatedOptions[index] = value;
    setFormData(prev => ({
      ...prev,
      options: updatedOptions
    }));
  };

  // Função para renderizar as opções do campo
  const renderOptions = () => {
    if (formData.type !== 'select' && formData.type !== 'multi_select') {
      return null;
    }

    return (
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Opções
        </label>
        
        <div className="space-y-2 mb-3">
          {(formData.options || []).map((option, index) => (
            <div key={index} className="flex items-center">
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                onBlur={() => console.log('Opção atualizada:', option)}
                className="flex-1 h-9 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 text-sm"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Botão remover opção clicado:', option);
                  handleRemoveOption(option);
                }}
                className="ml-2 text-red-500 hover:text-red-700 dark:hover:text-red-300 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        
        <div className="flex items-center mt-2">
          <input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="Nova opção"
            className="flex-1 h-9 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 text-sm"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Botão adicionar opção clicado');
              handleAddOption();
            }}
            disabled={!newOption.trim()}
            className="ml-2 px-3 py-1.5 text-xs border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Adicionar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {isCreating ? 'Criar Novo Campo' : 'Editar Campo'}
          </h3>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Botão Fechar modal clicado');
              onClose();
            }}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-md flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome do Campo *
              </label>
              <input
                type="text"
                value={formData.field_name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, field_name: e.target.value }));
                  setError('');
                }}
                disabled={!isCreating && !!formData.field_id}
                className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 disabled:opacity-70 disabled:cursor-not-allowed"
                placeholder="Ex: Aniversário, Empresa, etc."
                list={isCreating ? "organization-fields" : undefined}
              />
              {isCreating && (
                <datalist id="organization-fields">
                  {organizationFields.map(field => (
                    <option key={field.id} value={field.name} />
                  ))}
                </datalist>
              )}
              {!isCreating && !!formData.field_id && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  O nome do campo não pode ser alterado pois ele já está definido na organização.
                </p>
              )}
            </div>

            {isCreating && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Campo *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="date">Data</option>
                  <option value="select">Lista de Opções</option>
                </select>
              </div>
            )}

            {renderOptions()}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valor
              </label>
              {formData.type === 'select' && formData.options && formData.options.length > 0 ? (
                <select
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                >
                  <option value="">Selecione uma opção</option>
                  {formData.options.map((option, index) => (
                    <option key={index} value={option}>{option}</option>
                  ))}
                </select>
              ) : formData.type === 'date' ? (
                <input
                  type="date"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                />
              ) : formData.type === 'number' ? (
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                  placeholder="Digite um número"
                />
              ) : (
                <input
                  type="text"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                  placeholder={`Valor para ${formData.field_name}`}
                />
              )}
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <div>
              {!isCreating && onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Botão Excluir clicado');
                    onRemove();
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Botão Cancelar clicado');
                  onClose();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmit();
                }}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Salvando...' : isCreating ? 'Criar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 