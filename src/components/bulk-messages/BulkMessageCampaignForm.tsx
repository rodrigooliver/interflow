import React, { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import api from '../../lib/api';
import { 
  BulkMessageCampaign, 
  BulkMessageCampaignFormData, 
  ChatChannel, 
  CustomFieldDefinition 
} from '../../types/database';
import { useChannels, useFunnels, useTags, useCustomFieldDefinitions } from '../../hooks/useQueryes';

interface FilterOptions {
  channels: ChatChannel[];
  stages: Array<{
    id: string;
    name: string;
    color: string;
    position: number;
    funnel_id: string;
    description?: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  customFields: CustomFieldDefinition[];
}

interface BulkMessageCampaignFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (campaignId?: string) => void;
  editingCampaign?: BulkMessageCampaign | null;
  title?: string;
}

const BulkMessageCampaignForm: React.FC<BulkMessageCampaignFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingCampaign = null,
  title
}) => {
  const { currentOrganizationMember } = useAuthContext();
  const { show: showToast } = useToast();
  const { t } = useTranslation('bulkMessages');
  
  // Usar hooks para carregar dados de filtros
  const { data: channels = [] } = useChannels(currentOrganizationMember?.organization_id);
  const { data: funnels = [] } = useFunnels(currentOrganizationMember?.organization_id);
  const { data: tags = [] } = useTags(currentOrganizationMember?.organization_id);
  const { data: customFields = [] } = useCustomFieldDefinitions(currentOrganizationMember?.organization_id);
  
  const [estimatedRecipients, setEstimatedRecipients] = useState<number>(0);
  const [calculatingEstimate, setCalculatingEstimate] = useState(false);
  const [submittingForm, setSubmittingForm] = useState(false);
  
  // Construir opções de filtro a partir dos dados dos hooks
  const filterOptions: FilterOptions = {
    channels: channels.filter(channel => 
      channel.status === 'active' && 
      channel.is_connected === true && 
      channel.type === 'whatsapp_wapi'
    ),
    stages: funnels.flatMap(funnel => funnel.stages || []),
    tags: tags,
    customFields: customFields
  };

  // Filtrar funis que possuem estágios para exibição agrupada
  const funnelsWithStages = funnels.filter(funnel => funnel.stages && funnel.stages.length > 0);

  const [formData, setFormData] = useState<BulkMessageCampaignFormData>({
    name: '',
    description: '',
    content: '',
    channel_id: '',
    stage_ids: [],
    tag_ids: [],
    custom_field_filters: {},
    delay_between_messages: 1000, // 1 segundo
    batch_size: 50,
    delay_between_batches: 30000, // 30 segundos
    scheduled_at: undefined
  });

  // Preencher formulário quando editingCampaign mudar
  useEffect(() => {
    if (editingCampaign) {
      setFormData({
        name: editingCampaign.name,
        description: editingCampaign.description || '',
        content: editingCampaign.content,
        channel_id: editingCampaign.channel_id,
        stage_ids: editingCampaign.stage_ids || [],
        tag_ids: editingCampaign.tag_ids || [],
        custom_field_filters: editingCampaign.custom_field_filters || {},
        delay_between_messages: editingCampaign.delay_between_messages,
        batch_size: editingCampaign.batch_size,
        delay_between_batches: editingCampaign.delay_between_batches,
        scheduled_at: editingCampaign.scheduled_at || undefined
      });
    } else {
      resetForm();
    }
  }, [editingCampaign]);

  // Calcular estimativa de destinatários quando os filtros mudarem
  useEffect(() => {
    if (formData.channel_id) {
      calculateEstimatedRecipients();
    } else {
      setEstimatedRecipients(0);
    }
  }, [formData.channel_id, formData.stage_ids, formData.tag_ids, formData.custom_field_filters]);

  const calculateEstimatedRecipients = async () => {
    if (!currentOrganizationMember?.organization_id || calculatingEstimate) return;
    
    setCalculatingEstimate(true);
    try {
      const response = await api.post(`/api/${currentOrganizationMember.organization_id}/bulk-messages/estimate-recipients`, {
        channel_id: formData.channel_id,
        stage_ids: formData.stage_ids,
        tag_ids: formData.tag_ids,
        custom_field_filters: formData.custom_field_filters
      });

      if (response.data.error) {
        console.error('Erro na estimativa:', response.data.error);
        setEstimatedRecipients(0);
        return;
      }

      setEstimatedRecipients(response.data.estimate || 0);
    } catch (error) {
      console.error('Erro ao calcular estimativa:', error);
      setEstimatedRecipients(0);
    } finally {
      setCalculatingEstimate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentOrganizationMember?.profile_id) return;

    setSubmittingForm(true);
    try {
      const campaignData = {
        ...formData,
        organization_id: currentOrganizationMember.organization_id,
        created_by: currentOrganizationMember.profile_id,
        status: formData.scheduled_at ? 'scheduled' : 'draft'
      };

      if (editingCampaign) {
        const { error } = await supabase
          .from('bulk_message_campaigns')
          .update(campaignData)
          .eq('id', editingCampaign.id);

        if (error) throw error;
        showToast({ description: t('messages.updateSuccess'), variant: 'success' });
        
        onSuccess();
      } else {
        const { data, error } = await supabase
          .from('bulk_message_campaigns')
          .insert([campaignData])
          .select('id')
          .single();

        if (error) throw error;
        showToast({ description: t('messages.createSuccess'), variant: 'success' });
        
        // Navegar para a página de detalhes da campanha recém-criada
        onSuccess(data?.id);
      }
    } catch (error) {
      console.error('Erro ao salvar campanha:', error);
      showToast({ description: t('messages.saveError'), variant: 'destructive' });
    } finally {
      setSubmittingForm(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      content: '',
      channel_id: '',
      stage_ids: [],
      tag_ids: [],
      custom_field_filters: {},
      delay_between_messages: 1000,
      batch_size: 50,
      delay_between_batches: 30000,
      scheduled_at: undefined
    });
    setEstimatedRecipients(0);
  };

  const handleClose = () => {
    if (!editingCampaign) {
      resetForm();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title || (editingCampaign ? t('form.editCampaign') : t('form.newCampaign'))}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('form.campaignNameRequired')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('form.scheduling')}
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_at || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('form.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Filtros */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('form.recipientFilters')}</h3>
              
              <div className="space-y-4">
                {/* Canal - Linha própria para destaque */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('form.channelRequired')}
                  </label>
                  <select
                    required
                    value={formData.channel_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, channel_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">{t('form.selectChannel')}</option>
                    {filterOptions.channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estágios e Tags lado a lado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Estágios do Funil */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('form.funnelStages')}
                    </label>
                    <div className="space-y-3 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                      {funnelsWithStages.length > 0 ? (
                        funnelsWithStages.map((funnel) => (
                          <div key={funnel.id} className="space-y-1">
                            {/* Cabeçalho do Funil */}
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide border-b border-gray-300 dark:border-gray-600 pb-1">
                              {funnel.name}
                            </div>
                            {/* Estágios do Funil */}
                            <div className="space-y-1 pl-2">
                              {funnel.stages?.map((stage) => (
                                <label key={stage.id} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.stage_ids?.includes(stage.id) || false}
                                    onChange={(e) => {
                                      const currentStageIds = formData.stage_ids || [];
                                      if (e.target.checked) {
                                        setFormData(prev => ({
                                          ...prev,
                                          stage_ids: [...currentStageIds, stage.id]
                                        }));
                                      } else {
                                        setFormData(prev => ({
                                          ...prev,
                                          stage_ids: currentStageIds.filter(id => id !== stage.id)
                                        }));
                                      }
                                    }}
                                    className="mr-2"
                                  />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{stage.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum estágio disponível</p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('form.tags')}
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                      {filterOptions.tags.length > 0 ? (
                        filterOptions.tags.map((tag) => (
                          <label key={tag.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.tag_ids?.includes(tag.id) || false}
                              onChange={(e) => {
                                const currentTagIds = formData.tag_ids || [];
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    tag_ids: [...currentTagIds, tag.id]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    tag_ids: currentTagIds.filter(id => id !== tag.id)
                                  }));
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{tag.name}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma tag disponível</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Estimativa de Destinatários */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Users size={16} />
                  <span className="text-sm font-medium">
                    {t('form.estimatedRecipients')} {calculatingEstimate ? t('form.calculating') : estimatedRecipients}
                  </span>
                </div>
              </div>
            </div>

            {/* Configurações de Timing */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('form.sendingSettings')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('form.delayBetweenMessages')}
                  </label>
                  <input
                    type="number"
                    min="100"
                    value={formData.delay_between_messages}
                    onChange={(e) => setFormData(prev => ({ ...prev, delay_between_messages: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('form.batchSize')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.batch_size}
                    onChange={(e) => setFormData(prev => ({ ...prev, batch_size: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('form.delayBetweenBatches')}
                  </label>
                  <input
                    type="number"
                    min="1000"
                    value={formData.delay_between_batches}
                    onChange={(e) => setFormData(prev => ({ ...prev, delay_between_batches: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Conteúdo da Mensagem */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('form.messageContentRequired')}
              </label>
              <textarea
                required
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('form.messagePlaceholder')}
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('form.cancel')}
              </button>
              <button
                type="submit"
                disabled={!formData.channel_id || submittingForm}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingForm && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                {submittingForm ? 
                  (editingCampaign ? 'Atualizando...' : 'Criando...') : 
                  (editingCampaign ? t('form.updateCampaign') : t('form.createCampaign'))
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BulkMessageCampaignForm; 