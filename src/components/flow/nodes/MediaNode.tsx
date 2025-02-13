import React, { useState, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { Music, Image, Video, FileText, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface MediaNodeProps {
  type: 'audio' | 'image' | 'video' | 'document';
  data: {
    mediaUrl?: string;
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

export function MediaNode({ type, data, isConnectable }: MediaNodeProps) {
  const { t } = useTranslation('flows');
  const [url, setUrl] = useState(data.mediaUrl || '');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Icon = typeConfig[type].icon;

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
      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${typeConfig[type].bucket}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(typeConfig[type].bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(typeConfig[type].bucket)
        .getPublicUrl(filePath);

      setUrl(publicUrl);
      setShowUploadModal(false);
    } catch (err) {
      console.error('Upload error:', err);
      setError(t('chats:attachments.errors.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="node-content">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
      
      <div className="flex items-center mb-2">
        <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t(typeConfig[type].label)}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('nodes.mediaUrlPlaceholder')}
          className="flex-1 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
        />
        <button 
          onClick={() => setShowUploadModal(true)}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <Upload className="w-5 h-5" />
        </button>
      </div>

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