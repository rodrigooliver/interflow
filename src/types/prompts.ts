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
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: string;
}

// Definindo o tipo para ações que serão executadas quando uma ferramenta for chamada
export interface ToolAction {
  id: string;
  name: string;
  type: 'update_customer' | 'update_chat' | 'start_flow' | 'custom';
  config: Record<string, unknown>;
  filters?: ActionFilter[];
}

// Definindo o tipo para ferramentas
export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  actions?: ToolAction[];
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
  destinations: Record<string, Destination>;
  config: Record<string, unknown>;
} 