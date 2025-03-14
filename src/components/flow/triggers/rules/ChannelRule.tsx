import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import { supabase } from '../../../../lib/supabase';
import { useAuthContext } from '../../../../contexts/AuthContext';

interface ChannelRuleProps {
  params: {
    channels: string[];
  };
  onChange: (params: { channels: string[] }) => void;
}

export function ChannelRule({ params, onChange }: ChannelRuleProps) {
  const { t } = useTranslation('flows');
  const { currentOrganizationMember } = useAuthContext();
  const [channels, setChannels] = useState<Array<{ value: string; label: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadChannels = useCallback(async () => {
    if (!currentOrganizationMember?.organization.id) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('organization_id', currentOrganizationMember.organization.id);
      
      if (error) throw error;
      
      if (data) {
        const channelOptions = data.map(channel => ({
          value: channel.id,
          label: channel.name
        }));
        setChannels(channelOptions);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganizationMember?.organization.id]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  return (
    <Select
      isMulti
      isLoading={isLoading}
      options={channels}
      value={channels.filter(channel => params.channels.includes(channel.value))}
      onChange={(selected) => {
        onChange({ channels: selected.map(option => option.value) });
      }}
      className="react-select-container"
      classNamePrefix="react-select"
      placeholder={t('triggers.selectChannels')}
      menuPlacement="top"
      styles={{
        control: (base, state) => ({
          ...base,
          backgroundColor: 'var(--select-bg)',
          borderColor: state.isFocused ? 'var(--select-focus-border)' : 'var(--select-border)',
          '&:hover': {
            borderColor: 'var(--select-hover-border)'
          }
        }),
        menu: (base) => ({
          ...base,
          backgroundColor: 'var(--select-bg)',
          border: '1px solid var(--select-border)'
        }),
        option: (base, { isFocused, isSelected }) => ({
          ...base,
          backgroundColor: isSelected 
            ? 'var(--select-selected-bg)'
            : isFocused 
              ? 'var(--select-hover-bg)'
              : 'transparent',
          color: isSelected 
            ? 'var(--select-selected-text)'
            : 'var(--select-text)'
        }),
        singleValue: (base) => ({
          ...base,
          color: 'var(--select-text)'
        }),
        multiValue: (base) => ({
          ...base,
          backgroundColor: 'var(--select-selected-bg)',
          color: 'var(--select-selected-text)'
        }),
        multiValueLabel: (base) => ({
          ...base,
          color: 'var(--select-selected-text)'
        }),
        multiValueRemove: (base) => ({
          ...base,
          color: 'var(--select-selected-text)',
          ':hover': {
            backgroundColor: 'var(--select-tag-remove-hover-bg)',
            color: 'var(--select-tag-remove-hover-text)'
          }
        })
      }}
    />
  );
} 