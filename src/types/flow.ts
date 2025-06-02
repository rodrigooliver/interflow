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
  | 'update_customer'
  | 'start'
  | 'openai'
  | 'agenteia'
  | 'jump_to'
  | 'request'
  | 'group'
  | 'system_message';

export interface Variable {
  id: string;
  name: string;
  value: string;
  testValue?: string;
}

export interface OpenAINodeData {
  integration_id: string;
  prompt: string;
  label?: string;
  targetNodeId?: string;
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
    label?: string;
    targetNodeId?: string;
    color?: string;
    width?: number;
    height?: number;
  } | OpenAINodeData;
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
  created_by_prompt?: string | null;
}

export interface FlowSession {
  id: string;
  organization_id: string;
  bot_id: string;
  chat_id: string;
  customer_id: string;
  current_node_id: string;
  status: 'active' | 'inactive' | 'timeout';
  variables: Record<string, string | number | boolean | object>;
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

export interface Trigger {
  id: string;
  flow_id: string;
  type: 'first_contact' | 'inactivity';
  conditions: {
    operator: 'AND' | 'OR';
    rules: TriggerRule[];
  };
  organization_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleRuleParams {
  timezone: string;
  timeSlots: {
    id: string;
    day: number;
    startTime: string;
    endTime: string;
  }[];
}

export interface ChannelRuleParams {
  channels: string[];
}

export interface InactivityRuleParams {
  source: string;
  minutes: number;
}

export type RuleParams = ChannelRuleParams | InactivityRuleParams | ScheduleRuleParams;

export interface TriggerRule {
  id: string;
  type: 'channel' | 'inactivity' | 'schedule';
  params: RuleParams;
}

export interface ChannelRule {
  type: 'channel';
  params: {
    channels: string[];
    requireNoActiveChat: boolean;
  };
}

export interface InactivityRule {
  type: 'inactivity';
  params: {
    source: 'customer' | 'agent';
    minutes: number;
  };
}

export interface ScheduleRule {
  type: 'schedule';
  params: {
    days: number[];
    startTime: string;
    endTime: string;
    timezone: string;
  };
}