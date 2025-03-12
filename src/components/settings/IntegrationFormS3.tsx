import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { S3Client, ListBucketsCommand, Bucket } from '@aws-sdk/client-s3';

/**
 * Formulário para configuração de integração com AWS S3
 * 
 * Segurança:
 * - As chaves de acesso são enviadas para o backend para serem criptografadas antes de armazenadas
 * - A validação da chave é feita no frontend para verificar se as credenciais são válidas
 * - O backend deve implementar as seguintes rotas:
 *   - GET /api/:organizationId/integrations/:integrationId - Buscar integração
 *   - POST /api/:organizationId/integrations - Criar integração
 *   - PUT /api/:organizationId/integrations/:integrationId - Atualizar integração
 */

// Interface para erros de API
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

// Interface para dados de integração
interface IntegrationData {
  title: string;
  type: string;
  status: string;
  credentials?: {
    access_key_id: string;
    secret_access_key: string;
    region: string;
    bucket: string;
  };
}

interface IntegrationFormS3Props {
  onSuccess: () => void;
  onCancel: () => void;
  integrationId?: string;
}

export function IntegrationFormS3({
  onSuccess,
  onCancel,
  integrationId
}: IntegrationFormS3Props) {
  const { t } = useTranslation(['settings', 'common']);
  const { currentOrganization } = useOrganizationContext();
  const [loading, setLoading] = useState(!!integrationId);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [isCredentialsValid, setIsCredentialsValid] = useState<boolean | null>(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    access_key_id: '',
    secret_access_key: '',
    region: '',
    bucket: ''
  });

  useEffect(() => {
    if (integrationId && currentOrganization) {
      loadIntegration();
    }
  }, [integrationId, currentOrganization]);

  async function loadIntegration() {
    if (!currentOrganization || !integrationId) return;

    setLoading(true);
    try {
      // Usar API para buscar a integração do backend
      const response = await api.get(`/api/${currentOrganization.id}/integrations/${integrationId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load integration');
      }
      
      const data = response.data.data;
      
      if (data) {
        setFormData({
          title: data.title || '',
          access_key_id: data.credentials?.access_key_id || '',
          secret_access_key: data.credentials?.secret_access_key || '',
          region: data.credentials?.region || '',
          bucket: data.credentials?.bucket || ''
        });

        // Verificar se existe uma chave mascarada
        if (data.credentials?.has_key) {
          setHasExistingKey(true);
          // Se a chave existente for válida, não precisamos validar novamente
          setIsCredentialsValid(true);
        } else {
          setIsCredentialsValid(null);
        }
      }
    } catch (error: unknown) {
      console.error('Erro ao carregar integração S3:', error);
      const apiError = error as ApiError;
      setError(apiError.response?.data?.error || apiError.message || t('settings:integrations.errors.loadError'));
    } finally {
      setLoading(false);
    }
  }

  async function validateS3Credentials(): Promise<boolean> {
    setValidating(true);
    setIsCredentialsValid(null);
    
    try {
      const s3Client = new S3Client({
        region: formData.region,
        credentials: {
          accessKeyId: formData.access_key_id,
          secretAccessKey: formData.secret_access_key
        }
      });

      // Tenta listar os buckets para verificar se as credenciais são válidas
      const command = new ListBucketsCommand({});
      const response = await s3Client.send(command);
      
      // Verifica se o bucket especificado existe
      const bucketExists = response.Buckets?.some((bucket: Bucket) => bucket.Name === formData.bucket);
      
      if (!bucketExists) {
        console.warn('O bucket especificado não foi encontrado, mas as credenciais são válidas');
      }
      
      setIsCredentialsValid(true);
      return true;
    } catch (error) {
      console.error('Erro ao validar credenciais S3:', error);
      setIsCredentialsValid(false);
      return false;
    } finally {
      setValidating(false);
    }
  }

  const handleValidateCredentials = async () => {
    // Validar se todos os campos necessários estão preenchidos
    if (!formData.access_key_id || !formData.secret_access_key || !formData.region || !formData.bucket) {
      setError(t('settings:integrations.errors.requiredFields'));
      return;
    }
    
    setError('');
    await validateS3Credentials();
  };

  // Função para iniciar a edição da chave
  const handleStartEditKey = () => {
    setIsEditingKey(true);
    setFormData(prev => ({ ...prev, secret_access_key: '' }));
    setIsCredentialsValid(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    // Validar campos obrigatórios
    if (!formData.title || !formData.access_key_id || !formData.region || !formData.bucket) {
      setError(t('settings:integrations.errors.requiredFields'));
      return;
    }

    // Se estiver editando a chave ou não tiver uma chave existente, verificar se a chave foi validada
    if ((isEditingKey || !hasExistingKey) && (!formData.secret_access_key || isCredentialsValid !== true)) {
      setError(t('settings:integrations.errors.keyNotValidated'));
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Preparar dados para envio
      const integrationData: IntegrationData = {
        title: formData.title,
        type: 'aws_s3',
        status: 'active'
      };

      // Só incluir credenciais completas se estiver editando a chave ou não tiver uma chave existente
      if (isEditingKey || !hasExistingKey) {
        integrationData.credentials = {
          access_key_id: formData.access_key_id,
          secret_access_key: formData.secret_access_key,
          region: formData.region,
          bucket: formData.bucket
        };
      } else {
        // Se não estiver editando, enviar apenas os campos não sensíveis
        integrationData.credentials = {
          access_key_id: formData.access_key_id,
          secret_access_key: '', // Não enviar a chave secreta se não estiver editando
          region: formData.region,
          bucket: formData.bucket
        };
      }

      if (integrationId) {
        // Atualização - enviar para o backend
        const response = await api.put(
          `/api/${currentOrganization.id}/integrations/${integrationId}`, 
          integrationData
        );
        
        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to update integration');
        }
      } else {
        // Cadastro - enviar para o backend
        const response = await api.post(
          `/api/${currentOrganization.id}/integrations`, 
          integrationData
        );
        
        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to create integration');
        }
      }

      onSuccess();
    } catch (error: unknown) {
      console.error('Erro ao salvar integração S3:', error);
      const apiError = error as ApiError;
      setError(apiError.response?.data?.error || apiError.message || t('common:error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-6">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-100 dark:border-blue-800">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
          {t('settings:integrations.s3.howToGetKey')}
        </h3>
        <ol className="list-decimal pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li>{t('settings:integrations.s3.step1')}</li>
          <li>{t('settings:integrations.s3.step2')}</li>
          <li>{t('settings:integrations.s3.step3')}</li>
          <li>{t('settings:integrations.s3.step4')}</li>
          <li>{t('settings:integrations.s3.step5')}</li>
        </ol>
        <div className="mt-3">
          <a 
            href="https://console.aws.amazon.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            {t('settings:integrations.s3.visitWebsite')}
            <ExternalLink className="w-4 h-4 ml-1" />
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('settings:integrations.form.title')} *
          </label>
          <input
            type="text"
            required
            placeholder={t('settings:integrations.form.titlePlaceholderS3')}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Access Key ID *
          </label>
          <input
            type="text"
            required
            placeholder="AKIA..."
            value={formData.access_key_id}
            onChange={(e) => {
              setFormData({ ...formData, access_key_id: e.target.value });
              setIsCredentialsValid(null);
            }}
            className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Secret Access Key *
          </label>
          
          {hasExistingKey && !isEditingKey ? (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex-1 p-2 border rounded-l-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  ••••••••••••••••••••••
                </div>
                <button
                  type="button"
                  onClick={handleStartEditKey}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:change')}
                </button>
              </div>
              <div className="text-sm text-green-600 dark:text-green-400 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                <span>{t('settings:integrations.form.validKeyStored')}</span>
              </div>
            </div>
          ) : (
            <input
              type="password"
              required={!hasExistingKey || isEditingKey}
              placeholder="Your AWS secret key"
              value={formData.secret_access_key}
              onChange={(e) => {
                setFormData({ ...formData, secret_access_key: e.target.value });
                setIsCredentialsValid(null);
              }}
              className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            />
          )}
          
          {hasExistingKey && isEditingKey && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              <button
                type="button"
                onClick={() => {
                  setIsEditingKey(false);
                  setIsCredentialsValid(true);
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('settings:integrations.form.keepExistingKey')}
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Region *
          </label>
          <input
            type="text"
            required
            placeholder="us-east-1"
            value={formData.region}
            onChange={(e) => {
              setFormData({ ...formData, region: e.target.value });
              setIsCredentialsValid(null);
            }}
            className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Bucket Name *
          </label>
          <input
            type="text"
            required
            placeholder="my-bucket"
            value={formData.bucket}
            onChange={(e) => {
              setFormData({ ...formData, bucket: e.target.value });
              setIsCredentialsValid(null);
            }}
            className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={handleValidateCredentials}
            disabled={validating || !formData.access_key_id || !formData.secret_access_key || !formData.region || !formData.bucket}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {validating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {t('settings:integrations.s3.validateCredentials')}
          </button>
          
          {isCredentialsValid !== null && (
            <div className={`mt-2 flex items-center text-sm ${isCredentialsValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isCredentialsValid ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span>{t('settings:integrations.s3.validCredentials')}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span>{t('settings:integrations.s3.invalidCredentials')}</span>
                </>
              )}
            </div>
          )}
          
          {isCredentialsValid === null && (isEditingKey || !hasExistingKey) && formData.secret_access_key && (
            <div className="mt-2 text-sm text-amber-600 dark:text-amber-400 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
              <span>{t('settings:integrations.form.validateKeyBeforeSaving')}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="text-red-500 text-sm mt-2">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t('common:cancel')}
          </button>
          <button
            type="submit"
            disabled={saving || ((isEditingKey || !hasExistingKey) && isCredentialsValid !== true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('common:save')}
          </button>
        </div>
      </form>
    </div>
  );
} 