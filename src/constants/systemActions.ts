// Interface específica para ações do sistema
export interface SystemAction {
  type: 'update_chat' | 'update_customer' | 'start_flow' | 'check_schedule' | 'custom';
  description: string;
  config: Record<string, unknown>;
}

export const SYSTEM_ACTIONS: SystemAction[] = [
  {
    type: 'update_chat',
    description: 'prompts:form.systemActionTypes.endChat',
    config: {
      status: 'closed'
    }
  },
  {
    type: 'update_customer',
    description: 'prompts:form.systemActionTypes.changeCustomerName',
    config: {
      name: '{{customer_name}}'
    }
  },
  {
    type: 'update_customer',
    description: 'prompts:form.systemActionTypes.changeFunnel',
    config: {
      funnel_id: '{{funnel_id}}',
      stage_id: '{{stage_id}}'
    }
  },
  {
    type: 'update_chat',
    description: 'prompts:form.systemActionTypes.updateChatStatus',
    config: {
      status: '{{status}}'
    }
  },
  {
    type: 'update_chat',
    description: 'prompts:form.systemActionTypes.assignTeam',
    config: {
      team_id: '{{team_id}}'
    }
  },
  {
    type: 'start_flow',
    description: 'prompts:form.systemActionTypes.startNewFlow',
    config: {
      flow_id: '{{flow_id}}'
    }
  },
  {
    type: 'check_schedule',
    description: 'prompts:form.systemActionTypes.scheduleMeeting',
    config: {
      schedule_id: '{{schedule_id}}',
      date: '{{date}}',
      time: '{{time}}',
      notes: '{{notes}}'
    }
  },
  {
    type: 'custom',
    description: 'prompts:form.systemActionTypes.sendMessage',
    config: {
      content: '{{message_content}}'
    }
  },
  {
    type: 'update_customer',
    description: 'prompts:form.systemActionTypes.updateCustomerData',
    config: {
      data: {
        name: '{{customer_name}}',
        email: '{{customer_email}}',
        phone: '{{customer_phone}}'
      }
    }
  },
  {
    type: 'custom',
    description: 'prompts:form.systemActionTypes.createTask',
    config: {
      title: '{{task_title}}',
      description: '{{task_description}}',
      due_date: '{{due_date}}',
      priority: '{{priority}}'
    }
  }
];

// Mapeamento de tipos de ação para suas chaves de tradução
export const SYSTEM_ACTION_TYPES = {
  'update_chat': 'prompts:form.systemActionTypes.endChat',
  'update_customer': 'prompts:form.systemActionTypes.changeCustomerName',
  'start_flow': 'prompts:form.systemActionTypes.startNewFlow',
  'check_schedule': 'prompts:form.systemActionTypes.scheduleMeeting',
  'custom': 'prompts:form.systemActionTypes.sendMessage',
  'update_chat_status': 'prompts:form.systemActionTypes.updateChatStatus',
  'assign_team': 'prompts:form.systemActionTypes.assignTeam',
  'update_customer_data': 'prompts:form.systemActionTypes.updateCustomerData',
  'create_task': 'prompts:form.systemActionTypes.createTask',
  'change_funnel': 'prompts:form.systemActionTypes.changeFunnel'
} as const;

// Tipo para as chaves do mapeamento
export type SystemActionType = keyof typeof SYSTEM_ACTION_TYPES; 