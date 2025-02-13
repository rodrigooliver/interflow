import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HardDrive, Trash2, Loader2, AlertTriangle, FileText, Image, Music, Video, File } from 'lucide-react';
import { useOrganization } from '../../hooks/useOrganization';
import { supabase } from '../../lib/supabase';

interface StorageFile {
  id: string;
  name: string;
  size: number;
  public_url: string;
  mime_type: string;
  message_id?: string;
  created_at: string;
}

export default function FileManager() {
  const { t } = useTranslation(['settings', 'common']);
  const { currentOrganization } = useOrganization();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<StorageFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    limit: number;
  } | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      loadFiles();
      loadStorageInfo();
    }
  }, [currentOrganization]);

  async function loadFiles() {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error loading files:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  async function loadStorageInfo() {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('storage_used, storage_limit')
        .eq('id', currentOrganization.id)
        .single();

      if (error) throw error;
      setStorageInfo({
        used: data.storage_used,
        limit: data.storage_limit
      });
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  }

  const handleDelete = async (file: StorageFile) => {
    setDeleting(true);
    try {
      // Soft delete the file record
      const { error: deleteError } = await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', file.id);

      if (deleteError) throw deleteError;

      // Remove file from storage
      const filePath = file.public_url.split('/').pop();
      if (filePath) {
        await supabase.storage
          .from('attachments')
          .remove([`${currentOrganization?.id}/chat-attachments/${filePath}`]);
      }

      await loadFiles();
      await loadStorageInfo();
      setShowDeleteModal(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error deleting file:', error);
      setError(t('common:error'));
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.startsWith('text/') || mimeType.includes('pdf')) return FileText;
    return File;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('settings:fileManager.title')}
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {storageInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <HardDrive className="w-6 h-6 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('settings:fileManager.storageUsage')}
              </h3>
            </div>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>{formatFileSize(storageInfo.used)} used</span>
              <span>{formatFileSize(storageInfo.limit)} total</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  (storageInfo.used / storageInfo.limit) > 0.9
                    ? 'bg-red-500'
                    : (storageInfo.used / storageInfo.limit) > 0.75
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((storageInfo.used / storageInfo.limit) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('settings:fileManager.file')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('settings:fileManager.size')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('settings:fileManager.uploaded')}
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">{t('settings:fileManager.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {files.map((file) => {
              const Icon = getFileIcon(file.mime_type);
              return (
                <tr key={file.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 text-gray-400 mr-3" />
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {file.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(file.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedFile(file);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      {t('settings:fileManager.delete')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedFile && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('settings:fileManager.deleteTitle')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('settings:fileManager.deleteConfirmation', { name: selectedFile.name })}
                <br />
                {t('settings:fileManager.deleteWarning')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:back')}
                </button>
                <button
                  onClick={() => handleDelete(selectedFile)}
                  disabled={deleting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('common:confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}