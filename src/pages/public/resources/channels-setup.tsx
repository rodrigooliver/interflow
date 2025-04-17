import React from 'react';
import { useTranslation } from 'react-i18next';
import { ResourceLayout } from './ResourceLayout';

interface Resource {
  title: string;
  description: string;
  imageUrl?: string;
  link: string;
  type: string;
}

export default function ChannelsSetupGuide() {
  const { t } = useTranslation('resources');
  
  // Encontrar dados deste recurso no arquivo de tradução
  const resources = t('sections.guides.resources', { returnObjects: true }) as Resource[];
  const resource = resources[1]; // Segundo recurso na seção de guias
  
  // Recursos relacionados
  const relatedResources = [
    {
      title: resources[0]?.title || "Guia de Introdução ao Interflow",
      link: '/resources/getting-started'
    },
    {
      title: resources[2]?.title || "Criando Fluxos Automatizados",
      link: '/resources/automation-flows'
    }
  ];
  
  return (
    <ResourceLayout
      title={resource.title}
      description={resource.description}
      imageUrl={resource.imageUrl}
      type={resource.type}
      downloadUrl="/downloads/interflow-channels-setup.pdf"
      relatedResources={relatedResources}
    >
      <h2>Configurando Canais de Atendimento no Interflow</h2>
      
      <p>
        Este tutorial completo vai guiá-lo pelo processo de configuração dos diversos 
        canais de atendimento disponíveis no Interflow. Você aprenderá como integrar 
        WhatsApp, Facebook, Instagram e outros canais à plataforma.
      </p>
      
      <h3>Canais Disponíveis</h3>
      
      <p>
        O Interflow oferece suporte aos seguintes canais de comunicação:
      </p>
      
      <ul>
        <li><strong>WhatsApp Business API</strong>: Atendimento oficial pelo WhatsApp com múltiplos atendentes</li>
        <li><strong>Facebook Messenger</strong>: Mensagens da sua página do Facebook</li>
        <li><strong>Instagram Direct</strong>: Mensagens diretas e comentários do Instagram</li>
        <li><strong>E-mail</strong>: Integração com seu domínio de e-mail corporativo</li>
        <li><strong>Chat no Site</strong>: Widget de chat personalizado para seu site</li>
      </ul>
      
      <h3>Configurando o WhatsApp Business API</h3>
      
      <p>
        A integração com o WhatsApp Business API permite que sua empresa atenda os clientes
        no canal que eles mais utilizam. Siga estas etapas para configurar:
      </p>
      
      <ol>
        <li>No painel do Interflow, acesse a seção "Canais"</li>
        <li>Clique em "Adicionar Canal" e selecione "WhatsApp"</li>
        <li>Escolha o método de integração (API Oficial, APIs parceiras, etc.)</li>
        <li>Para a API oficial, você precisará:
          <ul>
            <li>Ter uma conta Business verificada no Facebook</li>
            <li>Seguir o processo de verificação de negócio</li>
            <li>Selecionar ou criar um número de telefone para a integração</li>
          </ul>
        </li>
        <li>Preencha os dados solicitados e siga as instruções na tela</li>
        <li>Aguarde a aprovação (normalmente entre 24h a 72h)</li>
        <li>Configure suas mensagens de boas-vindas e horários de atendimento</li>
      </ol>
      
      <h3>Configurando Facebook Messenger</h3>
      
      <p>
        Para integrar o Facebook Messenger ao Interflow:
      </p>
      
      <ol>
        <li>Acesse "Canais" e selecione "Facebook"</li>
        <li>Clique em "Conectar com Facebook"</li>
        <li>Faça login na sua conta do Facebook (deve ter permissões de administrador da página)</li>
        <li>Selecione as páginas que deseja conectar</li>
        <li>Conceda as permissões necessárias</li>
        <li>Configure os departamentos que receberão as mensagens de cada página</li>
      </ol>
      
      <h3>Configurando Instagram Direct</h3>
      
      <p>
        Para integrar o Instagram ao Interflow:
      </p>
      
      <ol>
        <li>Certifique-se de que sua conta do Instagram está configurada como conta comercial</li>
        <li>A conta do Instagram deve estar vinculada a uma página do Facebook</li>
        <li>No Interflow, acesse "Canais" e selecione "Instagram"</li>
        <li>Conceda as permissões necessárias na tela de autorização</li>
        <li>Configure quais tipos de mensagens serão capturadas (diretas, comentários, menções)</li>
      </ol>
      
      <h3>Configurando E-mail</h3>
      
      <p>
        Para integrar seu e-mail corporativo:
      </p>
      
      <ol>
        <li>Acesse "Canais" e selecione "E-mail"</li>
        <li>Escolha entre POP3/IMAP ou API específica (Gmail, Outlook, etc.)</li>
        <li>Forneça os dados de acesso ao servidor de e-mail</li>
        <li>Configure quais pastas serão monitoradas</li>
        <li>Defina regras de roteamento baseadas em remetente, assunto, etc.</li>
        <li>Configure a assinatura padrão para respostas</li>
      </ol>
      
      <h3>Configurando Chat no Site</h3>
      
      <p>
        Para adicionar o chat do Interflow ao seu site:
      </p>
      
      <ol>
        <li>Acesse "Canais" e selecione "Chat no Site"</li>
        <li>Personalize a aparência do widget (cores, logotipo, textos)</li>
        <li>Configure as mensagens automáticas iniciais</li>
        <li>Defina os horários de disponibilidade</li>
        <li>Copie o código de integração gerado</li>
        <li>Cole o código no HTML do seu site, antes do fechamento da tag &lt;/body&gt;</li>
      </ol>
      
      <h3>Gerenciamento de Canais</h3>
      
      <p>
        Após configurar seus canais, você pode gerenciá-los a qualquer momento:
      </p>
      
      <ul>
        <li>Definir horários de funcionamento específicos para cada canal</li>
        <li>Configurar mensagens automáticas personalizadas</li>
        <li>Atribuir canais a departamentos ou equipes específicas</li>
        <li>Ativar ou desativar temporariamente um canal</li>
        <li>Monitorar métricas de desempenho por canal</li>
      </ul>
      
      <h3>Práticas recomendadas</h3>
      
      <p>
        Para otimizar sua experiência de atendimento multicanal:
      </p>
      
      <ul>
        <li>Mantenha tempos de resposta consistentes em todos os canais</li>
        <li>Use as mesmas diretrizes de atendimento em todas as plataformas</li>
        <li>Configure respostas automáticas para horários fora do expediente</li>
        <li>Treine sua equipe para lidar com as particularidades de cada canal</li>
        <li>Analise regularmente o desempenho de cada canal e faça ajustes quando necessário</li>
      </ul>
      
      <p>
        Com todos os seus canais configurados no Interflow, sua equipe terá uma visão unificada
        de todas as comunicações com os clientes, permitindo um atendimento mais eficiente e coerente.
      </p>
    </ResourceLayout>
  );
} 