import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2, HelpCircle, MessageCircle, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import api from '../../lib/api';

// Interface para as props do modal de perguntas desconhecidas
export interface PromptUnknownModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId: string;
  organizationId: string;
  onAddToFormContext?: (response: string) => void;
}

// Componente para o modal de perguntas desconhecidas
const PromptUnknownModal: React.FC<PromptUnknownModalProps> = ({ isOpen, onClose, promptId, organizationId, onAddToFormContext }) => {
  const { t } = useTranslation(['prompts', 'common']);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unknowns, setUnknowns] = useState<{
    id: string;
    question: string;
    content: string;
    status: 'pending' | 'added' | 'rejected';
    priority: 'high' | 'medium' | 'low';
    created_at: string;
    category?: string;
    notes?: string;
    chat_id?: string;
  }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [suggestingResponse, setSuggestingResponse] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'pt' | 'en' | 'es'>('pt');
  
  useEffect(() => {
    if (isOpen && promptId) {
      loadUnknowns();
    }
  }, [isOpen, promptId, organizationId]);
  
  const loadUnknowns = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase
        .from('prompt_unknowns')
        .select('*')
        .eq('prompt_id', promptId)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setUnknowns(data || []);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Erro ao carregar perguntas desconhecidas:', error);
      setError(t('prompts:unknowns.loadError'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddToContext = async () => {
    if (!unknowns.length || currentIndex >= unknowns.length) return;
    
    const currentUnknown = unknowns[currentIndex];
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('prompt_unknowns')
        .update({
          content: response,
          status: 'added',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUnknown.id);
      
      if (error) throw error;
      
      // Adicionar ao contexto do formulário principal
      if (onAddToFormContext) {
        onAddToFormContext(response);
      }
      
      // Remover dos locais
      const newUnknowns = [...unknowns];
      newUnknowns.splice(currentIndex, 1);
      setUnknowns(newUnknowns);
      
      // Resetar resposta
      setResponse('');
      
      // Ajustar índice se necessário
      if (newUnknowns.length <= currentIndex && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      
    } catch (error) {
      console.error('Erro ao adicionar ao contexto:', error);
      setError(t('prompts:unknowns.updateError'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleReject = async () => {
    if (!unknowns.length || currentIndex >= unknowns.length) return;
    
    const currentUnknown = unknowns[currentIndex];
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('prompt_unknowns')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUnknown.id);
      
      if (error) throw error;
      
      // Remover dos locais
      const newUnknowns = [...unknowns];
      newUnknowns.splice(currentIndex, 1);
      setUnknowns(newUnknowns);
      
      // Resetar resposta
      setResponse('');
      
      // Ajustar índice se necessário
      if (newUnknowns.length <= currentIndex && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      
    } catch (error) {
      console.error('Erro ao rejeitar pergunta:', error);
      setError(t('prompts:unknowns.updateError'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleNext = () => {
    if (currentIndex < unknowns.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setResponse('');
    }
  };
  
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setResponse('');
    }
  };
  
  const navigateToChat = (chatId: string) => {
    navigate(`/app/chats/${chatId}`);
    onClose();
  };
  
  const suggestResponse = async () => {
    if (!unknowns.length || currentIndex >= unknowns.length) return;
    
    const currentUnknown = unknowns[currentIndex];
    
    setSuggestingResponse(true);
    setError('');
    
    try {
      const response = await api.post(
        `/api/${organizationId}/prompts/${promptId}/generate-response-unknown`,
        {
          question: currentUnknown.question,
          content: currentUnknown.content,
          notes: currentUnknown.notes,
          language: selectedLanguage
        }
      );
      
      if (response.data.success) {
        setResponse(response.data.data.suggestedResponse);
      } else {
        setError(response.data.error || t('prompts:unknowns.suggestResponseError', 'Erro ao sugerir resposta'));
      }
    } catch (error) {
      console.error('Erro ao sugerir resposta:', error);
      setError(t('prompts:unknowns.suggestResponseError', 'Erro ao sugerir resposta'));
    } finally {
      setSuggestingResponse(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('prompts:unknowns.title', 'Perguntas Sem Contexto')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <span className="sr-only">{t('common:close')}</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          )}

          {!loading && unknowns.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {t('prompts:unknowns.empty', 'Sem perguntas pendentes')}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('prompts:unknowns.emptyDescription', 'Não há perguntas sem contexto pendentes para este prompt')}
              </p>
            </div>
          )}

          {!loading && unknowns.length > 0 && currentIndex < unknowns.length && (
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      unknowns[currentIndex].priority === 'high' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : unknowns[currentIndex].priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {t(`prompts:unknowns.priority.${unknowns[currentIndex].priority}`, {
                        high: 'Alta',
                        medium: 'Média',
                        low: 'Baixa'
                      }[unknowns[currentIndex].priority] || 'Média')}
                    </span>
                    {/* Adicionar botão para navegar para o chat se existir chat_id */}
                    {unknowns[currentIndex].chat_id && (
                      <button
                        type="button"
                        onClick={() => navigateToChat(unknowns[currentIndex].chat_id!)}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                        title={t('prompts:unknowns.viewChat', 'Ver conversa')}
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        {t('prompts:unknowns.viewChatButton', 'Ver Conversa')}
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('prompts:unknowns.count', 'Pergunta {{current}} de {{total}}', {
                      current: currentIndex + 1,
                      total: unknowns.length
                    })}
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    {t('prompts:unknowns.question', 'Pergunta')}
                  </h3>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {unknowns[currentIndex].question}
                  </p>
                </div>
                
                {/* Adicionar exibição do conteúdo atual, se existir */}
                {unknowns[currentIndex].content && unknowns[currentIndex].content.trim() !== '' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {t('prompts:unknowns.existingContent', 'Conteúdo Atual')}
                    </h3>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {unknowns[currentIndex].content}
                    </p>
                  </div>
                )}
                
                {/* Adicionar exibição das notas, se existirem */}
                {unknowns[currentIndex].notes && unknowns[currentIndex].notes.trim() !== '' && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md mb-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {t('prompts:unknowns.notes', 'Notas')}
                    </h3>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {unknowns[currentIndex].notes}
                    </p>
                  </div>
                )}
                
                <div>
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('prompts:unknowns.response', 'Resposta para adicionar ao contexto')}
                    </label>
                    
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 rounded-md p-1">
                        <select
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value as 'pt' | 'en' | 'es')}
                          className="text-xs bg-transparent border-none focus:ring-0 pr-1 text-gray-700 dark:text-gray-300"
                        >
                          <option value="pt">PT</option>
                          <option value="en">EN</option>
                          <option value="es">ES</option>
                        </select>
                      </div>
                      
                      <button
                        type="button"
                        onClick={suggestResponse}
                        disabled={suggestingResponse}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium rounded text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 disabled:opacity-50"
                        title={t('prompts:unknowns.suggestResponse', 'Sugerir resposta com IA')}
                      >
                        {suggestingResponse ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            {t('prompts:unknowns.suggesting', 'Sugerindo...')}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 mr-1" />
                            {t('prompts:unknowns.suggestResponse', 'Sugerir resposta com IA')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="w-full p-3 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors"
                    placeholder={t('prompts:unknowns.responsePlaceholder', 'Escreva a resposta que será adicionada ao contexto...')}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-x-2">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={handlePrevious}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {t('prompts:unknowns.previous', 'Anterior')}
                  </button>
                  <button
                    type="button"
                    disabled={currentIndex >= unknowns.length - 1}
                    onClick={handleNext}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {t('prompts:unknowns.next', 'Próxima')}
                  </button>
                </div>
                
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={loading}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded-md text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {t('prompts:unknowns.reject', 'Recusar')}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToContext}
                    disabled={loading || !response.trim()}
                    className="px-3 py-2 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {t('prompts:unknowns.addToContext', 'Adicionar ao Contexto')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptUnknownModal; 