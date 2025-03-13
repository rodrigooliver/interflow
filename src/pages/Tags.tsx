import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag as TagIcon, Plus, Loader2, X, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TagForm } from '../components/tags/TagForm';
import { useOrganizationContext } from '../contexts/OrganizationContext';

interface Tag {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export default function Tags() {
  const { t } = useTranslation(['tags', 'common']);
  const { currentOrganization } = useOrganizationContext();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentOrganization) {
      loadTags();
    }
  }, [currentOrganization]);

  // Limpar mensagem de erro após 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function loadTags() {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('tags')
        .insert([{
          organization_id: currentOrganization.id,
          name: formData.name,
          color: formData.color
        }]);

      if (error) throw error;

      await loadTags();
      setShowAddModal(false);
      setFormData({ name: '', color: '#3B82F6' });
    } catch (error) {
      console.error('Error adding tag:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !selectedTag) return;

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('tags')
        .update({
          name: formData.name,
          color: formData.color
        })
        .eq('id', selectedTag.id);

      if (error) throw error;

      await loadTags();
      setShowEditModal(false);
      setSelectedTag(null);
      setFormData({ name: '', color: '#3B82F6' });
    } catch (error) {
      console.error('Error updating tag:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tag.id);

      if (error) throw error;

      await loadTags();
      setShowDeleteModal(false);
      setSelectedTag(null);
    } catch (error) {
      console.error('Error deleting tag:', error);
      setError(t('common:error'));
    }
  };

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
          <TagIcon className="w-6 h-6 mr-2" />
          {t('tags:title')}
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('tags:add')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {tags.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tags.map((tag) => (
            <div key={tag.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {tag.name}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedTag(tag);
                      setFormData({
                        name: tag.name,
                        color: tag.color
                      });
                      setShowEditModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTag(tag);
                      setShowDeleteModal(true);
                    }}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <TagIcon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              {t('tags:noTagsYet')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {t('tags:noTagsDescription')}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('tags:createFirstTag')}
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {showAddModal ? t('tags:add') : t('tags:edit')}
              </h3>
              <button
                onClick={() => {
                  if (showAddModal) {
                    setShowAddModal(false);
                  } else {
                    setShowEditModal(false);
                  }
                  setSelectedTag(null);
                  setFormData({ name: '', color: '#3B82F6' });
                }}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <TagForm
                formData={formData}
                onChange={setFormData}
                onSubmit={showAddModal ? handleAdd : handleEdit}
                onCancel={() => {
                  if (showAddModal) {
                    setShowAddModal(false);
                  } else {
                    setShowEditModal(false);
                  }
                  setSelectedTag(null);
                  setFormData({ name: '', color: '#3B82F6' });
                }}
                saving={saving}
                error={error}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTag && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('tags:deleteTitle')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('tags:deleteConfirmation', { name: selectedTag.name })}
                <br />
                {t('tags:deleteWarning')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedTag(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:back')}
                </button>
                <button
                  onClick={() => handleDelete(selectedTag)}
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