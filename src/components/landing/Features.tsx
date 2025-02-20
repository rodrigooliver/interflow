import { useTranslation } from 'react-i18next';

export const Features = () => {
  const { t } = useTranslation('landing');

  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            {t('features.title')}
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-3">
            {/* Feature cards aqui */}
          </div>
        </div>
      </div>
    </div>
  );
}; 