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

export default function WhatsappTemplates() {
  const { t } = useTranslation('resources');
  
  // Encontrar dados deste recurso no arquivo de tradução
  const resources = t('sections.templates.resources', { returnObjects: true }) as Resource[];
  const resource = resources[0]; // Primeiro recurso na seção de templates
  
  // Recursos relacionados
  const relatedResources = [
    {
      title: t('sections.guides.resources.0.title') || "Criando Fluxos Automatizados",
      link: '/resources/automation-flows'
    },
    {
      title: t('sections.ebooks.resources.0.title') || "Guia Definitivo de Atendimento ao Cliente Digital",
      link: '/resources/ebook-customer-service'
    },
    {
      title: t('sections.webinars.resources.1.title') || "Melhores Práticas em Atendimento Omnichannel",
      link: '/resources/omnichannel-best-practices'
    }
  ];
  
  return (
    <ResourceLayout
      title={resource.title}
      description={resource.description}
      imageUrl={resource.imageUrl}
      type={resource.type}
      downloadUrl="/downloads/whatsapp-templates-pack.zip"
      relatedResources={relatedResources}
    >
      <h2>Templates Prontos para WhatsApp Business</h2>
      
      <p>
        Comunique-se de forma eficaz com seus clientes utilizando nossa coleção de 
        templates prontos para WhatsApp Business. Todos os templates seguem as 
        diretrizes oficiais do WhatsApp e foram otimizados para as maiores taxas 
        de entrega e engajamento.
      </p>
      
      <div className="my-8 flex justify-center">
        <img 
          src="https://ttifgdlgcabuliwtjcnu.supabase.co/storage/v1/object/public/images/resources/whatsapp-templates-preview.png" 
          alt="Visualização dos Templates de WhatsApp"
          className="rounded-lg shadow-lg max-w-md w-full" 
        />
      </div>
      
      <h3>Por que usar templates aprovados pelo WhatsApp?</h3>
      
      <p className="mb-6">
        Templates oficiais permitem que sua empresa inicie conversas com clientes de forma 
        proativa, mesmo sem uma mensagem prévia deles. Isso expande significativamente 
        suas possibilidades de comunicação e marketing dentro do WhatsApp.
      </p>
      
      <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg mb-8">
        <h4 className="text-lg font-bold mb-2 text-green-700 dark:text-green-300">Vantagens dos Templates Oficiais</h4>
        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
          <li>Permitem iniciar conversas proativamente (mensagens outbound)</li>
          <li>Garantem entregabilidade confiável sem bloqueios</li>
          <li>Oferecem elementos interativos para melhor engajamento</li>
          <li>Aumentam a credibilidade da sua empresa como conta verificada</li>
          <li>Possibilitam comunicações em escala com sua base de clientes</li>
        </ul>
      </div>
      
      <h3>Categorias de Templates Incluídos</h3>
      
      <div className="space-y-8 mb-10">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">1. Confirmações e Notificações</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Templates para confirmar pedidos, agendamentos, atualizações de status 
            e outras notificações transacionais que mantêm seus clientes informados.
          </p>
          <div className="flex flex-col space-y-4">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Exemplo de confirmação de agendamento:</p>
              <p className="text-gray-800 dark:text-gray-200">
                Olá {"{1}"}, sua consulta foi agendada para {"{2}"} às {"{3}"}. 
                Para confirmar, responda SIM. Para reagendar, clique no link: {"{4}"}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Exemplo de confirmação de pedido:</p>
              <p className="text-gray-800 dark:text-gray-200">
                Olá {"{1}"}, seu pedido #{"{2}"} foi confirmado! Previsão de entrega: {"{3}"}. 
                Acompanhe seu pedido aqui: {"{4}"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">2. Campanhas de Marketing</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Templates para promoções, lançamentos de produtos, eventos e outras 
            comunicações de marketing aprovadas pelas diretrizes do WhatsApp.
          </p>
          <div className="flex flex-col space-y-4">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Exemplo de promoção limitada:</p>
              <p className="text-gray-800 dark:text-gray-200">
                Olá {"{1}"}, temos uma oferta exclusiva para você! {"{2}"} com {"{3}"} de desconto 
                válido até {"{4}"}. Acesse aqui: {"{5}"}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Exemplo de convite para evento:</p>
              <p className="text-gray-800 dark:text-gray-200">
                {"{1}"}, você está convidado para nosso evento {"{2}"} no dia {"{3}"}. 
                Confirme sua presença aqui: {"{4}"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">3. Suporte e Atendimento</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Templates para iniciar atendimentos, follow-ups, pesquisas de satisfação 
            e solicitações de feedback para melhorar seus processos.
          </p>
          <div className="flex flex-col space-y-4">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Exemplo de pesquisa de satisfação:</p>
              <p className="text-gray-800 dark:text-gray-200">
                Olá {"{1}"}, como foi sua experiência com nosso atendimento hoje? 
                Avalie de 1 a 5, sendo 5 excelente. Sua opinião é muito importante para nós!
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Exemplo de follow-up de suporte:</p>
              <p className="text-gray-800 dark:text-gray-200">
                Olá {"{1}"}, seu chamado #{"{2}"} foi resolvido? Se precisar de mais ajuda, 
                responda esta mensagem e continuaremos o atendimento.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">4. Recuperação e Retenção</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Templates para reengajar clientes inativos, recuperar carrinhos abandonados 
            e estimular renovações de serviços e assinaturas.
          </p>
          <div className="flex flex-col space-y-4">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Exemplo de recuperação de carrinho:</p>
              <p className="text-gray-800 dark:text-gray-200">
                Olá {"{1}"}, notamos que você não concluiu sua compra de {"{2}"}. 
                Seu carrinho estará salvo por mais {"{3}"} horas. Finalize aqui: {"{4}"}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Exemplo de lembrete de renovação:</p>
              <p className="text-gray-800 dark:text-gray-200">
                {"{1}"}, sua assinatura do plano {"{2}"} vence em {"{3}"} dias. 
                Renove agora com desconto especial: {"{4}"}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <h3>Como Utilizar os Templates</h3>
      
      <p className="mb-4">
        Todos os templates podem ser facilmente personalizados e implementados em sua conta 
        do WhatsApp Business API. Siga estas etapas:
      </p>
      
      <ol className="list-decimal pl-5 text-gray-700 dark:text-gray-300 mb-8 space-y-2">
        <li>Faça o download do pacote de templates</li>
        <li>No Interflow, acesse "Configurações &gt; Canais &gt; WhatsApp"</li>
        <li>Clique em "Gerenciar Templates" e depois em "Criar Template"</li>
        <li>Copie e cole o conteúdo do template desejado</li>
        <li>Defina a categoria correta conforme as diretrizes do WhatsApp</li>
        <li>Envie para aprovação (o processo leva entre 24-48h)</li>
        <li>Após aprovado, o template estará disponível para uso em automações e envios em massa</li>
      </ol>
      
      <h3>Dicas para Aprovação Rápida</h3>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg mb-8">
        <h4 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">
          Maximizando Suas Chances de Aprovação
        </h4>
        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-4">
          <li>Mantenha a linguagem clara e direta, sem abreviações excessivas</li>
          <li>Evite mencionar concorrentes ou plataformas de mensagens alternativas</li>
          <li>Não inclua referências a produtos ou serviços restritos pelo WhatsApp</li>
          <li>Verifique se a categoria selecionada corresponde corretamente ao conteúdo</li>
          <li>Revise a ortografia e gramática antes de submeter</li>
          <li>Utilize variáveis com moderação e apenas onde fazem sentido contextual</li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 italic">
          "Nossos templates foram pré-aprovados em centenas de contas, aumentando significativamente 
          a probabilidade de aprovação na primeira tentativa."
        </p>
      </div>
      
      <h3>Personalização e Variáveis</h3>
      
      <p className="mb-4">
        Todos os templates incluem variáveis que permitem personalização em escala. 
        Você pode modificar os seguintes elementos:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-8">
        <li>Nome do cliente e informações pessoais</li>
        <li>Detalhes do produto ou serviço</li>
        <li>Datas, horários e prazos</li>
        <li>Valores, descontos e condições especiais</li>
        <li>Links personalizados para ações específicas</li>
        <li>Números de pedido, protocolo ou referências</li>
      </ul>
      
      <h3>Conteúdo do Pacote</h3>
      
      <p className="mb-4">
        Ao fazer o download do pacote, você receberá:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-8">
        <li>30 templates prontos para WhatsApp em formato compatível</li>
        <li>Guia detalhado sobre o processo de aprovação</li>
        <li>Planilha de acompanhamento de desempenho dos templates</li>
        <li>Fluxograma de decisão para escolha do template ideal</li>
        <li>Vídeo tutorial sobre implementação e melhores práticas</li>
      </ul>
      
      <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg mb-8">
        <h4 className="text-lg font-bold mb-2 text-green-700 dark:text-green-300">
          Acesso ao Pacote Completo
        </h4>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Baixe agora o pacote completo de templates e comece a implementar comunicações 
          eficientes e conformes com seu público via WhatsApp:
        </p>
        <div className="flex">
          <a 
            href="/downloads/whatsapp-templates-pack.zip" 
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-300"
            download
          >
            Baixar Templates (ZIP, 5.3 MB)
          </a>
        </div>
      </div>
    </ResourceLayout>
  );
} 