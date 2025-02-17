import React from 'react';
import { Trigger, TriggerRule } from '../../../types/flow';
import { TriggerRules } from './TriggerRules';

interface FirstContactConfigProps {
  flowId: string;
  trigger: Trigger;
  onChange: (rules: TriggerRule[]) => void;
}

export function FirstContactConfig({ flowId, trigger, onChange }: FirstContactConfigProps) {
  return (
    <TriggerRules
      rules={trigger.conditions.rules}
      onChange={onChange}
    />
  );
} 