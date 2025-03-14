import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquareText, Plus, Loader2, AlertTriangle, Pencil, Trash2, Bot } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Prompt } from '../../types/database';
import { usePrompts } from '../../hooks/useQueryes';
import { useQueryClient } from '@tanstack/react-query';

export default function Prompts() {
  const { t } = useTranslation(['prompts', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const queryClient = useQueryClient();
  const { data: prompts = [], isLoading } = usePrompts(currentOrganizationMember?.organization.id);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  // Limpar mensagem de erro após 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleDelete = async (prompt: Prompt) => {
    if (!currentOrganizationMember) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', prompt.id);

      if (error) throw error;

      // Invalida o cache para forçar uma nova busca
      await queryClient.invalidateQueries({ queryKey: ['prompts', currentOrganizationMember.organization.id] });
      
      setShowDeleteModal(false);
      setSelectedPrompt(null);
    } catch (error) {
      console.error('Error deleting prompt:', error);
      setError(t('common:error'));
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
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
          <MessageSquareText className="w-6 h-6 mr-2" />
          {t('prompts:title')}
        </h1>
        <button
          onClick={() => navigate('/app/prompts/new')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('prompts:add')}
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

      {prompts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {prompt.title}
                  </h3>
                  {prompt.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {prompt.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigate(`/app/prompts/edit/${prompt.id}`)}
                    className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full"
                    title={t('prompts:edit')}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPrompt(prompt);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"
                    title={t('prompts:delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none">
                <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {prompt.content}
                </pre>
              </div>

              {prompt.tags && prompt.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {prompt.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {t('prompts:lastUpdated')}: {new Date(prompt.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Bot className="w-16 h-16 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              {t('prompts:noAgentsYet')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {t('prompts:noAgentsDescription')}
            </p>
            <button
              onClick={() => navigate('/app/prompts/new')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('prompts:createFirstAgent')}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPrompt && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('prompts:deleteTitle')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('prompts:deleteConfirmation', { name: selectedPrompt.title })}
                <br />
                {t('prompts:deleteWarning')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedPrompt(null);
                  }}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common:back')}
                </button>
                <button
                  onClick={() => handleDelete(selectedPrompt)}
                  disabled={deleting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common:deleting')}
                    </>
                  ) : (
                    t('common:confirmDelete')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}