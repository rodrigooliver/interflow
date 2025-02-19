import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HardDrive, Users, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { useOrganization } from '../../hooks/useOrganization';
import { supabase } from '../../lib/supabase';

interface UsageStats {
  storage: {
    used: number;
    limit: number;
  };
  users: {
    active: number;
    limit: number;
  };
  chats: {
    active: number;
    limit: number;
  };
}

export function UsageSettings() {
  const { t } = useTranslation(['settings', 'common']);
  const { currentOrganization, subscription } = useOrganization();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentOrganization) {
      loadUsageStats();
    }
  }, [currentOrganization]);

  async function loadUsageStats() {
    try {
      // Load storage usage
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('storage_used, storage_limit')
        .eq('id', currentOrganization?.id)
        .single();

      if (orgError) throw orgError;

      // Load active users count
      const { count: activeUsers, error: usersError } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization?.id);

      if (usersError) throw usersError;

      // Load active chats count
      const { count: activeChats, error: chatsError } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization?.id)
        .eq('status', 'in_progress');

      if (chatsError) throw chatsError;

      setStats({
        storage: {
          used: orgData.storage_used,
          limit: orgData.storage_limit
        },
        users: {
          active: activeUsers || 0,
          limit: subscription?.plan?.max_users || 0
        },
        chats: {
          active: activeChats || 0,
          limit: subscription?.plan?.features?.max_concurrent_chats || 0
        }
      });
    } catch (error) {
      console.error('Error loading usage stats:', error);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        {error || t('settings:usage.noData')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Usage */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <HardDrive className="w-6 h-6 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('settings:usage.storage')}
            </h2>
          </div>
          {getUsagePercentage(stats.storage.used, stats.storage.limit) >= 90 && (
            <div className="flex items-center text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span className="text-sm">{t('settings:usage.almostFull')}</span>
            </div>
          )}
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>{formatStorageSize(stats.storage.used)} used</span>
            <span>{formatStorageSize(stats.storage.limit)} total</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-${getUsageColor(
                getUsagePercentage(stats.storage.used, stats.storage.limit)
              )}-500 transition-all duration-300`}
              style={{
                width: `${getUsagePercentage(stats.storage.used, stats.storage.limit)}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Users Usage */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('settings:usage.users')}
            </h2>
          </div>
          {getUsagePercentage(stats.users.active, stats.users.limit) >= 90 && (
            <div className="flex items-center text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span className="text-sm">{t('settings:usage.limitReached')}</span>
            </div>
          )}
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>{stats.users.active} active users</span>
            <span>{stats.users.limit} total</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-${getUsageColor(
                getUsagePercentage(stats.users.active, stats.users.limit)
              )}-500 transition-all duration-300`}
              style={{
                width: `${getUsagePercentage(stats.users.active, stats.users.limit)}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Active Chats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MessageSquare className="w-6 h-6 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('settings:usage.activeChats')}
            </h2>
          </div>
          {getUsagePercentage(stats.chats.active, stats.chats.limit) >= 90 && (
            <div className="flex items-center text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span className="text-sm">{t('settings:usage.limitReached')}</span>
            </div>
          )}
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>{stats.chats.active} active chats</span>
            <span>{stats.chats.limit} maximum</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-${getUsageColor(
                getUsagePercentage(stats.chats.active, stats.chats.limit)
              )}-500 transition-all duration-300`}
              style={{
                width: `${getUsagePercentage(stats.chats.active, stats.chats.limit)}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}