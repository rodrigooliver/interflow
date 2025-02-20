import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  XYPosition,
  Viewport,
  NodeTypes,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FlowNode, FlowConnection, NodeType, Variable } from '../../types/flow';
import { NodeToolbar } from './NodeToolbar';
import { TextNode } from './nodes/TextNode';
import { MediaNode } from './nodes/MediaNode';
import { DelayNode } from './nodes/DelayNode';
import { VariableNode } from './nodes/VariableNode';
import { ConditionNode } from './nodes/ConditionNode';
import { InputNode } from './nodes/InputNode';
import { StartNode } from './nodes/StartNode';
import { OpenAINode } from './nodes/OpenAINode';
import { UpdateCustomerNode } from './nodes/UpdateCustomerNode';
import { Trash2, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  update_customer: UpdateCustomerNode,
};

interface FlowBuilderProps {
  initialNodes?: FlowNode[];
  initialEdges?: FlowConnection[];
  initialVariables?: Variable[];
  initialViewport?: Viewport;
  onSave?: (nodes: FlowNode[], edges: FlowConnection[], viewport: Viewport) => void;
  onVariablesUpdate?: (variables: Variable[]) => void;
}

interface HistoryState {
  nodes: FlowNode[];
  edges: FlowConnection[];
}

// Adicione esta interface para tipar os nós
interface NodeData {
  id: string;
  type: string;
  data: {
    label?: string;
    [key: string]: any;
  };
}

export function FlowBuilder({
  initialNodes = [],
  initialEdges = [],
  initialVariables = [],
  initialViewport,
  onSave,
  onVariablesUpdate,
}: FlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [variables, setVariables] = useState<Variable[]>(initialVariables);
  const [history, setHistory] = useState<HistoryState[]>([{ nodes: initialNodes, edges: initialEdges }]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const isHistoryActionRef = useRef(false);
  const { project, getViewport } = useReactFlow();
  const { t } = useTranslation('flows');
  const [showResetModal, setShowResetModal] = useState(false);

  // Effect to update input nodes when variables change
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'input' || node.type === 'openai') {
          return {
            ...node,
            data: {
              ...node.data,
            },
          };
        }
        return node;
      })
    );
  }, [variables, nodes, setNodes]);

  // Effect to sync with initialVariables
  useEffect(() => {
    setVariables(initialVariables);
  }, [initialVariables]);

  // Listen for node data change events
  useEffect(() => {
    const handleNodeDataChange = (event: CustomEvent) => {
      const { nodeId, data } = event.detail;
      
      let updatedNodes: Node[] = [];

      // Atualiza os nós
      setNodes((nds) => {
        updatedNodes = nds.map((node) => {
          if (node.id === nodeId) {
            return { 
              ...node, 
              data: { ...node.data, ...data }
            };
          }
          return node;
        });
        return updatedNodes;
      });

      // Se tiver onSave, salva as mudanças
      setTimeout(() => {
        if (onSave && reactFlowInstance) {
          const viewport = getViewport();
          onSave(updatedNodes as FlowNode[], edges as FlowConnection[], viewport);
        }
      }, 0);
    };

    document.addEventListener('nodeDataChanged', handleNodeDataChange as EventListener);

    return () => {
      document.removeEventListener('nodeDataChanged', handleNodeDataChange as EventListener);
    };
  }, [setNodes, edges, onSave, getViewport, reactFlowInstance]);

  useEffect(() => {
    if (!isHistoryActionRef.current) {
      const newState = { 
        nodes: nodes as FlowNode[], 
        edges: edges as FlowConnection[] 
      };
      setHistory(prev => [...prev.slice(0, currentHistoryIndex + 1), newState]);
      setCurrentHistoryIndex(prev => prev + 1);
    }
    isHistoryActionRef.current = false;
  }, [nodes, edges]);

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
      update_customer: t('nodes.updateCustomer.title') + ` ${nodeCount}`,
    };

    return typeLabels[type] || t('nodes.labels.generic') + ` ${nodeCount}`;
  };

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
    setTimeout(() => {
      if (onSave && reactFlowInstance) {
        const viewport = getViewport();
        onSave(nodes as FlowNode[], updatedEdges as FlowConnection[], viewport);
      }
    }, 0);
  }, [setEdges, nodes, onSave, getViewport, reactFlowInstance]);


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
      if (onSave && reactFlowInstance) {
        const viewport = getViewport();
        onSave(updatedNodes as FlowNode[], updatedEdges as FlowConnection[], viewport);
      }
    }, 0);
  }, [setNodes, setEdges, onSave, getViewport, reactFlowInstance]);

  const onNodeUpdate = useCallback((nodeId: string, data: any) => {
    let updatedNodes: Node[] = [];
    let hasChanges = false;
    
    // Atualiza o nó
    setNodes((nds) => {
      updatedNodes = nds.map(node => {
        if (node.id === nodeId) {
          // Verifica se houve mudança real nos dados
          const isEqual = JSON.stringify(node.data) === JSON.stringify(data);
          if (!isEqual) {
            hasChanges = true;
            return { ...node, data: { ...node.data, ...data } };
          }
        }
        return node;
      });
      return updatedNodes;
    });
    
    // Só chama onSave se houver mudanças reais
    if (hasChanges) {
      setTimeout(() => {
        if (onSave && reactFlowInstance) {
          const viewport = getViewport();
          onSave(updatedNodes as FlowNode[], edges as FlowConnection[], viewport);
        }
      }, 0);
    }
  }, [setNodes, edges, onSave, getViewport, reactFlowInstance]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const getNodePosition = useCallback((event: React.DragEvent): XYPosition => {
    if (!reactFlowWrapper.current || !reactFlowInstance) {
      return { x: 0, y: 0 };
    }

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
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
      if (onSave) {
        const updatedNodes = [...nodes, newNode];
        const viewport = getViewport();
        onSave(updatedNodes as FlowNode[], edges as FlowConnection[], viewport);
      }
    },
    [reactFlowInstance, onNodeAdd, nodes, edges, onSave, getViewport]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.id);
    setSelectedNode(null); // Limpa a seleção do nó quando seleciona uma edge
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

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
      if (onSave && reactFlowInstance) {
        const viewport = getViewport();
        onSave(nodes as FlowNode[], updatedEdges as FlowConnection[], viewport);
      }
    }, 0);
  }, [setEdges, nodes, onSave, getViewport, reactFlowInstance]);

  const onMoveEnd = useCallback((event: MouseEvent | TouchEvent, viewport: Viewport) => {
    // Agenda o salvamento para o próximo ciclo
    setTimeout(() => {
      if (onSave && reactFlowInstance) {
        onSave(nodes as FlowNode[], edges as FlowConnection[], viewport);
      }
    }, 0);
  }, [nodes, edges, onSave, reactFlowInstance]);

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
      if (onSave && reactFlowInstance) {
        const viewport = getViewport();
        onSave([startNode] as FlowNode[], [] as FlowConnection[], viewport);
      }
    }, 0);
  }, [nodes, setNodes, setEdges, onSave, reactFlowInstance, getViewport]);

  const handleFlowError = (error: any) => {

    // Ignorar erros específicos do React Flow relacionados a handles
    if (error.message?.includes("Couldn't create edge for source handle id") || error === '008') {
      return; // Silenciosamente ignora o erro
    }
    // Para outros erros, você pode logar ou tratar como desejar
    console.error(error);
    
  };

  return (
    <div className="flex h-[calc(100vh-64px)]" ref={reactFlowWrapper}>
      <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="h-full overflow-y-auto custom-scrollbar">
          <NodeToolbar />
        </div>
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
          {(selectedNode || selectedEdge) && (
            <button
              onClick={() => {
                if (selectedNode) onNodeRemove(selectedNode);
                if (selectedEdge) onEdgesDelete([{ id: selectedEdge } as Edge]);
              }}
              className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              title={t('flows:delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
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
          defaultViewport={initialViewport || { x: 0, y: 0, zoom: 0.7 }}
          minZoom={0.2}
          maxZoom={1.5}
          fitView={!initialViewport}
          zoomOnDoubleClick={false}
          panOnDrag={true}
          selectionOnDrag={false}
          onError={handleFlowError}
          onNodeDragStop={(event, node) => {
            onNodeUpdate(node.id, node.data);
          }}
        >
          <Background />
          <Controls />
          <MiniMap />
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