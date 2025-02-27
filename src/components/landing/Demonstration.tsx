import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export const Demonstration = () => {
  const { t } = useTranslation('landing');

  const features = [
    {
      id: 1,
      title: t('demonstration.feature1.title'),
      description: t('demonstration.feature1.description'),
      image: '/images/demo-flow.png'
    },
    {
      id: 2,
      title: t('demonstration.feature2.title'),
      description: t('demonstration.feature2.description'),
      image: '/images/demo-crm.png'
    },
    {
      id: 3,
      title: t('demonstration.feature3.title'),
      description: t('demonstration.feature3.description'),
      image: '/images/demo-audio.png'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-900 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t('demonstration.title')}
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            {t('demonstration.subtitle')}
          </p>
        </div>

        <div className="space-y-20">
          {features.map((feature, index) => (
            <div 
              key={feature.id}
              className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}
            >
              <div className="lg:w-1/2">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                  {feature.description}
                </p>
                <Link
                  to="/demo"
                  className="text-blue-600 dark:text-blue-400 font-medium flex items-center hover:underline"
                >
                  {t('demonstration.learnMore')} <span aria-hidden="true" className="ml-1">→</span>
                </Link>
              </div>
              <div className="lg:w-1/2">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 