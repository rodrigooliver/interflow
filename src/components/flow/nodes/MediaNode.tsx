import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { Music, Image, Video, FileText, Upload, X, Loader2, Trash2, Link, ExternalLink } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';
import api from '../../../lib/api';
import { useAuthContext } from '../../../contexts/AuthContext';

interface MediaNodeProps {
  id: string;
  type: 'audio' | 'image' | 'video' | 'document';
  data: {
    mediaUrl?: string;
    fileId?: string;  // ID do arquivo para exclusão direta
  };
  isConnectable: boolean;
}

const typeConfig = {
  audio: { 
    icon: Music, 
    label: 'nodes.sendAudio',
    accept: 'audio/*',
    maxSize: 10 * 1024 * 1024, // 10MB
    bucket: 'audio'
  },
  image: { 
    icon: Image, 
    label: 'nodes.sendImage',
    accept: 'image/*',
    maxSize: 5 * 1024 * 1024, // 5MB
    bucket: 'images'
  },
  video: { 
    icon: Video, 
    label: 'nodes.sendVideo',
    accept: 'video/*',
    maxSize: 50 * 1024 * 1024, // 50MB
    bucket: 'videos'
  },
  document: { 
    icon: FileText, 
    label: 'nodes.sendDocument',
    accept: '.pdf,.doc,.docx,.txt',
    maxSize: 10 * 1024 * 1024, // 10MB
    bucket: 'documents'
  }
};

// Definir interface para erros de API
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

export function MediaNode({ id, type, data, isConnectable }: MediaNodeProps) {
  const { t } = useTranslation('flows');
  const { updateNodeData, id: flowId } = useFlowEditor();
  const [url, setUrl] = useState(data.mediaUrl || '');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(!data.mediaUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Icon = typeConfig[type].icon;

  const { currentOrganizationMember }  = useAuthContext();
  // Extrair o nome do arquivo da URL
  const getFileNameFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1];
    } catch {
      return 'arquivo';
    }
  };

  useEffect(() => {
    // Atualizar o estado showUrlInput quando data.mediaUrl mudar
    setShowUrlInput(!data.mediaUrl);
  }, [data.mediaUrl]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleUrlBlur = () => {
    if (url) {
      updateNodeData(id, { ...data, mediaUrl: url, fileId: undefined });
      setShowUrlInput(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!data.fileId) return;
    
    setDeleting(true);
    setError('');
    
    try {
      // Chamar a API para excluir o arquivo usando o ID
      const response = await api.delete(`/api/${currentOrganizationMember?.organization.id}/flow/${flowId}/file`, {
        data: { fileId: data.fileId }
      });
      
      if (response.data.success) {
        // Limpar a URL e o ID do arquivo nos dados do nó
        setUrl('');
        updateNodeData(id, { ...data, mediaUrl: '', fileId: undefined });
        setShowUrlInput(true);
      } else {
        throw new Error(response.data.error || 'Falha ao excluir arquivo');
      }
    } catch (err: unknown) {
      console.error('Erro ao excluir arquivo:', err);
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error || apiError.message || t('chats:attachments.errors.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const handleShowUrlInput = () => {
    setShowUrlInput(true);
    setUrl('');
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > typeConfig[type].maxSize) {
      setError(t('chats:attachments.errors.tooLarge'));
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Preparar FormData para envio
      const formData = new FormData();
      
      // Adicionar o arquivo ao FormData
      formData.append('file', file, file.name);
      
      // Enviar o arquivo para o backend usando FormData
      const response = await api.post(`/api/${currentOrganizationMember?.organization.id}/flow/${flowId}/file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        const fileUrl = response.data.fileUrl;
        const fileId = response.data.fileId; // Obter o ID do arquivo retornado pelo backend
        setUrl(fileUrl);
        updateNodeData(id, { 
          ...data, 
          mediaUrl: fileUrl,
          fileId: fileId // Armazenar o ID do arquivo para exclusão direta
        });
        setShowUploadModal(false);
        setShowUrlInput(false);
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (err: unknown) {
      console.error('Upload error:', err);
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error || apiError.message || t('chats:attachments.errors.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800">
      <BaseNode 
        id={id} 
        data={data}
        icon={<Icon className="w-4 h-4 text-gray-500" />}
      />

      <div className="flex items-center space-x-2">
        {showUrlInput ? (
          <>
            <input
              type="text"
              value={url}
              onChange={handleUrlChange}
              onBlur={handleUrlBlur}
              placeholder={t('nodes.mediaUrlPlaceholder')}
              className="flex-1 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            />
            <button 
              onClick={() => setShowUploadModal(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              title={t('nodes.uploadFile')}
            >
              <Upload className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="flex items-center w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
            <div className="flex-1 flex items-center text-gray-900 dark:text-white overflow-hidden">
              <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate" title={data.mediaUrl}>
                {getFileNameFromUrl(data.mediaUrl || '')}
              </span>
            </div>
            <div className="flex space-x-1">
              <a 
                href={data.mediaUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                title={t('nodes.openFile')}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              {!data.fileId && (
                <button 
                  onClick={handleShowUrlInput}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  title={t('nodes.useExternalUrl')}
                >
                  <Link className="w-4 h-4" />
                </button>
              )}
              {data.fileId && (
                <button 
                  onClick={handleDeleteFile}
                  disabled={deleting}
                  className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                  title={t('nodes.deleteFile')}
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-2 rounded-md bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('chats:attachments.title')}
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500"
            >
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('chats:attachments.uploading')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('chats:attachments.dragAndDrop')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('chats:attachments.maxSize')}
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={typeConfig[type].accept}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
}