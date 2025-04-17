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

export default function SalesAutomationWebinar() {
  const { t } = useTranslation('resources');
  
  // Encontrar dados deste recurso no arquivo de tradução
  const resources = t('sections.webinars.resources', { returnObjects: true }) as Resource[];
  const resource = resources[0]; // Primeiro recurso na seção de webinars
  
  // Recursos relacionados
  const relatedResources = [
    {
      title: t('sections.guides.resources.2.title') || "Criando Fluxos Automatizados",
      link: '/resources/automation-flows'
    },
    {
      title: t('sections.templates.resources.2.title') || "Fluxos de Vendas Pré-configurados",
      link: '/resources/sales-flows'
    }
  ];
  
  return (
    <ResourceLayout
      title={resource.title}
      description={resource.description}
      imageUrl={resource.imageUrl}
      type={resource.type}
      downloadUrl="/downloads/sales-automation-presentation.pdf"
      relatedResources={relatedResources}
    >
      <h2>Como Aumentar Vendas com Automação</h2>
      
      <div className="aspect-w-16 aspect-h-9 mb-8">
        <iframe 
          className="w-full h-full" 
          src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
          title="Webinar: Como Aumentar Vendas com Automação" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      </div>
      
      <p>
        Neste webinar, nossos especialistas em vendas e automação mostram como utilizar
        os recursos do Interflow para aumentar significativamente suas taxas de conversão
        e otimizar o processo comercial.
      </p>
      
      <h3>Tópicos Abordados</h3>
      
      <ul>
        <li>Como a automação está transformando o processo de vendas</li>
        <li>Identificando oportunidades para automatizar em seu funil de vendas</li>
        <li>Construindo um funil de qualificação e conversão eficiente</li>
        <li>Medindo e otimizando seu processo de vendas automatizado</li>
        <li>Casos de sucesso e exemplos práticos</li>
      </ul>
      
      <h3>Apresentadores</h3>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Carlos Oliveira</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Diretor de Vendas da Interflow</p>
          <p className="text-gray-700 dark:text-gray-300">
            Carlos lidera a equipe de vendas da Interflow e possui mais de 15 anos de
            experiência em otimização de processos comerciais e implementação de 
            estratégias de automação em empresas de diversos setores.
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Ana Ferreira</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Especialista em Automação</p>
          <p className="text-gray-700 dark:text-gray-300">
            Ana é especialista em soluções de automação e inteligência artificial 
            aplicadas a processos de negócios. Ela é responsável pela implementação
            de fluxos automatizados em mais de 100 empresas.
          </p>
        </div>
      </div>
      
      <h3>Destaques do Webinar</h3>
      
      <div className="space-y-6 mb-8">
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">1. O Impacto da Automação nas Vendas</h4>
          <p className="text-gray-700 dark:text-gray-300">
            No início do webinar, Carlos apresenta dados impressionantes sobre como empresas
            que implementam automação em seus processos de vendas conseguem aumentar
            em até 30% suas taxas de conversão e reduzir em 25% o tempo do ciclo de vendas.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">2. Mapeando Oportunidades de Automação</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Ana mostra um framework prático para identificar quais etapas do processo 
            de vendas são candidatas ideais para automação, considerando fatores como
            repetitividade, complexidade e valor agregado.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">3. Construção de um Funil Automatizado</h4>
          <p className="text-gray-700 dark:text-gray-300">
            A parte central do webinar inclui uma demonstração ao vivo da criação de um
            funil de vendas automatizado no Interflow, desde a captação de leads até
            o agendamento de demonstrações e acompanhamento pós-venda.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">4. Análise e Otimização</h4>
          <p className="text-gray-700 dark:text-gray-300">
            O webinar conclui com uma explicação detalhada sobre como analisar os dados
            gerados pelo seu funil automatizado e como realizar testes A/B para 
            otimizar continuamente seus resultados.
          </p>
        </div>
      </div>
      
      <h3>Perguntas e Respostas</h3>
      
      <div className="space-y-6 mb-8">
        <div>
          <h4 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">Quanto tempo leva para implementar a automação de vendas?</h4>
          <p className="text-gray-700 dark:text-gray-300">
            "Com o Interflow, você pode implementar seus primeiros fluxos automatizados em questão
            de horas. Recomendamos começar com processos simples e ir expandindo gradualmente.
            Um funil completo e otimizado geralmente leva de 2 a 4 semanas para ser totalmente implementado."
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">A automação substitui completamente os vendedores humanos?</h4>
          <p className="text-gray-700 dark:text-gray-300">
            "Não, a automação funciona melhor como um complemento para sua equipe humana.
            Ela assume tarefas repetitivas e de baixo valor, permitindo que seus vendedores
            se concentrem em atividades que realmente exigem habilidades humanas, como
            negociações complexas e construção de relacionamentos."
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">Quais métricas devo monitorar em meu funil automatizado?</h4>
          <p className="text-gray-700 dark:text-gray-300">
            "As principais métricas a serem monitoradas incluem: taxa de conversão em cada
            etapa do funil, tempo médio de ciclo de vendas, custo de aquisição por cliente,
            valor médio de venda e ROI da automação. O Interflow oferece dashboards
            personalizáveis para acompanhar todas essas métricas."
          </p>
        </div>
      </div>
      
      <h3>Materiais Complementares</h3>
      
      <ul className="space-y-2 mb-8">
        <li>
          <a href="#" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            Apresentação em PDF do webinar
          </a>
        </li>
        <li>
          <a href="#" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            Planilha de mapeamento de processos para automação
          </a>
        </li>
        <li>
          <a href="#" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            Checklist: 10 etapas para implementar automação de vendas
          </a>
        </li>
      </ul>
      
      <p>
        Se você gostou deste webinar, considere se inscrever em nossa série completa
        sobre automação de processos comerciais. O próximo episódio abordará
        "Inteligência Artificial na Qualificação de Leads" e será transmitido
        ao vivo no dia 25 de maio.
      </p>
    </ResourceLayout>
  );
}