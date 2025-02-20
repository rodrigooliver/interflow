import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { UserCog, Loader2 } from 'lucide-react';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';

interface UpdateCustomerNodeProps {
  data: {
    updateCustomer?: {
      field: string;
      value: string;
      funnelId?: string;
      stageId?: string;
      teamId?: string;
      userId?: string;
    };
  };
  id: string;
  isConnectable: boolean;
  selected?: boolean;
}


export function UpdateCustomerNode({ data, id, isConnectable, selected }: UpdateCustomerNodeProps) {
  const { t } = useTranslation('flows');
  const { funnels, teams, users } = useFlowEditor();
  const [config, setConfig] = useState(data.updateCustomer || {
    field: '',
    value: '',
    funnelId: '',
    stageId: '',
    teamId: '',
    userId: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (funnels.length && teams.length && users.length) {
      setLoading(false);
    }
  }, [funnels, teams, users]);

  // Effect to update node data when config changes
  useEffect(() => {
    const event = new CustomEvent('updateNodeInternals', { detail: { nodeId: id } });
    document.dispatchEvent(event);
  }, [id, config]);

  const handleConfigChange = (updates: Partial<typeof config>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    
    const event = new CustomEvent('nodeDataChanged', {
      detail: {
        nodeId: id,
        data: { updateCustomer: newConfig }
      }
    });
    document.dispatchEvent(event);
  };

  if (loading) {
    return (
      <div className="node-content flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const fields = [
    { value: 'funnel', label: t('nodes.updateCustomer.fields.funnel') },
    { value: 'team', label: t('nodes.updateCustomer.fields.team') },
    { value: 'user', label: t('nodes.updateCustomer.fields.user') },
    { value: 'email', label: t('nodes.updateCustomer.fields.email') },
    { value: 'phone', label: t('nodes.updateCustomer.fields.phone') },
    { value: 'facebook', label: t('nodes.updateCustomer.fields.facebook') },
    { value: 'instagram', label: t('nodes.updateCustomer.fields.instagram') }
  ];

  return (
    <div className="node-content">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
      
      <div className="flex items-center mb-4">
        <UserCog className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('nodes.updateCustomer.title')}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('nodes.updateCustomer.field')}
          </label>
          <select
            value={config.field}
            onChange={(e) => handleConfigChange({ 
              field: e.target.value,
              value: '',
              funnelId: '',
              stageId: '',
              teamId: '',
              userId: ''
            })}
            className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">{t('nodes.updateCustomer.selectField')}</option>
            {fields.map(field => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
        </div>

        {config.field === 'funnel' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('nodes.updateCustomer.funnel')}
              </label>
              <select
                value={config.funnelId}
                onChange={(e) => handleConfigChange({ 
                  funnelId: e.target.value,
                  stageId: ''
                })}
                className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">{t('nodes.updateCustomer.selectFunnel')}</option>
                {funnels.map(funnel => (
                  <option key={funnel.id} value={funnel.id}>
                    {funnel.name}
                  </option>
                ))}
              </select>
            </div>

            {config.funnelId && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('nodes.updateCustomer.stage')}
                </label>
                <select
                  value={config.stageId}
                  onChange={(e) => handleConfigChange({ stageId: e.target.value })}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">{t('nodes.updateCustomer.selectStage')}</option>
                  {funnels
                    .find(f => f.id === config.funnelId)
                    ?.stages.map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </>
        )}

        {config.field === 'team' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t('nodes.updateCustomer.team')}
            </label>
            <select
              value={config.teamId}
              onChange={(e) => handleConfigChange({ teamId: e.target.value })}
              className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">{t('nodes.updateCustomer.selectTeam')}</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {config.field === 'user' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t('nodes.updateCustomer.user')}
            </label>
            <select
              value={config.userId}
              onChange={(e) => handleConfigChange({ userId: e.target.value })}
              className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">{t('nodes.updateCustomer.selectUser')}</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {['email', 'phone', 'facebook', 'instagram'].includes(config.field) && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t('nodes.updateCustomer.value')}
            </label>
            <input
              type="text"
              value={config.value}
              onChange={(e) => handleConfigChange({ value: e.target.value })}
              placeholder={t('nodes.updateCustomer.valuePlaceholder')}
              className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
    </div>
  );
}