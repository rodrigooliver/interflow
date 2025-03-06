import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Integration, Prompt } from '../types/database';
import { Variable } from '../types/flow';
import { Node, Connection, ReactFlowInstance } from 'reactflow';
import { useOrganizationContext } from './OrganizationContext';
import { useParams } from 'react-router-dom';

interface Funnel {
  id: string;
  name: string;
  stages: {
    id: string;
    name: string;
  }[];
}

interface Team {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

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
  integrations: Integration[];
  prompts: Prompt[];
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
  funnels: Funnel[];
  teams: Team[];
  users: User[];
  onSaveFlow: (data?: SaveFlowData) => Promise<void>;
  updateNodeData: (nodeId: string, data: any) => Promise<void>;
  loadFlow: (id: string) => Promise<void>;
  publishFlow: () => Promise<void>;
  restoreFlow: () => Promise<void>;
  setFlowName: (name: string) => Promise<void>;
  getViewport: () => any;
}

const FlowEditorContext = createContext<FlowEditorContextType | undefined>(undefined);

export function FlowEditorProvider({ children }: { children: React.ReactNode }) {
  const { currentOrganization } = useOrganizationContext();
  const { id } = useParams();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<FlowConnection[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [publishedNodes, setPublishedNodes] = useState<FlowNode[]>([]);
  const [publishedEdges, setPublishedEdges] = useState<FlowConnection[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 0.7 });
  const [flowName, setFlowNameState] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!currentOrganization) return;

      try {
        // Carregar dados existentes
        const [integrationsData, promptsData, funnelsData, teamsData, usersData] = await Promise.all([
          loadIntegrations(),
          loadPrompts(),
          loadFunnels(),
          loadTeams(),
          loadUsers()
        ]);

        setIntegrations(integrationsData || []);
        setPrompts(promptsData || []);
        setFunnels(funnelsData || []);
        setTeams(teamsData || []);
        setUsers(usersData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentOrganization]);

  async function loadIntegrations() {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .eq('type', 'openai');

    if (error) throw error;
    return data;
  }

  async function loadPrompts() {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('organization_id', currentOrganization.id);

    if (error) throw error;
    return data;
  }

  async function loadFunnels() {
    const { data, error } = await supabase
      .from('crm_funnels')
      .select('id, name, stages:crm_stages(id, name)')
      .eq('organization_id', currentOrganization?.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async function loadTeams() {
    const { data, error } = await supabase
      .from('service_teams')
      .select('id, name')
      .eq('organization_id', currentOrganization?.id)
      .order('name');

    if (error) throw error;
    return data;
  }

  async function loadUsers() {
    const { data: membersData, error: membersError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', currentOrganization?.id);

    if (membersError) throw membersError;
    if (!membersData?.length) return [];

    const userIds = membersData.map(member => member.user_id);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
      .order('full_name');

    if (error) throw error;
    return data;
  }

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
    if (!currentOrganization || !id) return;

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
  }, [currentOrganization, id, nodes, edges, variables, viewport]);

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
    if (!currentOrganization) return;
    
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
  }, [currentOrganization]);

  const publishFlow = useCallback(async (id: string) => {
    if (!currentOrganization || !id) return;

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
  }, [currentOrganization, nodes, edges, variables, viewport]);

  const restoreFlow = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (!currentOrganization || !id) return;

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
  }, [currentOrganization, publishedNodes, publishedEdges]);

  const updateFlowName = useCallback(async (name: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (!currentOrganization || !id || !name.trim()) return;

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
  }, [currentOrganization]);

  return (
    <FlowEditorContext.Provider value={{ 
      integrations, 
      prompts, 
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
      funnels,
      teams,
      users,
      onSaveFlow,
      updateNodeData,
      loadFlow,
      publishFlow,
      restoreFlow,
      setFlowName: updateFlowName,
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