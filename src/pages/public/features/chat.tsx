import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../../../layouts/PublicLayout';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  imageUrl?: string;
  benefits: string[];
}

interface SectionData {
  title: string;
  description?: string;
  features: Feature[];
}

export default function ChatFeatures() {
  const { t } = useTranslation('features');

  // Obter a seção de comunicação do JSON de features mas focar no chat
  const section = t('sections.communication', { returnObjects: true }) as SectionData;
  
  // Filtrar apenas o recurso de chat para destacar
  const chatFeature = section.features.find(feature => 
    feature.title.toLowerCase().includes('chat') || 
    feature.description.toLowerCase().includes('chat')
  ) || section.features[2]; // Se não encontrar, usar o terceiro recurso que deve ser sobre chat
  
  const renderFeature = (feature: Feature, index: number) => {
    const isEven = index % 2 === 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-16">
        {/* Imagem (alterna posição em dispositivos grandes) */}
        <div className={`${isEven ? 'md:order-1' : 'md:order-2'}`}>
          {feature.imageUrl ? (
            <img 
              src={feature.imageUrl} 
              alt={feature.title}
              className="rounded-lg shadow-lg w-full object-cover" 
            />
          ) : (
            <div className="bg-blue-300 dark:bg-slate-950 rounded-lg h-64 w-full flex items-center justify-center">
              <span className="text-blue-900 dark:text-blue-100 text-lg font-medium">
                {feature.title}
              </span>
            </div>
          )}
        </div>
        
        {/* Conteúdo */}
        <div className={`${isEven ? 'md:order-2' : 'md:order-1'}`}>
          <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            {feature.title}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            {feature.description}
          </p>
          
          <ul className="space-y-3">
            {feature.benefits.map((benefit: string, idx: number) => (
              <li key={idx} className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <PublicLayout>
      <div className="pt-4 pb-8">
        <main>
          {/* Hero section */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                  Chat e Atendimento em Tempo Real
                </h1>
                <p className="text-xl md:text-2xl text-blue-50 mb-8">
                  Ofereça suporte instantâneo aos seus clientes com nossas soluções de chat
                </p>
                <Link 
                  to="/signup" 
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-950 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-800"
                >
                  {t('startFree')}
                  <ArrowRight className="ml-2 -mr-1 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Features content */}
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-6xl mx-auto">
              <div className="mb-20">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                    Recursos de Chat
                  </h2>
                  <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
                    Conecte-se com seus clientes onde quer que eles estejam com nossas ferramentas de atendimento em tempo real
                  </p>
                </div>
                
                {/* Destaque do feature de chat */}
                {renderFeature(chatFeature, 0)}
                
                {/* Informações adicionais sobre o chat */}
                <div className="mt-16 bg-gray-50 dark:bg-gray-800 rounded-xl p-8">
                  <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                    Por que escolher o chat Interflow?
                  </h3>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
                      <h4 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">
                        Aumente a Satisfação
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        Resolva dúvidas e problemas instantaneamente, aumentando a satisfação do cliente em até 35%.
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
                      <h4 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">
                        Reduza Custos
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        Atenda múltiplos clientes simultaneamente, reduzindo custos operacionais de atendimento.
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
                      <h4 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">
                        Conversão em Tempo Real
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        Capture leads em momentos críticos de decisão, aumentando suas taxas de conversão.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Outros recursos relacionados */}
              <div className="mt-20">
                <h2 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white text-center">
                  Funcionalidades relacionadas
                </h2>
                
                <div className="grid md:grid-cols-2 gap-8">
                  {section.features.filter(f => f.title !== chatFeature.title).slice(0, 2).map((feature, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                      <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                        {feature.title}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-4">
                        {feature.description}
                      </p>
                      <ul className="space-y-2">
                        {feature.benefits.slice(0, 3).map((benefit, i) => (
                          <li key={i} className="flex items-start">
                            <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gray-100 dark:bg-gray-800 py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
                  {t('ctaTitle')}
                </h2>
                <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
                  {t('ctaDescription')}
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link 
                    to="/signup" 
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-900 hover:bg-blue-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-800"
                  >
                    {t('ctaButton')}
                  </Link>
                  <Link 
                    to="/contact" 
                    className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {t('contactSales')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PublicLayout>
  );
} 