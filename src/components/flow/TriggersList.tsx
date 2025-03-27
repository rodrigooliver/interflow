import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { Trigger } from '../../types/flow';
import { useChannels } from '../../hooks/useQueryes';
import { useAuthContext } from '../../contexts/AuthContext';
import { Tooltip } from '../ui/Tooltip';
import { Modal } from '../ui/Modal';
import { FlowTriggers } from './FlowTriggers';

interface TriggersListProps {
  triggers: Trigger[];
  flowId: string;
  showWarning?: boolean;
  onChange?: (triggers: Trigger[]) => void;
}

export const TriggersList: React.FC<TriggersListProps> = ({ 
  triggers, 
  flowId,
  showWarning = true,
  onChange
}) => {
  const { t } = useTranslation(['flows', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [showTriggersModal, setShowTriggersModal] = useState(false);

  // Buscar todos os canais
  const { data: channels } = useChannels(currentOrganizationMember?.organization.id);

  // Criar um mapa de ID para nome do canal
  const channelData = React.useMemo(() => {
    if (!channels) return {};
    return channels.reduce((acc, channel) => {
      acc[channel.id] = channel.name;
      return acc;
    }, {} as Record<string, string>);
  }, [channels]);

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'first_contact':
        return MessageSquare;
      case 'inactivity':
        return Clock;
      default:
        return null;
    }
  };

  const getTriggerLabel = (type: string) => {
    switch (type) {
      case 'first_contact':
        return t('flows:triggers.firstContact');
      case 'inactivity':
        return t('flows:triggers.inactivity');
      default:
        return type;
    }
  };

  const getTriggerConditions = (trigger: Trigger) => {
    const conditions = (trigger.conditions?.rules || []).map(rule => {
      let conditionText = '';
      
      if (rule.type === 'channel') {
        const channelParams = rule.params as { channels: string[] };
        const channelLabels = channelParams.channels?.map(id => channelData?.[id] || id) || [];
        conditionText = channelLabels.length > 0 
          ? `${t('flows:rules.channel')}: ${channelLabels.join(', ')}`
          : t('flows:rules.allChannels');
      } else if (rule.type === 'schedule') {
        const scheduleParams = rule.params as { timeSlots: Array<{ id: string; day: number; startTime: string; endTime: string }> };
        conditionText = scheduleParams.timeSlots?.length > 0 
          ? `${t('flows:rules.schedule')}: ${scheduleParams.timeSlots.map(slot => `${slot.startTime} - ${slot.endTime}`).join(', ')}`
          : t('flows:rules.anyTime');
      }

      return conditionText || null;
    }).filter(Boolean);

    // Se não houver regras de canal, adiciona "Por todos os canais"
    const hasChannelRule = (trigger.conditions?.rules || []).some(rule => rule.type === 'channel');
    if (!hasChannelRule) {
      conditions.push(t('flows:rules.allChannels'));
    }

    // Se não houver regras de horário, adiciona "Em qualquer hora"
    const hasScheduleRule = (trigger.conditions?.rules || []).some(rule => rule.type === 'schedule');
    if (!hasScheduleRule) {
      conditions.push(t('flows:rules.anyTime'));
    }

    return conditions.length > 0 ? ` (${conditions.join(' | ')})` : null;
  };

  if (!triggers || triggers.length === 0) {
    if (!showWarning) return null;

    return (
      <>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowTriggersModal(true);
          }}
          className="w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg p-2 transition-colors"
        >
          <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <div>
              <div className="text-sm font-medium">
                {t('flows:triggers.noTriggers')}
              </div>
              <div className="text-xs">
                {t('flows:triggers.noTriggersDescription')}
              </div>
            </div>
          </div>
        </button>

        <Modal
          isOpen={showTriggersModal}
          onClose={() => setShowTriggersModal(false)}
          title={t('flows:triggers.title')}
        >
          <div className="py-4">
            <FlowTriggers
              flowId={flowId}
              triggersInitial={triggers}
              onChange={(triggers) => {onChange?.(triggers);}}
            />
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 max-w-full">
        {triggers.map((trigger) => {
          const IconComponent = getTriggerIcon(trigger.type);
          const conditions = getTriggerConditions(trigger);
          const fullText = `${getTriggerLabel(trigger.type)}${conditions || ''}${!trigger.is_active ? ` (${t('common:disabled')})` : ''}`;
          
          return (
            <div key={trigger.id} className="min-w-0 max-w-full">
              <Tooltip content={fullText}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowTriggersModal(true);
                  }}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    trigger.is_active 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/70'
                  } transition-colors cursor-pointer max-w-full`}
                >
                  <div className="flex items-center w-full min-w-0">
                    {IconComponent && (
                      <div className="flex-shrink-0 mr-1">
                        <IconComponent className="w-3 h-3" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="truncate block">
                        {getTriggerLabel(trigger.type)}
                        {conditions}
                        {!trigger.is_active && (
                          <span className="ml-1 text-xs opacity-75">
                            ({t('common:disabled')})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              </Tooltip>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={showTriggersModal}
        onClose={() => setShowTriggersModal(false)}
        title={t('flows:triggers.title')}
      >
        <div className="py-4">
          <FlowTriggers
            flowId={flowId}
            triggersInitial={triggers}
            onChange={(triggers) => {onChange?.(triggers);}}

          />
        </div>
      </Modal>
    </>
  );
}; 