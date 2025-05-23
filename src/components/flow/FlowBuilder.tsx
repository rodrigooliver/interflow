import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  Connection,
  addEdge,
  XYPosition,
  Viewport,
  NodeTypes,
  NodeProps,
  applyNodeChanges,
  applyEdgeChanges,
  NodeToolbar as ReactFlowNodeToolbar,
  EdgeLabelRenderer,
  Position,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './styles/group-node.css';
import { NodeType } from '../../types/flow';
import { NodeToolbar } from './NodeToolbar';
import { TextNode } from './nodes/TextNode';
import { MediaNode } from './nodes/MediaNode';
import { DelayNode } from './nodes/DelayNode';
import { VariableNode } from './nodes/VariableNode';
import { ConditionNode } from './nodes/ConditionNode';
import { InputNode } from './nodes/InputNode';
import { StartNode } from './nodes/StartNode';
import { OpenAINode } from './nodes/OpenAINode';
import { AgenteIANode } from './nodes/AgenteIANode';
import { UpdateCustomerNode } from './nodes/UpdateCustomerNode';
import { RequestNode } from './nodes/RequestNode';
import { JumpToNode } from './nodes/JumpToNode';
import { GroupNode } from './nodes/GroupNode';
import { Trash2, RotateCcw, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFlowEditor } from '../../contexts/FlowEditorContext';

const nodeTypes: NodeTypes = {
  text: TextNode,
  audio: (props: NodeProps) => <MediaNode {...props} type="audio" />,
  image: (props: NodeProps) => <MediaNode {...props} type="image" />,
  video: (props: NodeProps) => <MediaNode {...props} type="video" />,
  document: (props: NodeProps) => <MediaNode {...props} type="document" />,
  delay: DelayNode,
  variable: VariableNode,
  condition: ConditionNode,
  input: InputNode,
  start: StartNode,
  openai: OpenAINode,
  agenteia: AgenteIANode,
  update_customer: UpdateCustomerNode,
  jump_to: JumpToNode,
  request: RequestNode,
  group: GroupNode,
};

export function FlowBuilder() {
  const { 
    nodes, 
    edges, 
    viewport,
    setViewport,
    setNodes,
    setEdges, 
    onSaveFlow,
  } = useFlowEditor();
  
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const { t } = useTranslation('flows');
  const [showResetModal, setShowResetModal] = useState(false);
  const [isToolbarMinimized, setIsToolbarMinimized] = useState(false);

  // Detectar se é mobile e minificar a toolbar automaticamente
  useEffect(() => {
    const checkIsMobile = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      setIsToolbarMinimized(isMobile);
    };

    // Verificar no mount
    checkIsMobile();

    // Adicionar listener para mudanças de tamanho
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // Garantir que o viewport seja aplicado ao carregar o componente
  useEffect(() => {
    if (reactFlowInstance && viewport) {
      reactFlowInstance.setViewport(viewport);
    }
  }, [reactFlowInstance, viewport]);

  const generateFriendlyLabel = (type: NodeType): string => {
    const nodeCount = nodes.filter(n => n.type === type).length + 1;
    
    const typeLabels: Record<NodeType, string> = {
      text: t('nodes.sendText.title') + ` ${nodeCount}`,
      audio: t('nodes.sendAudio.title') + ` ${nodeCount}`,
      image: t('nodes.sendImage.title') + ` ${nodeCount}`,
      video: t('nodes.sendVideo.title') + ` ${nodeCount}`,
      document: t('nodes.sendDocument.title') + ` ${nodeCount}`,
      delay: t('nodes.delay.title') + ` ${nodeCount}`,
      variable: t('nodes.variable.title') + ` ${nodeCount}`,
      condition: t('nodes.condition.title') + ` ${nodeCount}`,
      input: t('nodes.input.title') + ` ${nodeCount}`,
      start: t('nodes.start.title') + ` ${nodeCount}`,
      openai: t('nodes.openai.title') + ` ${nodeCount}`,
      agenteia: t('nodes.agenteia.title') + ` ${nodeCount}`,
      update_customer: t('nodes.updateCustomer.title') + ` ${nodeCount}`,
      jump_to: t('nodes.jumpTo.title') + ` ${nodeCount}`,
      request: t('nodes.request.title') + ` ${nodeCount}`,
      group: t('nodes.group.title') + ` ${nodeCount}`,
    };

    return typeLabels[type] || t('nodes.labels.generic') + ` ${nodeCount}`;
  };

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds: Node[]) => {
      const updatedNodes = applyNodeChanges(changes, nds);
      return updatedNodes;
    });
  }, [setNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds: Edge[]) => {
      const updatedEdges = applyEdgeChanges(changes, eds);
      return updatedEdges;
    });
  }, [setEdges]);

  const onConnect = useCallback((params: Connection) => {
    let updatedEdges: Edge[] = [];
    const newEdge = {
      ...params,
      id: `e${params.source}-${params.target}-${params.sourceHandle || ''}-${params.targetHandle || ''}`
    };
    
    setEdges((eds) => {
      updatedEdges = addEdge(newEdge, eds);
      return updatedEdges;
    });

    // Agenda o salvamento para o próximo ciclo
    onSaveFlow({edges: updatedEdges});
  }, [setEdges, onSaveFlow, reactFlowInstance]);

  const onNodeAdd = useCallback((node: Node) => {
    // Check if it's a start node and if one already exists
    if (node.type === 'start' && nodes.some(n => n.type === 'start')) {
      return; // Only allow one start node
    }

    // Generate friendly label for the new node
    const friendlyLabel = generateFriendlyLabel(node.type as NodeType);

    // Set isStart flag for start nodes and add friendly label
    if (node.type === 'start') {
      node.data = { ...node.data, isStart: true, label: friendlyLabel };
    } else {
      node.data = { ...node.data, label: friendlyLabel };
    }

    // Removemos a adição de variables e nodes para input e openai nodes
    // Apenas mantemos o id no data
    node.data = { ...node.data, id: node.id };

    setNodes((nds) => nds.concat(node));
  }, [setNodes, nodes]);

  // Função para duplicar um nó
  const onNodeDuplicate = useCallback((nodeId: string) => {
    // Encontre o nó a ser duplicado
    const nodeToDuplicate = nodes.find(n => n.id === nodeId);
    
    if (!nodeToDuplicate) return;
    
    // Não permite duplicar nós de início
    if (nodeToDuplicate.type === 'start') return;
    
    // Cria um novo ID para o nó duplicado
    const newNodeId = crypto.randomUUID();
    
    // Cria o novo nó como uma cópia do original com novo ID
    // e posição ligeiramente deslocada para ser visível
    const newNode: Node = {
      ...nodeToDuplicate,
      id: newNodeId,
      position: {
        x: nodeToDuplicate.position.x + 50,
        y: nodeToDuplicate.position.y + 50
      },
      data: {
        ...nodeToDuplicate.data,
        id: newNodeId,
      },
      selected: false, // Garante que o novo nó não esteja selecionado inicialmente
    };

    // Adiciona o texto "(cópia)" ao label, se existir
    if (nodeToDuplicate.data?.label) {
      newNode.data.label = nodeToDuplicate.data.label + ' (cópia)';
    }

    // Adiciona o novo nó ao fluxo e garante que apenas o novo nó esteja selecionado
    setNodes((nds) => {
      // Desselecionamos todos os nós (incluindo o original)
      const updatedNodes = nds.map(node => ({
        ...node,
        selected: false
      }));
      
      // Adicionamos o novo nó ao array
      return [...updatedNodes, newNode];
    });
    
    // Atualizamos o estado de seleção para apontar para o novo nó
    // Com um pequeno atraso para garantir que o React Flow tenha tempo de processar
    setTimeout(() => {
      setSelectedNode(newNodeId);
      
      // Força o React Flow a atualizar a seleção visual
      if (reactFlowInstance) {
        reactFlowInstance.setNodes((nds: Node[]) => 
          nds.map(node => ({
            ...node,
            selected: node.id === newNodeId
          }))
        );
      }
      
      // Salva o fluxo com as alterações
      onSaveFlow();
    }, 50);
  }, [nodes, setNodes, reactFlowInstance, onSaveFlow]);

  const onNodeRemove = useCallback((nodeId: string) => {
    let updatedNodes: Node[] = [];
    let updatedEdges: Edge[] = [];
    
    setNodes((nds) => {
      updatedNodes = nds.filter(n => n.id !== nodeId);
      return updatedNodes;
    });
    
    setEdges((eds) => {
      updatedEdges = eds.filter(e => e.source !== nodeId && e.target !== nodeId);
      return updatedEdges;
    });

    setSelectedNode(null);
    setSelectedEdge(null);

    // Agenda o salvamento para o próximo ciclo
    setTimeout(() => {
      if (reactFlowInstance) {
        onSaveFlow();
      }
    }, 0);
  }, [setNodes, setEdges, reactFlowInstance, onSaveFlow]);

  const onNodeUpdate = useCallback((nodeId: string, data: Record<string, any>) => {
    let hasChanges = false;
    
    // Primeiro verificamos as mudanças
    const checkChanges = (currentNodes: Node[]) => {
        const currentNode = currentNodes.find(n => n.id === nodeId);
        if (!currentNode) return false;

        if (currentNode.position.x !== data.position?.x || 
            currentNode.position.y !== data.position?.y) {
            return true;
        }

        const isEqual = JSON.stringify(currentNode.data) === JSON.stringify(data);
        if (!isEqual) {
            return true;
        }

        return false;
    };

    // Depois atualizamos os nodes
    setNodes((nds) => {
        hasChanges = checkChanges(nds);
        
        const updatedNodes = nds.map(node => {
            if (node.id === nodeId) {
                return { ...node, data: { ...node.data, ...data } };
            }
            return node;
        });

        // Se houve mudanças, salvamos imediatamente
        if (hasChanges && reactFlowInstance) {
            onSaveFlow({nodes: updatedNodes});
        }

        return updatedNodes;
    });
  }, [setNodes, reactFlowInstance, onSaveFlow]);

  // Adiciona um ouvinte para o evento nodeDataChanged
  useEffect(() => {
    const handleNodeDataChanged = (event: CustomEvent) => {
      const { nodeId, data } = event.detail;
      onNodeUpdate(nodeId, data);
    };

    document.addEventListener('nodeDataChanged', handleNodeDataChanged as EventListener);
    
    return () => {
      document.removeEventListener('nodeDataChanged', handleNodeDataChanged as EventListener);
    };
  }, [onNodeUpdate]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const getNodePosition = useCallback((event: React.DragEvent): XYPosition => {
    if (!reactFlowWrapper.current || !reactFlowInstance) {
      return { x: 0, y: 0 };
    }

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    return position;
  }, [reactFlowInstance]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow-type') as NodeType;
      if (!type || !reactFlowWrapper.current || !reactFlowInstance) return;

      const position = getNodePosition(event);
      const newNode: Node = {
        id: crypto.randomUUID(),
        type,
        position,
        data: (type === 'input' || type === 'openai') 
          ? { id: crypto.randomUUID() } 
          : { id: crypto.randomUUID() },
      };

      onNodeAdd(newNode);

      // Salvar após adicionar o novo nó
      if (reactFlowInstance) {
        setNodes([...nodes, newNode]);
        onSaveFlow();
      }
    },
    [reactFlowInstance, onNodeAdd, nodes, onSaveFlow]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Atualiza o estado de seleção para selecionar apenas este nó
    setSelectedNode(node.id);
    setSelectedEdge(null);
    
    // Força o React Flow a atualizar a seleção visual
    if (reactFlowInstance) {
      reactFlowInstance.setNodes((nds: Node[]) => 
        nds.map(n => ({
          ...n,
          selected: n.id === node.id
        }))
      );
    }
  }, [reactFlowInstance]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.id);
    setSelectedNode(null); // Limpa a seleção do nó quando seleciona uma edge
    
    // Desselecionamos todos os nós para evitar seleções múltiplas
    if (reactFlowInstance) {
      reactFlowInstance.setNodes((nds: Node[]) => 
        nds.map(n => ({
          ...n,
          selected: false
        }))
      );
    }
  }, [reactFlowInstance]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    
    // Desselecionamos todos os nós quando clica no painel
    if (reactFlowInstance) {
      reactFlowInstance.setNodes((nds: Node[]) => 
        nds.map(n => ({
          ...n,
          selected: false
        }))
      );
    }
  }, [reactFlowInstance]);

  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    console.log('On edges delete...', deletedEdges);
    
    let updatedEdges: Edge[] = [];
    
    setEdges((eds) => {
      updatedEdges = eds.filter(edge => 
        !deletedEdges.some(deletedEdge => deletedEdge.id === edge.id)
      );
      return updatedEdges;
    });

    setSelectedEdge(null);

    // Agenda o salvamento para o próximo ciclo
    setTimeout(() => {
      if (reactFlowInstance) {
        onSaveFlow();
      }
    }, 0);
  }, [setEdges, reactFlowInstance, onSaveFlow]);

  const onMoveEnd = useCallback((event: MouseEvent | TouchEvent, viewport: Viewport) => {
    setViewport(viewport);
    // Garantir que o salvamento do viewport ocorra sempre após um movimento
    onSaveFlow({viewport});
  }, [setViewport, onSaveFlow]);

  const onReset = useCallback(() => {
    // Encontra o nó start
    const startNode = nodes.find(node => node.type === 'start');
    
    // Se não tiver nó start, não faz nada
    if (!startNode) return;
    
    // Atualiza os nós mantendo apenas o start
    setNodes([startNode]);
    
    // Limpa todas as edges
    setEdges([]);
    
    // Limpa seleções
    setSelectedNode(null);
    setSelectedEdge(null);

    // Fecha o modal
    setShowResetModal(false);

    // Agenda o salvamento para o próximo ciclo
    setTimeout(() => {
      if (reactFlowInstance) {
        onSaveFlow();
      }
    }, 0);
  }, [nodes, setNodes, setEdges, reactFlowInstance, onSaveFlow]);

  const handleFlowError = (error: Error | string) => {
    // Ignorar erros específicos do React Flow relacionados a handles
    if (error.message?.includes("Couldn't create edge for source handle id") || error === '008') {
      return; // Silenciosamente ignora o erro
    }
    // Para outros erros, você pode logar ou tratar como desejar
    console.error(error);
  };

  // Componente dos botões de ação para ser usado com nós e arestas
  const ActionButtons = ({ onDelete, onDuplicate }: { onDelete: () => void, onDuplicate?: () => void }) => (
    <div className="flex space-x-2">
      {onDuplicate && (
        <button
          onClick={onDuplicate}
          className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          title={t('flows:duplicate')}
        >
          <Copy className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onDelete}
        className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        title={t('flows:delete')}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)]" ref={reactFlowWrapper}>
      <div className={`${isToolbarMinimized ? 'w-16' : 'w-64'} flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 relative`}>
        <div className="h-full overflow-y-auto custom-scrollbar">
          <NodeToolbar 
            isMinimized={isToolbarMinimized}
          />
        </div>
        
        {/* Botão de toggle flutuante */}
        <button
          onClick={() => setIsToolbarMinimized(!isToolbarMinimized)}
          className="absolute -right-3 top-4 z-20 p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title={isToolbarMinimized ? t('toolbar.expand', 'Expandir') : t('toolbar.collapse', 'Recolher')}
        >
          {isToolbarMinimized ? (
            <ChevronRight className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      <div className="flex-1 relative">
        <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
          <button
            onClick={() => setShowResetModal(true)}
            className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            title={t('flows:reset')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgesDelete={onEdgesDelete}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onMoveEnd={onMoveEnd}
          nodeTypes={nodeTypes}
          onInit={setReactFlowInstance}
          key={`flow-${viewport?.x}-${viewport?.y}-${viewport?.zoom}`}
          defaultViewport={viewport || { x: 0, y: 0, zoom: 0.7 }}
          minZoom={0.2}
          maxZoom={1.5}
          fitView={!viewport}
          zoomOnDoubleClick={false}
          panOnDrag={true}
          selectionOnDrag={false}
          onError={handleFlowError}
          onNodeDragStop={(event, node) => {
            onNodeUpdate(node.id, { ...node.data, position: node.position });
          }}
          multiSelectionKeyCode={null} // Desativa a seleção múltipla
          selectionKeyCode={null} // Desativa a seleção por arrasto
        >
          <Background />
          <Controls />
          
          {/* Botões de ação para nós selecionados */}
          {selectedNode && (
            <ReactFlowNodeToolbar 
              nodeId={selectedNode}
              position={'top' as Position}
              className="node-toolbar"
              offset={10}
            >
              <ActionButtons 
                onDelete={() => onNodeRemove(selectedNode)} 
                onDuplicate={() => onNodeDuplicate(selectedNode)}
              />
            </ReactFlowNodeToolbar>
          )}
          
          {/* Botões de ação para arestas selecionadas */}
          {selectedEdge && (
            <EdgeLabelRenderer>
              {edges.filter(edge => edge.id === selectedEdge).map(edge => {
                // Calcula a posição média da aresta para posicionar o botão
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);
                
                if (sourceNode && targetNode) {
                  // Calcula o ponto médio considerando o centro dos nós
                  // e ajusta para ficar exatamente no meio do caminho entre eles
                  const sourceX = sourceNode.position.x + 75; // Metade da largura média (150px)
                  const sourceY = sourceNode.position.y + 25; // Metade da altura média (50px)
                  const targetX = targetNode.position.x + 75; // Metade da largura média
                  const targetY = targetNode.position.y + 25; // Metade da altura média
                  
                  // Calcula o ponto médio da linha
                  const x = (sourceX + targetX) / 2;
                  const y = (sourceY + targetY) / 2;
                  
                  return (
                    <div
                      key={edge.id}
                      style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                        zIndex: 1000,
                        pointerEvents: 'all'
                      }}
                      className="nodrag nopan"
                    >
                      <ActionButtons 
                        onDelete={() => onEdgesDelete([{ id: edge.id } as Edge])}
                      />
                    </div>
                  );
                }
                return null;
              })}
            </EdgeLabelRenderer>
          )}
        </ReactFlow>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('flows:resetConfirmTitle')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {t('flows:resetConfirmMessage')}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                {t('common:cancel')}
              </button>
              <button
                onClick={onReset}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                {t('flows:reset')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}