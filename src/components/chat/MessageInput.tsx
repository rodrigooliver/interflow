import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Smile, Send, Mic, Loader2, Image, FileText, X, Sparkles, Plus, Play, Pause, RefreshCw } from 'lucide-react';
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
import axios from 'axios';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { toast } from 'react-hot-toast';
import { MarkdownRenderer } from '../../components/ui/MarkdownRenderer';

// Interface para configurações de funcionalidades por canal
interface ChannelFeatures {
  canReplyToMessages: boolean;
  canSendAudio: boolean;
  canSendTemplates: boolean;
  has24HourWindow: boolean;
  canSendAfter24Hours: boolean;
}

interface MessageInputProps {
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

// Função para detectar o sistema operacional
const getOS = () => {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
  const iosPlatforms = ['iPhone', 'iPad', 'iPod'];

  if (macosPlatforms.indexOf(platform) !== -1) {
    return 'MacOS';
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    return 'Windows';
  } else if (/Android/.test(userAgent)) {
    return 'Android';
  } else if (/Linux/.test(platform)) {
    return 'Linux';
  } else if (iosPlatforms.indexOf(platform) !== -1) {
    return 'iOS';
  }

  return 'Unknown';
};

export function MessageInput({ 
  chatId, 
  organizationId,
  onMessageSent, 
  replyTo, 
  isSubscriptionReady = false,
  channelFeatures = {
    canReplyToMessages: true,
    canSendAudio: false,
    canSendTemplates: false,
    has24HourWindow: false,
    canSendAfter24Hours: true
  },
  addOptimisticMessage
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
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<{ 
    file?: File; 
    preview: string; 
    type: string; 
    name: string;
    url?: string;
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
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  // Adicionando estado para controlar áudio temporário
  const [temporaryAudio, setTemporaryAudio] = useState<Blob | null>(null);
  // Adicionando estados para reprodução de áudio
  const [isPlaying, setIsPlaying] = useState(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const playbackIntervalRef = useRef<NodeJS.Timeout>();
  const [recordingStartDelay, setRecordingStartDelay] = useState(true);
  const [showShortcutHints, setShowShortcutHints] = useState(false);
  const isMac = getOS() === 'MacOS';
  
  // Usar o hook de status de conexão
  const { isOnline } = useOnlineStatus();
  
  // Fila de mensagens que falharam em enviar devido a problemas de conexão
  const [failedMessages, setFailedMessages] = useState<{
    content: string | null;
    attachments: File[];
    tempId?: string;
  }[]>([]);
  
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  
  // Função para detectar se o dispositivo é móvel
  // Usada para alterar o comportamento da tecla Enter (quebra de linha em vez de enviar)
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           (window.innerWidth <= 768);
  };

  // Adicionar estilos CSS para manter altura consistente
  useEffect(() => {
    // Estilos CSS para garantir altura consistente
    const styles = `
      @media (max-width: 768px) {
        .mobile-formatting-toolbar {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 0;
          background-color: var(--bg-color, white);
          border-radius: 8px 8px 0 0;
          padding: 8px;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          z-index: 10;
          margin-bottom: 8px;
          transition: all 0.3s ease;
          display: flex;
          justify-content: space-around;
          align-items: center;
          border: 1px solid var(--border-color, #e5e7eb);
        }
        
        .mobile-formatting-toolbar.hidden {
          transform: translateY(10px);
          opacity: 0;
          pointer-events: none;
          visibility: hidden;
        }
        
        .mobile-formatting-toolbar.visible {
          transform: translateY(0);
          opacity: 1;
          visibility: visible;
        }
      }
      
      /* Garantir altura consistente para o input */
      .input-container {
        min-height: 48px;
        display: flex;
        align-items: center;
      }
      
      /* Ajustar altura do input de gravação */
      .recording-container {
        min-height: 48px;
        display: flex;
        align-items: center;
      }
      
      :root {
        --bg-color: white;
        --border-color: #e5e7eb;
      }
      
      .dark {
        --bg-color: #1f2937;
        --border-color: #374151;
      }
    `;

    // Adicionar os estilos ao documento apenas uma vez
    const styleId = 'message-input-mobile-styles';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = styles;
      document.head.appendChild(styleElement);
    }

    // Limpar os estilos quando o componente for desmontado
    return () => {
      const styleElement = document.getElementById(styleId);
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

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

  // Manipuladores de eventos para o foco do textarea
  const handleTextareaFocus = () => {
    setIsTextareaFocused(true);
  };

  const handleTextareaBlur = () => {
    // Não esconder imediatamente para permitir cliques nos botões
    setTimeout(() => {
      // Verificar se o foco não está em um dos botões de formatação
      if (!document.activeElement?.closest('.formatting-toolbar')) {
        setIsTextareaFocused(false);
      }
    }, 100);
  };

  const handleFileUploadComplete = (file: File, type: string, name: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      setPendingAttachments(prev => [...prev, { file, preview, type, name }]);
    };
    reader.readAsDataURL(file);
  };

  // Nova função para adicionar anexo a partir de uma URL
  const addAttachmentFromUrl = (url: string, type: string, name: string) => {
    setPendingAttachments(prev => [...prev, { 
      preview: url, 
      type, 
      name,
      url
    }]);
  };

  // Efeito para tentar enviar mensagens pendentes quando a conexão for restaurada
  useEffect(() => {
    const sendFailedMessages = async () => {
      if (isOnline && failedMessages.length > 0 && isSubscriptionReady) {
        // Copiar as mensagens falhas para evitar problemas com a atualização do estado
        const messagesToSend = [...failedMessages];
        
        // Limpar a lista para evitar duplicação
        setFailedMessages([]);
        
        // Tentar enviar cada mensagem
        for (const msg of messagesToSend) {
          try {
            await handleSendMessage(msg.content, msg.attachments, msg.tempId);
          } catch (error) {
            console.error('Falha ao reenviar mensagem:', error);
            // Se falhar novamente, adiciona de volta à lista
            setFailedMessages(prev => [...prev, msg]);
            
            // Apenas mostra um erro para o usuário se for a última mensagem
            if (msg === messagesToSend[messagesToSend.length - 1]) {
              const errorMessage = axios.isAxiosError(error) && error.code === 'ERR_NETWORK'
                ? t('errors.network')
                : t('errors.sending');
              setError(errorMessage);
            }
            
            // Parar o processo de reenvio para evitar múltiplos erros
            break;
          }
        }
      }
    };
    
    sendFailedMessages();
  }, [isOnline, isSubscriptionReady]);

  // Função para gerar um ID temporário único para mensagens otimistas
  const generateTempId = () => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    // console.log(`Gerando ID temporário: ${tempId}`);
    return tempId;
  };

  // Função para verificar se o erro é de conexão
  const isConnectionError = (error: unknown): boolean => {
    // Se não temos conexão, é definitivamente um erro de conexão
    if (!isOnline) return true;
    
    // Verificar se é um erro do Axios de timeout ou network
    if (axios.isAxiosError(error)) {
      return error.code === 'ECONNABORTED' || 
             error.message.includes('Network Error') || 
             !error.response;
    }
    
    // Verificar mensagens de erro comuns relacionadas à rede
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      return errorMsg.includes('network') || 
             errorMsg.includes('connection') || 
             errorMsg.includes('offline') || 
             errorMsg.includes('internet');
    }
    
    return false;
  };

  const handleSendMessage = async (content: string | null, attachments?: File[], tempId?: string, attachmentUrls?: {url: string, type: string, name: string}[]) => {
    try {
      // Garantir que temos um tempId válido
      if (!tempId) {
        tempId = generateTempId();
      }
      
      // Validação: content só pode ser null se houver anexos ou urls
      if (content === null && 
          (!attachments || attachments.length === 0) && 
          (!attachmentUrls || attachmentUrls.length === 0)) {
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

      // Adicionar URLs de anexos se existirem
      if (attachmentUrls && attachmentUrls.length > 0) {
        attachmentUrls.forEach((attachment) => {
          // Criar objeto com os dados do anexo URL para envio
          const attachmentData = {
            url: attachment.url,
            type: attachment.type,
            name: attachment.name
          };
          
          // Em vez de criar um blob, vamos adicionar um campo 'url_attachments'
          // com o objeto JSON diretamente. O backend precisará ser modificado
          // para reconhecer este campo.
          formData.append('url_attachments', JSON.stringify(attachmentData));
        });
      }

      // Adicionar outros dados da mensagem
      if (content) {
        formData.append('content', content);
      }
      
      if (replyTo?.message.id) {
        formData.append('replyToMessageId', replyTo.message.id);
      }

      // Se temos um ID temporário, adicioná-lo para rastreamento
      if (tempId) {
        formData.append('metadata', JSON.stringify({ tempId }));
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

      // Emitir evento para atualizar o status da mensagem otimista para "enviada"
      if (tempId) {
        const event = new CustomEvent('update-message-status', {
          detail: {
            id: tempId,
            serverId: response.data.messageId, // ID real retornado pelo servidor
            status: 'sent',
            isPending: false
          }
        });
        window.dispatchEvent(event);
      }

      onMessageSent();

      return response.data;
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      
      // Melhorar o tratamento de erro
      let errorMessage = t('errors.sending', 'Erro ao enviar mensagem');
      
      // Verificar se é um erro de rede
      if (isConnectionError(error)) {
        errorMessage = t('errors.network', 'Erro de conexão. Verifique sua internet e tente novamente.');
        
        // Adicionar à fila de reenvio quando online
        setFailedMessages(prev => {
          // Verificar se já existe na lista
          if (prev.some(msg => msg.tempId === tempId)) {
            return prev;
          }
          
          return [...prev, { 
            content: content?.trim() || null, 
            attachments: attachments || [],
            tempId
          }];
        });
        
        if (tempId) {
          const event = new CustomEvent('update-message-status', {
            detail: {
              id: tempId,
              status: 'failed',
              isPending: false,
              error_message: 'Falha ao enviar mensagem'
            }
          });
          window.dispatchEvent(event);
        } else {
          console.warn('tempId não definido ao tentar emitir evento de erro');
        }
      } else if (axios.isAxiosError(error) && error.response?.status === 429) {
        errorMessage = t('errors.tooManyRequests', 'Muitas mensagens em pouco tempo. Aguarde alguns segundos.');
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setSending(false);
      
      // Esconder a interface de gravação após enviar mensagem
      if (isRecording || temporaryAudio) {
        setTemporaryAudio(null);
        setMediaRecorder(null);
        setRecordingDuration(0);
      }
    }
  };

  const handleSend = async () => {
    // Não bloqueamos mais o envio por problemas de conexão
    // Mostramos o aviso, mas deixamos o usuário continuar tentando
    if (!isSubscriptionReady) {
      setError(t('errors.waitingConnection'));
      // Não retornamos aqui para permitir tentar enviar mesmo assim
    }

    if (!message.trim() && pendingAttachments.length === 0) return;
    
    // Armazenar a mensagem e anexos atuais antes de limpar
    const currentMessage = message;
    const currentAttachments = [...pendingAttachments];
    
    // Limpar o campo de mensagem e anexos imediatamente para permitir nova entrada
    setMessage('');
    setPendingAttachments([]);
    setShowEmojiPicker(false);
    setShowAttachmentMenu(false);
    setError(''); // Limpar qualquer erro anterior
    
    // Iniciar o processo de envio
    setSending(true);

    // Formatar a mensagem
    let formattedMessage = currentMessage;
    if (textFormat.bold) formattedMessage = `**${formattedMessage}**`;
    if (textFormat.italic) formattedMessage = `_${formattedMessage}_`;

    // Separar anexos com arquivo dos anexos com URL
    const fileAttachments = currentAttachments
      .filter(attachment => attachment.file)
      .map(attachment => attachment.file!);
    
    const urlAttachments = currentAttachments
      .filter(attachment => attachment.url)
      .map(attachment => ({
        url: attachment.url!,
        type: attachment.type,
        name: attachment.name
      }));

    // Criar ID temporário para a mensagem otimista
    const tempId = generateTempId();

    // Se temos a função de adicionar mensagem otimista, usá-la
    if (addOptimisticMessage) {
      // Adicionar mensagem otimista ao estado
      addOptimisticMessage({
        id: tempId,
        content: formattedMessage.trim() || null,
        attachments: currentAttachments.map(att => ({
          file: att.file!,
          preview: att.preview,
          type: att.type,
          name: att.name,
          url: att.url
        })).filter(att => att.file || att.url) as { file: File; preview: string; type: string; name: string; url?: string }[],
        replyToMessageId: replyTo?.message.id,
        isPending: true
      });
      
      // Limpar a referência de resposta se existir
      if (replyTo?.onClose) {
        replyTo.onClose();
      }
      
      // Liberar o botão de envio imediatamente após adicionar a mensagem otimista
      // para permitir que o usuário continue enviando mensagens sem esperar
      setSending(false);
    }

    try {
      // Enviar mensagem com anexos (arquivos e URLs) em segundo plano
      // A UI já foi atualizada com a mensagem otimista
      await handleSendMessage(
        formattedMessage.trim() || null, 
        fileAttachments,
        tempId,
        urlAttachments
      );
    } catch {
      // O erro já foi definido na função handleSendMessage
      // Não precisamos fazer nada aqui, pois o estado de envio já foi liberado acima
    } finally {
      // Garantir que o botão de envio seja liberado em qualquer caso
      // (isso é redundante caso addOptimisticMessage exista, mas serve como fallback)
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
      // Em dispositivos móveis, permitir quebra de linha com Enter
      if (isMobileDevice()) {
        // Não faz nada, permitindo o comportamento padrão de quebra de linha
        return;
      }
      
      // Em desktop, enviar a mensagem
      e.preventDefault();
      handleSend();
    }
  };

  const onEmojiSelect = (emoji: EmojiData) => {
    if (textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart;
      const textBeforeCursor = message.substring(0, cursorPosition);
      const textAfterCursor = message.substring(cursorPosition);
      
      // Inserir o emoji na posição do cursor
      const newText = textBeforeCursor + emoji.native + textAfterCursor;
      setMessage(newText);
      
      // Atualizar a posição do cursor para logo após o emoji inserido
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPosition = cursorPosition + emoji.native.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 0);
    } else {
      // Fallback para o comportamento anterior
      setMessage(prev => prev + emoji.native);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Função principal para iniciar a gravação, atualizada
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Encontrar o melhor formato suportado pelo navegador
      const supportedMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
        'audio/mpeg'
      ];
      
      let mimeType = 'audio/webm'; // Formato intermediário para conversão posterior
      for (const type of supportedMimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log(`Formato suportado encontrado: ${mimeType}`);
          break;
        }
      }
      
      // Opções para melhor qualidade
      const options = { 
        mimeType,
        audioBitsPerSecond: 128000 // 128kbps
      };

      const recorder = new MediaRecorder(stream, options);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        try {
          // Criar um blob com os chunks coletados
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          audioChunksRef.current = [];
          
          // Salvamos o blob no estado temporário para permitir cancelamento
          setTemporaryAudio(audioBlob);
          
        } catch (error) {
          setError(t('errors.audioProcessingFailed'));
          console.error('Erro ao processar áudio:', error);
          // Em caso de erro, cancelamos a gravação para evitar estado inconsistente
          cancelRecording();
        }
      };

      // Indicar que estamos gravando antes mesmo de iniciar a contagem
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingStartDelay(true);
      
      // Iniciar o gravador imediatamente para capturar o áudio
      setMediaRecorder(recorder);
      recorder.start(1000); // Gravar em chunks de 1 segundo
      
      // Atrasar a contagem em 500ms para dar tempo ao usuário
      setTimeout(() => {
        setRecordingStartDelay(false);
        
        // Iniciar a contagem apenas após o delay
        timerIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      }, 500);
      
    } catch (error) {
      setError(t('errors.microphoneAccess'));
      console.error('Error accessing microphone:', error);
      // Em caso de erro, garantir que os estados sejam limpos
      setIsRecording(false);
      setMediaRecorder(null);
      setRecordingStartDelay(false);
    }
  };

  // Função para parar a gravação
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      // Limpar o intervalo do contador
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      
      try {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Erro ao parar gravação:', error);
      }
      setIsRecording(false);
    }
  };

  // Nova função para reproduzir o áudio temporário
  const togglePlayAudio = () => {
    if (!temporaryAudio) return;
    
    if (isPlaying && audioElementRef.current) {
      // Pausar a reprodução
      audioElementRef.current.pause();
      setIsPlaying(false);
      
      // Limpar o intervalo de atualização
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = undefined;
      }
      
      return;
    }
    
    // Se não temos um elemento de áudio ou está diferente do áudio atual, criar um novo
    if (!audioElementRef.current || audioElementRef.current.src !== URL.createObjectURL(temporaryAudio)) {
      // Liberar qualquer URL anterior
      if (audioElementRef.current && audioElementRef.current.src) {
        URL.revokeObjectURL(audioElementRef.current.src);
      }
      
      // Criar elemento de áudio
      const audioElement = new Audio(URL.createObjectURL(temporaryAudio));
      
      // Configurar eventos
      audioElement.addEventListener('ended', () => {
        setIsPlaying(false);
        setAudioProgress(100); // Garantir que termine em 100%
        
        // Limpar o intervalo de atualização
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
          playbackIntervalRef.current = undefined;
        }
      });
      
      audioElement.addEventListener('error', (e) => {
        console.error('Erro na reprodução do áudio:', e);
        setIsPlaying(false);
        
        // Limpar o intervalo de atualização
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
          playbackIntervalRef.current = undefined;
        }
      });
      
      audioElement.addEventListener('timeupdate', () => {
        if (audioElement.duration) {
          // Atualizar o progresso (0-100)
          const progress = (audioElement.currentTime / audioElement.duration) * 100;
          setAudioProgress(progress);
          setPlaybackTime(Math.floor(audioElement.currentTime));
        }
      });
      
      // Salvar referência
      audioElementRef.current = audioElement;
    }
    
    // Iniciar reprodução
    audioElementRef.current.play()
      .then(() => {
        setIsPlaying(true);
        
        // Atualizar o progresso a cada 100ms
        if (!playbackIntervalRef.current) {
          playbackIntervalRef.current = setInterval(() => {
            if (audioElementRef.current) {
              // O evento timeupdate já cuida disso, isso é apenas um backup
              const progress = (audioElementRef.current.currentTime / audioElementRef.current.duration) * 100;
              setAudioProgress(progress);
              setPlaybackTime(Math.floor(audioElementRef.current.currentTime));
            }
          }, 100);
        }
      })
      .catch(error => {
        console.error('Erro ao iniciar reprodução:', error);
        setIsPlaying(false);
      });
  };
  
  // Nova função para reiniciar a reprodução do áudio
  const restartAudio = () => {
    if (!audioElementRef.current || !temporaryAudio) return;
    
    // Reiniciar a posição
    audioElementRef.current.currentTime = 0;
    setAudioProgress(0);
    setPlaybackTime(0);
    
    // Se estava tocando, continuar a tocar
    if (isPlaying) {
      audioElementRef.current.play().catch(error => {
        console.error('Erro ao reiniciar reprodução:', error);
      });
    }
  };

  // Nova função para cancelar a gravação
  const cancelRecording = () => {
    // Limpar o áudio e estados relacionados
    if (mediaRecorder && isRecording) {
      stopRecording();
    }
    
    // Parar reprodução se estiver tocando
    if (isPlaying && audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
      
      // Limpar o intervalo de atualização
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = undefined;
      }
    }
    
    // Liberar URL do objeto
    if (audioElementRef.current && audioElementRef.current.src) {
      URL.revokeObjectURL(audioElementRef.current.src);
      audioElementRef.current = null;
    }
    
    setTemporaryAudio(null);
    setMediaRecorder(null);
    setRecordingDuration(0);
    setAudioProgress(0);
    setPlaybackTime(0);
    setRecordingStartDelay(false);
    
    // Focar no textarea após cancelar, para melhor experiência do usuário
    if (textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  // Nova função para confirmar e processar o áudio gravado
  const confirmRecording = async () => {
    try {
      if (!temporaryAudio) {
        console.error('Não há áudio temporário para processar');
        return;
      }
      
      // Indicar que estamos processando
      setSending(true);
      const mimeType = temporaryAudio.type;
      const tempId = generateTempId();
      
      try {
        // Tentar carregar o módulo de áudio
        const audioConverter = await import('../../lib/audioConverter');
        console.log('Convertendo áudio para OGG/Opus...');
        
        // Converter o blob para OGG/Opus
        const targetFileName = `audio-${Date.now()}.ogg`;
        const convertedBlob = await audioConverter.convertToOggOpus(temporaryAudio);
        const convertedFile = new File([convertedBlob], targetFileName, { type: 'audio/ogg;codecs=opus' });
        
        // Adicionar mensagem otimista se a função estiver disponível
        if (addOptimisticMessage) {
          addOptimisticMessage({
            id: tempId,
            content: null,
            attachments: [{
              file: convertedFile,
              preview: URL.createObjectURL(convertedBlob),
              type: 'audio/ogg;codecs=opus',
              name: targetFileName
            }],
            replyToMessageId: replyTo?.message.id,
            isPending: true
          });
          
          // Limpar a referência de resposta se existir
          if (replyTo?.onClose) {
            replyTo.onClose();
          }
        }
        
        // Limpar interface de gravação imediatamente
        setTemporaryAudio(null);
        setMediaRecorder(null);
        setRecordingDuration(0);
        setSending(false);
        
        // Enviar em segundo plano
        handleSendMessage(null, [convertedFile], tempId)
          .catch(error => {
            console.error('Erro ao enviar áudio:', error);
            // O erro já será tratado em handleSendMessage
          });
        
      } catch (conversionError) {
        console.error('Erro na conversão de áudio:', conversionError);
        console.log('Usando formato original sem conversão');
        
        // Determinar a extensão baseada no tipo MIME
        let extension = 'webm';
        if (mimeType.includes('mp4')) {
          extension = 'mp4';
        } else if (mimeType.includes('ogg')) {
          extension = 'ogg';
        } else if (mimeType.includes('mpeg')) {
          extension = 'mp3';
        }
        
        const fileName = `audio-${Date.now()}.${extension}`;
        const file = new File([temporaryAudio], fileName, { type: mimeType });
        
        // Adicionar mensagem otimista se a função estiver disponível
        if (addOptimisticMessage) {
          addOptimisticMessage({
            id: tempId,
            content: null,
            attachments: [{
              file: file,
              preview: URL.createObjectURL(temporaryAudio),
              type: mimeType,
              name: fileName
            }],
            replyToMessageId: replyTo?.message.id,
            isPending: true
          });
          
          // Limpar a referência de resposta se existir
          if (replyTo?.onClose) {
            replyTo.onClose();
          }
        }
        
        // Limpar interface de gravação imediatamente
        setTemporaryAudio(null);
        setMediaRecorder(null);
        setRecordingDuration(0);
        setSending(false);
        
        // Enviar em segundo plano
        handleSendMessage(null, [file], tempId)
          .catch(error => {
            console.error('Erro ao enviar áudio:', error);
            // O erro já será tratado em handleSendMessage
          });
      }
      
    } catch (error) {
      setError(t('errors.audioProcessingFailed'));
      console.error('Erro ao processar áudio:', error);
      setSending(false);
    }
  };

  // Limpar o intervalo quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      // Limpar o timeout de erro ao desmontar
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
    };
  }, [errorTimeout]);

  // Efeito para limpar erros após um período de tempo
  useEffect(() => {
    if (error) {
      // Limpar qualquer timeout anterior
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
      
      // Definir primeiro timeout para iniciar o fade
      const fadeTimeout = setTimeout(() => {
        // setErrorFading(true);
      }, 4000);
      
      // Definir um novo timeout para limpar o erro após 5 segundos (após o fade)
      const timeout = setTimeout(() => {
        setError('');
        // setErrorFading(false);
      }, 5000);
      
      setErrorTimeout(timeout);
      
      return () => {
        clearTimeout(fadeTimeout);
        clearTimeout(timeout);
      };
    }
    
    return () => {
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
    };
  }, [error]);

  const applyFormatting = (format: 'bold' | 'italic') => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = message.substring(start, end);
      const prefix = format === 'bold' ? '**' : '_';

      // Salvar o estado de foco atual
      const textareaHasFocus = document.activeElement === textareaRef.current;
      
      // Se há texto selecionado, aplicar formatação ao texto selecionado
      if (selectedText) {
        const newText = 
          message.substring(0, start) +
          `${prefix}${selectedText}${prefix}` +
          message.substring(end);
        
        setMessage(newText);
        
        // Restaurar o foco e a seleção imediatamente
        if (textareaHasFocus) {
          // Usar requestAnimationFrame para garantir que a atualização do DOM ocorra antes de tentar focar
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(
                start + prefix.length,
                end + prefix.length
              );
            }
          });
        }
      } else {
        // Se não há texto selecionado, inserir os marcadores de formatação na posição atual
        // e posicionar o cursor entre eles
        const newText = 
          message.substring(0, start) +
          `${prefix}${prefix}` +
          message.substring(end);
        
        setMessage(newText);
        
        // Posicionar o cursor entre os marcadores
        if (textareaHasFocus) {
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(
                start + prefix.length,
                start + prefix.length
              );
            }
          });
        }
      }
    }
  };

  // Função para garantir que o textarea mantenha o foco
  const ensureTextareaFocus = () => {
    if (textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Atualizar os handlers dos botões de formatação
  const handleBoldClick = (e: React.MouseEvent) => {
    // Prevenir comportamento padrão para evitar perda de foco
    e.preventDefault();
    applyFormatting('bold');
    // Garantir que o textarea mantenha o foco
    requestAnimationFrame(ensureTextareaFocus);
  };

  const handleItalicClick = (e: React.MouseEvent) => {
    // Prevenir comportamento padrão para evitar perda de foco
    e.preventDefault();
    applyFormatting('italic');
    // Garantir que o textarea mantenha o foco
    requestAnimationFrame(ensureTextareaFocus);
  };

  // Handler para o botão de IA
  const handleAIClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Desfocar o textarea para esconder o teclado virtual em dispositivos móveis
    if (textareaRef.current) {
      textareaRef.current.blur();
    }
    
    // Pequeno atraso para garantir que o teclado tenha tempo de sumir antes de abrir o modal
    setTimeout(() => {
      setShowAIModal(true);
      setShowShortcutHints(false); // Fechar instruções de atalho
      
      // Não restauramos o foco imediatamente para manter o teclado escondido
      // O foco será restaurado quando o modal for fechado, se necessário
    }, 100);
  };

  // Handler para o fechamento do modal de IA
  const handleAIModalClose = () => {
    setShowAIModal(false);
    setShowShortcutHints(false); // Fechar instruções de atalho
    
    // Em dispositivos desktop, restaurar o foco no textarea
    if (!isMobileDevice()) {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      });
    }
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
          shortcut.title.toLowerCase().includes(shortcutFilter.toLowerCase()) || 
          shortcut.content.toLowerCase().includes(shortcutFilter.toLowerCase())
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
          // Verificar se o anexo já tem URL
          if (attachment.url) {
            // Adicionar diretamente como anexo com URL
            addAttachmentFromUrl(
              attachment.url,
              attachment.type || 'document',
              attachment.name
            );
          } else {
            // Buscar o arquivo do storage (para compatibilidade com versões anteriores)
            const { data, error } = await supabase.storage
              .from('attachments')
              .download(`${organizationId}/shortcut-attachments/${attachment.name}`);
              
            if (error) throw error;
            
            if (data) {
              const file = new File([data], attachment.name, { type: attachment.type });
              handleFileUploadComplete(file, attachment.type, attachment.name);
            }
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

  // Handler para o botão de anexo
  const handleAttachmentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowAttachmentMenu(!showAttachmentMenu);
    setShowEmojiPicker(false);
  };

  // Adicionar handler para atalhos de teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isMac = getOS() === 'MacOS';
    const isCtrlPressed = isMac ? e.metaKey : e.ctrlKey;
    
    if (isCtrlPressed) {
      setShowShortcutHints(true);
      
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          applyFormatting('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormatting('italic');
          break;
        case 'j':
          e.preventDefault();
          handleAIClick(e as unknown as React.MouseEvent);
          break;
        case 'e':
          e.preventDefault();
          toggleEmojiPicker();
          break;
      }
    }

    // Fechar modais com ESC
    if (e.key === 'Escape') {
      if (showAIModal) {
        e.preventDefault();
        setShowAIModal(false);
        // Focar no textarea após fechar o modal
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 0);
      }
      if (showEmojiPicker) {
        e.preventDefault();
        setShowEmojiPicker(false);
        // Focar no textarea após fechar o seletor de emojis
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 0);
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    const isMac = getOS() === 'MacOS';
    const isCtrlPressed = isMac ? e.metaKey : e.ctrlKey;
    
    if (!isCtrlPressed) {
      setShowShortcutHints(false);
    }
  };

  // Adicionar efeito para escutar eventos de teclado no documento
  useEffect(() => {
    const handleDocumentKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAIModal) {
          e.preventDefault();
          setShowAIModal(false);
          // Focar no textarea após fechar o modal
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }, 0);
        }
        if (showEmojiPicker) {
          e.preventDefault();
          setShowEmojiPicker(false);
          // Focar no textarea após fechar o seletor de emojis
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }, 0);
        }
      }
    };

    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [showAIModal, showEmojiPicker]);

  // Handler para quando o emoji picker for montado
  const handleEmojiPickerMount = () => {
    // Usar setTimeout para garantir que o componente esteja completamente montado
    setTimeout(() => {
      // Tentar encontrar o input de pesquisa de diferentes maneiras
      const searchInput = document.querySelector('.emoji-mart-search input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      } else {
        // Tentar alternativa se o seletor padrão não funcionar
        const emojiSearch = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (emojiSearch) {
          emojiSearch.focus();
        }
      }
    }, 100);
  };

  // Handler para abrir/fechar emoji picker
  const toggleEmojiPicker = () => {
    if (!showEmojiPicker) {
      // Salvar posição do cursor antes de abrir
      if (textareaRef.current) {
        setCursorPosition(textareaRef.current.selectionStart);
      }
      setShowEmojiPicker(true);
      
      // Focar no input de pesquisa após um pequeno delay
      setTimeout(() => {
        const searchInput = document.querySelector('.emoji-mart-search input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        } else {
          const emojiSearch = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
          if (emojiSearch) {
            emojiSearch.focus();
          }
        }
      }, 100);
    } else {
      setShowEmojiPicker(false);
    }
  };

  // Handler para quando o emoji picker for desmontado
  const handleEmojiPickerUnmount = () => {
    // Restaurar posição do cursor
    if (textareaRef.current && cursorPosition !== null) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      setCursorPosition(null);
    }
  };

  // Renderizar o botão de enviar ou gravar áudio
  const renderSendButton = () => {
    // Primeiro verificamos se há mensagem ou anexos - isso tem prioridade
    if (message.trim() || pendingAttachments.length > 0) {
      return (
        <button
          onClick={handleSend}
          className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          aria-label={t('send')}
        >
          <Send className="w-5 h-5" />
        </button>
      );
    }

    // Se não há mensagem, mas estamos enviando, mostrar loader
    if (sending) {
      return (
        <button
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          disabled
        >
          <Loader2 className="w-5 h-5 animate-spin" />
        </button>
      );
    }

    // Mostrar botão de gravação apenas se o canal permitir áudio
    if (channelFeatures.canSendAudio) {
      return (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-2 rounded-full ${
            isRecording
              ? "bg-red-600 hover:bg-red-700"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white transition-colors flex items-center`}
          aria-label={isRecording ? t('recording') : t('record')}
        >
          <Mic className="w-5 h-5" />
        </button>
      );
    } else {
      // Se não puder enviar áudio, mostrar botão de enviar desabilitado
      return (
        <button
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          disabled
          aria-label={t('send')}
        >
          <Send className="w-5 h-5" />
        </button>
      );
    }
  };

  // Liberar recursos de áudio ao desmontar o componente
  useEffect(() => {
    return () => {
      // Limpar o intervalo do contador
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      
      // Limpar o intervalo de reprodução
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
      
      // Limpar o timeout de erro
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
      
      // Liberar URL do objeto de áudio
      if (audioElementRef.current && audioElementRef.current.src) {
        URL.revokeObjectURL(audioElementRef.current.src);
      }
      
      // Limpar todas as URLs de objeto criadas
      pendingAttachments.forEach(attachment => {
        if (attachment.preview) {
          URL.revokeObjectURL(attachment.preview);
        }
      });
    };
  }, [errorTimeout, pendingAttachments]);

  return (
    <div className="relative w-full p-2 border-t border-gray-200 dark:border-gray-700">
      {replyTo && (
        <div className="mb-4 flex items-start p-2 bg-blue-50 dark:bg-blue-900/20 text-gray-700 dark:text-gray-300 rounded-lg border border-blue-200 dark:border-blue-900">
          <div className="flex-1 overflow-hidden">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
              {t('actions.reply')}
            </div>
            <div className="line-clamp-1 text-sm max-h-[35px] overflow-x-hidden">
              {replyTo.message.content ? <MarkdownRenderer content={replyTo.message.content} variant="compact" /> : replyTo.message.content}
            </div>
          </div>
          <button 
            onClick={replyTo.onClose}
            className="self-start text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
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

      {/* Container para a barra de formatação e o textarea */}
      <div className="relative">
        {/* Barra de formatação - visível sempre em desktop, e apenas quando em foco em mobile */}
        {!isRecording && !temporaryAudio && (
          <div 
            className={`formatting-toolbar flex items-center space-x-2 mb-1 flex-wrap sm:flex-nowrap
              ${isMobileDevice() ? 'mobile-formatting-toolbar' : ''}
              ${isMobileDevice() && isTextareaFocused ? 'visible' : ''}
              ${isMobileDevice() && !isTextareaFocused ? 'hidden' : ''}
            `}
          >
            <button
              onMouseDown={handleBoldClick}
              className={`p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400`}
              title={t('formatting.bold')}
            >
              <Bold className="w-5 h-5" />
            </button>
            <button
              onMouseDown={handleItalicClick}
              className={`p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400`}
              title={t('formatting.italic')}
            >
              <Italic className="w-5 h-5" />
            </button>
            <button
              onMouseDown={handleAIClick}
              className="p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400"
              title={t('ai.improve')}
            >
              <Sparkles className="w-5 h-5" />
            </button>
            {/* Botão de emoji - visível apenas em desktop */}
            <div className="relative hidden sm:block ml-auto" ref={emojiPickerRef}>
              <button
                onClick={toggleEmojiPicker}
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
                    onMount={handleEmojiPickerMount}
                    onUnmount={handleEmojiPickerUnmount}
                    searchPosition="top"
                    autoFocus={true}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interface de gravação de áudio */}
        {(isRecording || temporaryAudio) ? (
          <div className="recording-container flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-full p-1 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-4 flex-1 justify-between">
              {/* Indicador de gravação ou reprodução */}
              <div className="flex items-center px-3 flex-1">
                {/* Indicador visual (ponto vermelho ou barra de progresso) */}
                {isRecording ? (
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
                    <div className={`text-sm font-medium text-red-500 mr-2 ${recordingStartDelay ? 'animate-pulse' : ''}`}>
                      {recordingStartDelay ? 'Preparando...' : 'Gravando...'}
                    </div>
                  </div>
                ) : (
                  temporaryAudio && (
                    <div className="w-full max-w-[100px] h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden mr-2">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${audioProgress}%` }}
                      ></div>
                    </div>
                  )
                )}
                
                {/* Contador de tempo */}
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {isRecording ? (
                    // Mostrar o tempo de gravação durante a gravação
                    <>
                      {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                    </>
                  ) : (
                    // Mostrar o tempo de reprodução após a gravação
                    <>
                      {Math.floor(playbackTime / 60)}:{(playbackTime % 60).toString().padStart(2, '0')}
                    </>
                  )}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Botão para cancelar gravação (apenas em modo preview) */}
                {!isRecording && temporaryAudio && (
                  <button 
                    onClick={cancelRecording}
                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 transition-colors"
                    title={t('recording.cancel', 'Cancelar')}
                    disabled={sending}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                
                {/* Botão para reiniciar a reprodução (apenas quando não está gravando) */}
                {!isRecording && temporaryAudio && (
                  <button 
                    onClick={restartAudio}
                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 transition-colors"
                    title={t('recording.restart', 'Reiniciar')}
                    disabled={sending}
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}
                
                {/* Botão para ouvir a gravação (apenas após parar de gravar) */}
                {!isRecording && temporaryAudio && (
                  <button 
                    onClick={togglePlayAudio}
                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 transition-colors"
                    title={isPlaying ? t('recording.pause', 'Pausar') : t('recording.play', 'Ouvir')}
                    disabled={sending}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                )}
                
                {/* Botão para enviar o áudio (após parar de gravar) */}
                {!isRecording && temporaryAudio && (
                  <button 
                    onClick={confirmRecording}
                    className={`p-2 rounded-full ${sending ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-colors`}
                    title={t('recording.confirm', 'Confirmar')}
                    disabled={sending}
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                )}
                
                {/* Botão para parar a gravação (durante a gravação) */}
                {isRecording && (
                  <button 
                    onClick={stopRecording}
                    className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    title={t('recording.stop', 'Parar')}
                  >
                    <span className="w-5 h-5 flex items-center justify-center">■</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="input-container flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-full p-1 border border-gray-200 dark:border-gray-600">
            {/* Botão de anexo (Plus) no lado esquerdo */}
            <div className="relative" ref={attachmentMenuRef}>
              <button
                onMouseDown={handleAttachmentClick}
                className={`p-2 rounded-full transition-colors ${
                  showAttachmentMenu
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
                }`}
                title={t('attachments.title')}
              >
                <Plus className="w-5 h-5" />
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
            
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyDown={(e) => {
                handleKeyPress(e);
                handleKeyDown(e);
              }}
              onKeyUp={handleKeyUp}
              onFocus={handleTextareaFocus}
              onBlur={handleTextareaBlur}
              placeholder={t('input.placeholder')}
              className="flex-1 px-4 py-2 bg-transparent border-0 rounded-lg focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
              style={{ height: '40px', maxHeight: '120px', overflowY: 'auto' }}
            />
            
            {renderSendButton()}
          </div>
        )}
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
          onClose={handleAIModalClose}
          onTextUpdate={(newText) => setMessage(newText)}
          chatId={chatId}
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

      {/* Dicas de atalhos */}
      {showShortcutHints && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex justify-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Bold: {isMac ? '⌘' : 'Ctrl'} + B</span>
            <span>Italic: {isMac ? '⌘' : 'Ctrl'} + I</span>
            <span>IA: {isMac ? '⌘' : 'Ctrl'} + J</span>
            <span>Emoji: {isMac ? '⌘' : 'Ctrl'} + E</span>
          </div>
        </div>
      )}
    </div>
  );
}