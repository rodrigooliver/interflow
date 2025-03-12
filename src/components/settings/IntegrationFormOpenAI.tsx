import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { useOrganizationContext } from '../../contexts/OrganizationContext';

/**
 * Formulário para configuração de integração com OpenAI
 * 
 * Segurança:
 * - As chaves de API são enviadas para o backend para serem criptografadas antes de armazenadas
 * - A validação da chave também é feita pelo backend para evitar exposição da chave no frontend
 * - O backend deve implementar as seguintes rotas:
 *   - GET /api/:organizationId/integrations/:integrationId - Buscar integração
 *   - POST /api/:organizationId/integrations - Criar integração
 *   - PUT /api/:organizationId/integrations/:integrationId - Atualizar integração
 *   - POST /api/:organizationId/integrations/openai/validate - Validar chave OpenAI
 */

/**
 * Nota: Adicione as seguintes chaves de tradução aos arquivos de tradução:
 * - settings:integrations.errors.keyNotValidated: "A chave API precisa ser validada antes de salvar."
 * - settings:integrations.form.validateKeyBeforeSaving: "Por favor, valide a chave API antes de salvar."
 * - settings:integrations.openai.step5: "Adicione um método de pagamento à sua conta OpenAI para utilizar a API."
 * - settings:integrations.openai.paymentRequired: "Importante: É necessário adicionar um método de pagamento válido à sua conta OpenAI para utilizar a API, mesmo para o nível gratuito."
 * - settings:integrations.openai.addPaymentMethod: "Adicionar método de pagamento"
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
    api_key: string;
  };
}

interface IntegrationFormOpenAIProps {
  onSuccess: () => void;
  onCancel: () => void;
  integrationId?: string;
}

export function IntegrationFormOpenAI({
  onSuccess,
  onCancel,
  integrationId
}: IntegrationFormOpenAIProps) {
  const { t } = useTranslation(['settings', 'common']);
  const { currentOrganization } = useOrganizationContext();
  const [loading, setLoading] = useState(!!integrationId);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    api_key: ''
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
          api_key: data.credentials?.api_key || ''
        });

        // Verificar se existe uma chave mascarada
        if (data.credentials?.has_key) {
          setHasExistingKey(true);
          // Se a chave existente for válida, não precisamos validar novamente
          setIsKeyValid(true);
        } else {
          setIsKeyValid(null);
        }
      }
    } catch (error: unknown) {
      console.error('Erro ao carregar integração OpenAI:', error);
      const apiError = error as ApiError;
      setError(apiError.response?.data?.error || apiError.message || t('settings:integrations.errors.loadError'));
    } finally {
      setLoading(false);
    }
  }

  async function validateOpenAIKey(apiKey: string): Promise<boolean> {
    setValidating(true);
    setIsKeyValid(null);
    
    try {
      // Usar o backend para validar a chave OpenAI
      const response = await api.post(`/api/${currentOrganization?.id}/integrations/openai/validate`, {
        api_key: apiKey
      });
      
      const isValid = response.data.success === true;
      setIsKeyValid(isValid);
      return isValid;
    } catch (error: unknown) {
      console.error('Erro ao validar chave OpenAI:', error);
      const apiError = error as ApiError;
      setError(apiError.response?.data?.error || apiError.message || t('settings:integrations.errors.invalidOpenAIKey'));
      setIsKeyValid(false);
      return false;
    } finally {
      setValidating(false);
    }
  }

  const handleValidateKey = async () => {
    if (!formData.api_key) {
      setError(t('settings:integrations.errors.emptyApiKey'));
      return;
    }
    
    setError('');
    await validateOpenAIKey(formData.api_key);
  };

  // Função para iniciar a edição da chave
  const handleStartEditKey = () => {
    setIsEditingKey(true);
    setFormData(prev => ({ ...prev, api_key: '' }));
    setIsKeyValid(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    // Validar campos obrigatórios
    if (!formData.title) {
      setError(t('settings:integrations.errors.requiredFields'));
      return;
    }

    // Se estiver editando a chave ou não tiver uma chave existente, verificar se a chave foi validada
    if ((isEditingKey || !hasExistingKey) && (!formData.api_key || isKeyValid !== true)) {
      setError(t('settings:integrations.errors.keyNotValidated'));
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Se estiver editando a chave, validar novamente
      if (isEditingKey && formData.api_key) {
        const isValidKey = await validateOpenAIKey(formData.api_key);
        if (!isValidKey) {
          setError(t('settings:integrations.errors.invalidOpenAIKey'));
          setSaving(false);
          return;
        }
      }

      // Preparar dados para envio
      const integrationData: IntegrationData = {
        title: formData.title,
        type: 'openai',
        status: 'active'
      };

      // Só incluir credenciais se estiver editando a chave ou não tiver uma chave existente
      if (isEditingKey || !hasExistingKey) {
        integrationData.credentials = {
          api_key: formData.api_key
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
      console.error('Erro ao salvar integração OpenAI:', error);
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
          {t('settings:integrations.openai.howToGetKey')}
        </h3>
        <ol className="list-decimal pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li>{t('settings:integrations.openai.step1')}</li>
          <li>{t('settings:integrations.openai.step2')}</li>
          <li>{t('settings:integrations.openai.step3')}</li>
          <li>{t('settings:integrations.openai.step4')}</li>
          <li>{t('settings:integrations.openai.step5')}</li>
        </ol>
        <div className="mt-3 text-sm text-amber-600 dark:text-amber-500 font-medium">
          <p>{t('settings:integrations.openai.paymentRequired')}</p>
        </div>
        <div className="mt-3 flex flex-col space-y-2">
          <a 
            href="https://platform.openai.com/api-keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            {t('settings:integrations.openai.visitWebsite')}
            <ExternalLink className="w-4 h-4 ml-1" />
          </a>
          <a 
            href="https://platform.openai.com/account/billing/payment-methods" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            {t('settings:integrations.openai.addPaymentMethod')}
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
            placeholder={t('settings:integrations.form.titlePlaceholderOpenAI')}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            API Key *
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
            <>
              <div className="flex">
                <input
                  type="password"
                  required={!hasExistingKey || isEditingKey}
                  placeholder="sk-..."
                  value={formData.api_key}
                  onChange={(e) => {
                    setFormData({ ...formData, api_key: e.target.value });
                    setIsKeyValid(null);
                  }}
                  className="flex-1 p-2 border rounded-l-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleValidateKey}
                  disabled={validating || !formData.api_key}
                  className="px-4 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 whitespace-nowrap"
                >
                  {validating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('settings:integrations.form.validate')
                  )}
                </button>
              </div>
              
              {isKeyValid !== null && (
                <div className={`mt-2 flex items-center text-sm ${isKeyValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isKeyValid ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span>{t('settings:integrations.form.validKey')}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span>{t('settings:integrations.form.invalidKey')}</span>
                    </>
                  )}
                </div>
              )}
              
              {isKeyValid === null && formData.api_key && (
                <div className="mt-2 text-sm text-amber-600 dark:text-amber-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span>{t('settings:integrations.form.validateKeyBeforeSaving')}</span>
                </div>
              )}

              {hasExistingKey && isEditingKey && (
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingKey(false);
                      setIsKeyValid(true);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('settings:integrations.form.keepExistingKey')}
                  </button>
                </div>
              )}
            </>
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
            disabled={saving || !formData.title || ((isEditingKey || !hasExistingKey) && (!formData.api_key || isKeyValid !== true))}
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