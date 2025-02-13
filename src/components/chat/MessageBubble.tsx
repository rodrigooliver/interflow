import React from 'react';
import { MessageStatus } from './MessageStatus';
import { Image, FileText } from 'lucide-react';

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isAgent: boolean;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  attachments?: { url: string; type: string; name: string }[];
}

export function MessageBubble({ content, timestamp, isAgent, status, errorMessage, attachments }: MessageBubbleProps) {
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
              className="max-w-full rounded-lg max-h-[300px] object-contain"
            />
          </a>
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
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
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
          <span>{new Date(timestamp).toLocaleTimeString()}</span>
          {isAgent && status && (
            <MessageStatus 
              status={status} 
              errorMessage={errorMessage}
            />
          )}
        </div>
      </div>
    </div>
  );
}