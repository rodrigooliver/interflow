import { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { supabase } from '../../lib/supabase';
import { generateApiKey } from '../../utils/apiKey';
import { useTranslation } from 'react-i18next';

interface Props {
  onSuccess: () => void;
}

export function CreateApiKeyDialog({ onSuccess }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    try {
      setLoading(true);
      
      // Gera uma nova API key
      const apiKey = generateApiKey();
      const keyHash = await hashApiKey(apiKey);

      // Obtém o profile atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Insere a nova key no banco
      const { error } = await supabase.from('api_keys').insert({
        name,
        key_hash: keyHash,
        profile_id: user.id,
        organization_id: user.user_metadata.organization_id,
        created_by: user.id
      });

      if (error) throw error;

      // Mostra a key para o usuário copiar
      setNewKey(apiKey);
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar API key:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        {t('apiKeys.create.button')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{t('apiKeys.create.title')}</Dialog.Title>
          </Dialog.Header>

          {!newKey ? (
            <>
              <div className="space-y-4">
                <Input
                  label={t('apiKeys.create.nameLabel')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('apiKeys.create.namePlaceholder')}
                  className="dark:bg-gray-800 dark:text-white"
                />
              </div>

              <Dialog.Footer>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleCreate}
                  loading={loading}
                  disabled={!name}
                  className="dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {t('common.create')}
                </Button>
              </Dialog.Footer>
            </>
          ) : (
            <>
              <Alert variant="warning" className="dark:bg-yellow-900/50 dark:text-yellow-200">
                {t('apiKeys.create.copyWarning')}
              </Alert>

              <div className="mt-4">
                <Input
                  value={newKey}
                  readOnly
                  onClick={(e) => e.currentTarget.select()}
                  className="dark:bg-gray-800 dark:text-white font-mono"
                />
              </div>

              <Dialog.Footer>
                <Button
                  onClick={() => {
                    setOpen(false);
                    setNewKey('');
                    setName('');
                  }}
                  className="dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {t('common.close')}
                </Button>
              </Dialog.Footer>
            </>
          )}
        </Dialog.Content>
      </Dialog>
    </>
  );
} 