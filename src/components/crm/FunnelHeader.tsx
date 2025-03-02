import React, { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CustomerAddModal } from '../customers/CustomerAddModal';
import { CRMFunnel } from '../../types/crm';

interface FunnelHeaderProps {
  funnelName: string;
  funnel: CRMFunnel;
  onBack: () => void;
  onAddStage: () => void;
  onCustomerAdded?: () => void;
}

export function FunnelHeader({ funnelName, funnel, onBack, onAddStage, onCustomerAdded }: FunnelHeaderProps) {
  const { t } = useTranslation(['crm', 'common']);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  const handleCustomerAdded = () => {
    setShowAddCustomerModal(false);
    if (onCustomerAdded) {
      onCustomerAdded();
    }
  };

  return (
    <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-medium text-gray-900 dark:text-white">
            {funnelName}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('customers:addCustomer')}
          </button>
          <button
            onClick={onAddStage}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('crm:stages.addStage')}
          </button>
        </div>
      </div>

      {/* Customer Add Modal */}
      {showAddCustomerModal && (
        <CustomerAddModal
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={handleCustomerAdded}
          initialFunnelId={funnel.id}
        />
      )}
    </div>
  );
}