import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, MessageSquare, ArrowLeftRight, ArrowUpDown, Sparkles, BookOpen, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Integration, Prompt } from '../../types/database';


interface AIImproveModalProps {
  text: string;
  onClose: () => void;
  onTextUpdate: (text: string) => void;
}

export function AIImproveModal({ text, onClose, onTextUpdate }: AIImproveModalProps) {
  const { t } = useTranslation('chats');
  const [improvedText, setImprovedText] = useState(text);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [openAIAccounts, setOpenAIAccounts] = useState<Integration[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  useEffect(() => {
    async function loadOpenAIAccounts() {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('type', 'openai')
        .eq('status', 'active');

      if (!error && data) {
        setOpenAIAccounts(data);
        if (data.length === 1) {
          setSelectedAccount(data[0].id);
        }
      }
    }

    loadOpenAIAccounts();
  }, []);

  useEffect(() => {
    async function loadPrompts() {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPrompts(data);
        if (data.length === 1) {
          setSelectedPrompt(data[0].id);
        }
      }
    }

    loadPrompts();
  }, []);

  const improvementOptions = [
    { id: 'generate', label: t('ai.options.generate'), icon: MessageSquare },
    { id: 'expand', label: t('ai.options.expand'), icon: ArrowLeftRight },
    { id: 'shorten', label: t('ai.options.shorten'), icon: ArrowUpDown },
    { id: 'improve', label: t('ai.options.improve'), icon: Sparkles },
    { id: 'formal', label: t('ai.options.formal'), icon: BookOpen },
    { id: 'casual', label: t('ai.options.casual'), icon: MessageCircle },
  ];

  const handleImprove = async () => {
    if (!selectedAccount || !selectedOption) return;
    
    setIsProcessing(true);
    try {
      // Aqui você implementará a chamada para a API da OpenAI
      // const response = await improveText(improvedText, selectedOption);
      // setImprovedText(response);
    } catch (error) {
      console.error('Erro ao melhorar texto:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    onTextUpdate(improvedText);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('ai.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('ai.selectAccount')}
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              >
                <option value="">{t('ai.selectAccountPlaceholder')}</option>
                {openAIAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    OpenAI - {account.credentials.organization_id || 'Padrão'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('ai.selectPrompt')}
              </label>
              <select
                value={selectedPrompt}
                onChange={(e) => setSelectedPrompt(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              >
                <option value="">{t('ai.selectPromptPlaceholder')}</option>
                {prompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              {t('ai.improvementType')}
            </label>
            <div className="flex flex-wrap gap-2">
              {improvementOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedOption(option.id)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      selectedOption === option.id
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              {t('ai.result')}
            </label>
            <textarea
              value={improvedText}
              onChange={(e) => setImprovedText(e.target.value)}
              className="w-full p-2 border rounded-lg min-h-[100px] dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg"
            >
              {t('ai.cancel')}
            </button>
            <button
              onClick={handleImprove}
              disabled={isProcessing || !selectedAccount || !selectedOption}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t('ai.improve')
              )}
            </button>
            <button
              onClick={handleApply}
              disabled={isProcessing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 hover:bg-green-700"
            >
              {t('ai.apply')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 