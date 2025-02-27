import { useTranslation } from 'react-i18next';
import { MessageSquare, Instagram, Phone, Tag, BarChart3, Bot } from 'lucide-react';

export const Features = () => {
  const { t } = useTranslation('landing');

  const features = [
    {
      name: t('features.feature1.title'),
      description: t('features.feature1.description'),
      icon: MessageSquare
    },
    {
      name: t('features.feature2.title'),
      description: t('features.feature2.description'),
      icon: Instagram
    },
    {
      name: t('features.feature3.title'),
      description: t('features.feature3.description'),
      icon: Bot
    },
    {
      name: t('features.feature4.title'),
      description: t('features.feature4.description'),
      icon: Tag
    },
    {
      name: t('features.feature5.title'),
      description: t('features.feature5.description'),
      icon: Phone
    },
    {
      name: t('features.feature6.title'),
      description: t('features.feature6.description'),
      icon: BarChart3
    }
  ];

  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            {t('features.subtitle')}
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t('features.title')}
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            {t('features.description')}
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-start">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900 p-3 mb-5">
                <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-300" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {feature.name}
              </h3>
              <p className="mt-2 text-base text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 