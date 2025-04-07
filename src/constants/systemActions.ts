// Interface específica para ações do sistema
export interface SystemActionType {
  title?: string | null | undefined;
  name: string;
  description: string;
  type: 'endChat' | 'changeCustomerName' | 'changeFunnel' | 'assignTeam' | 'schedule' | 'createTask' | 'dateReturn' | 'saveQuestionsNotInContext' | 'updateCustomFields';
  config?: {
    schedule?: string;
    funnel?: string;
    customFields?: Array<{
      [key: string]: string | boolean | undefined;
    }>;
  };
}

export const SYSTEM_ACTIONS: SystemActionType[] = [
  // {
  //   name: 'Encerrar Chat',
  //   description: 'Encerra o chat atual',
  //   type: 'endChat',
  //   config: {}
  // },
  // {
  //   name: 'Alterar Nome do Cliente',
  //   description: 'Altera o nome do cliente no chat',
  //   type: 'changeCustomerName',
  //   config: {}
  // },
  // {
  //   name: 'Alterar Funil',
  //   description: 'Altera o funil do cliente',
  //   type: 'changeFunnel',
  //   config: {
  //     funnel: ''
  //   }
  // },
  // {
  //   name: 'Atribuir Equipe',
  //   description: 'Atribui uma equipe ao chat',
  //   type: 'assignTeam',
  //   config: {}
  // },
  {
    name: 'Agendar',
    description: 'Agenda uma ação para o futuro',
    type: 'schedule',
    config: {
      schedule: ''
    }
  },
  {
    name: 'Atualizar campos customizados',
    description: 'Atualiza os campos customizados do cliente',
    type: 'updateCustomFields',
    config: {
      customFields: []
    }
  },
  // {
  //   name: 'Criar Tarefa',
  //   description: 'Cria uma nova tarefa',
  //   type: 'createTask',
  //   config: {}
  // },
  // {
  //   name: 'Retorno por Data',
  //   description: 'Agenda um retorno para uma data específica',
  //   type: 'dateReturn',
  //   config: {}
  // },
  // {
  //   name: 'Salvar Perguntas Fora de Contexto',
  //   description: 'Salva perguntas que não estão no contexto atual',
  //   type: 'saveQuestionsNotInContext',
  //   config: {}
  // }
];