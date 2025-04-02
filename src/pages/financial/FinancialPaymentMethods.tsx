import React from 'react';
import { useTranslation } from 'react-i18next';

const FinancialPaymentMethods: React.FC = () => {
  const { t } = useTranslation('financial');

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{t('financialPaymentMethods')}</h1>
      <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
        <p className="text-center text-gray-500 dark:text-gray-400">
          {t('futureImplementation')}
        </p>
      </div>
    </div>
  );
};

export default FinancialPaymentMethods; 