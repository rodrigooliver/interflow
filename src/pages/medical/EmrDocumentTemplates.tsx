import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Files, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { useDocumentTemplates, useDeleteDocumentTemplate } from '../../hooks/useMedicalHooks';
import DocumentTemplateForm from '../../components/medical/DocumentTemplateForm';
import { EmrDocumentTemplate } from '../../types/medicalRecord';

const EmrDocumentTemplates = () => {
  const { t } = useTranslation(['common', 'medical']);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmrDocumentTemplate | null>(null);
  
  // Buscar templates com filtros
  const { data: templatesData, isLoading } = useDocumentTemplates({
    search_term: searchTerm || undefined,
    is_active: true
  });
  
  const deleteTemplate = useDeleteDocumentTemplate();
  
  // Manipuladores de eventos
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setIsFormOpen(true);
  };
  
  const handleEditTemplate = (template: EmrDocumentTemplate) => {
    setSelectedTemplate(template);
    setIsFormOpen(true);
  };
  
  const handleDeleteTemplate = async (template: EmrDocumentTemplate) => {
    if (window.confirm(t('common:confirmDelete'))) {
      try {
        await deleteTemplate.mutateAsync(template.id);
      } catch (error) {
        console.error('Erro ao excluir template:', error);
      }
    }
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <div className="container px-4 py-6 mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg dark:bg-amber-900">
              <Files className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('medical:templates')}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleNewTemplate}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:bg-amber-700 dark:hover:bg-amber-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('medical:newTemplate')}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {t('medical:templatesDescription')}
        </p>
      </div>

      {/* Barra de Pesquisa */}
      <div className="flex mb-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={t('common:search')}
            className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Lista de Templates */}
      <div className="overflow-hidden bg-white rounded-lg shadow dark:bg-gray-800">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-amber-600 rounded-full animate-spin border-t-transparent"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-300">{t('common:loading')}</span>
          </div>
        ) : templatesData?.data.length === 0 ? (
          <div className="p-6">
            <div className="p-8 text-center">
              <Files className="w-16 h-16 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                {t('medical:noTemplatesYet')}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('medical:startByCreatingTemplate')}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleNewTemplate}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:bg-amber-700 dark:hover:bg-amber-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('medical:createFirstTemplate')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    {t('common:name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    {t('medical:documentType.label')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    {t('medical:format')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    {t('common:status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    {t('common:actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {templatesData?.data.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {template.name}
                      </div>
                      {template.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {template.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {t(`medical:documentType.${template.document_type}`, { defaultValue: template.document_type })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white uppercase">
                        {template.format}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        template.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {template.is_active ? t('medical:active') : t('medical:inactive')}
                      </span>
                      {template.is_default && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {t('medical:isDefault')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 mr-3"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Formulário */}
      {isFormOpen && (
        <DocumentTemplateForm
          template={selectedTemplate}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
};

export default EmrDocumentTemplates; 