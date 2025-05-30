import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

const FinancialCashierOperations: React.FC = () => {
  const { t } = useTranslation('financial');
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{t('cashierOperations')}</h1>
      <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
        <p className="text-center text-gray-500 dark:text-gray-400">
          {t('futureImplementation')}
        </p>
        <p className="text-center text-gray-400 dark:text-gray-500 mt-2">
          Cashier ID: {id}
        </p>
      </div>
    </div>
  );
};

export default FinancialCashierOperations; 