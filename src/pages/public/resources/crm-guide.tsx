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

export default function CrmGuide() {
  const { t } = useTranslation('resources');
  
  // Encontrar dados deste recurso no arquivo de tradução
  const resources = t('sections.ebooks.resources', { returnObjects: true }) as Resource[];
  const resource = resources[1]; // Segundo recurso na seção de ebooks
  
  // Recursos relacionados
  const relatedResources = [
    {
      title: t('sections.guides.resources.1.title') || "Configurando Canais de Atendimento",
      link: '/resources/channels-setup'
    },
    {
      title: t('sections.ebooks.resources.2.title') || "ROI do Atendimento: Como Medir e Melhorar",
      link: '/resources/roi-guide'
    }
  ];
  
  return (
    <ResourceLayout
      title={resource.title}
      description={resource.description}
      imageUrl={resource.imageUrl}
      type={resource.type}
      downloadUrl="/downloads/crm-digital-age-guide.pdf"
      relatedResources={relatedResources}
    >
      <h2>CRM na Era Digital: Estratégias que Funcionam</h2>
      
      <p>
        Este guia prático destina-se a empresas que desejam implementar ou aprimorar
        suas estratégias de CRM (Customer Relationship Management) na era digital.
        Você encontrará aqui abordagens comprovadas, ferramentas recomendadas e
        exemplos de casos reais para transformar seu relacionamento com clientes.
      </p>
      
      <div className="my-8 flex justify-center">
        <img 
          src="https://ttifgdlgcabuliwtjcnu.supabase.co/storage/v1/object/public/images/resources/crm-preview.png" 
          alt="Visualização do E-book de CRM"
          className="rounded-lg shadow-lg max-w-md w-full" 
        />
      </div>
      
      <h3>O que você vai encontrar neste guia:</h3>
      
      <ul className="mb-8">
        <li>A evolução do CRM: da planilha aos sistemas inteligentes</li>
        <li>Como escolher a plataforma de CRM ideal para seu negócio</li>
        <li>Integrando CRM com canais de comunicação digital</li>
        <li>Estratégias de segmentação e personalização em escala</li>
        <li>Automação de processos comerciais e de atendimento</li>
        <li>Métricas essenciais para avaliar a eficácia do seu CRM</li>
        <li>Casos de estudo de empresas que transformaram seus resultados</li>
      </ul>
      
      <h3>Capítulo 1: Fundamentos do CRM Moderno</h3>
      
      <p>
        O primeiro capítulo estabelece as bases para compreender o CRM contemporâneo,
        explicando como ele evoluiu de simples banco de dados para plataformas completas
        de gestão de relacionamento. Tópicos abordados:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-6">
        <li>Definição e escopo do CRM moderno</li>
        <li>Os quatro pilares: Dados, Processos, Tecnologia e Pessoas</li>
        <li>Diferenças entre CRM operacional, analítico e colaborativo</li>
        <li>Como o CRM se tornou o centro da estratégia omnichannel</li>
      </ul>
      
      <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Destaques do Capítulo 1:</h4>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg mb-8">
        <blockquote className="text-gray-700 dark:text-gray-300 italic">
          "O CRM moderno não é apenas uma ferramenta, mas uma filosofia que coloca o cliente
          no centro de todas as decisões empresariais. As empresas que mais se beneficiam de
          estratégias de CRM são aquelas que compreendem que se trata de uma abordagem
          holística para gestão de relacionamentos, não apenas um software."
        </blockquote>
      </div>
      
      <h3>Capítulo 2: Escolhendo a Plataforma Ideal</h3>
      
      <p>
        Neste capítulo, você encontrará um guia passo a passo para selecionar a plataforma
        de CRM mais adequada às necessidades específicas do seu negócio:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-6">
        <li>Critérios essenciais para avaliação de plataformas de CRM</li>
        <li>Comparativo detalhado das principais soluções do mercado</li>
        <li>CRM na nuvem vs. on-premise: prós e contras</li>
        <li>Calculando o retorno sobre investimento (ROI) do seu CRM</li>
        <li>Fatores críticos para uma implementação bem-sucedida</li>
      </ul>
      
      <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Matriz de Decisão:</h4>
      
      <p className="mb-4">
        O guia inclui uma matriz de decisão prática que você pode usar para avaliar
        diferentes plataformas de CRM com base em critérios como:
      </p>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h5 className="font-bold mb-3 text-gray-900 dark:text-white">Critérios Funcionais</h5>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
            <li>Capacidades de automação</li>
            <li>Integrações nativas disponíveis</li>
            <li>Recursos de relatórios e análises</li>
            <li>Funcionalidades móveis</li>
            <li>Personalização e flexibilidade</li>
          </ul>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h5 className="font-bold mb-3 text-gray-900 dark:text-white">Critérios Operacionais</h5>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
            <li>Escalabilidade</li>
            <li>Segurança e conformidade</li>
            <li>Facilidade de uso</li>
            <li>Qualidade do suporte</li>
            <li>Custo total de propriedade</li>
          </ul>
        </div>
      </div>
      
      <h3>Capítulo 3: Integrando CRM e Comunicação Digital</h3>
      
      <p>
        Este capítulo explora como integrar seu CRM com múltiplos canais de comunicação
        para criar uma experiência verdadeiramente omnichannel:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-6">
        <li>Integração com e-mail, SMS, WhatsApp e redes sociais</li>
        <li>Captura automática de interações em todos os canais</li>
        <li>Criação de uma visão 360° do cliente</li>
        <li>Estratégias para interações contextualizadas em cada canal</li>
        <li>Superando desafios comuns de integração</li>
      </ul>
      
      <h3>Capítulo 4: Personalização em Escala</h3>
      
      <p>
        Aprenda como utilizar dados de CRM para entregar experiências personalizadas,
        mantendo a eficiência operacional:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-6">
        <li>Técnicas avançadas de segmentação de clientes</li>
        <li>Personalização baseada em comportamento e preferências</li>
        <li>Automação de comunicações personalizadas</li>
        <li>Utilizando IA para recomendações em tempo real</li>
        <li>Balanceando personalização e privacidade</li>
      </ul>
      
      <h3>Capítulo 5: Automação de Processos Comerciais</h3>
      
      <p>
        Este capítulo detalha como automatizar processos de vendas e atendimento
        para aumentar a eficiência e melhorar a experiência do cliente:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-6">
        <li>Mapeamento e otimização de processos antes da automação</li>
        <li>Implementação de fluxos de trabalho automatizados</li>
        <li>Lead scoring e routing automatizado</li>
        <li>Automação de follow-ups e nutrição de leads</li>
        <li>Integração com ferramentas de marketing automation</li>
      </ul>
      
      <h3>Capítulo 6: Métricas e Analytics</h3>
      
      <p>
        Descubra quais métricas monitorar para avaliar a eficácia da sua estratégia de CRM:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-6">
        <li>KPIs essenciais para diferentes áreas do CRM</li>
        <li>Construindo dashboards eficientes</li>
        <li>Análise preditiva para antecipar comportamentos</li>
        <li>Customer Lifetime Value e outras métricas avançadas</li>
        <li>Utilizando dados para melhorar continuamente</li>
      </ul>
      
      <h3>Capítulo 7: Casos de Estudo</h3>
      
      <p>
        O guia conclui com casos reais de implementação bem-sucedida:
      </p>
      
      <div className="space-y-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Caso 1: Empresa de E-commerce</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Como uma empresa de e-commerce com 500.000 clientes implementou um CRM
            integrado que resultou em aumento de 28% nas vendas recorrentes e redução
            de 35% no custo de aquisição de clientes.
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Caso 2: Empresa B2B de Serviços</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Estratégia de automação que permitiu a uma empresa B2B reduzir o ciclo
            de vendas em 40% e aumentar a taxa de conversão de leads qualificados em 25%.
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Caso 3: Pequena Empresa em Crescimento</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Como uma empresa com recursos limitados implementou uma estratégia de CRM
            progressiva, começando com ferramentas básicas e expandindo gradualmente
            para uma solução robusta.
          </p>
        </div>
      </div>
      
      <h3>Conclusão e Próximos Passos</h3>
      
      <p className="mb-6">
        O guia termina com recomendações práticas para implementar os conhecimentos
        adquiridos, incluindo um plano de ação de 90 dias para transformar sua
        estratégia de CRM.
      </p>
      
      <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg mb-8">
        <h4 className="text-lg font-bold mb-2 text-green-700 dark:text-green-300">Download do Guia Completo</h4>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Este resumo cobre apenas os principais pontos abordados no guia completo.
          Para acesso a todos os insights, ferramentas e templates, faça o download
          do PDF completo.
        </p>
        <div className="flex">
          <a 
            href="/downloads/crm-digital-age-guide.pdf" 
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-300"
            download
          >
            Baixar Guia Completo (PDF, 8.2 MB)
          </a>
        </div>
      </div>
    </ResourceLayout>
  );
} 