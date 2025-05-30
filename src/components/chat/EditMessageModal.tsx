import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit3, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "../ui/Dialog";
import { Button } from "../ui/Button";
import { useAuthContext } from '../../contexts/AuthContext';
import api from '../../lib/api';

interface EditMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  chatId: string | number;
  initialContent: string;
  organizationId?: string;
}

export function EditMessageModal({
  isOpen,
  onClose,
  messageId,
  chatId,
  initialContent,
  organizationId
}: EditMessageModalProps) {
  const { t } = useTranslation('chats');
  const { currentOrganizationMember } = useAuthContext();
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetar o conteúdo quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      setEditContent(initialContent);
      setError(null);
    }
  }, [isOpen, initialContent]);

  // Função para enviar a edição
  const handleEditSubmit = async () => {
    if (!editContent.trim() || isEditing) return;
    
    setIsEditing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('content', editContent.trim());
      
      const orgId = organizationId || currentOrganizationMember?.organization.id;
      
      await api.put(`/api/${orgId}/chat/${chatId}/message/${messageId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      onClose();
      // A mensagem será atualizada automaticamente via WebSocket ou refresh
    } catch (err) {
      setError(t("errors.editMessage", "Erro ao editar mensagem"));
      console.error("Erro ao editar mensagem:", err);
    } finally {
      setIsEditing(false);
    }
  };

  const handleClose = () => {
    if (!isEditing) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            {t("editMessage.title", "Editar mensagem")}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {t("editMessage.description", "Você pode editar esta mensagem dentro de 15 minutos após o envio.")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("editMessage.content", "Conteúdo")}
            </label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              rows={4}
              placeholder={t("editMessage.placeholder", "Digite o novo conteúdo da mensagem...")}
              disabled={isEditing}
            />
          </div>
          
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isEditing}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t("editMessage.cancel", "Cancelar")}
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={isEditing || !editContent.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 flex items-center"
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("editMessage.saving", "Salvando...")}
                </>
              ) : (
                <>
                  <Edit3 className="mr-2 h-4 w-4" />
                  {t("editMessage.edit", "Editar")}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 