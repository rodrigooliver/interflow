import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus } from 'lucide-react';
import { ServiceTeam } from '../../types/database';
import { useFunnels } from '../../hooks/useQueryes';
import { useAuthContext } from '../../contexts/AuthContext';

// Interface para o objeto de canal a ser passado e atualizado
interface Channel {
  name: string;
  settings: {
    defaultTeamId?: string | null;
    messageSignature?: string;
    defaultFunnelId?: string | null;
    defaultStageId?: string | null;
    [key: string]: unknown;
  };
}

interface ChannelBasicFieldsProps {
  channel: Channel;
  onChannelChange: (updatedChannel: Channel) => void;
  teams?: ServiceTeam[];
  isLoadingTeams?: boolean;
}

// Mantendo a interface anterior para compatibilidade com código existente
interface LegacyChannelBasicFieldsProps {
  name: string;
  onNameChange: (name: string) => void;
  defaultTeamId?: string | null;
  onDefaultTeamChange: (teamId: string) => void;
  messageSignature?: string;
  onMessageSignatureChange?: (signature: string) => void;
  teams?: ServiceTeam[];
  isLoadingTeams?: boolean;
  defaultFunnelId?: string;
  onDefaultFunnelChange?: (funnelId: string) => void;
  defaultStageId?: string;
  onDefaultStageChange?: (stageId: string) => void;
}

export default function ChannelBasicFields(props: ChannelBasicFieldsProps | LegacyChannelBasicFieldsProps) {
  const { t } = useTranslation(['channels', 'common', 'crm']);
  const { currentOrganizationMember } = useAuthContext();

  // Verificar qual formato de props foi fornecido
  const isNewFormat = 'channel' in props;
  
  // Extrair valores das props com base no formato
  const name = isNewFormat ? props.channel.name : props.name;
  const defaultTeamId = isNewFormat ? props.channel.settings.defaultTeamId : props.defaultTeamId;
  const messageSignature = isNewFormat ? props.channel.settings.messageSignature || '' : props.messageSignature || '';
  const defaultFunnelId = isNewFormat ? props.channel.settings.defaultFunnelId : props.defaultFunnelId;
  const defaultStageId = isNewFormat ? props.channel.settings.defaultStageId : props.defaultStageId;
  const teams = props.teams;
  const isLoadingTeams = props.isLoadingTeams || false;

  // Funções de atualização que lidam com ambos os formatos
  const handleNameChange = (newName: string) => {
    if (isNewFormat) {
      (props as ChannelBasicFieldsProps).onChannelChange({
        ...props.channel,
        name: newName
      });
    } else {
      (props as LegacyChannelBasicFieldsProps).onNameChange(newName);
    }
  };

  const handleDefaultTeamChange = (teamId: string) => {
    if (isNewFormat) {
      (props as ChannelBasicFieldsProps).onChannelChange({
        ...props.channel,
        settings: {
          ...props.channel.settings,
          defaultTeamId: teamId || null
        }
      });
    } else {
      (props as LegacyChannelBasicFieldsProps).onDefaultTeamChange(teamId);
    }
  };

  const handleMessageSignatureChange = (signature: string) => {
    if (isNewFormat) {
      (props as ChannelBasicFieldsProps).onChannelChange({
        ...props.channel,
        settings: {
          ...props.channel.settings,
          messageSignature: signature
        }
      });
    } else {
      const legacyProps = props as LegacyChannelBasicFieldsProps;
      if (legacyProps.onMessageSignatureChange) {
        legacyProps.onMessageSignatureChange(signature);
      }
    }
  };

  // Referência para o textarea de assinatura
  const signatureRef = useRef<HTMLTextAreaElement>(null);
  
  // Buscar funis
  const { data: funnelsData, isLoading: loadingFunnels } = useFunnels(currentOrganizationMember?.organization.id);
  const funnels = funnelsData || [];
  
  // Extrair todos os estágios dos funis
  const stages = React.useMemo(() => {
    return funnels.flatMap(funnel => funnel.stages || []);
  }, [funnels]);

  // Determinar se devemos mostrar as seções de funil e estágio
  const canShowFunnelSection = isNewFormat || 
    (!!((props as LegacyChannelBasicFieldsProps).onDefaultFunnelChange) && 
     !!((props as LegacyChannelBasicFieldsProps).onDefaultStageChange));

  // Determinar se devemos mostrar a seção de assinatura
  const canShowSignatureSection = isNewFormat || 
    !!((props as LegacyChannelBasicFieldsProps).onMessageSignatureChange);

  // Efeito para observar mudanças no defaultFunnelId e atualizar o estágio automaticamente quando necessário
  useEffect(() => {
    if (!loadingFunnels && funnels.length > 0 && defaultFunnelId && !defaultStageId) {
      // Se temos um funil selecionado mas nenhum estágio, selecionar o primeiro estágio do funil
      const filteredStages = stages.filter(stage => stage.funnel_id === defaultFunnelId);
      const firstStage = filteredStages.length > 0 ? 
        filteredStages.sort((a, b) => a.position - b.position)[0] : null;
      
      if (firstStage) {
        // Adicionamos um pequeno atraso para garantir que o React concluiu a renderização
        const timer = setTimeout(() => {
          handleStageChange(firstStage.id);
        }, 100);
        
        // Limpeza do timer
        return () => clearTimeout(timer);
      }
    }
  }, [defaultFunnelId, defaultStageId, funnels, stages, loadingFunnels]);

  // Adicionamos uma ref para rastrear o último funnelId selecionado
  const lastFunnelIdRef = useRef<string | null | undefined>(defaultFunnelId);

  const handleFunnelChange = (funnelId: string) => {
    // Atualizamos nossa ref
    lastFunnelIdRef.current = funnelId || null;
    
    if (isNewFormat) {
      // Atualizamos apenas o funnelId, sem mudar o estágio ainda
      const updatedSettings = {
        ...props.channel.settings,
        defaultFunnelId: funnelId || null,
        // Limpamos o estágio para que o useEffect possa selecionar o primeiro estágio
        defaultStageId: null
      };
      
      (props as ChannelBasicFieldsProps).onChannelChange({
        ...props.channel,
        settings: updatedSettings
      });
    } else {
      const legacyProps = props as LegacyChannelBasicFieldsProps;
      if (legacyProps.onDefaultFunnelChange) {
        // Atualizamos apenas o funnelId
        legacyProps.onDefaultFunnelChange(funnelId);
        
        // Resetamos o estágio
        if (legacyProps.onDefaultStageChange) {
          legacyProps.onDefaultStageChange('');
        }
      }
    }
  };
  
  const handleStageChange = (stageId: string) => {
    if (isNewFormat) {
      // Preservamos o valor atual do funil ao atualizar o estágio
      // Usando a ref para garantir que temos o valor mais recente do funil
      const updatedSettings = {
        ...props.channel.settings,
        defaultFunnelId: lastFunnelIdRef.current || props.channel.settings.defaultFunnelId,
        defaultStageId: stageId || null
      };
      
      (props as ChannelBasicFieldsProps).onChannelChange({
        ...props.channel,
        settings: updatedSettings
      });
    } else {
      const legacyProps = props as LegacyChannelBasicFieldsProps;
      if (legacyProps.onDefaultStageChange) {
        legacyProps.onDefaultStageChange(stageId);
      }
    }
  };

  const insertNicknameAtStart = () => {
    if (!signatureRef.current) return;
    
    // Substituir completamente o conteúdo
    const newValue = '**{{nickname}}:**\n{{contentMessage}}';
    
    handleMessageSignatureChange(newValue);
    
    // Ajustar o cursor após a inserção
    setTimeout(() => {
      if (signatureRef.current) {
        const newPos = newValue.length;
        signatureRef.current.focus();
        signatureRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const insertNicknameAtEnd = () => {
    if (!signatureRef.current) return;
    
    // Substituir completamente o conteúdo
    const newValue = `{{contentMessage}}\n\n${t('form.regards')},\n**{{nickname}}**`;
    
    handleMessageSignatureChange(newValue);
    
    // Ajustar o cursor após a inserção
    setTimeout(() => {
      if (signatureRef.current) {
        const newPos = newValue.length;
        signatureRef.current.focus();
        signatureRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('form.name')} *
        </label>
        <input
          type="text"
          id="name"
          required
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder={t('form.namePlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="defaultTeam" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('form.defaultTeam')}
        </label>
        <select
          id="defaultTeam"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
          value={defaultTeamId || ''}
          onChange={(e) => handleDefaultTeamChange(e.target.value)}
          disabled={isLoadingTeams}
        >
          <option value="">{t('form.selectTeam')}</option>
          {teams?.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        {isLoadingTeams && (
          <div className="mt-1">
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          </div>
        )}
      </div>

      {/* Seção de Funil e Estágio Padrão */}
      {canShowFunnelSection && (
        <div className="space-y-4 border-t dark:border-gray-700 pt-4">
          <div>
            <label htmlFor="defaultFunnel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('form.defaultFunnel')}
            </label>
            <select
              id="defaultFunnel"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
              value={defaultFunnelId || ''}
              onChange={(e) => handleFunnelChange(e.target.value)}
              disabled={loadingFunnels || funnels.length === 0}
            >
              <option value="">{t('crm:funnels.selectFunnel')}</option>
              {funnels.map((funnel) => (
                <option key={funnel.id} value={funnel.id}>
                  {funnel.name} {funnel.default && `(${t('crm:funnels.alreadyDefault')})`}
                </option>
              ))}
            </select>
            {loadingFunnels && (
              <div className="mt-1">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              </div>
            )}
          </div>

          {defaultFunnelId && (
            <div>
              <label htmlFor="defaultStage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('form.defaultStage')}
              </label>
              <select
                id="defaultStage"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                value={defaultStageId || ''}
                onChange={(e) => handleStageChange(e.target.value)}
                disabled={loadingFunnels || !defaultFunnelId}
              >
                <option value="">{t('crm:stages.selectStage')}</option>
                {stages
                  .filter(stage => stage.funnel_id === defaultFunnelId)
                  .sort((a, b) => a.position - b.position)
                  .map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))
                }
              </select>
            </div>
          )}
        </div>
      )}

      {/* Seção de Assinatura de Mensagem */}
      {canShowSignatureSection && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-1 space-y-2 sm:space-y-0">
            <label htmlFor="messageSignature" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('form.messageSignature')}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={insertNicknameAtStart}
                className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title={t('form.insertNicknameAtStart') + " ({{nickname}}, {{contentMessage}})"}
              >
                <Plus className="w-3 h-3 mr-1" />
                {t('form.insertNicknameAtStart')}
              </button>
              <button
                type="button"
                onClick={insertNicknameAtEnd}
                className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title={t('form.insertNicknameAtEnd') + " ({{nickname}}, {{contentMessage}})"}
              >
                <Plus className="w-3 h-3 mr-1" />
                {t('form.insertNicknameAtEnd')}
              </button>
            </div>
          </div>
          <textarea
            ref={signatureRef}
            id="messageSignature"
            rows={3}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            value={messageSignature}
            onChange={(e) => handleMessageSignatureChange(e.target.value)}
            placeholder={t('form.messageSignaturePlaceholder')}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('form.messageSignatureHelp')}
          </p>
        </div>
      )}
    </div>
  );
} 