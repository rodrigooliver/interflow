import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HardDrive, Users, MessageSquare, GitBranch, Users2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { StorageDetailsModal } from './StorageDetailsModal';

interface UsageStats {
  storage: {
    used: number;
    limit: number;
  };
  users: {
    active: number;
    limit: number;
  };
  channels: {
    active: number;
    limit: number;
  };
  flows: {
    active: number;
    limit: number;
  };
  teams: {
    active: number;
    limit: number;
  };
  customers: {
    active: number;
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

      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1);


      if (subscriptionError) throw subscriptionError;

      const subscription = subscriptionData[0];

      // Load storage usage
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('storage_used, storage_limit')
        .eq('id', currentOrganizationMember?.organization.id)
        .single();

      if (orgError) throw orgError;

      // Load active users count
      const { count: activeUsers, error: usersError } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationMember?.organization.id);

      if (usersError) throw usersError;

      // Load active channels count
      const { count: activeChannels, error: channelsError } = await supabase
        .from('chat_channels')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .eq('status', 'active');

      if (channelsError) throw channelsError;

      // Load active flows count
      const { count: activeFlows, error: flowsError } = await supabase
        .from('flows')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .eq('is_active', true);

      if (flowsError) throw flowsError;

      // Load active teams count
      const { count: activeTeams, error: teamsError } = await supabase
        .from('service_teams')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationMember?.organization.id);

      if (teamsError) throw teamsError;

      // Load active customers count
      const { count: activeCustomers, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationMember?.organization.id);

      if (customersError) throw customersError;

      console.log(subscription);

      setStats({
        storage: {
          used: orgData.storage_used || 0,
          limit: subscription?.subscription_plans?.storage_limit || 0
        },
        users: {
          active: activeUsers || 0,
          limit: subscription?.subscription_plans?.max_users || 0
        },
        channels: {
          active: activeChannels || 0,
          limit: subscription?.subscription_plans?.max_channels || 0
        },
        flows: {
          active: activeFlows || 0,
          limit: subscription?.subscription_plans?.max_flows || 0
        },
        teams: {
          active: activeTeams || 0,
          limit: subscription?.subscription_plans?.max_teams || 0
        },
        customers: {
          active: activeCustomers || 0,
          limit: subscription?.subscription_plans?.max_customers || 0
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
      used: stats.users.active,
      limit: stats.users.limit,
      percentage: getUsagePercentage(stats.users.active, stats.users.limit)
    },
    {
      icon: MessageSquare,
      title: t('settings:billing.maxChannels'),
      used: stats.channels.active,
      limit: stats.channels.limit,
      percentage: getUsagePercentage(stats.channels.active, stats.channels.limit)
    },
    {
      icon: GitBranch,
      title: t('settings:billing.maxFlows'),
      used: stats.flows.active,
      limit: stats.flows.limit,
      percentage: getUsagePercentage(stats.flows.active, stats.flows.limit)
    },
    {
      icon: Users2,
      title: t('settings:billing.maxTeams'),
      used: stats.teams.active,
      limit: stats.teams.limit,
      percentage: getUsagePercentage(stats.teams.active, stats.teams.limit)
    },
    {
      icon: Users,
      title: t('settings:billing.maxCustomers'),
      used: stats.customers.active,
      limit: stats.customers.limit,
      percentage: getUsagePercentage(stats.customers.active, stats.customers.limit)
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
      {currentOrganizationMember && (
        <StorageDetailsModal
          isOpen={isStorageModalOpen}
          onClose={() => setIsStorageModalOpen(false)}
          organizationId={currentOrganizationMember.organization.id}
        />
      )}
    </div>
  );
}