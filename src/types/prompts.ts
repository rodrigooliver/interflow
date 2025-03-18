// Definindo o tipo para mensagens de chat
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Definindo o tipo para mensagens da API
export interface ApiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Definindo o tipo para informações de uso de tokens
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Definindo o tipo para modelos OpenAI
export interface OpenAIModel {
  id: string;
  name: string;
}

// Definindo o tipo para filtros de ações
export interface ActionFilter {
  variable: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'exists' | 'not_exists';
  value: string;
}

interface CustomerActionConfig {
  name?: string;
  funnelId?: string;
  stageId?: string;
  selectedField?: string;
  funnelMapping?: {
    variable: string;
    mapping: Record<string, string>; // Mapeia valores da variável para IDs de estágios
  };
  nameMapping?: {
    variable: string;
    mapping: Record<string, string>; // Mapeia valores da variável para nomes
  };
}

interface ChatActionConfig {
  status?: string;
  teamId?: string;
  title?: string;
  selectedField?: string;
  statusMapping?: {
    variable: string;
    mapping: Record<string, string>; // Mapeia valores da variável para status
  };
  teamMapping?: {
    variable: string;
    mapping: Record<string, string>; // Mapeia valores da variável para IDs de equipes
  };
  titleMapping?: {
    variable: string;
    mapping: Record<string, string>; // Mapeia valores da variável para títulos
  };
}

interface FlowActionConfig {
  flowId?: string;
  flowMapping?: {
    variable: string;
    mapping: Record<string, string>; // Mapeia valores da variável para IDs de fluxos
  };
  selectedField?: string;
}

interface ScheduleActionConfig {
  scheduleId?: string;
  operation?: 'checkAvailability' | 'createAppointment' | 'checkAppointment' | 'deleteAppointment';
  operationMapping?: {
    variable: string;
    mapping: Record<string, 'checkAvailability' | 'createAppointment' | 'checkAppointment' | 'deleteAppointment'>;
  };
  dayVariable?: string;
  timeVariable?: string;
  serviceVariable?: string;
  serviceMapping?: Record<string, string>;
  notes?: string;
  selectedField?: string;
}

type ActionConfig = CustomerActionConfig | ChatActionConfig | FlowActionConfig | ScheduleActionConfig | Record<string, unknown>;

// Definindo o tipo para ações que serão executadas quando uma ferramenta for chamada
export interface ToolAction {
  id: string;
  name: string;
  type: '' | 'update_customer' | 'update_chat' | 'start_flow' | 'check_schedule' | 'custom';
  description?: string;
  config?: ActionConfig;
  filters?: Array<{
    variable: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'exists' | 'not_exists';
    value: string;
  }>;
}

export interface ParameterProperty {
  type: string;
  description: string;
  enum?: string[];
}

export interface Parameters {
  type: string;
  properties: Record<string, ParameterProperty>;
  required: string[];
}

// Definindo o tipo para ferramentas
export interface Tool {
  name: string;
  description: string;
  parameters: Parameters;
  actions: ToolAction[];
}

// Definindo o tipo para destinos
export interface Destination {
  type: 'flow' | 'function' | 'url';
  id?: string;
  name?: string;
  url?: string;
}

// Definindo o tipo para variáveis
export interface Variable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  description: string;
  required: boolean;
  enumValues?: string[];
}

// Definindo o tipo para dados do formulário de prompt
export interface PromptFormData {
  title: string;
  content: string;
  tools: Tool[];
  destinations: Record<string, ToolAction[]>;
  config: Record<string, unknown>;
} 