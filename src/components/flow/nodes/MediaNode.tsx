import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { Music, Image, Video, FileText, Upload, X, Loader2, Sparkles } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';
import api from '../../../lib/api';
import { useAuthContext } from '../../../contexts/AuthContext';
import { createPortal } from 'react-dom';
import { VariableSelectorModal } from '../../flow/VariableSelectorModal';
import { Variable } from '../../../types/flow';

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

// Componente para o modal de edição de URL
interface MediaUrlEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  variables: Variable[];
  onSave: (url: string) => void;
}

function MediaUrlEditorModal({ isOpen, onClose, url, variables, onSave }: MediaUrlEditorModalProps) {
  const { t } = useTranslation(['flows', 'common']);
  const [editedUrl, setEditedUrl] = useState(url);
  const [showVariableSelector, setShowVariableSelector] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Quando o modal de variáveis está aberto, bloqueamos o scroll
  useEffect(() => {
    if (showVariableSelector) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [showVariableSelector]);
  
  // Dar foco ao textarea quando o modal abrir
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);
  
  const handleInsertVariable = (variableName: string) => {
    const textarea = textareaRef.current;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const textBefore = editedUrl.substring(0, start);
      const textAfter = editedUrl.substring(end);
      
      setEditedUrl(textBefore + variableName + textAfter);
      
      // Foco no textarea após a inserção
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = start + variableName.length;
        textarea.selectionEnd = start + variableName.length;
      }, 0);
    } else {
      setEditedUrl(editedUrl + variableName);
    }
  };

  const openVariableSelector = () => {
    setShowVariableSelector(true);
  };
  
  const closeVariableSelector = () => {
    setShowVariableSelector(false);
  };
  
  const handleSave = () => {
    onSave(editedUrl);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return createPortal(
    <div className="fixed inset-0 z-40">
      {/* Overlay semi-transparente */}
      <div 
        className="absolute inset-0 bg-gray-500 bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal fixado no lado direito */}
      <div 
        className="absolute top-0 right-0 h-full w-[600px] bg-white dark:bg-gray-800 shadow-xl flex flex-col overflow-hidden"
        style={{ maxWidth: '100vw' }}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('flows:nodes.mediaUrl.edit')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 relative">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="url-editor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('flows:nodes.mediaUrlPlaceholder')}
              </label>
              <button
                type="button"
                onClick={openVariableSelector}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {t('flows:variables.insertVariable')}
              </button>
            </div>
            <textarea
              id="url-editor"
              ref={textareaRef}
              value={editedUrl}
              onChange={(e) => setEditedUrl(e.target.value)}
              rows={4}
              className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('flows:nodes.mediaUrlPlaceholder')}
            />
            
            {showVariableSelector && (
              <VariableSelectorModal
                isOpen={showVariableSelector}
                onClose={closeVariableSelector}
                variables={variables}
                onSelectVariable={handleInsertVariable}
              />
            )}
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('flows:nodes.mediaUrl.description')}
            </p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            {t('common:cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            {t('common:save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Função para renderizar URL com variáveis destacadas
function RenderUrlWithVariables({ url }: { url: string }) {
  // Regex para encontrar variáveis no formato {{variableName}}
  const regex = /\{\{([^}]+)\}\}/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  // Encontrar todas as ocorrências de variáveis no texto
  while ((match = regex.exec(url)) !== null) {
    // Adicionar texto antes da variável
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: url.substring(lastIndex, match.index),
        key: `text-${lastIndex}`
      });
    }
    
    // Adicionar a variável
    parts.push({
      type: 'variable',
      content: match[1], // Nome da variável sem as chaves
      key: `var-${match.index}`
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Adicionar o texto restante após a última variável
  if (lastIndex < url.length) {
    parts.push({
      type: 'text',
      content: url.substring(lastIndex),
      key: `text-${lastIndex}`
    });
  }
  
  return (
    <div className="truncate text-gray-800 dark:text-gray-300">
      {parts.map((part) => {
        if (part.type === 'variable') {
          return (
            <span 
              key={part.key} 
              className="px-1 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded"
            >
              {`{{${part.content}}}`}
            </span>
          );
        }
        return <span key={part.key}>{part.content}</span>;
      })}
    </div>
  );
}

export function MediaNode({ id, type, data, isConnectable }: MediaNodeProps) {
  const { t } = useTranslation('flows');
  const { updateNodeData, id: flowId, variables } = useFlowEditor();
  const [url, setUrl] = useState(data.mediaUrl || '');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(!data.mediaUrl);
  const [showUrlEditorModal, setShowUrlEditorModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { currentOrganizationMember }  = useAuthContext();

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

  const handleOpenUrlEditorModal = () => {
    setShowUrlEditorModal(true);
  };

  const handleSaveUrl = (newUrl: string) => {
    setUrl(newUrl);
    updateNodeData(id, { ...data, mediaUrl: newUrl, fileId: undefined });
    setShowUrlInput(false);
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
        type={type}
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
              onClick={handleOpenUrlEditorModal}
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
          <div 
            className="flex items-center w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600"
            onClick={handleOpenUrlEditorModal}
          >
            <div className="flex-1 flex items-center text-gray-500 dark:text-white overflow-hidden">
              <RenderUrlWithVariables url={data.mediaUrl || ''} />
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

      {/* URL Editor Modal */}
      {showUrlEditorModal && (
        <MediaUrlEditorModal
          isOpen={showUrlEditorModal}
          onClose={() => setShowUrlEditorModal(false)}
          url={data.mediaUrl || ''}
          variables={variables}
          onSave={handleSaveUrl}
        />
      )}

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