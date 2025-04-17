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

export default function CustomerScripts() {
  const { t } = useTranslation('resources');
  
  // Encontrar dados deste recurso no arquivo de tradução
  const resources = t('sections.templates.resources', { returnObjects: true }) as Resource[];
  const resource = resources[1]; // Segundo recurso na seção de templates
  
  // Recursos relacionados
  const relatedResources = [
    {
      title: t('sections.webinars.resources.1.title') || "Melhores Práticas em Atendimento Omnichannel",
      link: '/resources/omnichannel-best-practices'
    },
    {
      title: t('sections.ebooks.resources.0.title') || "Guia Definitivo de Atendimento ao Cliente Digital",
      link: '/resources/ebook-customer-service'
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
      downloadUrl="/downloads/customer-service-scripts.zip"
      relatedResources={relatedResources}
    >
      <h2>Scripts para Atendimento ao Cliente de Alta Performance</h2>
      
      <p>
        Nossa coleção de scripts profissionais de atendimento ao cliente foi projetada 
        para ajudar suas equipes a oferecerem um serviço consistente, empático e 
        eficiente em todos os canais de comunicação.
      </p>
      
      <div className="my-8 flex justify-center">
        <img 
          src="https://ttifgdlgcabuliwtjcnu.supabase.co/storage/v1/object/public/images/resources/customer-scripts-preview.png" 
          alt="Visualização dos Scripts de Atendimento"
          className="rounded-lg shadow-lg max-w-md w-full" 
        />
      </div>
      
      <h3>Por que utilizar scripts estruturados?</h3>
      
      <p className="mb-6">
        Scripts profissionais de atendimento não são roteiros rígidos, mas sim estruturas 
        conversacionais que garantem consistência, conformidade e qualidade, enquanto 
        permitem flexibilidade para personalização e empatia genuína.
      </p>
      
      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-lg mb-8">
        <h4 className="text-lg font-bold mb-2 text-indigo-700 dark:text-indigo-300">Benefícios Comprovados</h4>
        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
          <li>Redução de 42% no tempo médio de atendimento</li>
          <li>Aumento de 28% na satisfação dos clientes (CSAT)</li>
          <li>Diminuição de 35% nas solicitações de escalonamento</li>
          <li>Integração de novos atendentes 55% mais rápida</li>
          <li>Consistência na comunicação da marca em todos os canais</li>
        </ul>
      </div>
      
      <h3>Categorias de Scripts Incluídos</h3>
      
      <div className="space-y-8 mb-10">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">1. Abertura e Diagnóstico</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Scripts para iniciar conversas, identificar necessidades e estabelecer 
            expectativas claras, adaptados para diferentes canais de comunicação.
          </p>
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Exemplo de script de abertura:</p>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Atendente:</p>
            <p className="text-gray-800 dark:text-gray-200 mb-3 pl-4">
              "Olá, [nome do cliente]! Obrigado por entrar em contato com a [nome da empresa]. 
              Meu nome é [seu nome] e estou aqui para ajudar. Para que eu possa atendê-lo(a) 
              da melhor forma possível, poderia me contar um pouco sobre o que você precisa hoje?"
            </p>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Cliente:</p>
            <p className="text-gray-800 dark:text-gray-200 mb-3 pl-4 italic">
              [Resposta do cliente]
            </p>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Atendente:</p>
            <p className="text-gray-800 dark:text-gray-200 pl-4">
              "Entendo, [nome do cliente]. Agradeço por compartilhar isso comigo. Vou ajudá-lo(a) 
              com [resumo da situação]. Antes de prosseguirmos, gostaria de verificar algumas 
              informações para garantir que possamos resolver isso da forma mais eficiente..."
            </p>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">2. Gerenciamento de Objeções</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Scripts para lidar com situações desafiadoras, objeções comuns e 
            clientes insatisfeitos de forma empática e eficaz.
          </p>
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Exemplo de script para cliente insatisfeito:</p>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Cliente:</p>
            <p className="text-gray-800 dark:text-gray-200 mb-3 pl-4 italic">
              "Já é a terceira vez que entro em contato e ninguém resolve meu problema!"
            </p>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Atendente:</p>
            <p className="text-gray-800 dark:text-gray-200 pl-4">
              "Compreendo completamente sua frustração, [nome do cliente], e peço sinceras 
              desculpas por essa experiência. Eu realmente aprecio sua paciência e gostaria 
              de assumir pessoalmente a responsabilidade por resolver isso hoje. Vamos começar 
              revisando o que aconteceu até agora para que eu possa entender exatamente onde 
              houve falha no nosso atendimento e garantir que seja resolvido adequadamente..."
            </p>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">3. Solução de Problemas</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Scripts para guiar o processo de resolução de problemas comuns de forma 
            estruturada, incluindo verificações de diagnóstico e confirmação.
          </p>
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Exemplo de script de troubleshooting:</p>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Atendente:</p>
            <p className="text-gray-800 dark:text-gray-200 mb-3 pl-4">
              "Para resolvermos esse problema de [descrição], vamos seguir algumas etapas 
              juntos. Primeiro, vamos verificar [passo 1]. Você poderia me confirmar se..."
            </p>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Cliente:</p>
            <p className="text-gray-800 dark:text-gray-200 mb-3 pl-4 italic">
              "Sim, já fiz isso."
            </p>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Atendente:</p>
            <p className="text-gray-800 dark:text-gray-200 pl-4">
              "Perfeito! Agora vamos para o próximo passo. Vamos tentar [passo 2]. 
              Isso ajudará a identificar se o problema está relacionado a [possível causa]..."
            </p>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">4. Encerramento e Follow-up</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Scripts para concluir interações de forma profissional, garantindo 
            satisfação do cliente e estabelecendo próximos passos claros.
          </p>
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Exemplo de script de encerramento:</p>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Atendente:</p>
            <p className="text-gray-800 dark:text-gray-200 mb-3 pl-4">
              "Excelente, [nome do cliente]! Conseguimos resolver [resumo do problema resolvido]. 
              Recapitulando o que fizemos hoje: [resumo das ações]. Os próximos passos são: 
              [próximas etapas, se houver]. Você receberá um e-mail de confirmação com todos 
              esses detalhes. Existe mais alguma coisa em que eu possa ajudá-lo(a) hoje?"
            </p>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Cliente:</p>
            <p className="text-gray-800 dark:text-gray-200 mb-3 pl-4 italic">
              "Não, está tudo resolvido. Obrigado."
            </p>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Atendente:</p>
            <p className="text-gray-800 dark:text-gray-200 pl-4">
              "Foi um prazer ajudá-lo(a) hoje. Em nome da [nome da empresa], agradeço pela 
              sua paciência e por nos dar a oportunidade de atendê-lo(a). Você receberá 
              uma pesquisa de satisfação que nos ajudará a melhorar ainda mais. Tenha um 
              excelente dia e não hesite em entrar em contato caso precise de algo mais!"
            </p>
          </div>
        </div>
      </div>
      
      <h3>Scripts Especializados</h3>
      
      <p className="mb-4">
        Além dos scripts conversacionais padrão, o pacote inclui roteiros especializados para:
      </p>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="font-bold mb-3 text-gray-900 dark:text-white">Scripts para Canais Específicos</h4>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
            <li>Chat ao vivo (adequando tom e abordagem)</li>
            <li>WhatsApp (utilizando recursos do aplicativo)</li>
            <li>E-mail (estrutura e formatação otimizadas)</li>
            <li>Telefone (técnicas de comunicação verbal)</li>
            <li>Redes sociais (tonalidade e considerações públicas)</li>
          </ul>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="font-bold mb-3 text-gray-900 dark:text-white">Scripts por Setor</h4>
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
            <li>E-commerce (compras, devoluções, rastreamento)</li>
            <li>SaaS (suporte técnico, onboarding, upgrades)</li>
            <li>Serviços financeiros (conformidade, segurança)</li>
            <li>Saúde (privacidade, agendamentos, seguros)</li>
            <li>Telecomunicações (problemas técnicos, faturamento)</li>
          </ul>
        </div>
      </div>
      
      <h3>Como Personalizar os Scripts</h3>
      
      <p className="mb-4">
        Todos os scripts são fornecidos em formatos editáveis para fácil adaptação à sua marca e contexto:
      </p>
      
      <ol className="list-decimal pl-5 text-gray-700 dark:text-gray-300 mb-8 space-y-2">
        <li>Faça o download do pacote completo de scripts</li>
        <li>Abra os arquivos em editores de texto padrão (incluímos versões .docx e .txt)</li>
        <li>Substitua os marcadores [nome da empresa] e outros com suas informações</li>
        <li>Ajuste a linguagem para refletir o tom da sua marca e público-alvo</li>
        <li>Adicione informações específicas do seu produto ou serviço</li>
        <li>Implemente gradualmente, treinando sua equipe para usar os scripts como guias</li>
        <li>Monitore resultados e refine com base no feedback de clientes e atendentes</li>
      </ol>
      
      <h3>Implementação e Treinamento</h3>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg mb-8">
        <h4 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">
          Melhores Práticas para Implementação
        </h4>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Para obter os melhores resultados com estes scripts:
        </p>
        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-4">
          <li>Envolva sua equipe no processo de personalização</li>
          <li>Explique o propósito de cada script e quando utilizá-lo</li>
          <li>Enfatize que os scripts são guias flexíveis, não roteiros rígidos</li>
          <li>Realize treinamentos com simulações e role-plays</li>
          <li>Inicie com scripts para situações mais comuns e depois expanda</li>
          <li>Incorpore os scripts na sua base de conhecimento</li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 italic">
          "Os melhores scripts são aqueles que seus clientes nunca percebem que está sendo usado. 
          Eles devem sentir apenas que estão tendo uma conversa profissional, empática e eficiente."
        </p>
      </div>
      
      <h3>Conteúdo do Pacote</h3>
      
      <p className="mb-4">
        Ao fazer o download do pacote completo, você receberá:
      </p>
      
      <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-8">
        <li>50+ scripts completos para diferentes cenários de atendimento</li>
        <li>Guia de implementação e personalização</li>
        <li>Material de treinamento para sua equipe</li>
        <li>Planilha de métricas para avaliar o impacto dos scripts</li>
        <li>Biblioteca de frases e respostas para situações específicas</li>
        <li>Cartões de referência rápida para atendentes</li>
      </ul>
      
      <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg mb-8">
        <h4 className="text-lg font-bold mb-2 text-green-700 dark:text-green-300">
          Acesso ao Pacote Completo
        </h4>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Transforme o atendimento da sua equipe com scripts profissionais que aumentam 
          a eficiência e satisfação dos clientes:
        </p>
        <div className="flex">
          <a 
            href="/downloads/customer-service-scripts.zip" 
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-300"
            download
          >
            Baixar Scripts Completos (ZIP, 4.7 MB)
          </a>
        </div>
      </div>
    </ResourceLayout>
  );
} 