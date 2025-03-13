import React, { useState, useCallback, useRef } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
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
import { Trash2, RotateCcw } from 'lucide-react';
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
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const { t } = useTranslation('flows');
  const [showResetModal, setShowResetModal] = useState(false);

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
    };

    return typeLabels[type] || t('nodes.labels.generic') + ` ${nodeCount}`;
  };

  const onNodesChange = useCallback((changes: any) => {
    setNodes((nds: Node[]) => {
      const updatedNodes = applyNodeChanges(changes, nds);
      return updatedNodes;
    });
  }, [setNodes]);

  const onEdgesChange = useCallback((changes: any) => {
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

  const onNodeUpdate = useCallback((nodeId: string, data: any) => {
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
      if (reactFlowInstance) {
        setNodes([...nodes, newNode]);
        onSaveFlow();
      }
    },
    [reactFlowInstance, onNodeAdd, nodes, onSaveFlow]
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
      if (reactFlowInstance) {
        onSaveFlow();
      }
    }, 0);
  }, [setEdges, reactFlowInstance, onSaveFlow]);

  const onMoveEnd = useCallback((event: MouseEvent | TouchEvent, viewport: Viewport) => {
    setViewport(viewport);
    if (reactFlowInstance) {
      onSaveFlow({viewport});
    }
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
          defaultViewport={viewport || { x: 0, y: 0, zoom: 0.7 }}
          minZoom={0.2}
          maxZoom={1.5}
          fitView={!viewport}
          zoomOnDoubleClick={false}
          panOnDrag={true}
          selectionOnDrag={false}
          onError={handleFlowError}
          onNodeDragStop={(event, node) => {
            // console.log('On node drag stop...', event, node);
            onNodeUpdate(node.id, { ...node.data, position: node.position });
          }}
        >
          <Background />
          <Controls />
          {/* <MiniMap /> */}
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