import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmrDocumentTemplate } from '../../types/medicalRecord';
import { useCreateDocumentTemplate, useUpdateDocumentTemplate, useDocumentTypes } from '../../hooks/useMedicalHooks';
import { X } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';

interface DocumentTemplateFormProps {
  template: EmrDocumentTemplate | null;
  onClose: () => void;
}

const DocumentTemplateForm: React.FC<DocumentTemplateFormProps> = ({ template, onClose }) => {
  const { t } = useTranslation(['common', 'medical']);
  const { data: documentTypes } = useDocumentTypes();
  const createTemplate = useCreateDocumentTemplate();
  const updateTemplate = useUpdateDocumentTemplate();
  
  const isEditing = !!template;
  
  // Estado do formulário
  const [formData, setFormData] = useState<Partial<EmrDocumentTemplate>>({
    name: template?.name || '',
    description: template?.description || '',
    document_type: template?.document_type || '',
    content: template?.content || '',
    format: template?.format || 'html',
    is_default: template?.is_default || false,
    is_active: template?.is_active !== undefined ? template.is_active : true,
    variables_schema: template?.variables_schema || {
      properties: {}
    },
  });
  
  // Para mensagens de erro e status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Manipuladores de eventos
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (isEditing && template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          ...formData
        });
      } else {
        await createTemplate.mutateAsync(formData as Omit<EmrDocumentTemplate, 'id' | 'created_at' | 'updated_at' | 'organization_id'>);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar template');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-4xl bg-white rounded-lg shadow-xl dark:bg-gray-800 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEditing ? t('medical:editTemplate') : t('medical:newTemplate')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Nome do Template */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('common:name')}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 mt-1 text-sm border rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          {/* Descrição */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('common:description')}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 mt-1 text-sm border rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          {/* Tipo de Documento */}
          <div>
            <label htmlFor="document_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:documentType.label')}
            </label>
            <select
              id="document_type"
              name="document_type"
              value={formData.document_type || ''}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 mt-1 text-sm border rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">{t('common:select')}</option>
              {documentTypes?.map(type => (
                <option key={type} value={type}>
                  {t(`medical:documentType.${type}`, { defaultValue: type })}
                </option>
              ))}
            </select>
          </div>
          
          {/* Formato */}
          <div>
            <label htmlFor="format" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:format')}
            </label>
            <select
              id="format"
              name="format"
              value={formData.format || 'html'}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 mt-1 text-sm border rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="html">HTML</option>
              <option value="docx">DOCX</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          
          {/* Conteúdo do Template */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:templateContent')}
            </label>
            <div className="mt-1 border rounded-md shadow-sm dark:border-gray-600 h-[400px]">
              <Editor
                id="content"
                apiKey="61wso3zke8lwmr3o2jkacwf8ww8bb6msecy33jcvgk8mqmhj"
                value={formData.content || ''}
                onEditorChange={(content: string) => setFormData(prev => ({ ...prev, content }))}
                init={{
                  height: '100%',
                  menubar: true,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                    'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'help', 'wordcount', 'codesample'
                  ],
                  toolbar: 'undo redo | blocks | ' +
                    'bold italic forecolor | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'removeformat | code codesample | help',
                  content_style: `
                    body { 
                      font-size: 14px;
                    }
                    p {
                      margin: 0;
                      padding: 0;
                    }
                    p + p {
                      margin-top: 0;
                    }
                  `,
                  skin: document.documentElement.classList.contains('dark') ? 'oxide-dark' : 'oxide',
                  content_css: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
                  promotion: false,
                  codesample_languages: [
                    { text: 'HTML/XML', value: 'markup' },
                    { text: 'JavaScript', value: 'javascript' },
                    { text: 'CSS', value: 'css' },
                    { text: 'PHP', value: 'php' },
                    { text: 'Ruby', value: 'ruby' },
                    { text: 'Python', value: 'python' },
                    { text: 'Java', value: 'java' },
                    { text: 'C', value: 'c' },
                    { text: 'C#', value: 'csharp' },
                    { text: 'C++', value: 'cpp' }
                  ],
                  codesample_global_prismjs: true,
                  verify_html: false,
                  cleanup: false,
                  valid_elements: '*[*]',
                  extended_valid_elements: '*[*]',
                  formats: {
                    p: { block: 'p', margins: false }
                  },
                  forced_root_block: 'p',
                  forced_root_block_attrs: {
                    'style': 'margin: 0; padding: 0;'
                  }
                }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('medical:templateContentHelp')}
            </p>
          </div>
          
          {/* Opções */}
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_default"
                checked={formData.is_default || false}
                onChange={handleInputChange}
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {t('medical:isDefault')}
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active || false}
                onChange={handleInputChange}
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {t('medical:isActive')}
              </span>
            </label>
          </div>
          
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md dark:bg-red-900 dark:text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="border-t dark:border-gray-700 p-6">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              {t('common:cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:bg-amber-700 dark:hover:bg-amber-600 disabled:opacity-50"
            >
              {isSubmitting ? t('common:saving') : t('common:save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default DocumentTemplateForm; 