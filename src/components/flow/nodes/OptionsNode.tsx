import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { List, Plus, X } from 'lucide-react';

interface Option {
  text: string;
  value: string;
}

interface OptionsNodeProps {
  data: {
    options?: Option[];
  };
  isConnectable: boolean;
}

export function OptionsNode({ data, isConnectable }: OptionsNodeProps) {
  const { t } = useTranslation('flows');
  const [options, setOptions] = useState<Option[]>(data.options || []);

  const addOption = () => {
    setOptions([...options, { text: '', value: '' }]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, field: keyof Option, value: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  return (
    <div className="node-content">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <List className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('nodes.options.title')}
          </span>
        </div>
        <button
          onClick={addOption}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        >
          <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center space-x-2">
            <input
              type="text"
              value={option.text}
              onChange={(e) => updateOption(index, 'text', e.target.value)}
              placeholder={t('nodes.options.textPlaceholder')}
              className="flex-1 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            />
            <input
              type="text"
              value={option.value}
              onChange={(e) => updateOption(index, 'value', e.target.value)}
              placeholder={t('nodes.options.valuePlaceholder')}
              className="w-24 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              onClick={() => removeOption(index)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>

            <Handle
              type="source"
              position={Position.Right}
              id={`option-${index}`}
              style={{ top: `${((index + 1) / (options.length + 1)) * 100}%` }}
              isConnectable={isConnectable}
              className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
            />
          </div>
        ))}
      </div>
    </div>
  );
}