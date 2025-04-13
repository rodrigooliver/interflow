import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Pricing } from '../../components/landing/Pricing';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
}

interface SupportChannel {
  title: string;
  description: string;
}

export default function PricingPage() {
  const { t } = useTranslation('pricing');

  return (
    <PublicLayout>
      <div className="pt-4 pb-8">
        <main>
          {/* Hero section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                  {t('heroTitle')}
                </h1>
                <p className="text-xl md:text-2xl text-blue-100 mb-8">
                  {t('heroSubtitle')}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Component */}
          <Pricing />

          {/* Pricing FAQs */}
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white">
                {t('faqTitle')}
              </h2>
              
              <div className="space-y-6">
                {Object.entries(t('faqs', { returnObjects: true })).map(([key, faq]: [string, FAQ]) => (
                  <div key={key} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                      {faq.question}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Support */}
          <div className="bg-gray-100 dark:bg-gray-800 py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
                  {t('supportTitle')}
                </h2>
                <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
                  {t('supportDescription')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
                  {Object.entries(t('supportChannels', { returnObjects: true })).map(([key, channel]: [string, SupportChannel]) => (
                    <div key={key} className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md">
                      <div className="flex items-center justify-center mb-4">
                        <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <CheckCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white text-center">
                        {channel.title}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 text-center">
                        {channel.description}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-12">
                  <Link
                    to="/contact"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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