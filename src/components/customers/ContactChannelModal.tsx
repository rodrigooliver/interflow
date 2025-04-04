import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ChatChannel, Customer } from '../../types/database';
import { useAuthContext } from '../../contexts/AuthContext';
import { getChannelIcon } from '../../utils/channel';

interface ServiceTeam {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface ContactChannelModalProps {
  contactType: 'email' | 'whatsapp' | 'phone' | 'instagram' | 'facebook' | 'telegram';
  contactValue: string;
  customer?: Customer;
  onClose: () => void;
}

export function ContactChannelModal({ contactType, contactValue, customer, onClose }: ContactChannelModalProps) {
  const { t } = useTranslation(['channels', 'common']);
  const navigate = useNavigate();
  const { session, currentOrganizationMember } = useAuthContext();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [userTeams, setUserTeams] = useState<ServiceTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (currentOrganizationMember && session?.user) {
      loadChannels();
      loadUserTeams();
    }
  }, [currentOrganizationMember, session?.user]);

  async function loadChannels() {
    try {
      let query = supabase
        .from('chat_channels')
        .select('*')
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .eq('status', 'active');

      // Filtrar canais baseado no tipo de contato
      switch (contactType) {
        case 'whatsapp':
          query = query.in('type', ['whatsapp_official', 'whatsapp_wapi', 'whatsapp_zapi', 'whatsapp_evo']);
          break;
        case 'email':
          query = query.eq('type', 'email');
          break;
        case 'instagram':
          query = query.eq('type', 'instagram');
          break;
        case 'facebook':
          query = query.eq('type', 'facebook');
          break;
        case 'telegram':
          query = query.eq('type', 'telegram');
          break;
        case 'phone':
          // Para contatos do tipo telefone, mostrar canais de WhatsApp
          query = query.in('type', ['whatsapp_official', 'whatsapp_wapi', 'whatsapp_zapi', 'whatsapp_evo']);
          break;
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
        .select('team:service_teams(id, organization_id, name, created_at, updated_at)')
        .eq('user_id', session?.user?.id);

      if (membersError) throw membersError;

      // Extract teams from the response and remove nulls
      const teams: ServiceTeam[] = [];
      
      if (teamMembers) {
        // Desabilitar temporariamente a regra de lint para any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (teamMembers as any[]).forEach(member => {
          if (member.team) {
            teams.push({
              id: member.team.id,
              organization_id: member.team.organization_id,
              name: member.team.name,
              created_at: member.team.created_at,
              updated_at: member.team.updated_at
            });
          }
        });
      }

      setUserTeams(teams);
    } catch (error) {
      console.error('Error loading user teams:', error);
    }
  }

  const handleSelectChannel = async (channel: ChatChannel) => {
    if (!currentOrganizationMember || !session?.user) return;
    
    setStartingChat(true);
    try {
      // Formatar o valor do contato baseado no tipo de canal
      let formattedValue = contactValue;
      let alternativeFormattedValue = null;
      
      if (contactType === 'whatsapp' || contactType === 'phone') {
        // Remover caracteres não numéricos
        const cleanNumber = contactValue.replace(/\D/g, '');
        
        // Para números brasileiros, criar versão alternativa com/sem 9 adicional
        if (cleanNumber.startsWith('55') && cleanNumber.length >= 12) {
          const ddd = cleanNumber.substring(2, 4);
          const rest = cleanNumber.substring(4);
          
          // Se o número tem 9 na frente (após DDD)
          if (rest.startsWith('9') && rest.length > 8) {
            // Alternativa sem o 9
            alternativeFormattedValue = `55${ddd}${rest.substring(1)}`;
          } else if (rest.length === 8) {
            // Alternativa com o 9 adicionado
            alternativeFormattedValue = `55${ddd}9${rest}`;
          }
        }
        
        // Formatar para o canal específico
        if (channel.type === 'whatsapp_evo') {
          formattedValue = `${cleanNumber}@s.whatsapp.net`;
          if (alternativeFormattedValue) {
            alternativeFormattedValue = `${alternativeFormattedValue}@s.whatsapp.net`;
          }
        } else if (channel.type === 'whatsapp_official' || channel.type === 'whatsapp_wapi' || channel.type === 'whatsapp_zapi') {
          formattedValue = cleanNumber;
        }
      }

      let customerId: string;

      if (customer) {
        // Se o cliente já foi fornecido, use o ID diretamente
        customerId = customer.id;
      } else {
        // Caso contrário, busque o cliente pelo contato
        const { data: contacts, error: contactsError } = await supabase
          .from('customer_contacts')
          .select('customer_id')
          .eq('type', contactType)
          .eq('value', contactValue)
          .limit(1);

        if (contactsError) throw contactsError;

        if (contacts && contacts.length > 0) {
          customerId = contacts[0].customer_id;
        } else {
          // Se não encontrar o cliente, crie um novo
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert([{
              organization_id: currentOrganizationMember.organization.id,
              name: contactValue // Use o valor do contato como nome temporário
            }])
            .select()
            .single();

          if (createError) throw createError;
          
          customerId = newCustomer.id;
          
          // Adicionar o contato ao novo cliente
          const { error: addContactError } = await supabase
            .from('customer_contacts')
            .insert([{
              customer_id: customerId,
              type: contactType,
              value: contactValue,
              label: contactType === 'email' ? 'Email principal' : 'WhatsApp principal'
            }]);
            
          if (addContactError) throw addContactError;
        }
      }

      // Verificar se já existe um chat ativo (em progresso ou pendente)
      const { data: activeChats, error: activeChatsError } = await supabase
        .from('chats')
        .select('*')
        .eq('organization_id', currentOrganizationMember.organization.id)
        .eq('channel_id', channel.id)
        .eq('customer_id', customerId)
        .in('status', ['in_progress', 'pending']);

      if (activeChatsError) throw activeChatsError;

      let chatId;
      let existingExternalId = null;

      if (activeChats && activeChats.length > 0) {
        // Use o chat ativo existente
        chatId = activeChats[0].id;

        // Atualizar o agente designado se não estiver definido
        if (!activeChats[0].assigned_to) {
          await supabase
            .from('chats')
            .update({ 
              assigned_to: session.user.id, 
              status: 'in_progress', 
              start_time: new Date().toISOString() 
            })
            .eq('id', chatId);
        }
      } else {
        // Procurar em chats fechados para obter o external_id
        const { data: closedChats, error: closedChatsError } = await supabase
          .from('chats')
          .select('*')
          .eq('organization_id', currentOrganizationMember.organization.id)
          .eq('channel_id', channel.id)
          .eq('customer_id', customerId)
          .eq('status', 'closed')
          .order('last_message_at', { ascending: false })
          .limit(1);

        if (closedChatsError) throw closedChatsError;

        // Se não encontrou chat com o número principal, tentar com o número alternativo
        if ((!closedChats || closedChats.length === 0) && alternativeFormattedValue) {
          // Buscar por external_id com número alternativo
          const { data: altChats, error: altChatsError } = await supabase
            .from('chats')
            .select('*')
            .eq('organization_id', currentOrganizationMember.organization.id)
            .eq('channel_id', channel.id)
            .eq('external_id', alternativeFormattedValue)
            .order('last_message_at', { ascending: false })
            .limit(1);
            
          if (altChatsError) throw altChatsError;
          
          if (altChats && altChats.length > 0) {
            existingExternalId = altChats[0].external_id;
          }
        } else if (closedChats && closedChats.length > 0) {
          existingExternalId = closedChats[0].external_id;
        }

        // Obter a equipe do usuário (usar a primeira equipe se pertencer a várias)
        const teamId = userTeams.length > 0 ? userTeams[0].id : null;

        // Para canais de WhatsApp e novo chat, usar a versão sem o 9 adicional se for BR
        if ((contactType === 'whatsapp' || contactType === 'phone') && 
            formattedValue.startsWith('55') && 
            !existingExternalId) {
          const cleanNumber = formattedValue.replace(/\D/g, '');
          if (cleanNumber.length >= 12) {
            const ddd = cleanNumber.substring(2, 4);
            const rest = cleanNumber.substring(4);
            
            if (rest.startsWith('9') && rest.length > 8) {
              // Remover o 9 para iniciar o chat
              const withoutNine = `55${ddd}${rest.substring(1)}`;
              if (channel.type === 'whatsapp_evo') {
                formattedValue = `${withoutNine}@s.whatsapp.net`;
              } else {
                formattedValue = withoutNine;
              }
            }
          }
        }

        // Criar um novo chat, usando o external_id existente se disponível
        const { data: newChat, error: createError } = await supabase
          .from('chats')
          .insert([{
            organization_id: currentOrganizationMember.organization.id,
            channel_id: channel.id,
            customer_id: customerId,
            external_id: existingExternalId || formattedValue,
            status: 'in_progress',
            assigned_to: session.user.id,
            team_id: teamId,
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

      // Navegar para o chat
      navigate(`/app/chats/${chatId}`);
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
      case 'whatsapp_wapi':
        return t('channels:types.whatsapp_wapi');
      case 'whatsapp_zapi':
        return t('channels:types.whatsapp_zapi');
      case 'whatsapp_evo':
        return t('channels:types.whatsapp_evo');
      case 'instagram':
        return t('channels:types.instagram');
      case 'facebook':
        return t('channels:types.facebook');
      case 'email':
        return t('channels:types.email');
      case 'telegram':
        return t('channels:types.telegram');
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {customer 
              ? t('channels:selectChannelForCustomer', { name: customer.name }) 
              : t('channels:selectChannel')}
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
              {contactType === 'email' 
                ? t('channels:noEmailChannels') 
                : contactType === 'whatsapp' || contactType === 'phone'
                ? t('channels:noWhatsAppChannels')
                : t('channels:noChannelsForType', { type: contactType })}
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
                  <img 
                    src={getChannelIcon(channel.type)} 
                    alt={getChannelTypeLabel(channel.type)}
                    className="w-6 h-6 mr-3"
                  />
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