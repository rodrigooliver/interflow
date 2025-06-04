import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Filter } from 'lucide-react';

export interface TaskFilters {
  assignedToMe: boolean;
  overdue: boolean;
  showArchived: boolean;
  status: 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'all' | 'low' | 'medium' | 'high';
  searchText: string;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  onClearFilters: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  const { t } = useTranslation('tasks');
  const [localFilters, setLocalFilters] = useState<TaskFilters>(filters);

  // Atualizar filtros locais quando os filtros externos mudarem
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  if (!isOpen) return null;

  const handleFilterChange = (key: keyof TaskFilters, value: string | boolean) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: TaskFilters = {
      assignedToMe: false,
      overdue: false,
      showArchived: false,
      status: 'all',
      priority: 'all',
      searchText: ''
    };
    setLocalFilters(clearedFilters);
    onClearFilters();
    onClose();
  };

  const hasActiveFilters = () => {
    return localFilters.assignedToMe || 
           localFilters.overdue || 
           localFilters.showArchived || 
           localFilters.status !== 'all' || 
           localFilters.priority !== 'all' ||
           localFilters.searchText.trim() !== '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('filters.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pesquisa */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('filters.search')}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={localFilters.searchText}
              onChange={(e) => handleFilterChange('searchText', e.target.value)}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('filters.searchDescription')}
          </p>
        </div>

        {/* Status */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('filters.status')}
          </label>
          <select
            value={localFilters.status}
            onChange={(e) => handleFilterChange('status', e.target.value as TaskFilters['status'])}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">{t('filters.statusAll')}</option>
            <option value="pending">{t('filters.statusPending')}</option>
            <option value="in_progress">{t('filters.statusInProgress')}</option>
            <option value="completed">{t('filters.statusCompleted')}</option>
            <option value="cancelled">{t('filters.statusCancelled')}</option>
          </select>
        </div>

        {/* Prioridade */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('filters.priority')}
          </label>
          <select
            value={localFilters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value as TaskFilters['priority'])}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">{t('filters.priorityAll')}</option>
            <option value="low">{t('filters.priorityLow')}</option>
            <option value="medium">{t('filters.priorityMedium')}</option>
            <option value="high">{t('filters.priorityHigh')}</option>
          </select>
        </div>

        {/* Outros filtros */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('filters.otherFilters')}
          </label>
          <div className="space-y-3">
            {/* Atribuídos a mim */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="filter-assigned-to-me"
                checked={localFilters.assignedToMe}
                onChange={(e) => handleFilterChange('assignedToMe', e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
              />
              <label htmlFor="filter-assigned-to-me" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {t('filters.assignedToMe')}
              </label>
            </div>

            {/* Vencidos */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="filter-overdue"
                checked={localFilters.overdue}
                onChange={(e) => handleFilterChange('overdue', e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
              />
              <label htmlFor="filter-overdue" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {t('filters.overdue')}
              </label>
            </div>

            {/* Arquivados */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="filter-archived"
                checked={localFilters.showArchived}
                onChange={(e) => handleFilterChange('showArchived', e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
              />
              <label htmlFor="filter-archived" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {t('filters.showArchived')}
              </label>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-between gap-3">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            disabled={!hasActiveFilters()}
          >
            {t('filters.clearAll')}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {t('form.cancel')}
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {t('filters.apply')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 