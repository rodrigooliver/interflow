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

export default function RoiGuide() {
  const { t } = useTranslation('resources');
  
  // Encontrar dados deste recurso no arquivo de tradução
  const resources = t('sections.ebooks.resources', { returnObjects: true }) as Resource[];
  const resource = resources[2]; // Terceiro recurso na seção de ebooks
  
  // Recursos relacionados
  const relatedResources = [
    {
      title: t('sections.guides.resources.1.title') || "Configurando Canais de Atendimento",
      link: '/resources/channels-setup'
    },
    {
      title: t('sections.ebooks.resources.1.title') || "CRM na Era Digital: Estratégias que Funcionam",
      link: '/resources/crm-guide'
    },
    {
      title: t('sections.webinars.resources.0.title') || "Webinar: Automação de Vendas",
      link: '/resources/sales-automation-webinar'
    }
  ];
  
  return (
    <ResourceLayout
      title={resource.title}
      description={resource.description}
      imageUrl={resource.imageUrl}
      type={resource.type}
      downloadUrl="/downloads/roi-customer-service-guide.pdf"
      relatedResources={relatedResources}
    >
      <h2>ROI do Atendimento: Como Medir e Melhorar</h2>
      
      <p>
        Este guia prático oferece métodos comprovados para calcular e maximizar 
        o retorno sobre investimento (ROI) das suas operações de atendimento ao cliente. 
        Descubra como transformar seu centro de contato de um centro de custo 
        para um diferencial competitivo e uma fonte de receita.
      </p>
      
      <div className="my-8 flex justify-center">
        <img 
          src="https://ttifgdlgcabuliwtjcnu.supabase.co/storage/v1/object/public/images/resources/roi-preview.png" 
          alt="Visualização do Guia de ROI do Atendimento"
          className="rounded-lg shadow-lg max-w-md w-full" 
        />
      </div>
      
      <h3>O que você vai encontrar neste guia:</h3>
      
      <ul className="mb-8">
        <li>Frameworks para calcular o ROI do atendimento ao cliente</li>
        <li>Métricas essenciais que impactam diretamente a lucratividade</li>
        <li>Estratégias para reduzir custos sem comprometer a qualidade</li>
        <li>Técnicas para monetização e geração de receita via atendimento</li>
        <li>Ferramentas de análise e visualização de dados de desempenho</li>
        <li>Cases de sucesso com resultados quantificáveis</li>
      </ul>
      
      <h3>Parte 1: Fundamentos do ROI no Atendimento</h3>
      
      <p>
        Esta seção estabelece as bases para compreender como o retorno sobre investimento 
        se aplica especificamente ao contexto de atendimento ao cliente:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-6">
        <li>Por que o ROI do atendimento é mais difícil de medir (e como resolver isso)</li>
        <li>A fórmula expandida do ROI aplicada ao atendimento</li>
        <li>Impactos diretos e indiretos das operações de atendimento</li>
        <li>Desmistificando o atendimento como "centro de custo"</li>
      </ul>
      
      <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Calculando o ROI Básico:</h4>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg mb-8">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          A fórmula tradicional de ROI adaptada para o atendimento:
        </p>
        <div className="text-xl font-bold text-center mb-4">
          ROI do Atendimento = (Ganhos do Atendimento - Custos do Atendimento) / Custos do Atendimento
        </div>
        <p className="text-gray-700 dark:text-gray-300 italic">
          "O desafio está em quantificar corretamente os ganhos, que incluem não apenas 
          receitas diretas, mas também retenção de clientes, referências, feedback valioso 
          e prevenção de perda de receita."
        </p>
      </div>
      
      <h3>Parte 2: Métricas Essenciais de ROI</h3>
      
      <p>
        Nesta seção, detalhamos as métricas mais impactantes para medir o desempenho 
        financeiro do atendimento:
      </p>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="font-bold mb-3 text-gray-900 dark:text-white">Métricas de Receita</h4>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
            <li>Customer Lifetime Value (CLTV)</li>
            <li>Taxa de cross-sell e upsell via atendimento</li>
            <li>Net Revenue Retention (NRR)</li>
            <li>Valor de prevenção de churn</li>
            <li>Receita por interação</li>
          </ul>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="font-bold mb-3 text-gray-900 dark:text-white">Métricas de Custos</h4>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
            <li>Custo por atendimento</li>
            <li>Custo de aquisição de clientes (CAC)</li>
            <li>First Contact Resolution (impacto nos custos)</li>
            <li>Cost of Poor Quality (COPQ)</li>
            <li>Custo de escalações</li>
          </ul>
        </div>
      </div>
      
      <h3>Parte 3: Estratégias para Redução de Custos</h3>
      
      <p>
        Aprenda a otimizar custos mantendo ou melhorando os níveis de satisfação dos clientes:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-6">
        <li>Self-service estratégico: quando e como implementar</li>
        <li>Automação inteligente de processos</li>
        <li>Roteamento otimizado baseado em skills</li>
        <li>Prevenção proativa de contatos</li>
        <li>Knowledge management para redução de tempo de atendimento</li>
        <li>Workforce management e otimização de escalas</li>
      </ul>
      
      <h3>Parte 4: Gerando Receita via Atendimento</h3>
      
      <p>
        Esta seção explora como transformar seu centro de contatos em um centro de lucro:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-6">
        <li>Modelos de monetização direta do atendimento</li>
        <li>Cross-selling e upselling contextual</li>
        <li>Customer Success como motor de expansão de receita</li>
        <li>Estratégias de retenção proativa de alto valor</li>
        <li>Programas de referência e advocacy</li>
      </ul>
      
      <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Destaque: Framework de Upsell</h4>
      
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-8">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          O guia apresenta um framework de 5 etapas para implementar upselling 
          ético e eficaz durante o atendimento:
        </p>
        <ol className="list-decimal pl-5 text-gray-700 dark:text-gray-300">
          <li className="mb-2"><span className="font-bold">Identificação de oportunidades:</span> Mapear momentos ideais na jornada</li>
          <li className="mb-2"><span className="font-bold">Segmentação precisa:</span> Oferecer apenas o que realmente agrega valor</li>
          <li className="mb-2"><span className="font-bold">Capacitação consultiva:</span> Treinar equipe para abordagem não-invasiva</li>
          <li className="mb-2"><span className="font-bold">Sistemas de suporte:</span> Ferramentas para recomendações em tempo real</li>
          <li><span className="font-bold">Mensuração e otimização:</span> Acompanhar métricas de conversão e satisfação</li>
        </ol>
      </div>
      
      <h3>Parte 5: Ferramentas de Análise e Visualização</h3>
      
      <p>
        Conheça as principais ferramentas e técnicas para coletar, analisar e visualizar 
        dados de ROI do atendimento:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-6">
        <li>Construção de dashboards de ROI do atendimento</li>
        <li>Integrando dados de CRM, contact center e financeiros</li>
        <li>Análise de jornada e seu impacto econômico</li>
        <li>Voice of Customer (VoC) quantificado financeiramente</li>
        <li>Previsões e modelagem de cenários</li>
      </ul>
      
      <div className="my-8 flex justify-center">
        <img 
          src="https://ttifgdlgcabuliwtjcnu.supabase.co/storage/v1/object/public/images/resources/roi-dashboard.png" 
          alt="Exemplo de Dashboard de ROI de Atendimento"
          className="rounded-lg shadow-lg max-w-md w-full" 
        />
      </div>
      
      <h3>Parte 6: Cases de Sucesso</h3>
      
      <p className="mb-4">
        Exemplos reais de empresas que transformaram seus centros de atendimento 
        em diferenciais competitivos com ROI mensurável:
      </p>
      
      <div className="space-y-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Case 1: Varejista Omnichannel</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Uma rede de varejo que implementou uma estratégia de atendimento omnichannel 
            integrada conseguiu aumentar o CLTV em 32% e reduzir o CAC em 18%, 
            resultando em um ROI de 287% sobre o investimento em transformação digital 
            do atendimento.
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Case 2: SaaS B2B</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Empresa de software que transformou seu time de suporte em consultores 
            de sucesso do cliente, elevando a taxa de renovação de 82% para 94% 
            e aumentando a receita média por conta em 27%.
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Case 3: Fintech</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Startup que implementou um programa de atendimento proativo baseado 
            em dados comportamentais, reduzindo o churn em 40% e gerando um 
            incremento de 15% nas compras recorrentes.
          </p>
        </div>
      </div>
      
      <h3>Parte 7: Implementação e Roadmap</h3>
      
      <p>
        Um guia passo a passo para implementar uma estratégia de ROI de atendimento:
      </p>
      
      <ol className="list-decimal pl-5 text-gray-700 dark:text-gray-300 mb-8">
        <li className="mb-3">
          <span className="font-bold">Diagnóstico inicial</span>
          <p>Avalie sua situação atual, identifique lacunas de dados e oportunidades imediatas.</p>
        </li>
        <li className="mb-3">
          <span className="font-bold">Definição de métricas e KPIs</span>
          <p>Estabeleça as métricas que serão monitoradas e as metas a serem alcançadas.</p>
        </li>
        <li className="mb-3">
          <span className="font-bold">Infraestrutura de dados</span>
          <p>Configure sistemas para coleta e integração dos dados necessários.</p>
        </li>
        <li className="mb-3">
          <span className="font-bold">Piloto de iniciativas</span>
          <p>Implemente projetos de alto impacto e baixa complexidade para resultados rápidos.</p>
        </li>
        <li className="mb-3">
          <span className="font-bold">Capacitação da equipe</span>
          <p>Treine sua equipe com mentalidade orientada a valor e habilidades de consultoria.</p>
        </li>
        <li className="mb-3">
          <span className="font-bold">Escala e otimização</span>
          <p>Expanda as iniciativas bem-sucedidas e refine continuamente com base nos dados.</p>
        </li>
      </ol>
      
      <h3>Conclusão e Ferramentas Práticas</h3>
      
      <p className="mb-6">
        O guia conclui com um resumo dos principais conceitos e oferece acesso a 
        ferramentas práticas para implementação imediata:
      </p>
      
      <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg mb-8">
        <h4 className="text-lg font-bold mb-2 text-green-700 dark:text-green-300">
          Acesso às Ferramentas Completas
        </h4>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Ao fazer o download do guia completo, você terá acesso a:
        </p>
        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-6">
          <li>Calculadora de ROI do Atendimento em Excel</li>
          <li>Templates de dashboard para análise de desempenho</li>
          <li>Checklist de implementação da estratégia de ROI</li>
          <li>Modelos de script para abordagens de upsell e cross-sell</li>
          <li>Questionário de diagnóstico para avaliação da maturidade</li>
        </ul>
        <div className="flex">
          <a 
            href="/downloads/roi-customer-service-guide.pdf" 
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-300"
            download
          >
            Baixar Guia Completo (PDF, 7.5 MB)
          </a>
        </div>
      </div>
    </ResourceLayout>
  );
} 