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

export default function SalesFlows() {
  const { t } = useTranslation('resources');
  
  // Encontrar dados deste recurso no arquivo de tradução
  const resources = t('sections.templates.resources', { returnObjects: true }) as Resource[];
  const resource = resources[2]; // Terceiro recurso na seção de templates
  
  // Recursos relacionados
  const relatedResources = [
    {
      title: t('sections.guides.resources.2.title') || "Criando Fluxos Automatizados",
      link: '/resources/automation-flows'
    },
    {
      title: t('sections.webinars.resources.0.title') || "Como Aumentar Vendas com Automação",
      link: '/resources/sales-automation-webinar'
    }
  ];
  
  return (
    <ResourceLayout
      title={resource.title}
      description={resource.description}
      imageUrl={resource.imageUrl}
      type={resource.type}
      downloadUrl="/downloads/sales-flows-templates.zip"
      relatedResources={relatedResources}
    >
      <h2>Fluxos de Vendas Pré-configurados</h2>
      
      <p>
        Economize tempo e aumente suas taxas de conversão com nossos fluxos de vendas
        prontos para uso. Cada fluxo foi desenvolvido por especialistas em vendas e
        testado em ambientes reais para garantir resultados efetivos.
      </p>
      
      <h3>Sobre estes Modelos</h3>
      
      <p>
        Esta coleção inclui fluxos de conversação pré-configurados para diferentes
        cenários de vendas. Você pode usar estes fluxos diretamente ou personalizá-los
        de acordo com as necessidades específicas do seu negócio.
      </p>
      
      <h3>Fluxos Incluídos</h3>
      
      <div className="space-y-8 mb-10">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">1. Qualificação de Leads</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Este fluxo automatizado identifica leads qualificados através de perguntas
            estratégicas, pontuando-os com base nas respostas e encaminhando apenas os
            mais promissores para sua equipe de vendas.
          </p>
          <div className="flex flex-col space-y-2">
            <strong className="text-sm text-gray-500 dark:text-gray-400">Características:</strong>
            <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
              <li>Sistema de pontuação baseado em critérios BANT</li>
              <li>Perguntas personalizáveis para diferentes segmentos</li>
              <li>Encaminhamento automático baseado em pontuação</li>
              <li>Integração com CRM para registro automático de leads</li>
            </ul>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">2. Agendamento de Demonstrações</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Automatize o processo de agendamento de demonstrações de produtos, permitindo
            que os clientes escolham horários convenientes e recebam lembretes automáticos.
          </p>
          <div className="flex flex-col space-y-2">
            <strong className="text-sm text-gray-500 dark:text-gray-400">Características:</strong>
            <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
              <li>Integração com sistemas de calendário (Google, Outlook)</li>
              <li>Verificação de disponibilidade em tempo real</li>
              <li>Confirmações e lembretes automáticos</li>
              <li>Coleta de informações pré-demonstração</li>
            </ul>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">3. Negociação e Fechamento</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Guie seus leads pelo processo de negociação com um fluxo que aborda objeções comuns,
            apresenta propostas de valor e facilita o fechamento de vendas.
          </p>
          <div className="flex flex-col space-y-2">
            <strong className="text-sm text-gray-500 dark:text-gray-400">Características:</strong>
            <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
              <li>Respostas pré-definidas para objeções comuns</li>
              <li>Calculadora de ROI integrada</li>
              <li>Apresentação dinâmica de casos de sucesso relevantes</li>
              <li>Facilitação de assinatura de contratos digitais</li>
            </ul>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">4. Reengajamento de Leads Inativos</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Recupere leads que esfriaram com este fluxo de reengajamento, que identifica
            o motivo da inatividade e apresenta ofertas personalizadas para reconectá-los.
          </p>
          <div className="flex flex-col space-y-2">
            <strong className="text-sm text-gray-500 dark:text-gray-400">Características:</strong>
            <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
              <li>Segmentação por tempo de inatividade</li>
              <li>Ofertas especiais baseadas no histórico do lead</li>
              <li>Sequência de follow-up automatizada</li>
              <li>Análise de efetividade das abordagens</li>
            </ul>
          </div>
        </div>
      </div>
      
      <h3>Como Utilizar os Fluxos</h3>
      
      <ol className="mb-8">
        <li>Faça o download do pacote de fluxos</li>
        <li>No Interflow, acesse a seção "Fluxos"</li>
        <li>Clique em "Importar Fluxo" e selecione o arquivo desejado</li>
        <li>Revise e personalize o fluxo conforme necessário</li>
        <li>Publique o fluxo e defina as condições de acionamento</li>
        <li>Monitore os resultados e otimize conforme necessário</li>
      </ol>
      
      <h3>Personalizando para seu Negócio</h3>
      
      <p className="mb-4">
        Para obter melhores resultados, recomendamos personalizar estes fluxos para
        refletir a linguagem, os produtos e os processos específicos da sua empresa.
        Considere:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-8">
        <li>Adaptar as perguntas para seu público-alvo específico</li>
        <li>Incluir informações sobre seus produtos/serviços</li>
        <li>Ajustar o sistema de pontuação para seus critérios de qualificação</li>
        <li>Integrar com suas ferramentas específicas de CRM e vendas</li>
      </ul>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg mb-8">
        <h4 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">Dica de Especialista</h4>
        <p className="text-gray-700 dark:text-gray-300">
          "Comece com um único fluxo e aprimore-o com base nos resultados antes de
          implementar múltiplos fluxos. Isso permite uma curva de aprendizado mais
          suave e resultados mais consistentes."
          <br /><br />
          <span className="italic">— Ana Ferreira, Especialista em Automação de Vendas</span>
        </p>
      </div>
      
      <p>
        Ao utilizar estes fluxos pré-configurados, você estará implementando as melhores
        práticas de vendas em seu processo automatizado, economizando tempo significativo
        de desenvolvimento e otimizando suas taxas de conversão desde o primeiro dia.
      </p>
    </ResourceLayout>
  );
} 