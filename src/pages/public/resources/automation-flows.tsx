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

export default function AutomationFlowsGuide() {
  const { t } = useTranslation('resources');
  
  // Encontrar dados deste recurso no arquivo de tradução
  const resources = t('sections.guides.resources', { returnObjects: true }) as Resource[];
  const resource = resources[2]; // Terceiro recurso na seção de guides
  
  // Recursos relacionados
  const relatedResources = [
    {
      title: t('sections.guides.resources.0.title') || "Primeiros Passos",
      link: '/resources/getting-started'
    },
    {
      title: t('sections.guides.resources.1.title') || "Configuração de Canais",
      link: '/resources/channels-setup'
    }
  ];
  
  return (
    <ResourceLayout
      title={resource.title}
      description={resource.description}
      imageUrl={resource.imageUrl}
      type={resource.type}
      downloadUrl="/downloads/automation-flows-guide.pdf"
      relatedResources={relatedResources}
    >
      <h2>Como Criar Fluxos Automatizados de Conversação</h2>
      
      <p>
        Os fluxos automatizados permitem criar experiências conversacionais interativas
        com seus clientes, qualificar leads, coletar dados, e oferecer atendimento
        24/7 sem intervenção humana. Este guia irá mostrar como criar seu primeiro
        fluxo no Interflow.
      </p>
      
      <h3>O que são Fluxos Automatizados?</h3>
      
      <p>
        Fluxos automatizados são sequências de mensagens, perguntas e ações que
        podem ser executadas automaticamente em resposta às interações dos clientes.
        Eles permitem:
      </p>
      
      <ul>
        <li>Qualificar leads com perguntas automáticas</li>
        <li>Responder perguntas frequentes</li>
        <li>Coletar informações dos clientes</li>
        <li>Agendar demonstrações ou reuniões</li>
        <li>Processar pedidos simples</li>
        <li>Transferir para atendimento humano quando necessário</li>
      </ul>
      
      <h3>Acessando o Editor de Fluxos</h3>
      
      <ol>
        <li>Faça login na sua conta Interflow</li>
        <li>No menu lateral, clique em "Fluxos"</li>
        <li>Clique no botão "+ Novo Fluxo" no canto superior direito</li>
        <li>Dê um nome e uma descrição para seu fluxo</li>
        <li>Escolha "Criar do zero" ou selecione um modelo pré-configurado</li>
        <li>Clique em "Criar" para abrir o editor visual</li>
      </ol>
      
      <h3>Entendendo o Editor Visual</h3>
      
      <p>
        O editor de fluxos do Interflow usa uma interface visual intuitiva:
      </p>
      
      <ul>
        <li><strong>Área de trabalho central</strong>: onde você cria e conecta os nós do fluxo</li>
        <li><strong>Barra lateral esquerda</strong>: contém os tipos de nós disponíveis</li>
        <li><strong>Barra lateral direita</strong>: configurações do nó selecionado</li>
        <li><strong>Barra superior</strong>: ferramentas de zoom, desfazer/refazer e salvar</li>
      </ul>
      
      <p>
        Para adicionar um nó, arraste-o da barra lateral esquerda para a área de trabalho.
        Para conectar nós, clique e arraste da saída de um nó para a entrada de outro.
      </p>
      
      <h3>Criando seu Primeiro Fluxo: Qualificação Simples</h3>
      
      <p>
        Vamos criar um fluxo simples para qualificar novos contatos:
      </p>
      
      <ol>
        <li>No editor, comece com o nó "Início do Fluxo" (já criado automaticamente)</li>
        <li>Adicione um nó de "Mensagem" conectado ao início:
          <ul>
            <li>Configure o texto: "Olá! Bem-vindo ao atendimento da [Sua Empresa]. Como podemos ajudar hoje?"</li>
            <li>Adicione opções de botões para facilitar a resposta: "Conhecer produtos", "Tirar dúvidas", "Suporte técnico", "Falar com atendente"</li>
          </ul>
        </li>
        <li>Adicione um nó de "Condição" conectado à mensagem:
          <ul>
            <li>Configure para verificar a resposta do usuário</li>
            <li>Crie saídas diferentes para cada opção de botão</li>
          </ul>
        </li>
        <li>Para a opção "Conhecer produtos":
          <ul>
            <li>Adicione um nó de "Mensagem" com informações sobre categorias de produtos</li>
            <li>Adicione outra condição para verificar qual categoria interessa ao cliente</li>
            <li>Para cada categoria, crie mensagens com informações específicas</li>
          </ul>
        </li>
        <li>Para a opção "Falar com atendente":
          <ul>
            <li>Adicione um nó "Coletar Dados" para pedir nome e e-mail do cliente</li>
            <li>Adicione um nó "Transferir" para encaminhar para um atendente humano</li>
          </ul>
        </li>
        <li>Salve o fluxo clicando em "Salvar" no topo da tela</li>
      </ol>
      
      <h3>Tipos de Nós Disponíveis</h3>
      
      <p>
        O Interflow oferece diversos tipos de nós para criar fluxos ricos:
      </p>
      
      <ul>
        <li><strong>Mensagem</strong>: Envia textos, imagens, vídeos ou arquivos para o cliente</li>
        <li><strong>Condição</strong>: Cria bifurcações no fluxo baseadas nas respostas ou dados</li>
        <li><strong>Coletar Dados</strong>: Solicita e salva informações do cliente (nome, e-mail, telefone)</li>
        <li><strong>Espera</strong>: Pausa o fluxo por um tempo determinado</li>
        <li><strong>API Request</strong>: Conecta com sistemas externos via API</li>
        <li><strong>Transferir</strong>: Encaminha o atendimento para um agente humano ou departamento</li>
        <li><strong>Salvar Variável</strong>: Armazena dados para uso posterior no fluxo</li>
        <li><strong>Integração CRM</strong>: Cria ou atualiza registros no CRM</li>
      </ul>
      
      <h3>Utilizando Variáveis</h3>
      
      <p>
        As variáveis permitem personalizar as mensagens e tomar decisões com base em dados:
      </p>
      
      <ul>
        <li><strong>Variáveis do sistema</strong>: Incluem dados como nome, email, telefone e horário</li>
        <li><strong>Variáveis personalizadas</strong>: Criadas com o nó "Salvar Variável"</li>
        <li><strong>Exemplo de uso</strong>: Configure mensagens personalizadas como "Olá [nome do cliente], como posso ajudar?"</li>
      </ul>
      
      <h3>Testando seu Fluxo</h3>
      
      <p>
        Antes de publicar seu fluxo, teste-o completamente:
      </p>
      
      <ol>
        <li>Clique em "Testar Fluxo" no topo da tela</li>
        <li>Um simulador abrirá, permitindo interagir com o fluxo como um cliente</li>
        <li>Teste todos os caminhos possíveis para garantir que funcionem corretamente</li>
        <li>Faça ajustes conforme necessário</li>
      </ol>
      
      <h3>Publicando seu Fluxo</h3>
      
      <p>
        Quando seu fluxo estiver pronto:
      </p>
      
      <ol>
        <li>Clique em "Publicar" no topo da tela</li>
        <li>Configure quando o fluxo deve ser acionado:
          <ul>
            <li><strong>No primeiro contato</strong>: Inicia automaticamente quando um cliente novo entra em contato</li>
            <li><strong>Por palavras-chave</strong>: Inicia quando o cliente envia certas palavras ou frases</li>
            <li><strong>Manualmente</strong>: Iniciado pelo atendente durante uma conversa</li>
          </ul>
        </li>
        <li>Selecione os canais onde o fluxo estará disponível (WhatsApp, Messenger, Chat do site, etc.)</li>
        <li>Confirme a publicação</li>
      </ol>
      
      <h3>Métricas e Análise</h3>
      
      <p>
        Após publicar seu fluxo, monitore seu desempenho:
      </p>
      
      <ul>
        <li>Na seção "Fluxos", clique em "Métricas"</li>
        <li>Visualize dados como:
          <ul>
            <li>Número de vezes que o fluxo foi iniciado</li>
            <li>Taxa de conclusão</li>
            <li>Pontos de abandono</li>
            <li>Tempo médio de interação</li>
            <li>Taxas de conversão para objetivos definidos</li>
          </ul>
        </li>
        <li>Use essas informações para otimizar seu fluxo continuamente</li>
      </ul>
      
      <h3>Melhores Práticas</h3>
      
      <ul>
        <li>Mantenha os fluxos simples e diretos</li>
        <li>Limite a quantidade de perguntas para evitar abandono</li>
        <li>Ofereça sempre uma opção para falar com um atendente humano</li>
        <li>Personalize as mensagens usando variáveis</li>
        <li>Teste exaustivamente antes de publicar</li>
        <li>Monitore e otimize constantemente com base nos dados</li>
      </ul>
      
      <p>
        Com esse conhecimento, você está pronto para criar fluxos automatizados poderosos
        que melhorarão significativamente a experiência do cliente e a eficiência do seu
        atendimento.
      </p>
    </ResourceLayout>
  );
} 