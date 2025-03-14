import React, { useState, useEffect } from 'react';
import { Keyboard, Plus, Loader2, X, AlertTriangle, Upload, Pencil, FileText, Image, Music, Video, File } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { MessageShortcut } from '../../types/database';

export default function MessageShortcuts() {
  const { t } = useTranslation(['shortcuts', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [shortcuts, setShortcuts] = useState<MessageShortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedShortcut, setSelectedShortcut] = useState<MessageShortcut | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [removingFile, setRemovingFile] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    if (currentOrganizationMember) {
      loadShortcuts();
    }
  }, [currentOrganizationMember]);

  // Limpar mensagem de erro após 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function loadShortcuts() {
    if (!currentOrganizationMember) return;

    try {
      const { data, error } = await supabase
        .from('message_shortcuts')
        .select('*')
        .eq('organization_id', currentOrganizationMember.organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShortcuts(data || []);
    } catch (error) {
      console.error('Error loading shortcuts:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  function handleEditClick(shortcut: MessageShortcut) {
    setSelectedShortcut(shortcut);
    setFormData({
      title: shortcut.title,
      content: shortcut.content,
    });
    setShowEditModal(true);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  }

  async function handleRemoveFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function handleRemoveExistingFile(url: string) {
    if (!selectedShortcut) return;
    
    setRemovingFile(url);
    
    try {
      const updatedAttachments = selectedShortcut.attachments.filter(a => a.url !== url);
      const filePath = url.split('/').pop();

      if (filePath) {
        await supabase.storage
          .from('attachments')
          .remove([`${currentOrganizationMember?.organization.id}/shortcuts/${filePath}`]);
      }

      const { error } = await supabase
        .from('message_shortcuts')
        .update({ attachments: updatedAttachments })
        .eq('id', selectedShortcut.id);

      if (error) throw error;

      setSelectedShortcut({
        ...selectedShortcut,
        attachments: updatedAttachments
      });

      await loadShortcuts();
    } catch (error) {
      console.error('Error removing file:', error);
      setError(t('common:error'));
    } finally {
      setRemovingFile(null);
    }
  }

  async function handleCreateShortcut(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganizationMember) return;
    
    setUploading(true);
    setError('');

    try {
      // Upload files first
      const attachments = await Promise.all(
        files.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${currentOrganizationMember.organization.id}/shortcuts/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);

          return {
            name: file.name,
            url: publicUrl,
            type: file.type
          };
        })
      );

      // Create shortcut with attachments
      const { error } = await supabase
        .from('message_shortcuts')
        .insert([
          {
            organization_id: currentOrganizationMember.organization.id,
            title: formData.title,
            content: formData.content,
            attachments
          },
        ]);

      if (error) throw error;

      await loadShortcuts();
      setShowCreateModal(false);
      setFormData({ title: '', content: '' });
      setFiles([]);
    } catch (error) {
      console.error('Error creating shortcut:', error);
      setError(t('common:error'));
    } finally {
      setUploading(false);
    }
  }

  async function handleEditShortcut(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganizationMember || !selectedShortcut) return;
    
    setUploading(true);
    setError('');

    try {
      // Upload new files first
      const newAttachments = await Promise.all(
        files.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${currentOrganizationMember.organization.id}/shortcuts/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);

          return {
            name: file.name,
            url: publicUrl,
            type: file.type
          };
        })
      );

      // Combine existing and new attachments
      const attachments = [...selectedShortcut.attachments, ...newAttachments];

      // Update shortcut
      const { error } = await supabase
        .from('message_shortcuts')
        .update({
          title: formData.title,
          content: formData.content,
          attachments
        })
        .eq('id', selectedShortcut.id);

      if (error) throw error;

      await loadShortcuts();
      setShowEditModal(false);
      setSelectedShortcut(null);
      setFormData({ title: '', content: '' });
      setFiles([]);
    } catch (error) {
      console.error('Error updating shortcut:', error);
      setError(t('common:error'));
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteShortcut(shortcut: MessageShortcut) {
    try {
      // Delete attachments from storage
      await Promise.all(
        shortcut.attachments.map(async (attachment) => {
          const filePath = attachment.url.split('/').pop();
          if (filePath) {
            await supabase.storage
              .from('attachments')
              .remove([`${currentOrganizationMember?.organization.id}/shortcuts/${filePath}`]);
          }
        })
      );

      // Delete shortcut
      const { error } = await supabase
        .from('message_shortcuts')
        .delete()
        .eq('id', shortcut.id);

      if (error) throw error;

      await loadShortcuts();
      setShowDeleteModal(false);
      setSelectedShortcut(null);
    } catch (error) {
      console.error('Error deleting shortcut:', error);
      setError(t('common:error'));
    }
  }

  const filteredShortcuts = shortcuts.filter(shortcut => 
    shortcut.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shortcut.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredShortcuts.length / itemsPerPage);
  const paginatedShortcuts = filteredShortcuts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!currentOrganizationMember) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-gray-500 dark:text-gray-400">
            {t('common:loading')}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Keyboard className="w-6 h-6 mr-2" />
          {t('shortcuts:title')}
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('shortcuts:newShortcut')}
        </button>
      </div>

      {shortcuts.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            placeholder={t('shortcuts:searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {paginatedShortcuts.length === 0 ? (
        searchTerm ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            {t('shortcuts:noSearchResults')}
          </div>
        ) : shortcuts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Keyboard className="w-16 h-16 text-gray-300 dark:text-gray-600" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                {t('shortcuts:noShortcutsYet')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {t('shortcuts:noShortcutsDescription')}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('shortcuts:createFirstShortcut')}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">
            {t('shortcuts:noShortcuts')}
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedShortcuts.map((shortcut) => (
              <div key={shortcut.id} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {shortcut.title}
                      </h3>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditClick(shortcut)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedShortcut(shortcut);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-3 max-h-[4.5rem] overflow-hidden">
                      {shortcut.content}
                    </p>
                  </div>

                  {shortcut.attachments.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        {t('shortcuts:attachments')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {shortcut.attachments.map((attachment, index) => {
                          let Icon = File;
                          if (attachment.type.startsWith('image/')) {
                            Icon = Image;
                          } else if (attachment.type.startsWith('audio/')) {
                            Icon = Music;
                          } else if (attachment.type.startsWith('video/')) {
                            Icon = Video;
                          } else if (attachment.type.startsWith('text/') || attachment.type.includes('pdf')) {
                            Icon = FileText;
                          }

                          return (
                            <a
                              key={index}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center p-2 space-x-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors group"
                            >
                              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              </div>
                              <span className="flex-1 truncate">
                                {attachment.name}
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(shortcut.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-gray-700 transition-colors"
              >
                {t('common:previous')}
              </button>
              
              <span className="px-3 py-1 text-gray-700 dark:text-gray-300">
                {t('common:pageOf', { current: currentPage, total: totalPages })}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-gray-700 transition-colors"
              >
                {t('common:next')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Shortcut Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {showEditModal ? t('shortcuts:editShortcut') : t('shortcuts:newShortcut')}
              </h3>
              <button
                onClick={() => {
                  if(showEditModal) {
                    setShowEditModal(false)
                  } else {
                    setShowCreateModal(false)
                  }
                  setSelectedShortcut(null);
                  setFormData({ title: '', content: '' });
                  setFiles([]);
                }}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={showEditModal ? handleEditShortcut : handleCreateShortcut} className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('shortcuts:title')}
                  </label>
                  <input
                    type="text"
                    id="title"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('shortcuts:content')}
                  </label>
                  <textarea
                    id="content"
                    required
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('shortcuts:attachments')}
                  </label>

                  {showEditModal && selectedShortcut && selectedShortcut.attachments.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {selectedShortcut.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {attachment.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingFile(attachment.url)}
                            disabled={removingFile === attachment.url}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          >
                            {removingFile === attachment.url ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 dark:text-gray-400">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>{t('shortcuts:uploadFiles')}</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            multiple
                            onChange={handleFileChange}
                          />
                        </label>
                        <p className="pl-1">{t('shortcuts:dragAndDrop')}</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('shortcuts:maxSize')}
                      </p>
                    </div>
                  </div>

                  {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    if(showEditModal) {
                      setShowEditModal(false)
                    } else {
                      setShowCreateModal(false)
                    }
                    setSelectedShortcut(null);
                    setFormData({ title: '', content: '' });
                    setFiles([]);
                  }}
                  disabled={uploading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:back')}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common:saving')}
                    </>
                  ) : showEditModal ? (
                    t('shortcuts:saveChanges')
                  ) : (
                    t('shortcuts:newShortcut')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && selectedShortcut && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('shortcuts:delete.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('shortcuts:delete.confirmation', { name: selectedShortcut.title })}
                <br />
                {t('shortcuts:delete.warning')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedShortcut(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:back')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteShortcut(selectedShortcut)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
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