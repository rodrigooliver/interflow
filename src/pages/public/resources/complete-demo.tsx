import React from 'react';
import { useTranslation } from 'react-i18next';
import { ResourceLayout } from './ResourceLayout';
import { useNavigate } from 'react-router-dom';

interface Resource {
  title: string;
  description: string;
  imageUrl?: string;
  link: string;
  type: string;
}

export default function CompleteDemo() {
  const { t } = useTranslation('resources');
  const navigate = useNavigate();
  
  // Encontrar dados deste recurso no arquivo de tradução
  const resources = t('sections.demos.resources', { returnObjects: true }) as Resource[];
  const resource = resources[0]; // Primeiro recurso na seção de demos
  
  // Recursos relacionados
  const relatedResources = [
    {
      title: t('sections.guides.resources.0.title') || "Criando Fluxos Automatizados",
      link: '/resources/automation-flows'
    },
    {
      title: t('sections.templates.resources.0.title') || "Templates para WhatsApp Business",
      link: '/resources/whatsapp-templates'
    },
    {
      title: t('sections.ebooks.resources.2.title') || "ROI do Atendimento: Como Medir e Melhorar",
      link: '/resources/roi-guide'
    }
  ];
  
  return (
    <ResourceLayout
      title={resource.title || "Demonstração Completa do Interflow"}
      description={resource.description || "Veja em primeira mão como o Interflow pode transformar as operações de atendimento da sua empresa."}
      imageUrl={resource.imageUrl}
      type={resource.type || "demo"}
      downloadUrl="/downloads/interflow-presentation.pdf"
      relatedResources={relatedResources}
    >
      <h2>Demonstração Completa do Interflow</h2>
      
      <p>
        Explore todas as funcionalidades da plataforma Interflow nesta demonstração 
        interativa guiada por especialistas. Veja como integrar canais, automatizar 
        fluxos de atendimento e analisar resultados em tempo real.
      </p>
      
      <div className="aspect-w-16 aspect-h-9 my-8">
        <iframe 
          className="w-full h-96" 
          src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
          title="Demonstração Completa do Interflow" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      </div>
      
      <h3>O que você verá nesta demonstração</h3>
      
      <p className="mb-6">
        Nesta demonstração completa, nossos especialistas mostram como o Interflow 
        pode ajudar sua empresa a centralizar todas as comunicações com clientes 
        e automatizar processos para maior eficiência.
      </p>
      
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-lg mb-8">
        <h4 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Destaque de Funcionalidades</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="ml-4">
              <h5 className="text-base font-semibold text-gray-900 dark:text-white">Omnichannel</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Integração perfeita entre WhatsApp, chat web, e-mail, redes sociais e mais
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <h5 className="text-base font-semibold text-gray-900 dark:text-white">Inbox Unificado</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Interface única para gerenciar todas as conversas, independente do canal
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <div className="ml-4">
              <h5 className="text-base font-semibold text-gray-900 dark:text-white">Builder de Fluxos</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Interface drag-and-drop para criar automações sem código
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h5 className="text-base font-semibold text-gray-900 dark:text-white">Analytics</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Dashboards personalizáveis com métricas em tempo real
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-4">
              <h5 className="text-base font-semibold text-gray-900 dark:text-white">Base de Conhecimento</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Repositório centralizado e acessível de informações para atendentes
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <h5 className="text-base font-semibold text-gray-900 dark:text-white">Integrações</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Conectores prontos para CRMs, ERPs e outras ferramentas 
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <h3>Detalhamento da Demonstração</h3>
      
      <div className="space-y-6 mb-8">
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">1. Introdução (00:00 - 03:45)</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Visão geral do Interflow e seus principais diferenciais no mercado. 
            Apresentação dos desafios comuns em operações de atendimento e como 
            a plataforma foi projetada para resolvê-los.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">2. Configuração de Canais (03:46 - 10:12)</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Demonstração passo a passo de como configurar e integrar diferentes canais 
            de comunicação, incluindo WhatsApp Business API, Instagram, Facebook Messenger, 
            chat web e e-mail. Exemplo prático de configuração do WhatsApp Business.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">3. Interface de Atendimento (10:13 - 17:40)</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Tour pelo inbox unificado, mostrando como os atendentes podem gerenciar 
            conversas de diferentes canais em uma única interface. Demonstração de 
            recursos de produtividade como respostas rápidas, transferência de 
            atendimentos e visualização de histórico do cliente.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">4. Automação de Fluxos (17:41 - 28:15)</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Exemplo de criação de um fluxo automatizado utilizando o builder visual. 
            Demonstração de como configurar condições, ações e integrações para 
            automatizar processos de atendimento, qualificação de leads e respostas 
            iniciais.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">5. Análise de Dados (28:16 - 35:50)</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Apresentação dos dashboards de análise, incluindo métricas de desempenho 
            de atendentes, tempos de resposta, satisfação do cliente e eficiência 
            de fluxos automatizados. Demonstração de como personalizar relatórios.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">6. Integrações (35:51 - 41:35)</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Demonstração de como integrar o Interflow com sistemas externos como CRMs, 
            plataformas de e-commerce e ERPs. Exemplo prático de sincronização de 
            dados com Salesforce e Shopify.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">7. Administração e Segurança (41:36 - 46:20)</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Visão geral das configurações administrativas, incluindo gerenciamento de 
            usuários, permissões, backup de dados e conformidade com regulamentações 
            de privacidade como LGPD e GDPR.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">8. Cases de Sucesso e ROI (46:21 - 51:48)</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Apresentação de exemplos reais de empresas que implementaram o Interflow 
            e os resultados obtidos em termos de eficiência operacional, satisfação 
            do cliente e retorno sobre investimento.
          </p>
        </div>
      </div>
      
      <h3>Destaques da Demonstração</h3>
      
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <img 
            src="https://ttifgdlgcabuliwtjcnu.supabase.co/storage/v1/object/public/images/resources/demo-inbox.png" 
            alt="Interface de Inbox Unificado" 
            className="mb-4 rounded-lg w-full"
          />
          <h4 className="font-bold mb-2 text-gray-900 dark:text-white">Inbox Unificado</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Visão 360° de todas as conversas de clientes em uma interface intuitiva e organizada.
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <img 
            src="https://ttifgdlgcabuliwtjcnu.supabase.co/storage/v1/object/public/images/resources/demo-flow-builder.png" 
            alt="Builder de Fluxos" 
            className="mb-4 rounded-lg w-full"
          />
          <h4 className="font-bold mb-2 text-gray-900 dark:text-white">Builder de Fluxos</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Interface drag-and-drop para criar automações complexas sem necessidade de código.
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <img 
            src="https://ttifgdlgcabuliwtjcnu.supabase.co/storage/v1/object/public/images/resources/demo-analytics.png" 
            alt="Dashboard de Analytics" 
            className="mb-4 rounded-lg w-full"
          />
          <h4 className="font-bold mb-2 text-gray-900 dark:text-white">Analytics Avançado</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Dashboards personalizáveis com métricas em tempo real para otimizar operações.
          </p>
        </div>
      </div>
      
      <h3>Perguntas Frequentes</h3>
      
      <div className="space-y-4 mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
          <h4 className="font-bold mb-2 text-gray-900 dark:text-white">Quanto tempo leva para implementar o Interflow?</h4>
          <p className="text-gray-700 dark:text-gray-300">
            A implementação básica pode ser feita em 1-2 dias, com a configuração completa 
            de automações e integrações levando de 1-3 semanas, dependendo da complexidade 
            do seu ambiente.
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
          <h4 className="font-bold mb-2 text-gray-900 dark:text-white">O Interflow se integra com o meu sistema atual?</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Sim, o Interflow possui conectores prontos para as principais plataformas de CRM, 
            e-commerce e ERP do mercado. Também oferecemos uma API aberta e webhooks para 
            integrações personalizadas.
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
          <h4 className="font-bold mb-2 text-gray-900 dark:text-white">Quais canais de comunicação são suportados?</h4>
          <p className="text-gray-700 dark:text-gray-300">
            O Interflow suporta WhatsApp Business API, Facebook Messenger, Instagram Direct, 
            chat web, e-mail, SMS, Telegram, entre outros. Novos canais são adicionados regularmente.
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
          <h4 className="font-bold mb-2 text-gray-900 dark:text-white">Qual o suporte oferecido durante a implementação?</h4>
          <p className="text-gray-700 dark:text-gray-300">
            Oferecemos um gerente de implementação dedicado, treinamento para sua equipe 
            e suporte técnico prioritário durante todo o processo de onboarding. Após a 
            implementação, disponibilizamos suporte contínuo via chat, e-mail e telefone.
          </p>
        </div>
      </div>
      
      <h3>Próximos Passos</h3>
      
      <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-6 rounded-lg mb-8">
        <h4 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">Agende uma Demonstração Personalizada</h4>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Quer ver como o Interflow pode resolver os desafios específicos da sua empresa? 
          Agende uma demonstração personalizada com um de nossos especialistas de produto.
        </p>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <button 
            onClick={() => navigate('/contact')} 
            className="inline-flex items-center justify-center px-5 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors duration-300"
          >
            Agendar Demonstração
          </button>
          <a 
            href="/downloads/interflow-presentation.pdf" 
            className="inline-flex items-center justify-center px-5 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors duration-300"
            download
          >
            Baixar Apresentação
          </a>
        </div>
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Esta demonstração foi atualizada em agosto de 2023 e reflete os recursos disponíveis 
          na versão atual da plataforma. Novas funcionalidades são adicionadas regularmente.
        </p>
      </div>
    </ResourceLayout>
  );
} 