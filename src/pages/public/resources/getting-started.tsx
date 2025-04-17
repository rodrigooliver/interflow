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

export default function GettingStartedGuide() {
  const { t } = useTranslation('resources');
  
  // Encontrar dados deste recurso no arquivo de tradução
  const resources = t('sections.guides.resources', { returnObjects: true }) as Resource[];
  const resource = resources[0];
  
  // Recursos relacionados
  const relatedResources = [
    {
      title: resources[1]?.title || "Configurando Canais de Atendimento",
      link: '/resources/channels-setup'
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
      downloadUrl="/downloads/interflow-getting-started.pdf"
      relatedResources={relatedResources}
    >
      <h2>Bem-vindo ao Interflow!</h2>
      
      <p>
        Este guia de introdução vai ajudar você a configurar sua conta e começar a usar o Interflow
        de forma rápida e eficiente. Em menos de uma hora, você terá um entendimento completo
        das funcionalidades básicas e estará pronto para atender seus clientes.
      </p>
      
      <h3>O que você vai aprender</h3>
      
      <ul>
        <li>Como criar sua conta e configurar seu perfil</li>
        <li>Como navegar pela interface do Interflow</li>
        <li>Configuração básica do seu primeiro canal de atendimento</li>
        <li>Como receber e responder mensagens</li>
        <li>Gerenciamento de contatos e equipes</li>
        <li>Personalização da sua conta</li>
      </ul>
      
      <h3>Criando sua conta</h3>
      
      <p>
        Se você ainda não tem uma conta, é possível criar uma gratuitamente em nosso site.
        O processo de cadastro é simples e rápido, seguindo estes passos:
      </p>
      
      <ol>
        <li>Acesse <a href="https://interflow.chat/signup" className="text-blue-600 dark:text-blue-400">interflow.chat/signup</a></li>
        <li>Preencha seus dados básicos (nome, e-mail e senha)</li>
        <li>Verifique seu e-mail para confirmar a conta</li>
        <li>Complete seu perfil com informações da sua empresa</li>
      </ol>
      
      <p>
        Após a criação da conta, você terá acesso ao painel de controle do Interflow.
        A partir dele, você poderá configurar seus canais de atendimento, visualizar
        estatísticas e gerenciar sua equipe.
      </p>
      
      <h3>Navegando pela interface</h3>
      
      <p>
        A interface do Interflow foi projetada para ser intuitiva e fácil de usar.
        Os principais elementos são:
      </p>
      
      <ul>
        <li><strong>Painel principal</strong>: Mostra um resumo das estatísticas e atividades recentes</li>
        <li><strong>Conversas</strong>: Acesso a todas as conversas ativas e históricas</li>
        <li><strong>Contatos</strong>: Lista de todos os seus contatos e clientes</li>
        <li><strong>Canais</strong>: Configuração e gerenciamento dos canais de atendimento</li>
        <li><strong>Equipe</strong>: Gerenciamento de usuários e permissões</li>
        <li><strong>Configurações</strong>: Personalizações gerais da sua conta</li>
      </ul>
      
      <h3>Configurando seu primeiro canal</h3>
      
      <p>
        Para começar a atender seus clientes, você precisa configurar pelo menos um canal de atendimento.
        O Interflow suporta diversas plataformas como WhatsApp, Facebook, Instagram, e-mail, entre outros.
      </p>
      
      <p>
        Para configurar o WhatsApp, por exemplo, acesse a seção "Canais" e selecione "WhatsApp". 
        Siga as instruções na tela para conectar sua conta do WhatsApp Business à plataforma.
      </p>
      
      <h3>Recebendo e respondendo mensagens</h3>
      
      <p>
        Quando um cliente enviar uma mensagem para qualquer um dos seus canais conectados, 
        você receberá uma notificação e a conversa aparecerá na seção "Conversas". 
        Para responder:
      </p>
      
      <ol>
        <li>Clique na conversa para abri-la</li>
        <li>Digite sua resposta no campo de texto</li>
        <li>Use a barra de ferramentas para adicionar mídias, templates ou atalhos</li>
        <li>Clique em enviar ou pressione Enter</li>
      </ol>
      
      <h3>Próximos passos</h3>
      
      <p>
        Agora que você já entende o básico do Interflow, recomendamos explorar recursos mais avançados como:
      </p>
      
      <ul>
        <li>Configuração de respostas automáticas</li>
        <li>Criação de fluxos de atendimento automatizados</li>
        <li>Integração com outras ferramentas de negócios</li>
        <li>Personalização de relatórios e métricas</li>
      </ul>
      
      <p>
        Para mais informações sobre estes tópicos, consulte nossos outros guias e tutoriais
        ou entre em contato com nossa equipe de suporte.
      </p>
    </ResourceLayout>
  );
} 