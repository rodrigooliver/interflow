export type NodeType = 
  | 'text'
  | 'audio'
  | 'image'
  | 'video'
  | 'document'
  | 'delay'
  | 'variable'
  | 'condition'
  | 'input'
  | 'options'
  | 'start';

export interface Variable {
  id: string;
  name: string;
  value: string;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position: {
    x: number;
    y: number;
  };
  data: {
    content?: string;
    mediaUrl?: string;
    delaySeconds?: number;
    variable?: Variable;
    condition?: {
      variable: string;
      operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
      value: string;
    };
    options?: {
      text: string;
      value: string;
    }[];
    folder?: string;
    isStart?: boolean;
    inputConfig?: {
      variableName: string;
      timeout: number;
      debounceTime: number;
      fallbackNodeId?: string;
    };
  };
}

export interface FlowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Flow {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
  variables: Variable[];
  folders: string[];
  created_at: string;
  updated_at: string;
}

export interface FlowSession {
  id: string;
  organization_id: string;
  bot_id: string;
  chat_id: string;
  customer_id: string;
  current_node_id: string;
  status: 'active' | 'inactive' | 'timeout';
  variables: Record<string, any>;
  message_history: {
    id: string;
    content: string;
    sender_type: 'bot' | 'user';
    timestamp: string;
  }[];
  created_at: string;
  last_interaction: string;
  timeout_at?: string;
  debounce_timestamp?: string;
}