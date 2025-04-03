import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Upload, X, Loader2, Trash2, ExternalLink, File, Video, Music, FileText, Pencil } from 'lucide-react';
import api from '../../lib/api';

interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'pdf' | 'document';
  description?: string;
}

interface MediaListProps {
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  organizationId: string;
  promptId: string;
}

const MediaList: React.FC<MediaListProps> = ({ media, onChange, organizationId, promptId }) => {
  const { t } = useTranslation('prompts');
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<MediaItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageDescription, setImageDescription] = useState('');
  const [pendingUploads, setPendingUploads] = useState<Array<{
    file: File;
    description: string;
  }>>([]);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Se for apenas um arquivo, mostra o modal de upload
      if (files.length === 1) {
        const file = files[0];
        const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        setImageDescription(fileNameWithoutExtension);
        setSelectedFile(file);
        setShowUploadModal(true);
      } else {
        // Se forem múltiplos arquivos, adiciona todos à lista de pendentes
        const newPendingUploads = Array.from(files).map(file => {
          const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
          return {
            file,
            description: fileNameWithoutExtension
          };
        });
        setPendingUploads(prev => [...prev, ...newPendingUploads]);
      }
    }
  };

  const handleAddToPending = () => {
    if (selectedFile && imageDescription.trim()) {
      setPendingUploads(prev => [...prev, { file: selectedFile, description: imageDescription.trim() }]);
      setSelectedFile(null);
      setImageDescription('');
      setShowUploadModal(false);
    }
  };

  const handleUploadAll = async () => {
    if (pendingUploads.length === 0) return;

    setIsUploading(true);
    const newMedia: MediaItem[] = [];

    try {
      for (const upload of pendingUploads) {
        const formData = new FormData();
        formData.append('file', upload.file);
        formData.append('description', upload.description);

        const response = await api.post(`/api/${organizationId}/prompts/${promptId}/media`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          newMedia.push({
            id: response.data.fileId,
            url: response.data.url,
            name: response.data.name,
            type: response.data.type,
            description: response.data.description
          });
        }
      }

      onChange([...media, ...newMedia]);
      setPendingUploads([]);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePending = (index: number) => {
    setPendingUploads(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteMedia = async (item: MediaItem) => {
    setMediaToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!mediaToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/${organizationId}/prompts/${promptId}/media/${mediaToDelete.id}`);
      onChange(media.filter(item => item.id !== mediaToDelete.id));
    } catch (error) {
      console.error('Erro ao excluir mídia:', error);
    } finally {
      setShowDeleteModal(false);
      setMediaToDelete(null);
      setIsDeleting(false);
    }
  };

  const handleUpdateDescription = async () => {
    if (!editingMedia || !imageDescription.trim()) return;

    onChange(media.map(item => 
      item.id === editingMedia.id 
        ? { ...item, description: imageDescription.trim() }
        : item
    ));

    setShowUploadModal(false);
    setEditingMedia(null);
    setImageDescription('');
  };

  const handleEditDescription = (item: MediaItem) => {
    setEditingMedia(item);
    setImageDescription(item.description || '');
    setShowUploadModal(true);
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-6 h-6" />;
      case 'video':
        return <Video className="w-6 h-6" />;
      case 'audio':
        return <Music className="w-6 h-6" />;
      case 'pdf':
        return <FileText className="w-6 h-6" />;
      default:
        return <File className="w-6 h-6" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Upload className="w-4 h-4 mr-2" />
          {t('form.images.addButton')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          multiple
        />
      </div>

      {/* Lista de uploads pendentes */}
      {pendingUploads.length > 0 && (
        <div className="flex-none mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('form.images.pendingUploads')}
          </h4>
          <div className="space-y-2 overflow-y-auto max-h-40 pr-2">
            {pendingUploads.map((upload, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <File className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="flex items-center mb-1">
                      <input
                        type="text"
                        value={upload.description}
                        onChange={(e) => {
                          const newPendingUploads = [...pendingUploads];
                          newPendingUploads[index].description = e.target.value;
                          setPendingUploads(newPendingUploads);
                        }}
                        className="text-sm text-gray-500 dark:text-gray-400 p-1 border border-gray-200 dark:border-gray-700 rounded w-full bg-white dark:bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                      />
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {upload.file.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePending(index)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleUploadAll}
            disabled={isUploading}
            className="w-full mt-2 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('form.images.uploading')}
              </>
            ) : (
              t('form.images.uploadAll')
            )}
          </button>
        </div>
      )}

      {/* Lista de mídia existente */}
      {media.length > 0 && (
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-60">
          {media.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-4 flex-1 min-w-0">
                <div className="flex-shrink-0 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {getMediaIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    {item.description ? (
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.description}
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 italic">
                        {t('form.images.noDescription')}
                      </p>
                    )}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                    {item.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleEditDescription(item)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteMedia(item)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de upload/edição */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingMedia ? t('form.images.editTitle') : t('form.images.uploadTitle')}
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setImageDescription('');
                  setEditingMedia(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {!editingMedia && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('form.images.file')}
                  </label>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="w-full"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('form.images.imageDescription')}
                </label>
                <textarea
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  placeholder={t('form.images.imageDescriptionPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setImageDescription('');
                    setEditingMedia(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {t('form.images.cancel')}
                </button>
                {editingMedia ? (
                  <button
                    onClick={handleUpdateDescription}
                    disabled={!imageDescription.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {t('form.images.save')}
                  </button>
                ) : (
                  <button
                    onClick={handleAddToPending}
                    disabled={!imageDescription.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {t('form.images.addToList')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('form.images.confirmDelete')}
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setMediaToDelete(null);
                  setIsDeleting(false);
                }}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t('form.images.confirmDeleteMessage')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setMediaToDelete(null);
                    setIsDeleting(false);
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {t('form.images.cancel')}
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 inline-flex items-center"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('form.images.deleting')}
                    </>
                  ) : (
                    t('form.images.confirm')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaList; 