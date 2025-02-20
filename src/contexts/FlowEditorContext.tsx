import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Integration, Prompt } from '../types/database';
import { Variable } from '../types/flow';
import { Node } from 'reactflow';
import { useOrganizationContext } from './OrganizationContext';

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

interface FlowEditorContextType {
  integrations: Integration[];
  prompts: Prompt[];
  variables: Variable[];
  nodes: Node[];
  setNodes: (nodes: Node[]) => void;
  setVariables: (variables: Variable[]) => void;
  loading: boolean;
  error: string | null;
  handleVariableNameChange: (index: number, name: string) => void;
  handleVariableNameBlur: (index: number) => void;
  addVariable: () => void;
  removeVariable: (index: number) => void;
  funnels: Funnel[];
  teams: Team[];
  users: User[];
}

const FlowEditorContext = createContext<FlowEditorContextType | undefined>(undefined);

interface FlowEditorProviderProps {
  children: React.ReactNode;
  initialVariables?: Variable[];
  initialNodes?: Node[];
}

export function FlowEditorProvider({ 
  children, 
  initialVariables = [],
  initialNodes = []
}: FlowEditorProviderProps) {
  const { currentOrganization } = useOrganizationContext();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [variables, setVariables] = useState<Variable[]>(initialVariables);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <FlowEditorContext.Provider value={{ 
      integrations, 
      prompts, 
      variables,
      nodes,
      setNodes,
      setVariables,
      loading, 
      error,
      handleVariableNameChange,
      handleVariableNameBlur,
      addVariable,
      removeVariable,
      funnels,
      teams,
      users,
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