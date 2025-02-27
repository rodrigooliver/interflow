import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Smile, Paperclip, Send, Mic, Loader2, Image, FileText, X, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { FileUpload } from './FileUpload';
import { supabase } from '../../lib/supabase';
import { AudioPlayer } from './AudioPlayer';
import { AIImproveModal } from './AIImproveModal';
import { Message } from '../../types/database';
import { useAuthContext } from '../../contexts/AuthContext';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import api from '../../lib/api';

interface MessageInputProps {
  chatId: string;
  organizationId: string;
  onMessageSent: () => void;
  replyTo?: {
    message: Message;
    onClose: () => void;
  };
  isSubscriptionReady?: boolean;
}

interface EmojiData {
  native: string;
  // outros campos do emoji se necessário
}

export function MessageInput({ 
  chatId, 
  organizationId,
  onMessageSent, 
  replyTo, 
  isSubscriptionReady = false
}: MessageInputProps) {
  const { profile } = useAuthContext();
  const { i18n, t } = useTranslation('chats');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [textFormat] = useState({
    bold: false,
    italic: false
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState<'image' | 'document' | null>(null);
  const [error, setError] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<{ 
    file: File; 
    preview: string; 
    type: string; 
    name: string 
  }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [deletingAttachment, setDeletingAttachment] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout>();
  const [showAIModal, setShowAIModal] = useState(false);
  const [sending, setSending] = useState(false);
  const { currentOrganization } = useOrganizationContext();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleFileUploadComplete = (file: File, type: string, name: string) => {
    let preview = '';
    
    try {
      // Criar URL para arquivos de imagem e áudio
      if (file instanceof Blob && (type.startsWith('image/') || type.startsWith('audio/'))) {
        preview = URL.createObjectURL(file);
      }
    } catch (error) {
      console.error('Erro ao criar preview:', error);
    }
    
    setPendingAttachments(prev => [...prev, { 
      file, 
      preview, 
      type, 
      name 
    }]);
  };

  const handleSendMessage = async (content: string | null, attachments?: File[]) => {
    try {
      // Validação: content só pode ser null se houver anexos
      if (content === null && (!attachments || attachments.length === 0)) {
        throw new Error(t('errors.emptyMessage'));
      }

      // Preparar FormData para envio
      const formData = new FormData();
      
      // Adicionar arquivos ao FormData
      if (attachments && attachments.length > 0) {
        attachments.forEach((file, index) => {
          formData.append(`attachments`, file, file.name);
        });
      }

      // Adicionar outros dados da mensagem
      if (content) {
        formData.append('content', content);
      }
      
      if (replyTo?.message.id) {
        formData.append('replyToMessageId', replyTo.message.id);
      }

      // Enviar para a nova API de mensagens usando api
      const response = await api.post(`/api/${currentOrganization?.id}/chat/${chatId}/message`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || t('errors.sending'));
      }

      onMessageSent();
      if (replyTo?.onClose) {
        replyTo.onClose();
      }

      return response.data;
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.response?.data?.error || t('errors.sending'));
      throw error;
    }
  };

  const handleSend = async () => {
    if (!isSubscriptionReady) {
      setError(t('errors.waitingConnection'));
      return;
    }

    if (!message.trim() && pendingAttachments.length === 0) return;
    
    setSending(true);
    setError('');

    try {
      let formattedMessage = message;
      if (textFormat.bold) formattedMessage = `**${formattedMessage}**`;
      if (textFormat.italic) formattedMessage = `_${formattedMessage}_`;

      // Preparar arquivos para upload
      const attachmentFiles = pendingAttachments.map(attachment => attachment.file);

      // Enviar mensagem com possíveis anexos
      await handleSendMessage(
        formattedMessage.trim() || null, 
        attachmentFiles
      );

      // Limpar estados após envio
      setMessage('');
      setPendingAttachments([]);
      setShowEmojiPicker(false);
      setShowAttachmentMenu(false);
      setError('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError(t('errors.sending'));
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onEmojiSelect = (emoji: EmojiData) => {
    setMessage(prev => prev + emoji.native);
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // // Determinar o formato suportado
      // const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      //   ? 'audio/webm'
      //   : 'audio/mp4';
      // Forçar o uso do formato MP4
      const mimeType = 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        try {
          // const extension = mimeType.split('/')[1];
          const timestamp = new Date().getTime(); // Usar timestamp como número
          // const fileName = `audio-${timestamp}.${extension}`;
          const fileName = `audio-${timestamp}.mp4`;
          const file = new File([audioBlob], fileName, { type: mimeType });
          
          const { error } = await supabase.storage
            .from('attachments')
            .upload(`${currentOrganization?.id}/chat-attachments/${fileName}`, file);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(`${currentOrganization?.id}/chat-attachments/${fileName}`);

          handleFileUploadComplete(file, mimeType, fileName);
        } catch (error) {
          setError(t('errors.uploadFailed'));
          console.error('Error uploading audio:', error);
        }
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Iniciar o contador
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      setError(t('errors.microphoneAccess'));
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      // Limpar o intervalo do contador
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setMediaRecorder(null);
      setRecordingDuration(0);
    }
  };

  // Limpar o intervalo quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const applyFormatting = (format: 'bold' | 'italic') => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = message.substring(start, end);

      if (selectedText) {
        const prefix = format === 'bold' ? '**' : '_';
        const newText = 
          message.substring(0, start) +
          `${prefix}${selectedText}${prefix}` +
          message.substring(end);
        
        setMessage(newText);
        
        // Restaurar o foco no textarea
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(
              start + prefix.length,
              end + prefix.length
            );
          }
        }, 0);
      }
    }
  };

  // Atualizar os handlers dos botões de formatação
  const handleBoldClick = () => {
    applyFormatting('bold');
  };

  const handleItalicClick = () => {
    applyFormatting('italic');
  };

  // Limpa o erro quando a subscrição fica pronta
  useEffect(() => {
    if (isSubscriptionReady) {
      setError('');
    }
  }, [isSubscriptionReady]);

  // Adicione esta função para limpar as URLs de preview quando o componente for desmontado
  useEffect(() => {
    return () => {
      // Limpar todas as URLs de objeto criadas
      pendingAttachments.forEach(attachment => {
        if (attachment.preview) {
          URL.revokeObjectURL(attachment.preview);
        }
      });
    };
  }, [pendingAttachments]);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pb-3 pt-2">
      {replyTo && (
        <div className="p-2 bg-gray-50 dark:bg-gray-800 flex items-start space-x-2">
          <div className="flex-1 text-sm border-l-2 border-blue-500 pl-2">
            <div className="text-blue-500 font-medium">
              {replyTo.message.sender_type === 'agent' 
                ? t('you') 
                : t('customer')
              }
            </div>
            <div className="text-gray-600 dark:text-gray-300 truncate">
              {replyTo.message.content}
            </div>
          </div>
          <button 
            onClick={replyTo.onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      {pendingAttachments.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {pendingAttachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-2"
            >
              {attachment.type.startsWith('image/') && attachment.preview ? (
                <img 
                  src={attachment.preview} 
                  alt={attachment.name} 
                  className="w-12 h-12 object-cover rounded-md mr-2" 
                />
              ) : attachment.type.startsWith('audio/') && attachment.preview ? (
                <AudioPlayer
                  src={attachment.preview}
                  fileName={attachment.name}
                  compact
                />
              ) : (
                <div className="flex items-center justify-center w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-md mr-2">
                  <FileText className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </div>
              )}
              <span className="text-sm truncate max-w-[180px] text-gray-700 dark:text-gray-300">
                {attachment.name}
              </span>
              <button
                onClick={() => handleRemoveAttachment(index)}
                className="ml-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center space-x-2 mb-1">
        <button
          onClick={handleBoldClick}
          className={`p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400`}
          title={t('formatting.bold')}
        >
          <Bold className="w-5 h-5" />
        </button>
        <button
          onClick={handleItalicClick}
          className={`p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400`}
          title={t('formatting.italic')}
        >
          <Italic className="w-5 h-5" />
        </button>
        <div className="relative" ref={attachmentMenuRef}>
          <button
            onClick={() => {
              setShowAttachmentMenu(!showAttachmentMenu);
              setShowEmojiPicker(false);
            }}
            className={`p-1 rounded-lg transition-colors ${
              showAttachmentMenu
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400'
            }`}
            title={t('attachments.title')}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          {showAttachmentMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 min-w-[160px]">
              <button
                onClick={() => {
                  setShowFileUpload('image');
                  setShowAttachmentMenu(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Image className="w-4 h-4 mr-2" />
                <span>{t('attachments.image')}</span>
              </button>
              <button
                onClick={() => {
                  setShowFileUpload('document');
                  setShowAttachmentMenu(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                <span>{t('attachments.document')}</span>
              </button>
            </div>
          )}
        </div>
        <div className="relative" ref={emojiPickerRef}>
          <button
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachmentMenu(false);
            }}
            className={`p-1 rounded-lg transition-colors ${
              showEmojiPicker
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400'
            }`}
            title={t('emoji.title')}
          >
            <Smile className="w-5 h-5" />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2">
              <Picker
                data={data}
                onEmojiSelect={onEmojiSelect}
                locale={i18n.language}
                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                previewPosition="none"
                skinTonePosition="none"
              />
            </div>
          )}
        </div>
        <button
          onClick={() => setShowAIModal(true)}
          className="p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400"
          title={t('ai.improve')}
        >
          <Sparkles className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center space-x-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isSubscriptionReady ? t('input.placeholder') : t('input.waitingConnection')}
          className="flex-1 min-h-[40px] max-h-[120px] px-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
        />
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-2 rounded-lg transition-colors flex items-center ${
            isRecording
              ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400'
          }`}
          title={t(isRecording ? 'voice.stop' : 'voice.start')}
        >
          <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
          {isRecording && (
            <span className="ml-2 text-sm">
              {Math.floor(recordingDuration / 60)}:
              {(recordingDuration % 60).toString().padStart(2, '0')}
            </span>
          )}
        </button>
        <button
          onClick={handleSend}
          disabled={
            sending || 
            (!message.trim() && pendingAttachments.length === 0) || 
            !isSubscriptionReady
          }
          className="p-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={
            !isSubscriptionReady 
              ? t('waitingConnection') 
              : t('send')
          }
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : !isSubscriptionReady ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {showFileUpload && (
        <FileUpload
          type={showFileUpload}
          organizationId={currentOrganization?.id || ''}
          onUploadComplete={handleFileUploadComplete}
          onError={setError}
          onClose={() => setShowFileUpload(null)}
        />
      )}

      {showAIModal && (
        <AIImproveModal
          text={message}
          onClose={() => setShowAIModal(false)}
          onTextUpdate={(newText) => setMessage(newText)}
        />
      )}
    </div>
  );
}