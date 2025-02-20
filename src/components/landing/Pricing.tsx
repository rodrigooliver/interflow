import { useTranslation } from 'react-i18next';

export const Pricing = () => {
  const { t } = useTranslation('landing');

  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            {t('pricing.title')}
          </h2>
          {/* Pricing cards aqui */}
        </div>
      </div>
    </div>
  );
}; 