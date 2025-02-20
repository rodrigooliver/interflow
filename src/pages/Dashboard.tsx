import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Users, MessageCircle } from 'lucide-react';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

interface StatCard {
  id: string;
  title: string;
  description: string;
  value: number;
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  textColor: string;
  link?: string;
}

export default function Dashboard() {
  const { t } = useTranslation('dashboard');
  const { currentOrganization } = useOrganization();
  const [customerCount, setCustomerCount] = useState(0);
  const [activeChatsCount, setActiveChatsCount] = useState(0);
  const [todayMessagesCount, setTodayMessagesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization) {
      loadStats();
      subscribeToUpdates();
    }
  }, [currentOrganization]);

  const subscribeToUpdates = () => {
    // Subscribe to chats changes
    const chatsSubscription = supabase
      .channel('chats-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chats',
        filter: `organization_id=eq.${currentOrganization?.id}`
      }, () => {
        loadActiveChatsCount();
      })
      .subscribe();

    // Subscribe to messages changes
    const messagesSubscription = supabase
      .channel('messages-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `organization_id=eq.${currentOrganization?.id}`
      }, () => {
        loadTodayMessagesCount();
      })
      .subscribe();

    return () => {
      chatsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  };

  async function loadStats() {
    try {
      await Promise.all([
        loadCustomerCount(),
        loadActiveChatsCount(),
        loadTodayMessagesCount()
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomerCount() {
    try {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization?.id);

      if (error) throw error;
      setCustomerCount(count || 0);
    } catch (error) {
      console.error('Error loading customer count:', error);
    }
  }

  async function loadActiveChatsCount() {
    try {
      const { count, error } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization?.id)
        .eq('status', 'in_progress');

      if (error) throw error;
      setActiveChatsCount(count || 0);
    } catch (error) {
      console.error('Error loading active chats count:', error);
    }
  }

  async function loadTodayMessagesCount() {
    try {
      // Get today's date at midnight in UTC
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization?.id)
        .gte('created_at', today.toISOString());

      if (error) throw error;
      setTodayMessagesCount(count || 0);
    } catch (error) {
      console.error('Error loading today\'s messages count:', error);
    }
  }

  const stats: StatCard[] = [
    {
      id: 'active-chats',
      title: t('activeChats'),
      description: t('activeChatsDescription'),
      value: activeChatsCount,
      icon: MessageSquare,
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-500 dark:text-blue-400',
      textColor: 'text-blue-600 dark:text-blue-400',
      link: '/app/chats'
    },
    {
      id: 'total-customers',
      title: t('totalCustomers'),
      description: t('totalCustomersDescription'),
      value: customerCount,
      icon: Users,
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-500 dark:text-green-400',
      textColor: 'text-green-600 dark:text-green-400',
      link: '/app/customers'
    },
    {
      id: 'today-messages',
      title: t('todayMessages'),
      description: t('todayMessagesDescription'),
      value: todayMessagesCount,
      icon: MessageCircle,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-500 dark:text-purple-400',
      textColor: 'text-purple-600 dark:text-purple-400'
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
        {t('title')}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map(({ id, title, description, value, icon: Icon, bgColor, iconColor, textColor, link }) => {
          const CardContent = (
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 transition-transform duration-200 hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {title}
                </h2>
                <div className={`p-3 rounded-full ${bgColor}`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
              </div>
              
              <div className="flex flex-col">
                <p className={`text-4xl font-bold ${textColor} ${loading ? 'animate-pulse' : ''}`}>
                  {loading ? '-' : value.toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              </div>

              <div className="mt-4 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded">
                <div 
                  className={`h-1 rounded ${iconColor.replace('text', 'bg')}`}
                  style={{ width: loading ? '0%' : '100%', transition: 'width 1s ease-in-out' }}
                />
              </div>
            </div>
          );

          return (
            <div key={id}>
              {link ? (
                <Link to={link} className="block">
                  {CardContent}
                </Link>
              ) : (
                CardContent
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}