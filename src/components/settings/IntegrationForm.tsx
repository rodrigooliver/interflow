import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useOrganization } from '../../hooks/useOrganization';
import { supabase } from '../../lib/supabase';

interface IntegrationFormProps {
  type: 'openai' | 'aws_s3';
  formData: Record<string, string>;
  setFormData: (data: Record<string, string>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  showTypeSelector?: boolean;
  integrationId?: string;
}

interface Field {
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder: string;
  required: boolean;
}

export function IntegrationForm({
  type,
  formData,
  setFormData,
  onSubmit,
  onCancel,
  saving,
  showTypeSelector = false,
  integrationId
}: IntegrationFormProps) {
  const { t } = useTranslation(['settings', 'common']);
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(!!integrationId);

  useEffect(() => {
    if (integrationId && currentOrganization) {
      loadIntegration();
    }
  }, [integrationId, currentOrganization]);

  async function loadIntegration() {
    if (!currentOrganization || !integrationId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('organization_id', currentOrganization.id)
        .single();

      if (error) throw error;
      if (data) {
        const formValues = {
          title: data.title || '',
          ...(data.credentials || {})
        };
        setFormData(formValues);
      }
    } catch (error) {
      console.error('Erro ao carregar integração:', error);
    } finally {
      setLoading(false);
    }
  }

  const integrationFields: Record<'openai' | 'aws_s3', Field[]> = {
    openai: [
      {
        key: 'title',
        label: t('settings:integrations.form.title'),
        type: 'text',
        placeholder: t('settings:integrations.form.titlePlaceholderOpenAI'),
        required: true
      },
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-...',
        required: true
      },
      {
        key: 'organization_id',
        label: 'Organization ID',
        type: 'text',
        placeholder: 'org-...',
        required: false
      }
    ],
    aws_s3: [
      {
        key: 'title',
        label: t('settings:integrations.form.title'),
        type: 'text',
        placeholder: t('settings:integrations.form.titlePlaceholderS3'),
        required: true
      },
      {
        key: 'access_key_id',
        label: 'Access Key ID',
        type: 'text',
        placeholder: 'AKIA...',
        required: true
      },
      {
        key: 'secret_access_key',
        label: 'Secret Access Key',
        type: 'password',
        placeholder: 'Your AWS secret key',
        required: true
      },
      {
        key: 'region',
        label: 'Region',
        type: 'text',
        placeholder: 'us-east-1',
        required: true
      },
      {
        key: 'bucket',
        label: 'Bucket Name',
        type: 'text',
        placeholder: 'my-bucket',
        required: true
      }
    ]
  };

  const fields = integrationFields[type];

  const sensitiveFields = {
    openai: ['api_key'],
    aws_s3: ['access_key_id', 'secret_access_key']
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Chama o onSubmit diretamente com os dados do formulário
    await onSubmit(formData);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-6">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map(field => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {field.label} {field.required && '*'}
          </label>
          <input
            type={field.type}
            required={field.required}
            placeholder={field.placeholder}
            value={formData[field.key] || ''}
            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
            className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      ))}

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
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t('common:saving')}
        </button>
      </div>
    </form>
  );
}