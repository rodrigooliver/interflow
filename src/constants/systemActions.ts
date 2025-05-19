// Interface específica para ações do sistema
export interface SystemActionType {
  title?: string | null | undefined;
  name: string;
  description: string;
  type: 'endChat' | 'changeCustomerName' | 'updateCustomerCustomData' | 'transferToTeam'  | 'schedule'  | 'changeFunnel' | 'createTask' | 'dateReturn' | 'saveQuestionsNotInContext' | 'unknownResponse';
  config?: {
    schedule?: string | null;
    funnels?: Array<{
      [key: string]: string | boolean | undefined;
    }>;
    fields?: Array<{
      [key: string]: string | boolean | undefined;
    }>;
    customFields?: Array<{
      [key: string]: string | boolean | undefined;
    }>;
    sourceStages?: Array<{
      id: string;
      name: string;
      funnelName: string;
      selected: boolean;
      description?: string;
    }>;
    targetStages?: Array<{
      id: string;
      name: string;
      funnelName: string;
      selected: boolean;
      description?: string;
    }>;
    unknownResponse?: {
      pauseAgent: boolean;
      saveQuestion: boolean;
      tryToAnswer: boolean;
    };
  };
}

export const SYSTEM_ACTIONS: SystemActionType[] = [
 
  {
    name: 'Alterar Nome do Cliente',
    description: 'Altera o nome do cliente no chat',
    type: 'changeCustomerName',
    config: {}
  },
  {
    name: 'Atualizar dados do cliente',
    description: 'Atualiza os dados do cliente',
    type: 'updateCustomerCustomData',
    config: {
      customFields: []
    }
  },
  {
    name: 'Transferir para equipe',
    description: 'Transferir para alguma equipe',
    type: 'transferToTeam',
    config: {}
  },
  {
    name: 'Agendar',
    description: 'Agenda uma ação para o futuro',
    type: 'schedule',
    config: {
      schedule: ''
    }
  },
  {
    name: 'Alterar Funil',
    description: 'Altera o funil do cliente',
    type: 'changeFunnel',
    config: {
      funnels: [],
      sourceStages: [],
      targetStages: []
    }
  },
  {
    name: 'Quando não souber responder',
    description: 'Define como lidar com informações desconhecidas',
    type: 'unknownResponse',
    config: {
      unknownResponse: {
        pauseAgent: false,
        saveQuestion: true,
        tryToAnswer: true
      }
    }
  },
  // {
  //   name: 'Atribuir Equipe',
  //   description: 'Atribui uma equipe ao chat',
  //   type: 'assignTeam',
  //   config: {}
  // },
  
   // {
  //   name: 'Encerrar Chat',
  //   description: 'Encerra o chat atual',
  //   type: 'endChat',
  //   config: {}
  // },
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