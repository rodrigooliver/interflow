import React, { useState, useEffect } from 'react';
import { MessageInput } from './MessageInput';
import { Message } from '../../types/database';

// Interface para configurações de funcionalidades por canal
interface ChannelFeatures {
  canReplyToMessages: boolean;
  canSendAudio: boolean;
  canSendTemplates: boolean;
  has24HourWindow: boolean;
  canSendAfter24Hours: boolean;
  canDeleteMessages?: boolean;
}

interface MessageInputWrapperProps {
  chatId: string;
  organizationId: string;
  onMessageSent: () => void;
  replyTo?: {
    message: Message;
    onClose: () => void;
  };
  isSubscriptionReady?: boolean;
  channelFeatures?: ChannelFeatures;
  addOptimisticMessage?: (message: {
    id: string;
    content: string | null;
    attachments?: { file: File; preview: string; type: string; name: string; url?: string }[];
    replyToMessageId?: string;
    isPending: boolean;
  }) => void;
  droppedFiles?: File[];
}

export function MessageInputWrapper({ 
  chatId, 
  organizationId,
  onMessageSent, 
  replyTo, 
  isSubscriptionReady = false,
  channelFeatures,
  addOptimisticMessage,
  droppedFiles = []
}: MessageInputWrapperProps) {
  // Estado para armazenar a referência do MessageInput
  const [messageInputInstance, setMessageInputInstance] = useState<any>(null);
  
  // Effect para processar os arquivos quando eles forem passados
  useEffect(() => {
    if (droppedFiles.length > 0 && messageInputInstance) {
      // Processar cada arquivo
      droppedFiles.forEach(file => {
        try {
          // Determinar o tipo de arquivo
          if (file.type.startsWith('image/')) {
            // Imagem
            messageInputInstance.handleFileUploadComplete(file, file.type, file.name);
          } else if (
            file.type === 'application/pdf' || 
            file.type.includes('document') || 
            file.type.includes('audio/') ||
            file.type.includes('video/') ||
            file.type.includes('text/')
          ) {
            // Documento, áudio, vídeo ou texto
            messageInputInstance.handleFileUploadComplete(file, file.type, file.name);
          } else {
            // Outro tipo de arquivo
            messageInputInstance.handleFileUploadComplete(
              file, 
              file.type || 'application/octet-stream', 
              file.name
            );
          }
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
        }
      });
    }
  }, [droppedFiles, messageInputInstance]);

  // Função para capturar o componente MessageInput
  const captureMessageInput = (instance: any) => {
    if (instance && instance.handleFileUploadComplete) {
      setMessageInputInstance(instance);
    }
  };

  return (
    <MessageInput
      chatId={chatId}
      organizationId={organizationId}
      onMessageSent={onMessageSent}
      replyTo={replyTo}
      isSubscriptionReady={isSubscriptionReady}
      channelFeatures={channelFeatures}
      addOptimisticMessage={addOptimisticMessage}
      ref={captureMessageInput}
    />
  );
} 