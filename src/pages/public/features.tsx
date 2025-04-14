import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  imageUrl?: string;
  benefits: string[];
}

interface FeaturesSection {
  title: string;
  description?: string;
  features: Feature[];
}

export default function Features() {
  const { t } = useTranslation('features');

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
            {feature.benefits.map((benefit, idx) => (
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

  const renderSection = (section: FeaturesSection) => {
    return (
      <div className="mb-20">
        <h2 className="text-3xl font-bold mb-3 text-gray-900 dark:text-white">
          {section.title}
        </h2>
        {section.description && (
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-12 max-w-3xl">
            {section.description}
          </p>
        )}
        <div>
          {section.features.map((feature, index) => (
            <div key={index}>
              {renderFeature(feature, index)}
            </div>
          ))}
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
                  {t('heroTitle')}
                </h1>
                <p className="text-xl md:text-2xl text-blue-50 mb-8">
                  {t('heroSubtitle')}
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
              {Object.entries(t('sections', { returnObjects: true })).map(([key, section]) => (
                <div key={key}>
                  {renderSection(section as FeaturesSection)}
                </div>
              ))}
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