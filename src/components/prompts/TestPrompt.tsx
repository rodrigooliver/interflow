import React from 'react';
import { useTranslation } from 'react-i18next';
import { Integration } from '../../types/database';
import TestChat from './TestChat';

interface TestPromptProps {
  selectedIntegration: Integration | null;
  selectedModel: string;
  temperature: number;
  systemPrompt: string;
}

const TestPrompt: React.FC<TestPromptProps> = ({
  selectedIntegration,
  selectedModel,
  temperature,
  systemPrompt
}) => {
  const { t } = useTranslation(['prompts']);

  return (
    <div className="flex flex-col h-full rounded-lg shadow-sm overflow-hidden">
      <TestChat 
        selectedIntegration={selectedIntegration}
        selectedModel={selectedModel}
        temperature={temperature}
        systemPrompt={systemPrompt}
        placeholder={t('prompts:test.placeholder')}
        emptyMessage={t('prompts:test.empty')}
        clearChatText={t('prompts:test.clearChat')}
        sendButtonText={t('prompts:test.send')}
        testingText={t('prompts:test.testing')}
        successMessage={t('prompts:test.success')}
        noIntegrationMessage={t('prompts:test.noIntegration')}
        tokenUsageLabel={t('prompts:test.tokenUsage')}
        promptTokensLabel={t('prompts:test.promptTokens')}
        completionTokensLabel={t('prompts:test.completionTokens')}
        totalTokensLabel={t('prompts:test.totalTokens')}
        showIntegrationInfo={false}
        showTemperatureInfo={false}
      />
    </div>
  );
};

export default TestPrompt; 