import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Folder, GitFork, Plus, ChevronLeft, Loader2, X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '../lib/supabase';
import { Flow, FlowNode, FlowConnection } from '../types/flow';

// Nó inicial padrão
const DEFAULT_START_NODE: FlowNode = {
  id: 'start-node',
  type: 'start',
  position: { x: 100, y: 100 },
  data: { isStart: true }
};

export default function FlowList() {
  const { t } = useTranslation(['flows', 'common']);
  const { currentOrganization } = useOrganization();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewFlowModal, setShowNewFlowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFlowData, setNewFlowData] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentOrganization) {
      loadFlows();
    }
  }, [currentOrganization, currentPath]);

  async function loadFlows() {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('folder_path', currentPath)
        .order('name');

      if (error) throw error;
      setFlows(data || []);
    } catch (error) {
      console.error('Error loading flows:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFolder() {
    if (!currentOrganization || !newFolderName.trim()) return;

    try {
      const newPath = currentPath === '/' 
        ? `/${newFolderName}` 
        : `${currentPath}/${newFolderName}`;

      // Create a placeholder flow to represent the folder
      const { error } = await supabase
        .from('flows')
        .insert([{
          organization_id: currentOrganization.id,
          name: '.folder',
          folder_path: newPath,
          nodes: [],
          edges: []
        }]);

      if (error) throw error;

      setNewFolderName('');
      setShowNewFolderModal(false);
      loadFlows();
    } catch (error) {
      console.error('Error creating folder:', error);
      setError(t('common:error'));
    }
  }

  async function handleCreateFlow() {
    if (!currentOrganization || !newFlowData.name.trim()) return;

    try {
      // Criar o fluxo com o nó inicial no rascunho
      const { error } = await supabase
        .from('flows')
        .insert([{
          organization_id: currentOrganization.id,
          name: newFlowData.name,
          description: newFlowData.description,
          folder_path: currentPath,
          nodes: [], // Versão publicada começa vazia
          edges: [], // Versão publicada começa vazia
          draft_nodes: [DEFAULT_START_NODE], // Rascunho já começa com o nó inicial
          draft_edges: [], // Rascunho começa sem conexões
          variables: [],
          is_published: false
        }]);

      if (error) throw error;

      setNewFlowData({ name: '', description: '' });
      setShowNewFlowModal(false);
      loadFlows();
    } catch (error) {
      console.error('Error creating flow:', error);
      setError(t('common:error'));
    }
  }

  async function handleDeleteFlow() {
    if (!selectedFlow) return;

    try {
      const { error } = await supabase
        .from('flows')
        .delete()
        .eq('id', selectedFlow.id);

      if (error) throw error;

      await loadFlows();
      setShowDeleteModal(false);
      setSelectedFlow(null);
    } catch (error) {
      console.error('Error deleting flow:', error);
      setError(t('common:error'));
    }
  }

  async function handleDeleteFolder() {
    if (!selectedFolder) return;

    try {
      // Move all flows to root
      const { error: moveError } = await supabase
        .from('flows')
        .update({ folder_path: '/' })
        .eq('folder_path', selectedFolder)
        .neq('name', '.folder');

      if (moveError) throw moveError;

      // Delete folder placeholder
      const { error: deleteError } = await supabase
        .from('flows')
        .delete()
        .eq('folder_path', selectedFolder)
        .eq('name', '.folder');

      if (deleteError) throw deleteError;

      await loadFlows();
      setShowDeleteFolderModal(false);
      setSelectedFolder(null);
    } catch (error) {
      console.error('Error deleting folder:', error);
      setError(t('common:error'));
    }
  }

  const getFolders = () => {
    const uniqueFolders = new Set<string>();
    flows.forEach(flow => {
      if (flow.name === '.folder') {
        const folderName = flow.folder_path.split('/').pop();
        if (folderName) uniqueFolders.add(folderName);
      }
    });
    return Array.from(uniqueFolders);
  };

  const getFlows = () => {
    return flows.filter(flow => flow.name !== '.folder');
  };

  const navigateUp = () => {
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/') || '/');
  };

  if (!currentOrganization) {
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
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <GitFork className="w-6 h-6 mr-2" />
            {t('flows:title')}
          </h1>
          {currentPath !== '/' && (
            <button
              onClick={navigateUp}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('common:back')}
            </button>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Folder className="w-4 h-4 mr-2" />
            {t('flows:newFolder')}
          </button>
          <button
            onClick={() => setShowNewFlowModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('flows:newFlow')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Folders */}
        {getFolders().map((folder) => (
          <div
            key={folder}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative group"
          >
            <button
              onClick={() => {
                setSelectedFolder(currentPath === '/' ? `/${folder}` : `${currentPath}/${folder}`);
                setShowDeleteFolderModal(true);
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPath(currentPath === '/' ? `/${folder}` : `${currentPath}/${folder}`)}
              className="flex items-center w-full text-left"
            >
              <Folder className="w-8 h-8 text-gray-400 dark:text-gray-500 mr-3" />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                  {folder}
                </h3>
              </div>
            </button>
          </div>
        ))}

        {/* Flows */}
        {getFlows().map((flow) => (
          <div
            key={flow.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative group"
          >
            <button
              onClick={() => {
                setSelectedFlow(flow);
                setShowDeleteModal(true);
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
            <Link
              to={`/flows/${flow.id}`}
              className="flex items-center"
            >
              <GitFork className="w-8 h-8 text-gray-400 dark:text-gray-500 mr-3" />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                  {flow.name}
                </h3>
                {flow.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                    {flow.description}
                  </p>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('flows:newFolder')}
            </h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta"
              className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                {t('common:back')}
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {t('common:saving')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Flow Modal */}
      {showNewFlowModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('flows:newFlow')}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newFlowData.name}
                onChange={(e) => setNewFlowData({ ...newFlowData, name: e.target.value })}
                placeholder="Nome do fluxo"
                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
              />
              <textarea
                value={newFlowData.description}
                onChange={(e) => setNewFlowData({ ...newFlowData, description: e.target.value })}
                placeholder="Descrição (opcional)"
                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowNewFlowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                {t('common:back')}
              </button>
              <button
                onClick={handleCreateFlow}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {t('common:saving')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Flow Modal */}
      {showDeleteModal && selectedFlow && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('flows:delete.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('flows:delete.confirmation', { name: selectedFlow.name })}
                <br />
                {t('flows:delete.warning')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedFlow(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:back')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteFlow}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {t('common:confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Modal */}
      {showDeleteFolderModal && selectedFolder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('flows:folder.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('flows:folder.confirmation', { name: selectedFolder.split('/').pop() })}
                <br />
                {t('flows:folder.warning')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteFolderModal(false);
                    setSelectedFolder(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:back')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteFolder}
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