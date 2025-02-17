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
import { Trash2 } from 'lucide-react';

const nodeTypes = {
  text: TextNode,
  audio: MediaNode,
  image: MediaNode,
  video: MediaNode,
  document: MediaNode,
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
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const isHistoryActionRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { project, getViewport } = useReactFlow();

  // Effect to update input nodes when variables change
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'input' || node.type === 'openai') {
          return {
            ...node,
            data: {
              ...node.data,
              variables,
            },
          };
        }
        return node;
      })
    );
  }, [variables, setNodes]);

  // Effect to sync with initialVariables
  useEffect(() => {
    setVariables(initialVariables);
  }, [initialVariables]);

  // Listen for node data change events
  useEffect(() => {
    const handleNodeDataChange = (event: CustomEvent) => {
      const { nodeId, data } = event.detail;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            const updatedData = { ...node.data, ...data };
            return { ...node, data: updatedData };
          }
          return node;
        })
      );
    };

    document.addEventListener('nodeDataChanged', handleNodeDataChange as EventListener);

    return () => {
      document.removeEventListener('nodeDataChanged', handleNodeDataChange as EventListener);
    };
  }, [setNodes]);

  // Debounced save effect
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (onSave && reactFlowInstance) {
        const viewport = getViewport();
        onSave(nodes, edges, viewport);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, onSave, getViewport, reactFlowInstance]);

  useEffect(() => {
    if (!isHistoryActionRef.current) {
      const newState = { nodes, edges };
      setHistory(prev => [...prev.slice(0, currentHistoryIndex + 1), newState]);
      setCurrentHistoryIndex(prev => prev + 1);
    }
    isHistoryActionRef.current = false;
  }, [nodes, edges]);

  const onConnect = useCallback((params: Connection) => {
    const newEdge = {
      ...params,
      id: `e${params.source}-${params.target}-${params.sourceHandle || ''}-${params.targetHandle || ''}`
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  const onNodeAdd = useCallback((node: Node) => {
    // Check if it's a start node and if one already exists
    if (node.type === 'start' && nodes.some(n => n.type === 'start')) {
      return; // Only allow one start node
    }

    // Set isStart flag for start nodes
    if (node.type === 'start') {
      node.data = { ...node.data, isStart: true };
    }

    // Add variables to input nodes
    if (node.type === 'input') {
      node.data = { ...node.data, variables };
    }

    // Ensure node has an id property in its data
    node.data = { ...node.data, id: node.id };

    setNodes((nds) => nds.concat(node));
  }, [setNodes, nodes, variables]);

  const onNodeRemove = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const onNodeUpdate = useCallback((nodeId: string, data: any) => {
    setNodes((nds) => 
      nds.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  }, [setNodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const getNodePosition = useCallback((event: React.DragEvent): XYPosition => {
    if (!reactFlowWrapper.current || !reactFlowInstance) {
      return { x: 0, y: 0 };
    }

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.project({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
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
          ? { variables, id: crypto.randomUUID() } 
          : { id: crypto.randomUUID() },
      };

      onNodeAdd(newNode);
    },
    [reactFlowInstance, onNodeAdd, variables, getNodePosition]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)]" ref={reactFlowWrapper}>
      <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="h-full overflow-y-auto custom-scrollbar">
          <NodeToolbar />
        </div>
      </div>

      <div className="flex-1 relative">
        <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
          {selectedNode && (
            <button
              onClick={() => onNodeRemove(selectedNode)}
              className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              title="Excluir"
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
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          onInit={setReactFlowInstance}
          defaultViewport={initialViewport || { x: 0, y: 0, zoom: 0.7 }}
          minZoom={0.2}
          maxZoom={1.5}
          fitView={!initialViewport}
          zoomOnDoubleClick={false}
          panOnDrag={true}
          selectionOnDrag={false}
          onNodeDragStop={(event, node) => {
            onNodeUpdate(node.id, node.data);
          }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}