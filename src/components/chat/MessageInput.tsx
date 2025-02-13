import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Smile, Paperclip, Send, Mic, Loader2, Image, FileText, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { FileUpload } from './FileUpload';
import { supabase } from '../../lib/supabase';

interface MessageInputProps {
  onSend: (message: string, attachments?: { url: string; type: string; name: string }[]) => Promise<void>;
  sending: boolean;
  organizationId: string;
}

export function MessageInput({ onSend, sending, organizationId }: MessageInputProps) {
  const { i18n, t } = useTranslation('chats');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [textFormat, setTextFormat] = useState({
    bold: false,
    italic: false
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState<'image' | 'document' | null>(null);
  const [error, setError] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<{ url: string; type: string; name: string }[]>([]);

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

  const handleSend = async () => {
    if (!message.trim() && pendingAttachments.length === 0) return;

    let formattedMessage = message;
    if (textFormat.bold) formattedMessage = `**${formattedMessage}**`;
    if (textFormat.italic) formattedMessage = `_${formattedMessage}_`;

    // If there are pending attachments, send them as separate messages
    if (pendingAttachments.length > 0) {
      for (const attachment of pendingAttachments) {
        await onSend('', [attachment]);
      }
      setPendingAttachments([]);
    }

    // Send text message if there is one
    if (formattedMessage.trim()) {
      await onSend(formattedMessage);
    }

    setMessage('');
    setShowEmojiPicker(false);
    setShowAttachmentMenu(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onEmojiSelect = (emoji: any) => {
    setMessage(prev => prev + emoji.native);
  };

  const handleFileUploadComplete = (url: string, type: string, name: string) => {
    setPendingAttachments(prev => [...prev, { url, type, name }]);
  };

  const handleRemoveAttachment = async (url: string) => {
    // Extract file path from URL
    const filePath = url.split('/').pop();
    if (filePath) {
      try {
        await supabase.storage
          .from('attachments')
          .remove([`${organizationId}/chat-attachments/${filePath}`]);
      } catch (error) {
        console.error('Error removing file:', error);
      }
    }
    setPendingAttachments(prev => prev.filter(a => a.url !== url));
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
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
                <Image className="w-4 h-4 mr-2" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                {attachment.name}
              </span>
              <button
                onClick={() => handleRemoveAttachment(attachment.url)}
                className="ml-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center space-x-2 mb-2">
        <button
          onClick={() => setTextFormat(prev => ({ ...prev, bold: !prev.bold }))}
          className={`p-2 rounded-lg transition-colors ${
            textFormat.bold
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400'
          }`}
          title={t('formatting.bold')}
        >
          <Bold className="w-5 h-5" />
        </button>
        <button
          onClick={() => setTextFormat(prev => ({ ...prev, italic: !prev.italic }))}
          className={`p-2 rounded-lg transition-colors ${
            textFormat.italic
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400'
          }`}
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
            className={`p-2 rounded-lg transition-colors ${
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
            className={`p-2 rounded-lg transition-colors ${
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
      </div>

      <div className="flex items-center space-x-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t('input.placeholder')}
          className="flex-1 min-h-[40px] max-h-[120px] px-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
        />
        <button
          onClick={() => {/* TODO: Implement voice recording */}}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 transition-colors"
          title={t('voice.title')}
        >
          <Mic className="w-5 h-5" />
        </button>
        <button
          onClick={handleSend}
          disabled={sending || (!message.trim() && pendingAttachments.length === 0)}
          className="p-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={t('send')}
        >
          {sending ? (
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
    </div>
  );
}