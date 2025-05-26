import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionExpiredScreenProps {
  isTrialExpired: boolean;
  daysExpired: number;
}

export const SubscriptionExpiredScreen: React.FC<SubscriptionExpiredScreenProps> = ({ 
  isTrialExpired, 
  daysExpired 
}) => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const handleGoToBilling = () => {
    navigate('/app/settings/billing');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 subscription-expired-screen">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
          {isTrialExpired ? t('trialExpired') : t('subscriptionExpiredTitle')}
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          {isTrialExpired 
            ? t('trialExpiredMessage', { days: daysExpired })
            : t('subscriptionExpired', { days: daysExpired })
          }
          {' '}
          {t('subscriptionExpiredContinue')}
        </p>
        
        <button
          onClick={handleGoToBilling}
          className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <CreditCard className="w-5 h-5 mr-2" />
          {t('updateSubscription')}
        </button>
      </div>
    </div>
  );
}; 