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
import api from '../../lib/api';
import { useMessageShortcuts } from '../../hooks/useQueryes';

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

interface ShortcutSuggestion {
  id: string;
  title: string;
  content: string;
  attachments: {
    name: string;
    type: string;
    url?: string;
  }[];
}

export function MessageInput({ 
  chatId, 
  organizationId,
  onMessageSent, 
  replyTo, 
  isSubscriptionReady = false
}: MessageInputProps) {
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
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout>();
  const [showAIModal, setShowAIModal] = useState(false);
  const [sending, setSending] = useState(false);
  const { currentOrganizationMember } = useAuthContext();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [shortcutFilter, setShortcutFilter] = useState('');
  const [selectedShortcutIndex, setSelectedShortcutIndex] = useState(0);
  const shortcutsRef = useRef<HTMLDivElement>(null);
  const { messageShortcuts, isLoading: isLoadingShortcuts } = useMessageShortcuts(organizationId);
  const [filteredShortcuts, setFilteredShortcuts] = useState<ShortcutSuggestion[]>([]);
  const selectedItemRef = useRef<HTMLLIElement>(null);

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
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      setPendingAttachments(prev => [...prev, { file, preview, type, name }]);
    };
    reader.readAsDataURL(file);
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
        attachments.forEach(file => {
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
      const response = await api.post(`/api/${currentOrganizationMember?.organization.id}/chat/${chatId}/message`, formData, {
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
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      
      // Melhorar o tratamento de erro
      let errorMessage = t('errors.sending', 'Erro ao enviar mensagem');
      if (error instanceof Error) {
        const apiError = error as { response?: { data?: { error?: string } } };
        if (apiError.response?.data?.error) {
          errorMessage = apiError.response.data.error;
        }
      }
      
      setError(errorMessage);
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
    // Verificar se o usuário digitou "/"
    if (e.key === '/' && message.length === 0) {
      // Não precisamos fazer nada aqui, pois o handleMessageChange vai detectar a mudança
    }
    
    // Gerenciar navegação na lista de atalhos
    if (showShortcuts && filteredShortcuts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedShortcutIndex(prev => 
          prev < filteredShortcuts.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedShortcutIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        applyShortcut(filteredShortcuts[selectedShortcutIndex]);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowShortcuts(false);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        applyShortcut(filteredShortcuts[selectedShortcutIndex]);
        return;
      }
    }
    
    // Comportamento original para Enter
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
            .upload(`${currentOrganizationMember?.organization.id}/chat-attachments/${fileName}`, file);

          if (error) throw error;

          // Obter a URL pública do arquivo
          supabase.storage
            .from('attachments')
            .getPublicUrl(`${currentOrganizationMember?.organization.id}/chat-attachments/${fileName}`);

          // Usar a URL pública se necessário
          // console.log('Arquivo disponível em:', storageData?.publicUrl);

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

  useEffect(() => {
    // Filtrar atalhos com base no texto após a barra
    if (showShortcuts && shortcutFilter !== '') {
      const filtered = messageShortcuts
        .filter(shortcut => 
          shortcut.title.toLowerCase().includes(shortcutFilter.toLowerCase())
        )
        .map(shortcut => ({
          id: shortcut.id,
          title: shortcut.title,
          content: shortcut.content,
          attachments: shortcut.attachments
        }));
      setFilteredShortcuts(filtered);
      setSelectedShortcutIndex(0);
    } else if (showShortcuts) {
      const allShortcuts = messageShortcuts.map(shortcut => ({
        id: shortcut.id,
        title: shortcut.title,
        content: shortcut.content,
        attachments: shortcut.attachments
      }));
      setFilteredShortcuts(allShortcuts);
      setSelectedShortcutIndex(0);
    }
  }, [shortcutFilter, messageShortcuts, showShortcuts]);

  // Função para aplicar o atalho selecionado
  const applyShortcut = async (shortcut: ShortcutSuggestion) => {
    setMessage(shortcut.content);
    setShowShortcuts(false);
    
    // Se houver anexos, carregá-los
    if (shortcut.attachments && shortcut.attachments.length > 0) {
      try {
        for (const attachment of shortcut.attachments) {
          // Buscar o arquivo do storage
          const { data, error } = await supabase.storage
            .from('attachments')
            .download(`${organizationId}/shortcut-attachments/${attachment.name}`);
            
          if (error) throw error;
          
          if (data) {
            const file = new File([data], attachment.name, { type: attachment.type });
            handleFileUploadComplete(file, attachment.type, attachment.name);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar anexos do atalho:', error);
      }
    }
    
    // Focar no textarea após aplicar o atalho
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Simplificar a lógica de exibição da lista de atalhos
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    
    // Verificar se a mensagem começa com "/"
    if (newValue.startsWith('/')) {
      setShowShortcuts(true);
      setShortcutFilter(newValue.substring(1)); // Remove a barra para filtrar
    } else {
      setShowShortcuts(false);
    }
  };

  // Adicionar useEffect para rolar até o item selecionado
  useEffect(() => {
    if (selectedItemRef.current && shortcutsRef.current) {
      const container = shortcutsRef.current;
      const selectedItem = selectedItemRef.current;
      
      // Calcular a posição do item selecionado em relação ao container
      const containerRect = container.getBoundingClientRect();
      const selectedItemRect = selectedItem.getBoundingClientRect();
      
      // Verificar se o item está fora da área visível
      const isAbove = selectedItemRect.top < containerRect.top;
      const isBelow = selectedItemRect.bottom > containerRect.bottom;
      
      if (isAbove) {
        // Se o item estiver acima da área visível, rolar para cima
        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else if (isBelow) {
        // Se o item estiver abaixo da área visível, rolar para baixo
        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedShortcutIndex]);

  // Adicionar um log para verificar o estado dos atalhos
  useEffect(() => {
    // Não é necessário fazer nada aqui
  }, [showShortcuts, filteredShortcuts, messageShortcuts, chatId]);

  // Adicionar um log para verificar os dados retornados pelo hook
  useEffect(() => {
    // Não é necessário fazer nada aqui
  }, [messageShortcuts, isLoadingShortcuts]);

  return (
    <div className="relative w-full p-2 border-t border-gray-200 dark:border-gray-700">
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

      <div className="flex items-center space-x-2 mb-1 flex-wrap sm:flex-nowrap">
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
            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 min-w-[160px] z-50">
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
        <button
          onClick={() => setShowAIModal(true)}
          className="p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400"
          title={t('ai.improve')}
        >
          <Sparkles className="w-5 h-5" />
        </button>
        <div className="relative hidden sm:block ml-auto" ref={emojiPickerRef}>
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
            <div className="absolute bottom-full left-0 right-auto mb-2 z-50">
              <Picker
                data={data}
                onEmojiSelect={onEmojiSelect}
                locale={i18n.language}
                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                previewPosition="none"
                skinTonePosition="none"
                perLine={9}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyPress}
          placeholder={t('input.placeholder')}
          className="flex-1 max-h-[120px] px-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
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
          organizationId={currentOrganizationMember?.organization.id || ''}
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

      {/* Lista de atalhos */}
      {showShortcuts && (
        <div 
          ref={shortcutsRef}
          className="absolute bottom-full left-2 mb-2 w-full max-w-md bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700"
          style={{ marginBottom: '8px', padding: '4px 0' }}
        >
          <div className="p-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-2 border-b border-gray-200 dark:border-gray-700 pb-2">
              {t('shortcuts.title', 'Atalhos de mensagem')}
            </h3>
            {isLoadingShortcuts ? (
              <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
                {t('shortcuts.loading', 'Carregando atalhos...')}
              </div>
            ) : filteredShortcuts.length > 0 ? (
              <ul className="py-1">
                {filteredShortcuts.map((shortcut, index) => (
                  <li 
                    key={shortcut.id}
                    ref={index === selectedShortcutIndex ? selectedItemRef : null}
                    className={`px-3 py-2 cursor-pointer rounded-md mx-2 ${
                      index === selectedShortcutIndex 
                        ? 'bg-blue-100 dark:bg-blue-900' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => applyShortcut(shortcut)}
                  >
                    <div className="font-medium text-gray-800 dark:text-gray-200">{shortcut.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {shortcut.content.substring(0, 50)}{shortcut.content.length > 50 ? '...' : ''}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
                {t('shortcuts.empty', 'Nenhum atalho encontrado')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}