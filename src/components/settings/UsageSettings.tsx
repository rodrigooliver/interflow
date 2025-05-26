import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HardDrive, Users, MessageSquare, GitBranch, Users2, AlertTriangle, Loader2, Zap } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { StorageDetailsModal } from './StorageDetailsModal';

interface UsageStats {
  storage: {
    used: number;
    limit: number;
  };
  users: {
    used: number;
    limit: number;
  };
  channels: {
    used: number;
    limit: number;
  };
  flows: {
    used: number;
    limit: number;
  };
  teams: {
    used: number;
    limit: number;
  };
  customers: {
    used: number;
    limit: number;
  };
  tokens: {
    used: number;
    limit: number;
  };
}

export function UsageSettings() {
  const { t } = useTranslation(['settings', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);

  useEffect(() => {
    if (currentOrganizationMember) {
      loadUsageStats();
    }
  }, [currentOrganizationMember]);

  async function loadUsageStats() {
    try {
      // Load organization data with usage information
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('usage')
        .eq('id', currentOrganizationMember?.organization.id)
        .single();

      if (orgError) throw orgError;

      const usage = orgData?.usage || {};

      setStats({
        storage: {
          used: usage.storage?.used || 0,
          limit: usage.storage?.limit || 0
        },
        users: {
          used: usage.users?.used || 0,
          limit: usage.users?.limit || 0
        },
        channels: {
          used: usage.channels?.used || 0,
          limit: usage.channels?.limit || 0
        },
        flows: {
          used: usage.flows?.used || 0,
          limit: usage.flows?.limit || 0
        },
        teams: {
          used: usage.teams?.used || 0,
          limit: usage.teams?.limit || 0
        },
        customers: {
          used: usage.customers?.used || 0,
          limit: usage.customers?.limit || 0
        },
        tokens: {
          used: usage.tokens?.used || 0,
          limit: usage.tokens?.limit || 0
        }
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas de uso:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  const formatStorageSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'red';
    if (percentage >= 75) return 'yellow';
    return 'blue';
  };

  const handleStorageCardClick = () => {
    setIsStorageModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600" />
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {t('common:loading')}
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 py-6">
        {error || t('settings:usage.noData')}
      </div>
    );
  }

  const usageItems = [
    {
      icon: HardDrive,
      title: t('settings:billing.storage'),
      used: formatStorageSize(stats.storage.used),
      limit: formatStorageSize(stats.storage.limit),
      percentage: getUsagePercentage(stats.storage.used, stats.storage.limit),
      onClick: handleStorageCardClick
    },
    {
      icon: Users,
      title: t('settings:billing.maxUsers'),
      used: stats.users.used,
      limit: stats.users.limit,
      percentage: getUsagePercentage(stats.users.used, stats.users.limit)
    },
    {
      icon: MessageSquare,
      title: t('settings:billing.maxChannels'),
      used: stats.channels.used,
      limit: stats.channels.limit,
      percentage: getUsagePercentage(stats.channels.used, stats.channels.limit)
    },
    {
      icon: GitBranch,
      title: t('settings:billing.maxFlows'),
      used: stats.flows.used,
      limit: stats.flows.limit,
      percentage: getUsagePercentage(stats.flows.used, stats.flows.limit)
    },
    {
      icon: Users2,
      title: t('settings:billing.maxTeams'),
      used: stats.teams.used,
      limit: stats.teams.limit,
      percentage: getUsagePercentage(stats.teams.used, stats.teams.limit)
    },
    {
      icon: Users,
      title: t('settings:billing.maxCustomers'),
      used: stats.customers.used,
      limit: stats.customers.limit,
      percentage: getUsagePercentage(stats.customers.used, stats.customers.limit)
    },
    {
      icon: Zap,
      title: 'Tokens',
      used: `${((stats.tokens.used || 0) / 1000000).toFixed(1)}M`,
      limit: `${((stats.tokens.limit || 0) / 1000000).toFixed(1)}M`,
      percentage: getUsagePercentage(stats.tokens.used, stats.tokens.limit)
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {usageItems.map((item, index) => {
          const Icon = item.icon;
          const usageColor = getUsageColor(item.percentage);
          
          return (
            <div 
              key={index} 
              className={`bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4 md:p-6 border border-gray-200 dark:border-gray-700 ${item.onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750' : ''}`}
              onClick={item.onClick}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-gray-400" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                    {item.title}
                  </h3>
                  <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {item.used} / {item.limit}
                  </div>
                </div>
              </div>
              <div className="mt-2 sm:mt-3 md:mt-4">
                <div className="relative pt-1">
                  <div className="overflow-hidden h-1.5 sm:h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                    <div
                      style={{ width: `${item.percentage}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        usageColor === 'red'
                          ? 'bg-red-500'
                          : usageColor === 'yellow'
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                    />
                  </div>
                </div>
                {item.percentage >= 90 && (
                  <div className="mt-1.5 sm:mt-2 flex items-center text-xs sm:text-sm text-red-600">
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {t('settings:usage.limitWarning')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de detalhes de armazenamento */}
      {currentOrganizationMember?.organization?.id && (
        <StorageDetailsModal
          isOpen={isStorageModalOpen}
          onClose={() => setIsStorageModalOpen(false)}
          organizationId={currentOrganizationMember.organization.id}
        />
      )}
    </div>
  );
}