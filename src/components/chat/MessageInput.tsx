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

export function MessageInput({ chatId, organizationId, onMessageSent, replyTo, isSubscriptionReady = false }: MessageInputProps) {
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
  const [pendingAttachments, setPendingAttachments] = useState<{ url: string; type: string; name: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [deletingAttachment, setDeletingAttachment] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout>();
  const [showAIModal, setShowAIModal] = useState(false);
  const [sending, setSending] = useState(false);

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

  const handleSendMessage = async (content: string | null, attachments?: { url: string; type: string; name: string }[]) => {
    setSending(true);
    try {
      // Validação: content só pode ser null se houver anexos
      if (content === null && (!attachments || attachments.length === 0)) {
        throw new Error(t('errors.emptyMessage'));
      }

      const messageData = {
        chat_id: chatId,
        organization_id: organizationId,
        content: content,
        sender_type: 'agent',
        sent_from_system: true,
        sender_agent_id: profile?.id,
        status: 'pending',
        attachments: attachments || [],
        response_message_id: replyTo?.message.id || null
      };

      const { data: newMsg, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;
      
      if (newMsg) {
        const { error: updateError } = await supabase
          .from('chats')
          .update({ 
            last_message_id: newMsg.id
          })
          .eq('id', chatId);

        if (updateError) throw updateError;
        
        onMessageSent();
        if (replyTo?.onClose) {
          replyTo.onClose();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(t('errors.sending'));
    } finally {
      setSending(false);
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

      // If there are pending attachments, send them as separate messages
      if (pendingAttachments.length > 0) {
        for (const attachment of pendingAttachments) {
          await handleSendMessage('', [attachment]);
        }
        setPendingAttachments([]);
      }

      // Send text message if there is one
      if (formattedMessage.trim()) {
        await handleSendMessage(formattedMessage);
      }

      // Limpa a mensagem e outros estados após envio bem-sucedido
      setMessage('');
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

  const handleFileUploadComplete = (url: string, type: string, name: string) => {
    setPendingAttachments(prev => [...prev, { url, type, name }]);
  };

  const handleRemoveAttachment = async (url: string) => {
    setDeletingAttachment(url);
    // Extract file path from URL
    const filePath = url.split('/').pop();
    if (filePath) {
      try {
        await supabase.storage
          .from('attachments')
          .remove([`${organizationId}/chat-attachments/${filePath}`]);
        setPendingAttachments(prev => prev.filter(a => a.url !== url));
      } catch (error) {
        console.error('Error removing file:', error);
      }
    }
    setDeletingAttachment(null);
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
            .upload(`${organizationId}/chat-attachments/${fileName}`, file);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(`${organizationId}/chat-attachments/${fileName}`);

          handleFileUploadComplete(publicUrl, mimeType, fileName);
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
          {pendingAttachments.map((attachment) => (
            <div
              key={attachment.url}
              className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-2"
            >
              {attachment.type.startsWith('image/') ? (
                <>
                  <a 
                    href={attachment.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-blue-500 dark:hover:text-blue-400"
                  >
                    <Image className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm truncate max-w-[180px] text-gray-700 dark:text-gray-300">{attachment.name}</span>
                  </a>
                </>
              ) : attachment.type.startsWith('audio/') ? (
                <div className="flex-1">
                  <AudioPlayer
                    src={attachment.url}
                    fileName={attachment.name}
                    compact
                  />
                </div>
              ) : (
                <>
                  <a 
                    href={attachment.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-blue-500 dark:hover:text-blue-400"
                  >
                    <FileText className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm truncate max-w-[180px] text-gray-700 dark:text-gray-300">{attachment.name}</span>
                  </a>
                </>
              )}
              <button
                onClick={() => handleRemoveAttachment(attachment.url)}
                className="ml-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                disabled={deletingAttachment === attachment.url}
              >
                {deletingAttachment === attachment.url ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
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
          disabled={sending || (!message.trim() && pendingAttachments.length === 0) || !isSubscriptionReady}
          className="p-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={!isSubscriptionReady ? t('waitingConnection') : t('send')}
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
          organizationId={organizationId}
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