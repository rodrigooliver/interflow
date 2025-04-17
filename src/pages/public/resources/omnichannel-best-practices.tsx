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

export default function OmnichannelBestPractices() {
  const { t } = useTranslation('resources');
  
  // Encontrar dados deste recurso no arquivo de tradução
  const resources = t('sections.webinars.resources', { returnObjects: true }) as Resource[];
  const resource = resources[1]; // Segundo recurso na seção de webinars
  
  // Recursos relacionados
  const relatedResources = [
    {
      title: t('sections.guides.resources.1.title') || "Configurando Canais de Atendimento",
      link: '/resources/channels-setup'
    },
    {
      title: t('sections.ebooks.resources.0.title') || "Guia Definitivo de Atendimento ao Cliente Digital",
      link: '/resources/ebook-customer-service'
    }
  ];
  
  return (
    <ResourceLayout
      title={resource.title}
      description={resource.description}
      imageUrl={resource.imageUrl}
      type={resource.type}
      downloadUrl="/downloads/omnichannel-best-practices.pdf"
      relatedResources={relatedResources}
    >
      <h2>Melhores Práticas em Atendimento Omnichannel</h2>
      
      <div className="aspect-w-16 aspect-h-9 mb-8">
        <iframe 
          className="w-full h-full" 
          src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
          title="Webinar: Melhores Práticas em Atendimento Omnichannel" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      </div>
      
      <p>
        Neste webinar, nossos especialistas em atendimento ao cliente discutem
        estratégias comprovadas para oferecer uma experiência consistente e de alta
        qualidade através de múltiplos canais de comunicação.
      </p>
      
      <h3>Tópicos Abordados</h3>
      
      <ul className="mb-8">
        <li>Os desafios do atendimento em múltiplos canais</li>
        <li>Como criar uma experiência consistente entre canais</li>
        <li>Gerenciamento centralizado de conversas</li>
        <li>Personalização do atendimento em diferentes plataformas</li>
        <li>Métricas para avaliar atendimento omnichannel</li>
      </ul>
      
      <h3>Apresentadores</h3>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Marcos Silva</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Diretor de Customer Success da Interflow</p>
          <p className="text-gray-700 dark:text-gray-300">
            Com mais de 12 anos de experiência em atendimento ao cliente em grandes
            empresas multinacionais, Marcos desenvolveu metodologias inovadoras para
            otimização de processos de atendimento em múltiplos canais.
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Carla Santos</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Consultora de Experiência do Cliente</p>
          <p className="text-gray-700 dark:text-gray-300">
            Carla é especialista em experiência do cliente com foco em estratégias
            omnichannel. Trabalhou com mais de 50 empresas para implementar programas
            de atendimento multicanal de alta performance.
          </p>
        </div>
      </div>
      
      <h3>Principais Insights</h3>
      
      <div className="space-y-6 mb-8">
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">1. A Importância da Visão Unificada</h4>
          <p className="text-gray-700 dark:text-gray-300">
            O webinar destaca como uma visão unificada do cliente, incluindo todo
            o histórico de interações em diferentes canais, é essencial para um
            atendimento omnichannel eficaz. Marcos demonstra como implementar um
            sistema que agrega todas as conversas do cliente em uma única interface.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">2. Transição Perfeita Entre Canais</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Carla apresenta técnicas para garantir que os clientes possam iniciar uma
            conversa em um canal (como WhatsApp) e continuá-la em outro (como e-mail)
            sem precisar repetir informações ou explicar novamente seu problema.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">3. Personalização Contextual</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Um dos momentos mais reveladores do webinar é a demonstração de como
            usar dados contextuais (como dispositivo usado, localização, histórico
            de compras) para personalizar o atendimento em cada canal, mantendo a
            coerência da experiência.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">4. Implementação Gradual</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Marcos compartilha um framework prático para implementação gradual de
            uma estratégia omnichannel, começando com dois canais principais e
            expandindo progressivamente, garantindo qualidade em cada etapa.
          </p>
        </div>
      </div>
      
      <h3>Checklist de Melhores Práticas</h3>
      
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-8">
        <ul className="space-y-3">
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>Mantenha consistência na identidade da marca</strong> - Utilize a mesma linguagem, tom e identidade visual em todos os canais.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>Centralize o histórico de conversas</strong> - Garanta que os atendentes tenham acesso a todas as interações anteriores, independentemente do canal.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>Adapte as mensagens ao canal</strong> - Respeite as particularidades de cada plataforma, mantendo a essência da comunicação.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>Monitore tempos de resposta em todos os canais</strong> - Estabeleça SLAs específicos para cada canal e garanta seu cumprimento.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>Treine sua equipe para todos os canais</strong> - Capacite os atendentes para manter o mesmo nível de qualidade em qualquer plataforma.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>Implemente automação com inteligência</strong> - Use chatbots e fluxos automatizados para tarefas repetitivas, mas garanta transição suave para atendentes humanos quando necessário.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>Analise dados de desempenho por canal</strong> - Compare métricas entre canais para identificar oportunidades de melhoria.
            </span>
          </li>
        </ul>
      </div>
      
      <h3>Perguntas e Respostas</h3>
      
      <div className="space-y-6 mb-8">
        <div>
          <h4 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">Qual é o maior desafio na implementação de uma estratégia omnichannel?</h4>
          <p className="text-gray-700 dark:text-gray-300">
            "O maior desafio costuma ser a integração de sistemas legados com novas
            plataformas de comunicação. Para superar isso, recomendamos começar com
            uma plataforma central como o Interflow, que já oferece conectores para
            a maioria dos sistemas, e implementar integrações gradualmente, priorizando
            os canais mais utilizados pelos seus clientes."
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">Como medir o sucesso de uma estratégia omnichannel?</h4>
          <p className="text-gray-700 dark:text-gray-300">
            "Além das métricas tradicionais como tempo de resposta e satisfação do cliente,
            recomendamos acompanhar métricas específicas para omnichannel, como: taxa de
            transição entre canais, consistência na resolução entre canais e Customer Effort
            Score (CES) que mede o esforço que o cliente precisa fazer para resolver seu problema."
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">Quais canais devem ser priorizados em uma estratégia omnichannel?</h4>
          <p className="text-gray-700 dark:text-gray-300">
            "Não existe uma resposta única para todos os negócios. O ideal é analisar
            onde seus clientes já estão, quais canais eles preferem e começar por ali.
            Uma abordagem eficaz é realizar uma pesquisa com seus clientes para entender
            suas preferências de comunicação e, com base nisso, definir suas prioridades."
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
            Template: Plano de Implementação Omnichannel
          </a>
        </li>
        <li>
          <a href="#" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            Guia: Métricas para Atendimento Omnichannel
          </a>
        </li>
      </ul>
      
      <p>
        Neste webinar, você aprenderá estratégias práticas para implementar e
        otimizar o atendimento omnichannel em sua empresa, garantindo uma experiência
        consistente para seus clientes independentemente do canal que eles escolherem
        para se comunicar.
      </p>
    </ResourceLayout>
  );
} 