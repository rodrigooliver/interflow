import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Loader2, Trash2, Paperclip, ExternalLink, FileText, Check } from 'lucide-react';
import { EmrAttachment } from '../../types/medicalRecord';
import { Customer } from '../../types/database';
import { useAuthContext } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { MEDICAL_CACHE_KEYS } from '../../hooks/useMedicalHooks';

interface AttachmentFormProps {
  attachment: EmrAttachment | null;
  onClose: () => void;
  customer: Customer | null;
  medical_record_id?: string;
  appointment_id?: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

const AttachmentForm = ({ attachment, onClose, customer, medical_record_id, appointment_id }: AttachmentFormProps) => {
  const { t } = useTranslation(['medical', 'common']);
  const [title, setTitle] = useState(attachment?.title || '');
  const [attachmentType, setAttachmentType] = useState(attachment?.attachment_type || 'lab_result');
  const [description, setDescription] = useState(attachment?.description || '');
  const [isHighlighted, setIsHighlighted] = useState(attachment?.is_highlighted || false);
  
  // Estado para o arquivo selecionado (mas ainda não enviado)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Estados para arquivo existente
  const [fileUrl, setFileUrl] = useState(attachment?.file_url || '');
  const [fileName, setFileName] = useState(attachment?.file_name || '');
  const [fileType, setFileType] = useState(attachment?.file_type || '');
  const [fileSize, setFileSize] = useState(attachment?.file_size || 0);
  const [fileId, setFileId] = useState(attachment?.file_id || '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;
  const queryClient = useQueryClient();
  
  // Resetar estados quando o modal for fechado
  useEffect(() => {
    if (attachment) {
      setTitle(attachment.title);
      setAttachmentType(attachment.attachment_type);
      setDescription(attachment.description || '');
      setIsHighlighted(attachment.is_highlighted);
      setFileUrl(attachment.file_url || '');
      setFileName(attachment.file_name || '');
      setFileType(attachment.file_type || '');
      setFileSize(attachment.file_size || 0);
      setFileId(attachment.file_id || '');
    }
  }, [attachment]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      setError(t('medical:attachments.errors.titleRequired'));
      return;
    }
    
    if (!fileUrl && !fileId && !selectedFile) {
      setError(t('medical:attachments.errors.fileRequired'));
      return;
    }
    
    if (!customer?.id) {
      setError(t('medical:attachments.errors.customerRequired'));
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // Preparar FormData para envio dos dados e arquivo
      const formData = new FormData();
      
      // Adicionar dados básicos do anexo
      formData.append('title', title);
      formData.append('attachment_type', attachmentType);
      formData.append('description', description || '');
      formData.append('is_highlighted', isHighlighted.toString());
      formData.append('customer_id', customer.id);
      
      if (medical_record_id) {
        formData.append('medical_record_id', medical_record_id);
      }
      
      if (appointment_id) {
        formData.append('appointment_id', appointment_id);
      }
      
      // Se estiver editando um anexo existente
      if (attachment?.id) {
        formData.append('attachment_id', attachment.id);
      }
      
      // Se há um arquivo existente, incluir suas informações
      if (fileId) {
        formData.append('file_id', fileId);
      }
      
      // Se selecionou um novo arquivo, adicioná-lo ao formData
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      
      // Determinar a URL de destino com base em criar ou atualizar
      const url = `/api/${organizationId}/medical/attachment`;
      
      // Fazer a requisição para o backend
      const response = await api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        setSuccess(true);
        // Invalidar as consultas para recarregar os dados
        queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.attachments] });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(response.data.error || 'Falha ao salvar anexo');
      }
    } catch (err) {
      console.error('Erro ao salvar anexo:', err);
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error || apiError.message || t('medical:attachments.errors.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validar tamanho do arquivo (máximo 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      setError(t('medical:attachments.errors.tooLarge'));
      return;
    }
    
    setSelectedFile(file);
    setFileName(file.name);
    setFileType(file.type);
    setFileSize(file.size);
    
    // Limpar arquivo existente se havia um
    if (fileId) {
      setFileId('');
      setFileUrl('');
    }
    
    setError('');
  };
  
  const handleClearFile = () => {
    // Se tinha um arquivo selecionado, limpar
    if (selectedFile) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    
    // Se era um arquivo existente, manter o ID para o backend saber que deve removê-lo
    // O backend vai identificar que deve excluir o arquivo atual
    
    setFileName('');
    setFileType('');
    setFileSize(0);
    setFileUrl('');
  };
  
  const getFileIcon = () => {
    const type = selectedFile ? selectedFile.type : fileType;
    
    if (type?.startsWith('image/')) {
      return 'image';
    } else if (type?.startsWith('application/pdf')) {
      return 'pdf';
    } else if (type?.startsWith('text/')) {
      return 'text';
    } else {
      return 'document';
    }
  };
  
  // Função para exibir a visualização de arquivo
  const renderFilePreview = () => {
    // Se tem um arquivo selecionado ou um arquivo existente
    if (selectedFile || fileUrl) {
      return (
        <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center">
            <div className="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full mr-3">
              {getFileIcon() === 'image' ? (
                selectedFile ? (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                    imagem
                  </div>
                ) : (
                  <img 
                    src={fileUrl} 
                    alt={fileName} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )
              ) : (
                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {fileName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {fileSize ? (fileSize / 1024 / 1024).toFixed(2) + ' MB' : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                title={t('common:view')}
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
            <button
              type="button"
              onClick={handleClearFile}
              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              title={t('common:delete')}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      );
    }
    
    // Se não tem arquivo, mostrar área para upload
    return (
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center cursor-pointer hover:border-green-500 dark:hover:border-green-400"
      >
        <Paperclip className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('medical:attachments.dragAndDrop')}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {t('medical:attachments.maxSize', { size: '20MB' })}
        </p>
      </div>
    );
  };
  
  return (
    <div className="w-full">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {attachment ? t('medical:attachments.edit') : t('medical:attachments.add')}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm flex items-center">
          <Check className="w-5 h-5 mr-2" />
          {t('medical:attachments.saveSuccess')}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('medical:attachments.title')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 text-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('medical:attachments.titlePlaceholder')}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('medical:attachments.type')}
            </label>
            <select
              value={attachmentType}
              onChange={(e) => setAttachmentType(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 text-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
            >
              {['lab_result', 'imaging', 'report', 'examination', 'prescription', 'certificate', 'other'].map((type) => (
                <option key={type} value={type}>
                  {t(`medical:attachmentTypes.${type}`, { defaultValue: type })}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('medical:attachments.description')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 text-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
            placeholder={t('medical:attachments.descriptionPlaceholder')}
          />
        </div>
        
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:attachments.file')} *
            </label>
            
            {!fileName && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ml-auto text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center"
              >
                <Upload className="w-4 h-4 mr-1" />
                {t('medical:attachments.upload')}
              </button>
            )}
          </div>
          
          {renderFilePreview()}
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        
        <div className="mb-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isHighlighted"
              checked={isHighlighted}
              onChange={(e) => setIsHighlighted(e.target.checked)}
              className="h-4 w-4 text-green-600 dark:text-green-500 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="isHighlighted" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('medical:attachments.highlight')}
            </label>
            <div className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              ({t('medical:attachments.highlightHelp')})
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            disabled={isSubmitting}
          >
            {t('common:cancel')}
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 dark:bg-green-700 rounded-md hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common:saving')}
              </div>
            ) : (
              t('common:save')
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AttachmentForm; 