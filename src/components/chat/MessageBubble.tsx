import React from 'react';
import { MessageStatus } from './MessageStatus';
import { FileText } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { Message } from '../../types/database';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const {
    content,
    created_at,
    sender_type,
    status,
    error_message,
    attachments
  } = message;
  
  const isAgent = sender_type === 'agent';

  const formatMessageContent = (content: string) => {
    let formatted = content;
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  };

  const renderAttachment = (attachment: { url: string; type: string; name: string }) => {
    if (attachment.type.startsWith('image/')) {
      return (
        <div className="mt-2">
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-w-full rounded-lg h-[200px] object-contain"
            />
          </a>
        </div>
      );
    }

    if (attachment.type.startsWith('audio/')) {
      return (
        <div className="mt-2">
          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-2">
            <AudioPlayer
              src={attachment.url}
              fileName={attachment.name}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="mt-2">
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[250px]">
            {attachment.name}
          </span>
        </a>
      </div>
    );
  };

  return (
    <div className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg p-3 ${
          isAgent
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
        }`}
      >
        {content && (
          <div
            dangerouslySetInnerHTML={{
              __html: formatMessageContent(content)
            }}
            className="whitespace-pre-wrap"
          />
        )}

        {attachments?.map((attachment, index) => (
          <div key={index}>
            {renderAttachment(attachment)}
          </div>
        ))}

        <div className={`flex items-center justify-end space-x-1 text-xs mt-1 ${
          isAgent
            ? 'text-blue-100'
            : 'text-gray-500 dark:text-gray-400'
        }`}>
          <span>{new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isAgent && status && (
            <MessageStatus 
              status={status} 
              errorMessage={error_message}
            />
          )}
        </div>
      </div>
    </div>
  );
}