import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, MessageSquare, ArrowLeftRight, ArrowUpDown, Sparkles, BookOpen, MessageCircle } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import api from '../../lib/api';
import { useAuthContext } from '../../contexts/AuthContext';
import { usePrompts } from '../../hooks/useQueryes';

interface AIImproveModalProps {
  text: string;
  onClose: () => void;
  onTextUpdate: (text: string) => void;
  chatId?: string;
}

export function AIImproveModal({ text, onClose, onTextUpdate, chatId }: AIImproveModalProps) {
  const { t, i18n } = useTranslation(['chats', 'prompts']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization.id || '';
  const [improvedText, setImprovedText] = useState(text);
  const [selectedOption, setSelectedOption] = useState(text.trim() ? 'improve' : 'generate');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const { data: prompts = [], isLoading: loadingPrompts } = usePrompts(organizationId);
  const [error, setError] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isMac = typeof navigator !== 'undefined' && 
    (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Selecionar o prompt padrão ou único quando os prompts forem carregados
  useEffect(() => {
    if (prompts.length > 0 && !selectedPrompt) {
      // Se existe apenas um prompt, selecione-o automaticamente
      if (prompts.length === 1) {
        setSelectedPrompt(prompts[0].id);
      } 
      // Se existem múltiplos prompts, verifique se algum é o padrão
      else if (prompts.length > 1) {
        // Verificar se existe um prompt padrão (is_default = true)
        const defaultPrompt = prompts.find(prompt => prompt.is_default);
        
        if (defaultPrompt) {
          // Se existir um prompt padrão, selecione-o automaticamente
          setSelectedPrompt(defaultPrompt.id);
        } else {
          setSelectedPrompt(prompts[0].id);
        }
      }
    }
  }, [prompts, selectedPrompt]);

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
    { id: 'generate', label: t('ai.options.generate'), icon: MessageSquare, shortcut: '1' },
    { id: 'expand', label: t('ai.options.expand'), icon: ArrowLeftRight, shortcut: '2' },
    { id: 'shorten', label: t('ai.options.shorten'), icon: ArrowUpDown, shortcut: '3' },
    { id: 'improve', label: t('ai.options.improve'), icon: Sparkles, shortcut: '4' },
    { id: 'formal', label: t('ai.options.formal'), icon: BookOpen, shortcut: '5' },
    { id: 'casual', label: t('ai.options.casual'), icon: MessageCircle, shortcut: '6' },
    { id: 'custom', label: t('ai.options.custom'), icon: Sparkles, shortcut: '7' },
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

  // Função para limpar o texto
  const clearText = () => {
    setImprovedText('');
    // Focar no textarea após limpar
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 10);
  };

  // Adicionar handler para teclas de atalho
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Verificar se é Ctrl+número ou Command+número (1-7)
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        const key = e.key;
        const option = improvementOptions.find(opt => opt.shortcut === key);
        
        if (option) {
          e.preventDefault();
          
          // Verificar se o foco atual está em uma textarea ou input
          const isTextareaOrInputFocused = 
            document.activeElement?.tagName === 'TEXTAREA' || 
            document.activeElement?.tagName === 'INPUT';
          
          // Salvar o estado atual para aplicar foco após a atualização
          const shouldFocusTextarea = !isTextareaOrInputFocused;
          
          // Atualizar a opção selecionada
          setSelectedOption(option.id);
          
          // Usar um timeout mais longo para garantir que a UI seja completamente atualizada
          setTimeout(() => {
            // Encontrar o textarea mesmo se a ref não estiver corretamente ligada
            // (pode acontecer devido à renderização condicional)
            const textareaElement = textareaRef.current || 
                                  document.querySelector('.flex-1 textarea') as HTMLTextAreaElement;
                                  
            if (shouldFocusTextarea && textareaElement) {
              console.log('Focusing textarea after shortcut');
              textareaElement.focus();
            }
          }, 100);
        }

        // Atalho para melhorar texto com Ctrl+J/Cmd+J
        if (key.toLowerCase() === 'j' && selectedPrompt && selectedOption) {
          e.preventDefault();
          handleImprove();
        }
        
        // Atalho para limpar texto com Ctrl+Backspace ou Ctrl+Delete
        if ((key === 'Backspace' || key === 'Delete') && improvedText.trim()) {
          e.preventDefault();
          clearText();
        }
      }
      
      // Atalho para aplicar (Ctrl+Enter ou Cmd+Enter)
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && improvedText.trim()) {
        e.preventDefault();
        handleApply();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedOption, improvedText, selectedPrompt]);

  // Tentar focar no textarea quando o componente for montado
  useEffect(() => {
    // Tentar focar após a primeira renderização
    setTimeout(() => {
      const textareaElement = textareaRef.current;
      if (textareaElement) {
        console.log('Initial focus on textarea');
      }
    }, 300);
  }, []);

  // Tentar focar no textarea quando a opção selecionada mudar
  useEffect(() => {
    if (selectedOption) {
      setTimeout(() => {
        const textareaElement = textareaRef.current;
        if (textareaElement && !document.activeElement?.contains(textareaElement)) {
          console.log('Focusing textarea after option change');
          textareaElement.focus();
        }
      }, 300);
    }
  }, [selectedOption]);

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
                disabled={loadingPrompts}
              >
                <option value="">{loadingPrompts ? t('common:loading') : t('ai.selectAgentPlaceholder')}</option>
                {prompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.title}{prompt.is_default ? ` (${t('prompts:defaultAgent')})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Opções de melhoria em grid responsivo */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('ai.improvementType')}
              </label>
              <div className="flex flex-wrap gap-2 pb-1">
                {improvementOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedOption(option.id)}
                      className={`flex-1 min-w-[calc(50%-4px)] sm:min-w-[calc(33.33%-8px)] md:min-w-[calc(33.33%-8px)] px-3 py-2 rounded-lg flex flex-row items-center justify-center gap-2 text-xs transition-colors ${
                        selectedOption === option.id
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 ring-1 ring-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">{option.label}</span>
                      {/* Mostrar atalhos apenas em desktops */}
                      {!isMobile && (
                        <span className="ml-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px] text-gray-600 dark:text-gray-300">
                          {isMac ? '⌘' : 'Ctrl'} {option.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Exibir a legenda de atalhos apenas em dispositivos não-móveis */}
              {!isMobile && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                  <span>{isMac ? '⌘' : 'Ctrl'} 1-7: {t('ai.shortcuts.select', 'Selecionar opção')}</span>
                  <span>{isMac ? '⌘' : 'Ctrl'} J: {t('ai.shortcuts.improve', 'Melhorar texto')}</span>
                  <span>{isMac ? '⌘' : 'Ctrl'} Enter: {t('ai.shortcuts.apply', 'Aplicar texto')}</span>
                  <span>{isMac ? '⌘' : 'Ctrl'} ⌫: {t('ai.shortcuts.clear', 'Limpar texto')}</span>
                </div>
              )}
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex justify-between items-center">
                  <span>{t('ai.result')}</span>
                  <button 
                    onClick={clearText}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
                    title={t('ai.clearText', 'Limpar texto')}
                  >
                    <span>{t('ai.clear', 'Limpar')}</span>
                    <span className="ml-1 text-[10px] text-gray-400">
                      {isMac ? '⌘ ⌫' : 'Ctrl ⌫'}
                    </span>
                  </button>
                </label>
                <textarea
                  ref={textareaRef}
                  value={improvedText}
                  onChange={(e) => setImprovedText(e.target.value)}
                  className="w-full p-2 border rounded-lg min-h-[120px] text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            )}

            {/* Área de texto para a opção 'generate' quando já temos uma resposta */}
            {selectedOption === 'generate' && improvedText.trim() && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex justify-between items-center">
                  <span>{t('ai.result')}</span>
                  <button 
                    onClick={clearText}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
                    title={t('ai.clearText', 'Limpar texto')}
                  >
                    <span>{t('ai.clear', 'Limpar')}</span>
                    <span className="ml-1 text-[10px] text-gray-400">
                      {isMac ? '⌘ ⌫' : 'Ctrl ⌫'}
                    </span>
                  </button>
                </label>
                <textarea
                  ref={textareaRef}
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
                onClick={handleImprove}
                disabled={
                  isProcessing || 
                  !selectedPrompt || 
                  !selectedOption || 
                  (selectedOption !== 'generate' && !text.trim() && !improvedText.trim()) ||
                  (selectedOption === 'custom' && !customInstructions.trim())
                }
                className="w-full py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>{t('ai.generating', 'Gerando texto...')}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span>
                      {selectedOption ? 
                        `${improvementOptions.find(opt => opt.id === selectedOption)?.label} ${t('ai.with')}` : 
                        t('ai.improve')}
                    </span>
                    {/* Não exibir atalhos em dispositivos móveis */}
                  </div>
                )}
              </button>
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleApply}
                  disabled={isProcessing || !improvedText.trim()}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <span>{t('ai.apply')}</span>
                    {/* Não exibir atalhos em dispositivos móveis */}
                  </div>
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
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>{t('ai.generating', 'Gerando texto...')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    <span>
                      {selectedOption ? 
                        `${improvementOptions.find(opt => opt.id === selectedOption)?.label} ${t('ai.with')}` : 
                        t('ai.improve')}
                    </span>
                    <span className="ml-2 px-2 py-0.5 bg-blue-500 rounded text-xs">
                      {isMac ? '⌘' : 'Ctrl'} J
                    </span>
                  </>
                )}
              </button>
              <button
                onClick={handleApply}
                disabled={isProcessing || !improvedText.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 hover:bg-green-700 text-sm font-medium transition-colors flex items-center"
              >
                <span>{t('ai.apply')}</span>
                <span className="ml-2 px-2 py-0.5 bg-green-500 rounded text-xs">
                  {isMac ? '⌘' : 'Ctrl'} ↵
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 