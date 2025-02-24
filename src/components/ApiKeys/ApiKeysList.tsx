import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { CreateApiKeyButton } from './CreateApiKeyButton';
import { useTranslation } from 'react-i18next';

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export function ApiKeysList() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Erro ao carregar API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      await loadApiKeys();
    } catch (error) {
      console.error('Erro ao revogar API key:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold dark:text-white">
          {t('apiKeys.title', 'Suas API Keys')}
        </h2>
        <CreateApiKeyButton onSuccess={loadApiKeys} />
      </div>

      {loading ? (
        <div className="dark:text-gray-300">{t('common.loading', 'Carregando...')}</div>
      ) : (
        <div className="grid gap-4">
          {apiKeys.map((key) => (
            <Card key={key.id} className="p-4 dark:bg-gray-800">
              <div className="flex justify-between items-start">
                <div>
                  <Text className="font-medium dark:text-white">{key.name}</Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    {t('apiKeys.createdAt', 'Criada em')}: {new Date(key.created_at).toLocaleDateString()}
                  </Text>
                  {key.last_used_at && (
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {t('apiKeys.lastUsed', 'Último uso')}: {new Date(key.last_used_at).toLocaleDateString()}
                    </Text>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={key.is_active ? "success" : "error"}
                  >
                    {key.is_active ? t('apiKeys.status.active', 'Ativa') : t('apiKeys.status.revoked', 'Revogada')}
                  </Badge>
                  {key.is_active && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokeApiKey(key.id)}
                    >
                      {t('apiKeys.actions.revoke', 'Revogar')}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 