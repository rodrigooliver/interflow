import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MessageSquare, Thermometer, Send } from 'lucide-react';
import { ChatMessage, TokenUsage } from '../../types/prompts';
import { Integration } from '../../types/database';
import api from '../../lib/api';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';

interface TestChatProps {
  selectedIntegration: Integration | null;
  selectedModel: string;
  temperature: number;
  systemPrompt: string;
  content_addons?: Array<{
    id: string;
    title: string;
    description: string;
    content: string;
    type: string;
  }>;
  placeholder?: string;
  emptyMessage?: string;
  clearChatText?: string;
  sendButtonText?: string;
  testingText?: string;
  noIntegrationMessage?: string;
  tokenUsageLabel?: string;
  promptTokensLabel?: string;
  completionTokensLabel?: string;
  totalTokensLabel?: string;
  showIntegrationInfo?: boolean;
  showTemperatureInfo?: boolean;
}

const TestChat: React.FC<TestChatProps> = ({
  selectedIntegration,
  selectedModel,
  temperature,
  systemPrompt,
  content_addons = [],
  placeholder,
  emptyMessage,
  clearChatText,
  sendButtonText,
  testingText,
  noIntegrationMessage,
  tokenUsageLabel,
  promptTokensLabel,
  completionTokensLabel,
  totalTokensLabel,
  showIntegrationInfo = true,
  showTemperatureInfo = true
}) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [testMessage, setTestMessage] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Effect to scroll to the end of the conversation when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleTestPrompt = async () => {
    if (!selectedIntegration || !testMessage) return;
    
    setTesting(true);
    setError('');
    // Reset token usage information when starting a new test
    setTokenUsage(null);
    
    try {
      // Add the user message to the history
      const updatedMessages: ChatMessage[] = [
        ...chatMessages,
        { role: 'user', content: testMessage }
      ];
      
      // Update the state to show the user message immediately
      setChatMessages(updatedMessages);
      
      // Store a reference to the input element before clearing the text
      const inputElement = inputRef.current;
      
      // Clear the message field immediately after sending
      setTestMessage('');
      
      // Keep focus on the input field after clearing the text
      setTimeout(() => {
        if (inputElement) {
          inputElement.focus();
        }
      }, 0);
      
      // Prepare messages to send to the backend
      const apiMessages = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Use the new backend API route to test the prompt
      const response = await api.post(
        `/api/${selectedIntegration.organization_id}/integrations/${selectedIntegration.id}/test-prompt`,
        {
          systemPrompt,
          messages: apiMessages,
          model: selectedModel,
          temperature,
          content_addons
        }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || t('prompts:testError'));
      }
      
      const assistantMessage = response.data.data.message;
      
      // Capture token usage information if available
      if (response.data.data.usage) {
        setTokenUsage(response.data.data.usage);
      }
      
      // Add the assistant's response to the history
      setChatMessages([
        ...updatedMessages,
        { 
          role: 'assistant' as const, 
          content: assistantMessage.content 
        }
      ]);
    } catch (error: unknown) {
      console.error('Error testing prompt:', error);
      const apiError = error as { response?: { data?: { error?: string } }, message?: string };
      setError(apiError.response?.data?.error || apiError.message || t('prompts:testError'));
    } finally {
      setTesting(false);
      // Ensure focus returns to the input field after the response
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleClearChat = () => {
    setChatMessages([]);
    setTokenUsage(null);
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex items-center justify-between mb-0">
        <h2 className="hidden md:flex text-xl font-semibold text-gray-700 dark:text-gray-300 items-center">
          <MessageSquare className="w-5 h-5 mr-2" />
          {t('prompts:test.title')}
        </h2>
        {chatMessages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            {clearChatText || t('prompts:clearChat') || 'Limpar conversa'}
          </button>
        )}
      </div>

      {/* Informações de integração e modelo */}
      <div className="hidden sm:block mb-4">
        {showIntegrationInfo && (
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              {selectedIntegration ? (
                <span>{selectedIntegration.name}</span>
              ) : (
                <span className="text-red-500">{noIntegrationMessage || t('prompts:test.noIntegration')}</span>
              )}
            </div>
            {showTemperatureInfo && (
              <div className="flex items-center">
                <Thermometer className="w-4 h-4 mr-2" />
                <span>{temperature}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mensagens de erro e sucesso */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Container de mensagens */}
      <div 
        ref={chatContainerRef}
        className="flex-grow border rounded-md mb-4 p-4 overflow-y-auto border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/30 min-h-0"
      >
        {chatMessages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
            {emptyMessage || t('prompts:test.empty')}
          </div>
        )}
        {chatMessages.map((message, index) => (
          <div key={index} className={`mb-3 ${message.role === 'assistant' ? 'pl-4' : 'pr-4'}`}>
            <div className={`p-3 rounded-lg ${
              message.role === 'assistant' 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-gray-900 dark:text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
            }`}>
              <MarkdownRenderer content={message.content} />
            </div>
          </div>
        ))}
      </div>

      {/* Exibição de informações de uso de tokens */}
      {tokenUsage && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-md text-sm">
          <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">
            {tokenUsageLabel || t('prompts:test.tokenUsage')}
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">{promptTokensLabel || t('prompts:test.promptTokens')}:</span>
              <span className="ml-1">{tokenUsage.prompt_tokens}</span>
            </div>
            <div>
              <span className="font-medium">{completionTokensLabel || t('prompts:test.completionTokens')}:</span>
              <span className="ml-1">{tokenUsage.completion_tokens}</span>
            </div>
            <div>
              <span className="font-medium">{totalTokensLabel || t('prompts:test.totalTokens')}:</span>
              <span className="ml-1">{tokenUsage.total_tokens}</span>
            </div>
          </div>
        </div>
      )}

      {/* Input e botão de envio */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          placeholder={placeholder || t('prompts:test.placeholder')}
          className="flex-1 p-3 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !testing && testMessage.trim() && selectedIntegration) {
              e.preventDefault();
              handleTestPrompt();
            }
          }}
        />
        <button
          onClick={handleTestPrompt}
          disabled={testing || !selectedIntegration || !testMessage.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700 transition-colors flex items-center"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {testingText || t('prompts:test.testing')}
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {sendButtonText || t('prompts:test.send')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TestChat; 