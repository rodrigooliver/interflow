import React, { useState, useCallback, useMemo, ReactNode } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { MessageSquare, X, AlertCircle } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';
import { Variable } from '../../../types/flow';
import { createPortal } from 'react-dom';

interface ListSection {
  title: string;
  rows: ListRow[];
}

interface ListRow {
  title: string;
  description: string;
  rowId: string;
}

interface ListOptions {
  title: string;
  description: string;
  buttonText: string;
  footerText: string;
  sections: ListSection[];
}

interface TextNodeProps {
  id: string;
  data: {
    text?: string;
    label?: string;
    splitParagraphs?: boolean;
    listOptions?: ListOptions;
  };
  isConnectable: boolean;
}

// Componente Portal para renderizar o modal fora da hierarquia do DOM
const Portal = ({ children }: { children: ReactNode }) => {
  return createPortal(children, document.body);
};

interface TextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  variables: Variable[];
  splitParagraphs: boolean;
  listOptions?: ListOptions;
  onSave: (text: string, splitParagraphs: boolean, listOptions?: ListOptions) => void;
}

// Componente para o modal de edição de texto
function TextEditorModal({ isOpen, onClose, text, variables, splitParagraphs, listOptions, onSave }: TextEditorModalProps) {
  const { t } = useTranslation(['flows', 'common']);
  const [editedText, setEditedText] = useState(text);
  const [shouldSplitParagraphs, setShouldSplitParagraphs] = useState(splitParagraphs);
  const [showListOptions, setShowListOptions] = useState(!!listOptions);
  const [editedListOptions, setEditedListOptions] = useState<ListOptions>(listOptions || {
    title: '',
    description: '',
    buttonText: '',
    footerText: '',
    sections: []
  });
  
  const handleInsertVariable = (variable: Variable) => {
    const variableTag = `{{${variable.name}}}`;
    const textarea = document.getElementById('text-editor') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const textBefore = editedText.substring(0, start);
      const textAfter = editedText.substring(end);
      
      setEditedText(textBefore + variableTag + textAfter);
      
      // Foco no textarea após a inserção
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = start + variableTag.length;
        textarea.selectionEnd = start + variableTag.length;
      }, 0);
    } else {
      setEditedText(editedText + variableTag);
    }
  };
  
  const handleSave = () => {
    onSave(editedText, shouldSplitParagraphs, showListOptions ? editedListOptions : undefined);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <Portal>
      <div className="fixed inset-0 z-50">
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
              {t('flows:nodes.sendText.edit')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4">
              <label htmlFor="text-editor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('flows:nodes.messagePlaceholder')}
              </label>
              <textarea
                id="text-editor"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={8}
                className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('flows:nodes.messagePlaceholder')}
              />
            </div>
            
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('flows:variables.title')}
                </h4>
              </div>
              
              {variables.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {variables.map((variable, index) => (
                    <button
                      key={index}
                      onClick={() => handleInsertVariable(variable)}
                      className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                    >
                      {variable.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('flows:variables.noVariables')}
                </p>
              )}
            </div>
            
            <div className="mb-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="split-paragraphs"
                  checked={shouldSplitParagraphs}
                  onChange={(e) => setShouldSplitParagraphs(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="split-paragraphs" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  {t('flows:nodes.sendText.splitParagraphs')}
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('flows:nodes.sendText.splitParagraphsDescription')}
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show-list-options"
                  checked={showListOptions}
                  onChange={(e) => setShowListOptions(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show-list-options" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  {t('flows:nodes.sendText.showListOptions')}
                </label>
              </div>
              {showListOptions && (
                <div className="mt-2 flex items-center text-sm text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>
                    {t('flows:nodes.sendText.listOptionsWarning')}
                  </span>
                </div>
              )}
            </div>

            {showListOptions && (
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('flows:nodes.sendText.listOptions')}
                </h4>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder={t('flows:nodes.sendText.listTitle')}
                    value={editedListOptions.title}
                    onChange={(e) => setEditedListOptions({ ...editedListOptions, title: e.target.value })}
                    className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  
                  <input
                    type="text"
                    placeholder={t('flows:nodes.sendText.listDescription')}
                    value={editedListOptions.description}
                    onChange={(e) => setEditedListOptions({ ...editedListOptions, description: e.target.value })}
                    className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  
                  <input
                    type="text"
                    placeholder={t('flows:nodes.sendText.listButtonText')}
                    value={editedListOptions.buttonText}
                    onChange={(e) => setEditedListOptions({ ...editedListOptions, buttonText: e.target.value })}
                    className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  
                  <input
                    type="text"
                    placeholder={t('flows:nodes.sendText.listFooterText')}
                    value={editedListOptions.footerText}
                    onChange={(e) => setEditedListOptions({ ...editedListOptions, footerText: e.target.value })}
                    className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div className="space-y-4">
                  {editedListOptions.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="border border-gray-200 dark:border-gray-700 rounded-md p-4 relative">
                      <button
                        onClick={() => {
                          const newSections = editedListOptions.sections.filter((_, index) => index !== sectionIndex);
                          setEditedListOptions({ ...editedListOptions, sections: newSections });
                        }}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-full shadow-sm"
                        title={t('common:delete')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="mb-2">
                        <input
                          type="text"
                          placeholder={t('flows:nodes.sendText.sectionTitle')}
                          value={section.title}
                          onChange={(e) => {
                            const newSections = [...editedListOptions.sections];
                            newSections[sectionIndex] = { ...section, title: e.target.value };
                            setEditedListOptions({ ...editedListOptions, sections: newSections });
                          }}
                          className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      
                      {section.rows.map((row, rowIndex) => (
                        <div key={rowIndex} className="space-y-2 mb-4 border border-gray-200 dark:border-gray-700 rounded-md p-4 relative">
                          <button
                            onClick={() => {
                              const newSections = [...editedListOptions.sections];
                              newSections[sectionIndex].rows = newSections[sectionIndex].rows.filter((_, index) => index !== rowIndex);
                              setEditedListOptions({ ...editedListOptions, sections: newSections });
                            }}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-full shadow-sm"
                            title={t('common:delete')}
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <input
                            type="text"
                            placeholder={t('flows:nodes.sendText.rowTitle')}
                            value={row.title}
                            onChange={(e) => {
                              const newSections = [...editedListOptions.sections];
                              newSections[sectionIndex].rows[rowIndex] = { ...row, title: e.target.value };
                              setEditedListOptions({ ...editedListOptions, sections: newSections });
                            }}
                            className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                          
                          <input
                            type="text"
                            placeholder={t('flows:nodes.sendText.rowDescription')}
                            value={row.description}
                            onChange={(e) => {
                              const newSections = [...editedListOptions.sections];
                              newSections[sectionIndex].rows[rowIndex] = { ...row, description: e.target.value };
                              setEditedListOptions({ ...editedListOptions, sections: newSections });
                            }}
                            className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                      ))}
                      
                      <button
                        onClick={() => {
                          const newSections = [...editedListOptions.sections];
                          newSections[sectionIndex].rows.push({
                            title: '',
                            description: '',
                            rowId: ''
                          });
                          setEditedListOptions({ ...editedListOptions, sections: newSections });
                        }}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {t('flows:nodes.sendText.addRow')}
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      setEditedListOptions({
                        ...editedListOptions,
                        sections: [
                          ...editedListOptions.sections,
                          {
                            title: '',
                            rows: []
                          }
                        ]
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {t('flows:nodes.sendText.addSection')}
                  </button>
                </div>
              </div>
            )}
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

export function TextNode({ id, data, isConnectable }: TextNodeProps) {
  const { t } = useTranslation('flows');
  const { updateNodeData, variables } = useFlowEditor();
  const [showEditModal, setShowEditModal] = useState(false);
  
  const text = data.text || '';
  const splitParagraphs = data.splitParagraphs || false;
  const listOptions = data.listOptions;
  
  const handleSaveText = useCallback((newText: string, newSplitParagraphs: boolean, newListOptions?: ListOptions) => {
    updateNodeData(id, { 
      ...data, 
      text: newText,
      splitParagraphs: newSplitParagraphs,
      listOptions: newListOptions
    });
  }, [id, data, updateNodeData]);
  
  const handleLabelChange = useCallback((newLabel: string) => {
    updateNodeData(id, { ...data, label: newLabel });
  }, [id, data, updateNodeData]);
  
  // Calcular o número de mensagens que serão enviadas
  const messageCount = useMemo(() => {
    if (!text) return 0;
    if (!splitParagraphs) return 1;
    
    // Contar parágrafos não vazios
    return text.split('\n\n')
      .filter(paragraph => paragraph.trim().length > 0)
      .length;
  }, [text, splitParagraphs]);
  
  return (
    <div className="bg-white dark:bg-gray-800" id={`node-${id}`}>
      <BaseNode 
        id={id} 
        data={data}
        icon={<MessageSquare className="w-4 h-4 text-gray-500" />}
        onLabelChange={handleLabelChange}
      />
      
      <div 
        className="p-3 border-t border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
        onClick={() => setShowEditModal(true)}
      >
        {splitParagraphs && messageCount > 1 && (
          <div className="mb-2">
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
              {messageCount} {t('flows:nodes.sendText.messages')}
            </span>
          </div>
        )}
        
        {listOptions && (
          <div className="mb-2">
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
              {t('flows:nodes.sendText.listOptionsEnabled')}
            </span>
          </div>
        )}
        
        <div className="max-h-[100px] overflow-hidden">
          {text ? (
            <RenderTextWithVariables text={text} />
          ) : (
            <div className="flex items-center justify-center h-[40px] text-gray-400 dark:text-gray-500 text-sm italic">
              {t('flows:nodes.messagePlaceholder')}
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
        <TextEditorModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          text={text}
          variables={variables}
          splitParagraphs={splitParagraphs}
          listOptions={listOptions}
          onSave={handleSaveText}
        />
      )}
    </div>
  );
}