import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { supabase } from '../../lib/supabase';
import { generateApiKey, hashApiKey } from '../../utils/apiKey';

interface Props {
  onSuccess: () => void;
}

export function CreateApiKeyButton({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Gera uma nova API key
      const apiKey = generateApiKey();
      const keyHash = await hashApiKey(apiKey);

      // Obtém o profile atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Usuário não autenticado');

      // Obtém a organização do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      if (!profile?.organization_id) throw new Error('Organização não encontrada');

      // Insere a nova key no banco
      const { error: insertError } = await supabase
        .from('api_keys')
        .insert({
          name,
          key_hash: keyHash,
          profile_id: user.id,
          organization_id: profile.organization_id,
          created_by: user.id
        });

      if (insertError) throw insertError;

      // Mostra a key para o usuário copiar
      setNewKey(apiKey);
      onSuccess();
    } catch (err) {
      console.error('Erro ao criar API key:', err);
      setError('Erro ao criar API key. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setName('');
    setNewKey('');
    setError('');
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Criar Nova API Key
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova API Key</DialogTitle>
            <DialogDescription>
              Crie uma nova API key para integrar com seus serviços.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="mb-4">
              {error}
            </Alert>
          )}

          {!newKey ? (
            <>
              <div className="space-y-4">
                <Input
                  label="Nome da API Key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Integração Webhook"
                  disabled={loading}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  loading={loading}
                  disabled={!name || loading}
                >
                  Criar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <Alert variant="warning" className="mb-4">
                Copie sua API key agora. Você não poderá vê-la novamente!
              </Alert>

              <div className="mt-4">
                <Input
                  value={newKey}
                  readOnly
                  onClick={(e) => e.currentTarget.select()}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Clique na key acima para copiar
                </p>
              </div>

              <DialogFooter>
                <Button onClick={handleClose}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 