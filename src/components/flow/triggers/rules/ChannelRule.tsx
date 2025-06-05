import React from 'react';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { useChannels } from '../../../../hooks/useQueryes';

interface ChannelRuleProps {
  params: {
    channels: string[];
  };
  onChange: (params: { channels: string[] }) => void;
}

export function ChannelRule({ params, onChange }: ChannelRuleProps) {
  const { t } = useTranslation('flows');
  const { currentOrganizationMember } = useAuthContext();
  const { data: channels = [], isLoading } = useChannels(currentOrganizationMember?.organization.id);

  const channelOptions = channels.map(channel => ({
    value: channel.id,
    label: channel.name
  }));

  return (
    <Select
      isMulti
      isLoading={isLoading}
      options={channelOptions}
      value={channelOptions.filter(channel => params.channels.includes(channel.value))}
      onChange={(selected) => {
        onChange({ channels: selected.map(option => option.value) });
      }}
      className="react-select-container"
      classNamePrefix="react-select"
      placeholder={t('triggers.selectChannels')}
      menuPlacement="auto"
      menuPortalTarget={document.body}
      menuPosition="fixed"
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
          border: '1px solid var(--select-border)',
          zIndex: 9999
        }),
        menuPortal: (base) => ({
          ...base,
          zIndex: 9999
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