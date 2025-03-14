import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, MessageSquare, ArrowLeftRight, ArrowUpDown, Sparkles, BookOpen, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Prompt } from '../../types/database';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import api from '../../lib/api';
import { useAuthContext } from '../../contexts/AuthContext';

interface AIImproveModalProps {
  text: string;
  onClose: () => void;
  onTextUpdate: (text: string) => void;
  chatId?: string;
}

export function AIImproveModal({ text, onClose, onTextUpdate, chatId }: AIImproveModalProps) {
  const { t, i18n } = useTranslation('chats');
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization.id || '';
  const [improvedText, setImprovedText] = useState(text);
  const [selectedOption, setSelectedOption] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [error, setError] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const isMobile = useMediaQuery('(max-width: 640px)');

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

  // Atualizar o texto melhorado quando o texto original mudar
  useEffect(() => {
    setImprovedText(text);
  }, [text]);

  // Definir uma opção padrão quando os prompts forem carregados
  useEffect(() => {
    if (prompts.length > 0 && !selectedOption) {
      // Se não houver texto, selecionar 'generate' como padrão (desde que tenhamos chatId)
      if (!text.trim() && chatId) {
        setSelectedOption('generate');
      } else if (text.trim()) {
        // Se houver texto, selecionar 'improve' como padrão
        setSelectedOption('improve');
      } else if (chatId) {
        // Se não houver texto mas temos chatId, selecionar 'generate'
        setSelectedOption('generate');
      }
    }
  }, [prompts, chatId, selectedOption, text]);

  const improvementOptions = [
    { id: 'generate', label: t('ai.options.generate'), icon: MessageSquare },
    { id: 'expand', label: t('ai.options.expand'), icon: ArrowLeftRight },
    { id: 'shorten', label: t('ai.options.shorten'), icon: ArrowUpDown },
    { id: 'improve', label: t('ai.options.improve'), icon: Sparkles },
    { id: 'formal', label: t('ai.options.formal'), icon: BookOpen },
    { id: 'casual', label: t('ai.options.casual'), icon: MessageCircle },
    { id: 'custom', label: t('ai.options.custom'), icon: Sparkles },
  ];

  // Função para obter o texto de erro com base na opção selecionada
  const getErrorMessage = (errorKey: string) => {
    if (!selectedOption) return t(`ai.errors.${errorKey}`);
    
    const optionLabel = improvementOptions.find(opt => opt.id === selectedOption)?.label.toLowerCase();
    
    // Mensagens de erro específicas para cada opção
    if (errorKey === 'noText') {
      if (selectedOption === 'generate') {
        return t('ai.errors.noChatId');
      } else {
        return t('ai.errors.noTextForOption', { option: optionLabel });
      }
    }
    
    return t(`ai.errors.${errorKey}`);
  };

  const handleImprove = async () => {
    if (!selectedPrompt) {
      setError(t('ai.errors.noPrompt'));
      return;
    }
    
    if (!selectedOption) {
      setError(t('ai.errors.noOption'));
      return;
    }
    
    // Para a opção 'generate', precisamos do chatId
    if (selectedOption === 'generate' && !chatId) {
      setError(t('ai.errors.noChatId'));
      return;
    }
    
    // Para a opção 'custom', precisamos de instruções customizadas
    if (selectedOption === 'custom' && !customInstructions.trim()) {
      setError(t('ai.errors.noCustomInstructions'));
      return;
    }
    
    // Para outras opções, precisamos de texto
    if (selectedOption !== 'generate' && !text.trim() && !improvedText.trim()) {
      setError(getErrorMessage('noText'));
      return;
    }
    
    setIsProcessing(true);
    setError('');
    
    try {
      // Preparar os dados para a requisição
      const requestData: {
        improveOption: string;
        chatId?: string;
        text?: string;
        language?: string;
        customInstructions?: string;
      } = {
        improveOption: selectedOption,
        language: i18n.language
      };
      
      // Adicionar dados específicos com base na opção selecionada
      if (selectedOption === 'generate') {
        requestData.chatId = chatId;
      } else {
        // Usar o texto melhorado se já existir, caso contrário usar o texto original
        requestData.text = improvedText.trim() ? improvedText : text;
      }

      // Adicionar instruções customizadas se a opção for 'custom'
      if (selectedOption === 'custom' && customInstructions.trim()) {
        requestData.customInstructions = customInstructions.trim();
      }
      
      // Enviar a requisição para a API
      const response = await api.post(
        `/api/${organizationId}/prompts/${selectedPrompt}/improve-text`,
        requestData
      );
      
      if (response.data.success) {
        setImprovedText(response.data.data.text);
      } else {
        throw new Error(response.data.error || t('ai.errors.generic'));
      }
    } catch (error: unknown) {
      console.error('Erro ao melhorar texto:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : t('ai.errors.generic');
      
      // Verificar se é um erro de API com resposta
      const apiError = error as { response?: { data?: { error?: string } } };
      setError(apiError.response?.data?.error || errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    onTextUpdate(improvedText);
    onClose();
  };

  // Prevenir o scroll do corpo quando o modal estiver aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <Sparkles className="w-4 h-4 mr-2 text-blue-500" />
            {selectedOption 
              ? `${improvementOptions.find(opt => opt.id === selectedOption)?.label} ${t('ai.with')}` 
              : t('ai.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-3">
            {error && (
              <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-md">
                {error}
              </div>
            )}
            
            {/* Seletor de Agente IA */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('ai.selectAgent')}
              </label>
              <select
                value={selectedPrompt}
                onChange={(e) => setSelectedPrompt(e.target.value)}
                className="w-full p-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('ai.selectAgentPlaceholder')}</option>
                {prompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Opções de melhoria em grid responsivo */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('ai.improvementType')}
              </label>
              <div className="flex flex-wrap gap-1.5 pb-1">
                {improvementOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedOption(option.id)}
                      className={`flex-1 min-w-[calc(33.33%-6px)] sm:min-w-[calc(20%-6px)] md:min-w-[calc(16.66%-6px)] px-2 py-1.5 rounded-lg flex flex-row items-center justify-center gap-1.5 text-xs transition-colors ${
                        selectedOption === option.id
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 ring-1 ring-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="whitespace-nowrap">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campo de instruções customizadas - aparece apenas quando a opção 'custom' é selecionada */}
            {selectedOption === 'custom' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('ai.customInstructions')}
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={t('ai.customInstructionsPlaceholder')}
                  className="w-full p-2 border rounded-lg min-h-[80px] text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            )}

            {/* Área de texto - mostrada para todas as opções exceto 'generate' quando não há resposta */}
            {selectedOption && selectedOption !== 'generate' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('ai.result')}
                </label>
                {improvedText.trim() && improvedText !== text && (
                  <div className="p-2 mb-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm rounded-md">
                    {t('ai.generateSuccess')}
                  </div>
                )}
                <textarea
                  value={improvedText}
                  onChange={(e) => setImprovedText(e.target.value)}
                  className="w-full p-2 border rounded-lg min-h-[120px] text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            )}

            {/* Área de texto para a opção 'generate' quando já temos uma resposta */}
            {selectedOption === 'generate' && improvedText.trim() && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('ai.result')}
                </label>
                <div className="p-2 mb-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm rounded-md">
                  {t('ai.generateSuccess')}
                </div>
                <textarea
                  value={improvedText}
                  onChange={(e) => setImprovedText(e.target.value)}
                  className="w-full p-2 border rounded-lg min-h-[120px] text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            )}

            {/* Mensagem informativa para a opção 'generate' quando ainda não temos resposta */}
            {selectedOption === 'generate' && !improvedText.trim() && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-md">
                {t('ai.generateInfo')}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com botões */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          {isMobile ? (
            // Layout para mobile - botões empilhados
            <div className="flex flex-col w-full gap-2">
              <button
                onClick={handleApply}
                disabled={isProcessing || !improvedText.trim()}
                className="w-full py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 hover:bg-green-700 text-sm font-medium transition-colors"
              >
                {t('ai.apply')}
              </button>
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleImprove}
                  disabled={
                    isProcessing || 
                    !selectedPrompt || 
                    !selectedOption || 
                    (selectedOption !== 'generate' && !text.trim() && !improvedText.trim()) ||
                    (selectedOption === 'custom' && !customInstructions.trim())
                  }
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    selectedOption ? 
                      `${improvementOptions.find(opt => opt.id === selectedOption)?.label} ${t('ai.with')}` : 
                      t('ai.improve')
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('ai.cancel')}
                </button>
              </div>
            </div>
          ) : (
            // Layout para desktop - botões lado a lado
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                {t('ai.cancel')}
              </button>
              <button
                onClick={handleImprove}
                disabled={
                  isProcessing || 
                  !selectedPrompt || 
                  !selectedOption || 
                  (selectedOption !== 'generate' && !text.trim() && !improvedText.trim()) ||
                  (selectedOption === 'custom' && !customInstructions.trim())
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 text-sm font-medium transition-colors flex items-center"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {selectedOption ? 
                      `${improvementOptions.find(opt => opt.id === selectedOption)?.label} ${t('ai.with')}` : 
                      t('ai.improve')}
                  </>
                )}
              </button>
              <button
                onClick={handleApply}
                disabled={isProcessing || !improvedText.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 hover:bg-green-700 text-sm font-medium transition-colors"
              >
                {t('ai.apply')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 