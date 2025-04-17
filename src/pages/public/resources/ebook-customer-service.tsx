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

export default function EbookCustomerService() {
  const { t } = useTranslation('resources');
  
  // Encontrar dados deste recurso no arquivo de tradução
  const resources = t('sections.ebooks.resources', { returnObjects: true }) as Resource[];
  const resource = resources[0]; // Primeiro recurso na seção de ebooks
  
  // Recursos relacionados
  const relatedResources = [
    {
      title: t('sections.guides.resources.1.title') || "Configurando Canais de Atendimento",
      link: '/resources/channels-setup'
    },
    {
      title: t('sections.webinars.resources.1.title') || "Melhores Práticas em Atendimento Omnichannel",
      link: '/resources/omnichannel-best-practices'
    },
    {
      title: t('sections.templates.resources.1.title') || "Scripts para Atendimento ao Cliente",
      link: '/resources/customer-scripts'
    }
  ];
  
  return (
    <ResourceLayout
      title={resource.title || "Guia Definitivo de Atendimento ao Cliente Digital"}
      description={resource.description || "O guia completo para criar, gerenciar e otimizar operações de atendimento ao cliente na era digital."}
      imageUrl={resource.imageUrl}
      type={resource.type || "ebook"}
      downloadUrl="/downloads/digital-customer-service-guide.pdf"
      relatedResources={relatedResources}
    >
      <h2>Guia Definitivo de Atendimento ao Cliente Digital</h2>
      
      <p>
        Este ebook explora as melhores práticas, estratégias e ferramentas para criar 
        experiências de atendimento ao cliente excepcionais em ambientes digitais, 
        adaptadas às expectativas dos consumidores modernos.
      </p>
      
      <div className="my-8 flex justify-center">
        <img 
          src="https://ttifgdlgcabuliwtjcnu.supabase.co/storage/v1/object/public/images/resources/ebook-customer-service-preview.png" 
          alt="Visualização do Ebook de Atendimento ao Cliente"
          className="rounded-lg shadow-lg max-w-md w-full" 
        />
      </div>
      
      <h3>O que você vai encontrar neste guia:</h3>
      
      <ul className="mb-8">
        <li>Tendências atuais de atendimento ao cliente digital</li>
        <li>Estratégias omnichannel para atendimento integrado</li>
        <li>Implementação de chatbots e IA no atendimento</li>
        <li>Métricas essenciais para avaliar qualidade e desempenho</li>
        <li>Processos para gestão eficiente de equipes de atendimento</li>
        <li>Estudos de caso de empresas de referência</li>
      </ul>
      
      <h3>Conteúdo do Ebook</h3>
      
      <div className="space-y-6 mb-8">
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Capítulo 1: A Era do Atendimento Digital</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Uma análise da evolução do atendimento ao cliente e como as expectativas 
            dos consumidores mudaram na era digital. O capítulo aborda:
          </p>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mt-2">
            <li>A jornada histórica do atendimento ao cliente</li>
            <li>O impacto da transformação digital nas interações com clientes</li>
            <li>Expectativas dos consumidores modernos</li>
            <li>O custo da má experiência de atendimento</li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Capítulo 2: Estratégia Omnichannel</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Um guia completo para desenvolver uma estratégia omnichannel eficaz, 
            oferecendo experiências consistentes em todos os pontos de contato:
          </p>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mt-2">
            <li>Diferença entre multichannel e omnichannel</li>
            <li>Mapeamento da jornada do cliente através dos canais</li>
            <li>Centralizando dados de clientes para visão 360°</li>
            <li>Personalização contextual entre canais</li>
            <li>Implementação gradual da estratégia omnichannel</li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Capítulo 3: Canais Digitais de Atendimento</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Uma análise detalhada dos principais canais de atendimento digital e 
            como otimizá-los para diferentes contextos:
          </p>
          <div className="grid md:grid-cols-2 gap-4 mt-3">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h5 className="font-bold mb-2 text-gray-900 dark:text-white">Chat ao Vivo</h5>
              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 text-sm">
                <li>Melhores práticas de implementação</li>
                <li>Dicas para reduzir tempo de resposta</li>
                <li>Quando usar proatividade vs. reatividade</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h5 className="font-bold mb-2 text-gray-900 dark:text-white">WhatsApp Business</h5>
              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 text-sm">
                <li>Guia de configuração da API</li>
                <li>Templates de mensagens eficazes</li>
                <li>Automações específicas para WhatsApp</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h5 className="font-bold mb-2 text-gray-900 dark:text-white">Redes Sociais</h5>
              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 text-sm">
                <li>Gerenciamento de menções e DMs</li>
                <li>Resposta a comentários e reclamações</li>
                <li>Estratégia para diferentes plataformas</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h5 className="font-bold mb-2 text-gray-900 dark:text-white">E-mail</h5>
              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 text-sm">
                <li>Modernizando o atendimento por e-mail</li>
                <li>Automação inteligente de respostas</li>
                <li>Integração com outros canais</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Capítulo 4: Automação e Inteligência Artificial</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Um guia prático sobre como implementar automação e IA para melhorar 
            a eficiência sem comprometer a qualidade do atendimento:
          </p>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mt-2">
            <li>Chatbots: tipos, casos de uso e limitações</li>
            <li>Roteamento inteligente de atendimentos</li>
            <li>Machine learning para previsão de problemas</li>
            <li>Análise de sentimento em tempo real</li>
            <li>Equilíbrio entre automação e toque humano</li>
          </ul>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-lg mt-4">
            <h5 className="font-bold mb-2 text-blue-700 dark:text-blue-300">Destaque: Framework de Decisão</h5>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              O ebook apresenta um framework exclusivo para decidir quais interações 
              devem ser automatizadas versus as que necessitam de atendimento humano, 
              baseado em complexidade, valor do cliente, estágio da jornada e contexto emocional.
            </p>
          </div>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Capítulo 5: Gestão de Equipes de Atendimento</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Estratégias para recrutar, treinar e gerenciar equipes de atendimento 
            de alta performance no ambiente digital:
          </p>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mt-2">
            <li>Perfil do atendente digital: competências-chave</li>
            <li>Estruturação de equipes por especialidade vs. generalistas</li>
            <li>Programas de capacitação contínua</li>
            <li>Gestão de equipes remotas de atendimento</li>
            <li>Cultura centrada no cliente</li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Capítulo 6: Medindo o Sucesso</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Um guia completo sobre as métricas essenciais para avaliar e 
            melhorar continuamente suas operações de atendimento:
          </p>
          <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg mt-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-bold mb-2 text-gray-900 dark:text-white">Métricas de Eficiência</h5>
                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 text-sm">
                  <li>Tempo médio de resposta</li>
                  <li>Tempo médio de resolução</li>
                  <li>Taxa de primeira resolução (FCR)</li>
                  <li>Volume de atendimentos por canal</li>
                </ul>
              </div>
              
              <div>
                <h5 className="font-bold mb-2 text-gray-900 dark:text-white">Métricas de Qualidade</h5>
                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 text-sm">
                  <li>Net Promoter Score (NPS)</li>
                  <li>Customer Satisfaction (CSAT)</li>
                  <li>Customer Effort Score (CES)</li>
                  <li>Análise qualitativa de feedback</li>
                </ul>
              </div>
              
              <div>
                <h5 className="font-bold mb-2 text-gray-900 dark:text-white">Métricas de Engajamento</h5>
                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 text-sm">
                  <li>Taxa de abandono</li>
                  <li>Taxa de conversão pós-atendimento</li>
                  <li>Engajamento em canais digitais</li>
                </ul>
              </div>
              
              <div>
                <h5 className="font-bold mb-2 text-gray-900 dark:text-white">Métricas de Negócio</h5>
                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 text-sm">
                  <li>Custo por atendimento</li>
                  <li>Customer Lifetime Value (CLV)</li>
                  <li>ROI de iniciativas de atendimento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Capítulo 7: Estudos de Caso</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Análises detalhadas de empresas que transformaram seu atendimento 
            ao cliente digital e os resultados obtidos:
          </p>
          <div className="space-y-3 mt-3">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h5 className="font-bold mb-1 text-gray-900 dark:text-white">Magazine Luiza</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Como o varejista brasileiro transformou a experiência do cliente com 
                atendimento omnichannel integrado e uso estratégico de IA.
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h5 className="font-bold mb-1 text-gray-900 dark:text-white">Nubank</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                A abordagem da fintech para escalar atendimento de qualidade 
                durante crescimento exponencial de base de clientes.
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h5 className="font-bold mb-1 text-gray-900 dark:text-white">Zappos</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Lições da empresa americana conhecida mundialmente por sua 
                obsessão com atendimento ao cliente excepcional.
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Capítulo 8: O Futuro do Atendimento</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Uma análise das tendências emergentes que moldarão o futuro 
            do atendimento ao cliente digital:
          </p>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mt-2">
            <li>IA conversacional avançada</li>
            <li>Realidade aumentada no suporte remoto</li>
            <li>Atendimento proativo baseado em dados</li>
            <li>Experiências de autoatendimento imersivas</li>
            <li>Hiperpersonalização ética</li>
          </ul>
        </div>
      </div>
      
      <h3>Ferramentas e Recursos Incluídos</h3>
      
      <p className="mb-4">
        Além do conteúdo teórico, este guia inclui diversos recursos práticos 
        para implementação imediata:
      </p>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="font-bold mb-3 text-gray-900 dark:text-white">Templates e Checklists</h4>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
            <li>Template de política de atendimento</li>
            <li>Checklist de implementação omnichannel</li>
            <li>Roteiro para seleção de plataforma</li>
            <li>Modelo de script para canais digitais</li>
            <li>Plano de treinamento para atendentes</li>
          </ul>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="font-bold mb-3 text-gray-900 dark:text-white">Planilhas e Calculadoras</h4>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
            <li>Calculadora de ROI de atendimento</li>
            <li>Dashboard de métricas-chave</li>
            <li>Matriz de decisão de automação</li>
            <li>Planilha de dimensionamento de equipe</li>
            <li>Modelo de avaliação de qualidade</li>
          </ul>
        </div>
      </div>
      
      <h3>Sobre os Autores</h3>
      
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-1 bg-gray-50 dark:bg-gray-800 p-5 rounded-lg flex items-start space-x-4">
          <img 
            src="https://ttifgdlgcabuliwtjcnu.supabase.co/storage/v1/object/public/images/authors/author1.png" 
            alt="Foto de Carolina Mendes" 
            className="w-20 h-20 rounded-full object-cover"
          />
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white">Carolina Mendes</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Diretora de CX na Interflow</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Com 15 anos de experiência em gestão de experiência do cliente em 
              empresas como Natura, Itaú e Americanas.com, Carolina é especialista 
              em transformação digital de operações de atendimento.
            </p>
          </div>
        </div>
        
        <div className="flex-1 bg-gray-50 dark:bg-gray-800 p-5 rounded-lg flex items-start space-x-4">
          <img 
            src="https://ttifgdlgcabuliwtjcnu.supabase.co/storage/v1/object/public/images/authors/author2.png" 
            alt="Foto de Ricardo Oliveira" 
            className="w-20 h-20 rounded-full object-cover"
          />
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white">Ricardo Oliveira</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">VP de Tecnologia na Interflow</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Ricardo lidera a equipe de desenvolvimento de soluções de IA e 
              automação para atendimento ao cliente. Anteriormente, trabalhou 
              na IBM e liderou iniciativas de transformação digital em diversos segmentos.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-lg mb-8">
        <h4 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">Depoimentos</h4>
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-700 dark:text-gray-300 italic mb-2">
              "Este guia transformou completamente nossa abordagem de atendimento digital. 
              Implementamos várias das estratégias sugeridas e vimos nosso NPS aumentar 
              em 35% em apenas três meses."
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              — Maria Silva, Diretora de Atendimento, E-commerce Brasil
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-700 dark:text-gray-300 italic mb-2">
              "Um recurso essencial para qualquer empresa que busca excelência em atendimento 
              digital. As ferramentas práticas e modelos valeram o investimento por si só."
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              — Carlos Santos, Head de Customer Success, SaaS Solutions
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg mb-8">
        <h4 className="text-lg font-bold mb-2 text-green-700 dark:text-green-300">
          Acesso ao E-book Completo
        </h4>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Transforme a experiência de atendimento ao cliente da sua empresa com este 
          guia completo e suas ferramentas práticas:
        </p>
        <div className="flex">
          <a 
            href="/downloads/digital-customer-service-guide.pdf" 
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-300"
            download
          >
            Baixar E-book Completo (PDF, 12.3 MB)
          </a>
        </div>
      </div>
    </ResourceLayout>
  );
} 