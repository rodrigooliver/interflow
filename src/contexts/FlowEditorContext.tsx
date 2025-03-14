import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Variable } from '../types/flow';
import { Node } from 'reactflow';
import { useAuthContext } from './AuthContext';
import { useParams } from 'react-router-dom';   
import { FlowConnection, FlowNode } from '../types/flow';

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface SaveFlowData {
  nodes?: Node[];
  edges?: FlowConnection[];
  variables?: Variable[];
  viewport?: Viewport;
}

interface FlowEditorContextType {
  variables: Variable[];
  nodes: Node[];
  edges: FlowConnection[];
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  flowName: string;
  isPublished: boolean;
  publishedNodes: FlowNode[];
  publishedEdges: FlowConnection[];
  loading: boolean;
  error: string | null;
  lastSaved: Date | null;
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: FlowConnection[] | ((prev: FlowConnection[]) => FlowConnection[])) => void;
  setVariables: (variables: Variable[]) => void;
  handleVariableNameChange: (index: number, name: string) => void;
  handleVariableNameBlur: (index: number) => void;
  addVariable: () => void;
  removeVariable: (index: number) => void;
  onSaveFlow: (data?: SaveFlowData) => Promise<void>;
  updateNodeData: (nodeId: string, data: any) => Promise<void>;
  loadFlow: (id: string) => Promise<void>;
  publishFlow: () => Promise<void>;
  restoreFlow: () => Promise<void>;
  setFlowName: (name: string) => Promise<void>;
  id: string | undefined;
}

const FlowEditorContext = createContext<FlowEditorContextType | undefined>(undefined);

export function FlowEditorProvider({ children }: { children: React.ReactNode }) {
  const { currentOrganizationMember } = useAuthContext();
  const { id } = useParams();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<FlowConnection[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [publishedNodes, setPublishedNodes] = useState<FlowNode[]>([]);
  const [publishedEdges, setPublishedEdges] = useState<FlowConnection[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 0.7 });
  const [flowName, setFlowNameState] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleVariableNameChange = (index: number, name: string) => {
    const newVariables = [...variables];
    newVariables[index] = { ...newVariables[index], name };
    setVariables(newVariables);
  };

  const handleVariableNameBlur = (index: number) => {
    // Remove variáveis vazias ao perder o foco
    setVariables(variables.filter((v, i) => i === index ? v.name.trim() !== '' : true));
  };

  const addVariable = () => {
    setVariables([...variables, { id: crypto.randomUUID(), name: '', value: '' }]);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const onSaveFlow = useCallback(async (data?: SaveFlowData) => {
    if (!currentOrganizationMember || !id) return;

    try {
      const { error } = await supabase
        .from('flows')
        .update({
          draft_nodes: data?.nodes || nodes,
          draft_edges: data?.edges || edges,
          variables: data?.variables || variables,
          viewport: data?.viewport || viewport,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      if (data?.nodes) setNodes(data.nodes);
      if (data?.edges) setEdges(data.edges);
      if (data?.variables) setVariables(data.variables);
      if (data?.viewport) setViewport(data.viewport);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving flow:', error);
      throw error;
    }
  }, [currentOrganizationMember, id, nodes, edges, variables, viewport]);

  const updateNodeData = useCallback(async (nodeId: string, newData: any) => {

    const updatedNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: { ...node.data, ...newData }
        };
      }
      return node;
    });

    try {
      await onSaveFlow({ nodes: updatedNodes });
      setNodes(updatedNodes);
    } catch (error) {
      console.error('Error updating node data:', error);
      throw error;
    }
  }, [nodes, edges, onSaveFlow]);

  const loadFlow = useCallback(async (id: string) => {
    if (!currentOrganizationMember) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: flow, error } = await supabase
        .from('flows')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (flow) {
        setNodes(flow.draft_nodes?.length ? flow.draft_nodes : flow.nodes || []);
        setEdges(flow.draft_edges?.length ? flow.draft_edges : flow.edges || []);
        setPublishedNodes(flow.nodes || []);
        setPublishedEdges(flow.edges || []);
        setVariables(flow.variables || []);
        setViewport(flow.viewport || { x: 0, y: 0, zoom: 0.7 });
        setFlowNameState(flow.name);
        setIsPublished(flow.is_published || false);
        setLastSaved(flow.updated_at ? new Date(flow.updated_at) : null);
      }
    } catch (error) {
      console.error('Error loading flow:', error);
      setError('Error loading flow');
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationMember]);

  const publishFlow = useCallback(async () => {
    if (!currentOrganizationMember || !id) return;

    try {
      const { error } = await supabase
        .from('flows')
        .update({
          nodes: nodes,
          edges: edges,
          draft_nodes: nodes,
          draft_edges: edges,
          variables,
          viewport,
          is_published: true,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      setIsPublished(true);
      setPublishedNodes(nodes);
      setPublishedEdges(edges);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error publishing flow:', error);
      throw error;
    }
  }, [currentOrganizationMember, nodes, edges, variables, viewport]);

  const restoreFlow = useCallback(async () => {
    
    if (!currentOrganizationMember || !id) return;

    try {
      const { error } = await supabase
        .from('flows')
        .update({
          draft_nodes: publishedNodes,
          draft_edges: publishedEdges,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setNodes(publishedNodes);
      setEdges(publishedEdges);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error restoring flow:', error);
      throw error;
    }
  }, [currentOrganizationMember, publishedNodes, publishedEdges]);

  const updateFlowName = useCallback(async (name: string) => {
    
    if (!currentOrganizationMember || !id || !name.trim()) return;

    try {
      const { error } = await supabase
        .from('flows')
        .update({
          name: name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setFlowNameState(name.trim());
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error updating flow name:', error);
      throw error;
    }
  }, [currentOrganizationMember]);

  return (
    <FlowEditorContext.Provider value={{ 
      variables,
      nodes,
      edges,
      viewport,
      setViewport,
      flowName,
      isPublished,
      publishedNodes,
      publishedEdges,
      loading, 
      error,
      lastSaved,
      setNodes,
      setEdges,
      setVariables,
      handleVariableNameChange,
      handleVariableNameBlur,
      addVariable,
      removeVariable,
      onSaveFlow,
      updateNodeData,
      loadFlow,
      publishFlow,
      restoreFlow,
      setFlowName: updateFlowName,
      id
    }}>
      {children}
    </FlowEditorContext.Provider>
  );
}

export function useFlowEditor() {
  const context = useContext(FlowEditorContext);
  if (context === undefined) {
    throw new Error('useFlowEditor must be used within a FlowEditorProvider');
  }
  return context;
} 