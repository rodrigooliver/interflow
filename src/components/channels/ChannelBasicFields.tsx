import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus } from 'lucide-react';
import { ServiceTeam } from '../../types/database';

interface ChannelBasicFieldsProps {
  name: string;
  onNameChange: (name: string) => void;
  defaultTeamId?: string | null;
  onDefaultTeamChange: (teamId: string) => void;
  messageSignature?: string;
  onMessageSignatureChange?: (signature: string) => void;
  teams?: ServiceTeam[];
  isLoadingTeams?: boolean;
}

export default function ChannelBasicFields({
  name,
  onNameChange,
  defaultTeamId,
  onDefaultTeamChange,
  messageSignature = '',
  onMessageSignatureChange,
  teams,
  isLoadingTeams = false
}: ChannelBasicFieldsProps) {
  const { t } = useTranslation(['channels', 'common']);
  const signatureRef = useRef<HTMLTextAreaElement>(null);

  const insertNicknameAtStart = () => {
    if (!signatureRef.current || !onMessageSignatureChange) return;
    
    // Substituir completamente o conteúdo
    const newValue = '**{{nickname}}:**\n{{contentMessage}}';
    
    onMessageSignatureChange(newValue);
    
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
    if (!signatureRef.current || !onMessageSignatureChange) return;
    
    // Substituir completamente o conteúdo
    const newValue = `{{contentMessage}}\n\n${t('form.regards')},\n**{{nickname}}**`;
    
    onMessageSignatureChange(newValue);
    
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
          onChange={(e) => onNameChange(e.target.value)}
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
          onChange={(e) => onDefaultTeamChange(e.target.value)}
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

      {onMessageSignatureChange && (
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
            onChange={(e) => onMessageSignatureChange(e.target.value)}
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