import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { CustomFieldDefinition, CustomFieldFormData } from '../../types/database';
import { 
  createCustomFieldDefinition,
  updateCustomFieldDefinition
} from '../../services/customFieldsService';
import { useCustomFieldDefinitions } from '../../hooks/useQueryes';
import { supabase } from '../../lib/supabase';
import { CustomFieldModal } from './CustomFieldModal';
import { useQueryClient } from '@tanstack/react-query';

interface CustomFieldsManagerProps {
  organizationId: string;
}

export function CustomFieldsManager({ organizationId }: CustomFieldsManagerProps) {
  const { data: fields = [], isLoading, error: queryError } = useCustomFieldDefinitions(organizationId);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomFieldDefinition | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  // Combine os erros
  useEffect(() => {
    if (queryError) {
      setError('Não foi possível carregar os campos personalizados');
      console.error('Erro ao carregar campos personalizados:', queryError);
    }
  }, [queryError]);

  const handleCreateField = () => {
    console.log('CustomFieldsManager - handleCreateField chamado');
    setSelectedField(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleEditField = (field: CustomFieldDefinition) => {
    console.log('CustomFieldsManager - handleEditField chamado', field);
    setSelectedField(field);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleSaveField = async (formData: CustomFieldFormData) => {
    console.log('CustomFieldsManager - handleSaveField chamado', formData);
    try {
      if (isCreating) {
        // Criar novo campo
        await createCustomFieldDefinition({
          name: formData.field_name,
          organization_id: organizationId,
          type: formData.type || 'text',
          options: formData.options,
          mask_type: formData.mask_type,
          custom_mask: formData.custom_mask
        });
      } else if (selectedField) {
        // Atualizar campo existente
        await updateCustomFieldDefinition(selectedField.id, {
          name: formData.field_name,
          type: formData.type || 'text',
          options: formData.options,
          mask_type: formData.mask_type,
          custom_mask: formData.custom_mask
        });
      }
      
      // Recarregar a lista de campos via React Query
      await queryClient.invalidateQueries({
        queryKey: ['custom_field_definitions', organizationId]
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar campo:', error);
      setError('Ocorreu um erro ao salvar o campo');
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    try {
      // Verificar se o campo está sendo usado por algum cliente
      const { count, error: countError } = await supabase
        .from('customer_field_values')
        .select('id', { count: 'exact', head: true })
        .eq('field_definition_id', fieldId);
        
      if (countError) throw countError;
      
      if (count && count > 0) {
        setError(`Este campo está sendo usado por ${count} cliente(s) e não pode ser excluído.`);
        return;
      }
      
      // Excluir o campo
      const { error } = await supabase
        .from('custom_fields_definition')
        .delete()
        .eq('id', fieldId);
        
      if (error) throw error;
      
      // Atualizar a lista de campos via React Query
      await queryClient.invalidateQueries({
        queryKey: ['custom_field_definitions', organizationId]
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao excluir campo:', error);
      setError('Ocorreu um erro ao excluir o campo');
    }
  };

  const getFieldTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return 'Texto';
      case 'number': return 'Número';
      case 'date': return 'Data';
      case 'select': return 'Lista de Opções';
      default: return type;
    }
  };

  // Renderizar cada definição de campo
  const renderFieldDefinition = (field: CustomFieldDefinition) => {
    return (
      <div 
        key={field.id} 
        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-2"
      >
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {field.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {getFieldTypeLabel(field.type)}
            {(field.type === 'select' || field.type === 'multi_select') && field.options && (
              <span className="ml-1">
                ({field.options.length} opções)
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Botão editar campo clicado:', field.name);
              handleEditField(field);
            }}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Botão excluir campo clicado:', field.name);
              handleDeleteField(field.id);
            }}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300 p-1 ml-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Campos Personalizados
        </h2>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault(); // Garantir que não cause atualização da página
            e.stopPropagation(); // Impedir propagação do evento
            console.log('Botão Novo Campo clicado');
            handleCreateField();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          Novo Campo
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-md flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : fields.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Nenhum campo personalizado definido
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault(); // Garantir que não cause atualização da página
              e.stopPropagation(); // Impedir propagação do evento
              console.log('Botão Criar Primeiro Campo clicado');
              handleCreateField();
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Criar Primeiro Campo
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nome
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tipo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Opções
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {fields.map((field) => renderFieldDefinition(field))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <CustomFieldModal
          field={selectedField ? {
            field_id: selectedField.id,
            field_name: selectedField.name,
            value: '',
            type: selectedField.type,
            options: selectedField.options
          } : null}
          isCreating={isCreating}
          organizationFields={fields}
          organizationId={organizationId}
          onSave={handleSaveField}
          onRemove={selectedField ? () => handleDeleteField(selectedField.id) : undefined}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
} 