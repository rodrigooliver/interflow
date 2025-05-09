import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { Loader2, File, MessageSquare, Boxes, GitBranch, MessageCircleQuestion, ExternalLink, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';

interface StorageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
}

interface FileGroup {
  type: 'messages' | 'integrations' | 'flows' | 'prompts' | 'shortcuts' | 'other';
  label: string;
  icon: React.ElementType;
  totalSize: number;
  count: number;
  color: string;
}

interface FileItem {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  created_at: string;
  public_url?: string;
  message_id?: string;
  integration_id?: string;
  flow_id?: string;
  prompt_id?: string;
  shortcut_id?: string;
}

interface FileStats {
  message_files_count: number;
  message_files_size: number;
  integration_files_count: number;
  integration_files_size: number;
  flow_files_count: number;
  flow_files_size: number;
  prompt_files_count: number;
  prompt_files_size: number;
  shortcut_files_count: number;
  shortcut_files_size: number;
  other_files_count: number;
  other_files_size: number;
  total_size: number;
}

export function StorageDetailsModal({ isOpen, onClose, organizationId }: StorageDetailsModalProps) {
  const { t } = useTranslation(['settings', 'common']);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (isOpen && organizationId) {
      loadStorageDetails();
    }
  }, [isOpen, organizationId]);

  const loadStorageDetails = async () => {
    try {
      setLoading(true);
      
      // Obter estatísticas de arquivos agrupados por tipo
      const { data: statsData, error: statsError } = await supabase.rpc('get_file_stats_by_type', {
        org_id: organizationId
      });
      
      if (statsError) throw statsError;

      if (!statsData || statsData.length === 0) {
        setError(t('settings:storage.noData'));
        return;
      }

      const stats: FileStats = statsData[0];
      console.log('File stats:', stats);
      
      // Processar dados da função RPC
      const groups: FileGroup[] = [
        {
          type: 'messages',
          label: t('settings:storage.messageFiles'),
          icon: MessageSquare,
          totalSize: stats.message_files_size || 0,
          count: stats.message_files_count || 0,
          color: 'bg-blue-500'
        },
        {
          type: 'integrations',
          label: t('settings:storage.integrationFiles'),
          icon: Boxes,
          totalSize: stats.integration_files_size || 0,
          count: stats.integration_files_count || 0,
          color: 'bg-purple-500'
        },
        {
          type: 'flows',
          label: t('settings:storage.flowFiles'),
          icon: GitBranch,
          totalSize: stats.flow_files_size || 0,
          count: stats.flow_files_count || 0,
          color: 'bg-green-500'
        },
        {
          type: 'prompts',
          label: t('settings:storage.promptFiles'),
          icon: MessageCircleQuestion,
          totalSize: stats.prompt_files_size || 0,
          count: stats.prompt_files_count || 0,
          color: 'bg-yellow-500'
        },
        {
          type: 'shortcuts',
          label: t('settings:storage.shortcutFiles'),
          icon: File,
          totalSize: stats.shortcut_files_size || 0,
          count: stats.shortcut_files_count || 0,
          color: 'bg-orange-500'
        },
        {
          type: 'other',
          label: t('settings:storage.otherFiles'),
          icon: File,
          totalSize: stats.other_files_size || 0,
          count: stats.other_files_count || 0,
          color: 'bg-gray-500'
        }
      ];

      setFileGroups(groups);
      setTotalSize(stats.total_size || 0);
    } catch (error) {
      console.error('Erro ao carregar detalhes de armazenamento:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  const loadFilesByType = async (type: string) => {
    try {
      setLoading(true);
      setSelectedGroup(type);
      setFiles([]);
      setPage(0);
      setHasMore(true);
      
      await loadMoreFiles(type, 0);
    } catch (error) {
      console.error(`Erro ao carregar arquivos do tipo ${type}:`, error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  const loadMoreFiles = async (type: string, currentPage: number) => {
    try {
      setLoadingMore(true);
      
      let query = supabase
        .from('files')
        .select('id, name, size, mime_type, created_at, public_url, message_id, integration_id, flow_id, prompt_id, shortcut_id')
        .eq('organization_id', organizationId)
        .order('size', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);
      
      // Filtrar por tipo
      switch (type) {
        case 'messages':
          query = query.not('message_id', 'is', null);
          break;
        case 'integrations':
          query = query.not('integration_id', 'is', null);
          break;
        case 'flows':
          query = query.not('flow_id', 'is', null);
          break;
        case 'prompts':
          query = query.not('prompt_id', 'is', null);
          break;
        case 'shortcuts':
          query = query.not('shortcut_id', 'is', null);
          break;
        case 'other':
          query = query.is('message_id', null)
                       .is('integration_id', null)
                       .is('flow_id', null)
                       .is('prompt_id', null)
                       .is('shortcut_id', null);
          break;
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data) {
        if (data.length < PAGE_SIZE) {
          setHasMore(false);
        }
        
        if (currentPage === 0) {
          setFiles(data);
        } else {
          setFiles(prevFiles => [...prevFiles, ...data]);
        }
        
        setPage(currentPage);
      }
    } catch (error) {
      console.error(`Erro ao carregar mais arquivos do tipo ${type}:`, error);
      setError(t('common:error'));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && selectedGroup) {
      loadMoreFiles(selectedGroup, page + 1);
    }
  };

  const getRelatedItemLink = (file: FileItem) => {
    if (file.message_id) {
      return `/chat/messages/${file.message_id}`;
    } else if (file.integration_id) {
      return `/settings/integrations/${file.integration_id}`;
    } else if (file.flow_id) {
      return `/flows/${file.flow_id}`;
    } else if (file.prompt_id) {
      return `/prompts/${file.prompt_id}`;
    } else if (file.shortcut_id) {
      return `/shortcuts/${file.shortcut_id}`;
    }
    return null;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getFileTypeIcon = () => {
    // Simplificado para retornar sempre o ícone File
    return File;
  };

  const renderContent = () => {
    if (loading && !loadingMore) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('common:loading')}
            </p>
          </div>
        </div>
      );
    }

    if (error && files.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-red-500">{error}</p>
        </div>
      );
    }

    if (selectedGroup) {
      // Mostrar lista de arquivos do grupo selecionado
      return (
        <div>
          <div className="mb-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedGroup(null)}
              className="text-sm"
            >
              ← {t('common:back')}
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('settings:storage.fileName')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('settings:storage.fileSize')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('settings:storage.fileType')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('settings:storage.dateCreated')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('settings:storage.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {files.map((file) => {
                  const FileIcon = getFileTypeIcon();
                  const relatedItemLink = getRelatedItemLink(file);
                  
                  return (
                    <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <FileIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="truncate max-w-xs">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatStorageSize(file.size)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {file.mime_type}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(file.created_at)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          {file.public_url && (
                            <a 
                              href={file.public_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700 transition-colors"
                              title={t('settings:storage.viewFile')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {relatedItemLink && (
                            <a 
                              href={relatedItemLink} 
                              className="text-purple-500 hover:text-purple-700 transition-colors"
                              title={t('settings:storage.viewRelatedItem')}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {files.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t('settings:storage.noFiles')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button 
                variant="outline" 
                onClick={handleLoadMore} 
                disabled={loadingMore}
                className="text-sm"
              >
                {loadingMore ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common:loading')}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <ChevronDown className="h-4 w-4 mr-2" />
                    {t('settings:storage.loadMore')}
                  </div>
                )}
              </Button>
            </div>
          )}
          
          {loadingMore && hasMore && (
            <div className="mt-4 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      );
    }

    // Mostrar visão geral dos grupos
    return (
      <div>
        <div className="mb-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('settings:storage.totalStorage')}: {formatStorageSize(totalSize)}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fileGroups.map((group) => (
            <div 
              key={group.type}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
              onClick={() => loadFilesByType(group.type)}
            >
              <div className="flex items-center">
                <div className={`p-2 rounded-md ${group.color}`}>
                  <group.icon className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {group.label}
                  </h4>
                  <div className="mt-1 flex items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatStorageSize(group.totalSize)}
                    </span>
                    <span className="mx-1.5 text-gray-400">•</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {group.count} {t('settings:storage.files')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`${group.color} h-2 rounded-full`} 
                    style={{ width: `${Math.max(5, Math.min(100, (group.totalSize / totalSize) * 100))}%` }}
                  ></div>
                </div>
                <div className="mt-1 text-xs text-right text-gray-500 dark:text-gray-400">
                  {totalSize > 0 ? Math.round((group.totalSize / totalSize) * 100) : 0}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings:storage.storageDetails')}
      size="lg"
    >
      {renderContent()}
    </Modal>
  );
} 