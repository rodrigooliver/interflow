import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface TagFormProps {
  formData: {
    name: string;
    color: string;
  };
  onChange: (data: any) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error?: string;
}

export function TagForm({
  formData,
  onChange,
  onSubmit,
  onCancel,
  saving,
  error
}: TagFormProps) {
  const { t } = useTranslation(['tags', 'common']);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('tags:form.name')} *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => onChange({ ...formData, name: e.target.value })}
          className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('tags:form.color')} *
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="color"
            required
            value={formData.color}
            onChange={(e) => onChange({ ...formData, color: e.target.value })}
            className="w-12 h-10 p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          />
          <input
            type="text"
            required
            value={formData.color}
            onChange={(e) => onChange({ ...formData, color: e.target.value })}
            pattern="^#[0-9A-Fa-f]{6}$"
            placeholder="#000000"
            className="flex-1 p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {t('common:back')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('common:saving')}</> : t('common:save')}
        </button>
      </div>
    </form>
  );
}