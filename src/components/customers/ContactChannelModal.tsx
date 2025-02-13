import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../../hooks/useOrganization';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { ChatChannel, ServiceTeam } from '../../types/database';

interface ContactChannelModalProps {
  onClose: () => void;
  contactType: 'email' | 'whatsapp';
  contactValue: string;
}

export function ContactChannelModal({ onClose, contactType, contactValue }: ContactChannelModalProps) {
  const { t } = useTranslation(['channels', 'common']);
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { session } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [userTeams, setUserTeams] = useState<ServiceTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (currentOrganization && session?.user) {
      Promise.all([
        loadChannels(),
        loadUserTeams()
      ]);
    }
  }, [currentOrganization, session?.user]);

  async function loadChannels() {
    try {
      let query = supabase
        .from('chat_channels')
        .select('*')
        .eq('organization_id', currentOrganization?.id)
        .eq('status', 'active');

      // For WhatsApp, include both official and unofficial channels
      if (contactType === 'whatsapp') {
        query = query.in('type', ['whatsapp_official', 'whatsapp_unofficial']);
      } else {
        query = query.eq('type', 'email');
      }

      const { data, error } = await query;

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error loading channels:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  async function loadUserTeams() {
    try {
      const { data: teamMembers, error: membersError } = await supabase
        .from('service_team_members')
        .select('team:service_teams(*)')
        .eq('user_id', session?.user?.id);

      if (membersError) throw membersError;

      // Extract teams from the response and remove nulls
      const teams = teamMembers
        ?.map(tm => tm.team)
        .filter((team): team is ServiceTeam => team !== null) || [];

      setUserTeams(teams);
    } catch (error) {
      console.error('Error loading user teams:', error);
    }
  }

  const handleSelectChannel = async (channel: ChatChannel) => {
    if (!currentOrganization || !session?.user) return;
    
    setStartingChat(true);
    try {
      // First, find the customer by contact
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq(contactType, contactValue)
        .limit(1);

      if (customerError) throw customerError;

      let customerId: string;

      if (!customers || customers.length === 0) {
        // Create new customer if not found
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert([{
            organization_id: currentOrganization.id,
            name: contactValue, // Use contact as temporary name
            [contactType]: contactValue
          }])
          .select()
          .single();

        if (createError) throw createError;
        customerId = newCustomer.id;
      } else {
        customerId = customers[0].id;
      }

      // Find existing chat
      const { data: existingChats, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('channel_id', channel.id)
        .eq('status', 'open')
        .eq(contactType, contactValue);

      if (chatsError) throw chatsError;

      let chatId;

      if (existingChats && existingChats.length > 0) {
        // Use existing chat
        chatId = existingChats[0].id;

        // Update assigned agent if not set
        if (!existingChats[0].assigned_to) {
          await supabase
            .from('chats')
            .update({ assigned_to: session.user.id })
            .eq('id', chatId);
        }
      } else {
        // Get user's team (use first team if user belongs to multiple)
        const teamId = userTeams.length > 0 ? userTeams[0].id : null;

        // Create new chat
        const { data: newChat, error: createError } = await supabase
          .from('chats')
          .insert([{
            organization_id: currentOrganization.id,
            channel_id: channel.id,
            customer_id: customerId,
            channel: contactType === 'email' ? 'email' : 'whatsapp',
            status: 'open',
            assigned_to: session.user.id,
            team_id: teamId,
            whatsapp: contactType === 'whatsapp' ? contactValue : null,
            email: contactType === 'email' ? contactValue : null,
            arrival_time: new Date().toISOString(),
            start_time: new Date().toISOString()
          }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating chat:', createError);
          throw createError;
        }
        
        if (!newChat) {
          throw new Error('Failed to create chat');
        }
        
        chatId = newChat.id;
      }

      // Navigate to chat
      navigate(`/chats/${chatId}`);
      onClose();
    } catch (error) {
      console.error('Error starting chat:', error);
      setError(t('common:error'));
    } finally {
      setStartingChat(false);
    }
  };

  const getChannelTypeLabel = (type: string) => {
    switch (type) {
      case 'whatsapp_official':
        return t('channels:types.whatsapp_official');
      case 'whatsapp_unofficial':
        return t('channels:types.whatsapp_unofficial');
      case 'email':
        return t('channels:types.email');
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Selecionar Canal
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="text-red-600 dark:text-red-400">{error}</div>
          ) : loading || startingChat ? (
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              Nenhum canal {contactType === 'email' ? 'de email' : 'do WhatsApp'} ativo encontrado
            </div>
          ) : (
            <div className="space-y-2">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleSelectChannel(channel)}
                  disabled={startingChat}
                  className="w-full flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {channel.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getChannelTypeLabel(channel.type)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}