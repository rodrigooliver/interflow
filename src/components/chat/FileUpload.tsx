import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, FileText, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FileUploadProps {
  organizationId: string;
  onUploadComplete: (file: File, type: string, name: string) => void;
  onError: (error: string) => void;
  type: 'image' | 'document';
  onClose: () => void;
}

export function FileUpload({ organizationId, onUploadComplete, onError, type, onClose }: FileUploadProps) {
  const { t } = useTranslation('chats');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    limit: number;
  } | null>(null);

  useEffect(() => {
    loadStorageInfo();
  }, [organizationId]);

  async function loadStorageInfo() {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('usage')
        .eq('id', organizationId)
        .single();

      if (error) throw error;
      if (data) {
        const usage = data.usage || {};
        setStorageInfo({
          used: usage.storage?.used || 0,
          limit: usage.storage?.limit || 0
        });
      }
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  }

  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedDocumentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  const allowedTypes = type === 'image' ? allowedImageTypes : allowedDocumentTypes;
  const maxSize = 10 * 1024 * 1024; // 10MB per file

  const validateFile = (file: File) => {
    if (!allowedTypes.includes(file.type)) {
      throw new Error(t('attachments.errors.invalidType'));
    }
    if (file.size > maxSize) {
      throw new Error(t('attachments.errors.tooLarge'));
    }
    if (storageInfo && storageInfo.used + file.size > storageInfo.limit) {
      throw new Error('Limite de armazenamento excedido. Entre em contato com o suporte para aumentar seu limite.');
    }
  };

  const processFile = async (file: File) => {
    try {
      validateFile(file);
      
      // Em vez de fazer upload, apenas retorna o arquivo para o componente pai
      onUploadComplete(file, file.type, file.name);
      onClose();
    } catch (error: unknown) {
      console.error('Erro ao processar arquivo:', error);
      const errorMessage = error instanceof Error ? error.message : t('attachments.errors.uploadFailed');
      onError(errorMessage);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const formatStorageSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t(`attachments.upload${type === 'image' ? 'Image' : 'Document'}`)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {storageInfo && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>Armazenamento utilizado:</span>
              <span>{formatStorageSize(storageInfo.used)} / {formatStorageSize(storageInfo.limit)}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(storageInfo.used / storageInfo.limit) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            dragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <>
            {type === 'image' ? (
              <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            ) : (
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {t('attachments.dragAndDrop')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              {t('attachments.maxSize')}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('attachments.selectFile')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={allowedTypes.join(',')}
              onChange={handleFileSelect}
            />
          </>
        </div>
      </div>
    </div>
  );
}