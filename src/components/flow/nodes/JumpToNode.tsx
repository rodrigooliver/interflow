import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';
import { BaseNode } from './BaseNode';
import { Search, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { NodeType } from '../../../types/flow';
import { getNodeIcon } from '../../../utils/nodeIcons';

// Componente Portal para renderizar o modal fora da hierarquia de ReactFlow
const Portal = ({ children }: { children: React.ReactNode }) => {
  return createPortal(children, document.body);
};

interface JumpToNodeProps {
  id: string;
  data: {
    targetNodeId?: string;
    label?: string;
  };
  isConnectable: boolean;
}

export function JumpToNode({ id, data, isConnectable }: JumpToNodeProps) {
  const { t } = useTranslation('flows');
  const { nodes, updateNodeData } = useFlowEditor();
  const [isOpen, setIsOpen] = useState(false);
  const [targetNodeId, setTargetNodeId] = useState(data.targetNodeId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Carregar targetNodeId do data se existir
  useEffect(() => {
    if (data.targetNodeId) {
      setTargetNodeId(data.targetNodeId);
    }
  }, [data.targetNodeId]);

  // Focar no campo de busca quando o modal abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSave = () => {
    updateNodeData(id, { targetNodeId });
    closeModal();
  };

  const closeModal = () => {
    setIsOpen(false);
    setSearchTerm('');
  };

  // Filtrar o nó atual da lista e ordenar os nós por label
  const availableNodes = nodes
    .filter(node => node.id !== id)
    .filter(node => {
      if (!searchTerm) return true;
      const nodeLabel = String(node.data?.label || '').toLowerCase();
      const nodeType = String(node.type || '').toLowerCase();
      return nodeLabel.includes(searchTerm.toLowerCase()) || 
             nodeType.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      const labelA = String(a.data?.label || '');
      const labelB = String(b.data?.label || '');
      return labelA.localeCompare(labelB);
    });

  // Obter o nó selecionado para exibir no seletor
  const selectedNode = nodes.find(node => node.id === targetNodeId);

  return (
    <div className="node-content">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
      
      <BaseNode 
        id={id} 
        data={data}
        type="jump_to"
        onLabelChange={(label) => updateNodeData(id, { label })}
      />

      <div 
        className="p-1 cursor-pointer nodrag" 
        onClick={() => setIsOpen(true)}
      >
        <div className="flex flex-col space-y-2 w-full">

          <div className="flex items-center p-2 border rounded-md bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            {targetNodeId ? (
              <div className="flex items-center space-x-2">
                {selectedNode?.type && getNodeIcon(selectedNode.type as NodeType)}
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {selectedNode?.data?.label || t('nodes.jumpTo.selectNode')}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('nodes.jumpTo.selectNode')}
              </span>
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <Portal>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeModal();
              }
            }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('nodes.jumpTo.selectTarget')}
                </h3>
                <button 
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm placeholder-gray-400 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('common:search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
              
              <div className="max-h-60 overflow-y-auto mb-4 custom-scrollbar">
                {availableNodes.length > 0 ? (
                  <div className="space-y-2">
                    {availableNodes.map(node => (
                      <div 
                        key={node.id}
                        className={`p-2 rounded-md cursor-pointer ${
                          targetNodeId === node.id 
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => setTargetNodeId(node.id)}
                      >
                        <div className="flex items-center">
                          <div className="mr-3 flex-shrink-0">
                            {node.type && getNodeIcon(node.type as NodeType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                              {node.data?.label || `Node ${node.id.substring(0, 8)}`}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {t(`nodes.${node.type}.title`) || node.type}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    {searchTerm 
                      ? t('common:noSearchResults') 
                      : t('nodes.jumpTo.noNodesAvailable')}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  {t('common:cancel')}
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!targetNodeId}
                >
                  {t('common:save')}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
} 