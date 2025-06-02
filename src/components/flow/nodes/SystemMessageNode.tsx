import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { X, Sparkles } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';
import { Variable } from '../../../types/flow';
import { createPortal } from 'react-dom';
import { VariableSelectorModal } from '../../flow/VariableSelectorModal';

interface SystemMessageNodeProps {
  id: string;
  data: {
    text?: string;
    label?: string;
  };
  isConnectable: boolean;
}

// Componente Portal para renderizar o modal fora da hierarquia do DOM
const Portal = ({ children }: { children: React.ReactNode }) => {
  return createPortal(children, document.body);
};

interface SystemMessageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  variables: Variable[];
  onSave: (text: string) => void;
}

// Componente para o modal de edição de mensagem do sistema
function SystemMessageEditorModal({ isOpen, onClose, text, variables, onSave }: SystemMessageEditorModalProps) {
  const { t } = useTranslation(['flows', 'common']);
  const [editedText, setEditedText] = useState(text);
  const [showVariableSelector, setShowVariableSelector] = useState(false);
  
  // Quando o modal de variáveis está aberto, bloqueamos o scroll
  React.useEffect(() => {
    if (showVariableSelector) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [showVariableSelector]);
  
  const handleInsertVariable = (variableName: string) => {
    const textarea = document.getElementById('system-message-editor') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const textBefore = editedText.substring(0, start);
      const textAfter = editedText.substring(end);
      
      setEditedText(textBefore + variableName + textAfter);
      
      // Foco no textarea após a inserção
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = start + variableName.length;
        textarea.selectionEnd = start + variableName.length;
      }, 0);
    } else {
      setEditedText(editedText + variableName);
    }
  };
  
  const openVariableSelector = () => {
    setShowVariableSelector(true);
  };
  
  const closeVariableSelector = () => {
    setShowVariableSelector(false);
  };
  
  const handleSave = () => {
    onSave(editedText);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <Portal>
      <div className="fixed inset-0 z-40">
        {/* Overlay semi-transparente */}
        <div 
          className="absolute inset-0 bg-gray-500 bg-opacity-50"
          onClick={onClose}
        />
        
        {/* Modal fixado no lado direito */}
        <div 
          className="absolute top-0 right-0 h-full w-[600px] bg-white dark:bg-gray-800 shadow-xl flex flex-col overflow-hidden"
          style={{ maxWidth: '100vw' }}
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('flows:nodes.systemMessage.edit')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4 relative">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="system-message-editor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('flows:nodes.systemMessage.messagePlaceholder')}
                </label>
                <button
                  type="button"
                  onClick={openVariableSelector}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  {t('flows:variables.insertVariable')}
                </button>
              </div>
              <textarea
                id="system-message-editor"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={8}
                className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('flows:nodes.systemMessage.messagePlaceholder')}
              />
              
              {showVariableSelector && (
                <VariableSelectorModal
                  isOpen={showVariableSelector}
                  onClose={closeVariableSelector}
                  variables={variables}
                  onSelectVariable={handleInsertVariable}
                />
              )}
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t('flows:nodes.systemMessage.description')}
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              {t('common:cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {t('common:save')}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// Função para renderizar texto com variáveis destacadas
function RenderTextWithVariables({ text }: { text: string }) {
  // Constantes para controle de tamanho do texto
  const MAX_CHARS = 150; // Número máximo de caracteres a serem exibidos
  const MAX_LINES = 5; // Número máximo de linhas a serem exibidas
  
  // Verificar se o texto precisa ser truncado
  const needsTruncation = text.length > MAX_CHARS || text.split('\n').length > MAX_LINES;
  
  // Truncar o texto se necessário
  const truncateText = (text: string) => {
    // Se o texto não precisa ser truncado, retorná-lo como está
    if (!needsTruncation) return text;
    
    // Dividir o texto em linhas
    const lines = text.split('\n');
    
    // Se houver mais linhas que o máximo permitido
    if (lines.length > MAX_LINES) {
      // Pegar apenas as primeiras MAX_LINES linhas
      const truncatedLines = lines.slice(0, MAX_LINES);
      return truncatedLines.join('\n');
    }
    
    // Se o texto for muito longo, truncá-lo
    if (text.length > MAX_CHARS) {
      // Encontrar o último espaço antes do limite para não cortar palavras
      const lastSpace = text.substring(0, MAX_CHARS).lastIndexOf(' ');
      const truncateAt = lastSpace > 0 ? lastSpace : MAX_CHARS;
      return text.substring(0, truncateAt);
    }
    
    return text;
  };
  
  // Texto truncado para exibição
  const displayText = needsTruncation ? truncateText(text) : text;
  
  // Regex para encontrar variáveis no formato {{variableName}}
  const regex = /\{\{([^}]+)\}\}/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  // Encontrar todas as ocorrências de variáveis no texto
  while ((match = regex.exec(displayText)) !== null) {
    // Adicionar texto antes da variável
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: displayText.substring(lastIndex, match.index),
        key: `text-${lastIndex}`
      });
    }
    
    // Adicionar a variável
    parts.push({
      type: 'variable',
      content: match[1], // Nome da variável sem as chaves
      key: `var-${match.index}`
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Adicionar o texto restante após a última variável
  if (lastIndex < displayText.length) {
    parts.push({
      type: 'text',
      content: displayText.substring(lastIndex),
      key: `text-${lastIndex}`
    });
  }
  
  return (
    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
      {parts.map((part) => {
        if (part.type === 'variable') {
          return (
            <span 
              key={part.key} 
              className="px-1 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded"
            >
              {`{{${part.content}}}`}
            </span>
          );
        }
        return <span key={part.key}>{part.content}</span>;
      })}
      
      {/* Indicador de texto truncado - apenas elipses */}
      {needsTruncation && <span>...</span>}
    </div>
  );
}

export function SystemMessageNode({ id, data, isConnectable }: SystemMessageNodeProps) {
  const { t } = useTranslation('flows');
  const { updateNodeData, variables } = useFlowEditor();
  const [showEditModal, setShowEditModal] = useState(false);
  
  const text = data.text || '';
  
  const handleSaveText = useCallback((newText: string) => {
    updateNodeData(id, { 
      ...data, 
      text: newText
    });
  }, [id, data, updateNodeData]);
  
  const handleLabelChange = useCallback((newLabel: string) => {
    updateNodeData(id, { ...data, label: newLabel });
  }, [id, data, updateNodeData]);
  
  return (
    <div className="bg-white dark:bg-gray-800" id={`node-${id}`}>
      <BaseNode 
        id={id} 
        data={data}
        type="system_message"
        onLabelChange={handleLabelChange}
      />
      
      <div 
        className="border-t border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
        onClick={() => setShowEditModal(true)}
      >
        <div className="mb-2">
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300 rounded">
            {t('flows:nodes.systemMessage.systemOnly')}
          </span>
        </div>
        
        <div className="max-h-[100px] overflow-hidden bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-2">
          {text ? (
            <RenderTextWithVariables text={text} />
          ) : (
            <div className="flex items-center justify-center h-[40px] text-gray-400 dark:text-gray-500 text-sm italic">
              {t('flows:nodes.systemMessage.messagePlaceholder')}
            </div>
          )}
        </div>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
      
      {showEditModal && (
        <SystemMessageEditorModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          text={text}
          variables={variables}
          onSave={handleSaveText}
        />
      )}
    </div>
  );
} 