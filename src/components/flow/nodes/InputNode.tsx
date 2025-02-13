import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Plus, X, Clock, Variable, Type } from 'lucide-react';

interface Option {
  text: string;
}

interface InputNodeProps {
  data: {
    inputType: 'text' | 'options';
    options?: Option[];
    inputConfig?: {
      variableName: string;
      timeout: number;
      fallbackNodeId?: string;
    };
    variables: { id: string; name: string }[];
    removedHandles?: string[];
  };
  isConnectable: boolean;
  id: string;
  updateNodeData: (nodeId: string, data: any) => void;
}

export function InputNode({ data, isConnectable, id, updateNodeData }: InputNodeProps) {
  const { t } = useTranslation('flows');
  const [inputType, setInputType] = useState(data.inputType || 'text');
  const [options, setOptions] = useState<Option[]>(data.options || []);
  const [config, setConfig] = useState(data.inputConfig || {
    variableName: '',
    timeout: 5,
    fallbackNodeId: ''
  });
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);

  // Ensure variables is always an array
  const variables = data.variables || [];
  const removedHandles = data.removedHandles || [];

  const removeHandle = (handleId: string) => {
    const newRemovedHandles = [...removedHandles, handleId];
    updateNodeData(id, { ...data, removedHandles: newRemovedHandles });
  };

  const renderHandle = (handleId: string, position: Position, className: string) => {
    if (removedHandles.includes(handleId)) return null;

    return (
      <div
        className="relative"
        onMouseEnter={() => setHoveredHandle(handleId)}
        onMouseLeave={() => setHoveredHandle(null)}
      >
        <Handle
          type="source"
          position={position}
          id={handleId}
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          isConnectable={isConnectable}
          className={className}
        />
        {hoveredHandle === handleId && (
          <button
            onClick={() => removeHandle(handleId)}
            className="absolute top-1/2 -translate-y-1/2 right-0 transform translate-x-full ml-2 p-1 bg-red-100 dark:bg-red-900/50 rounded-full hover:bg-red-200 dark:hover:bg-red-800/50"
          >
            <X className="w-3 h-3 text-red-600 dark:text-red-400" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="node-content w-[280px] overflow-hidden">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
      
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <MessageCircle className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('nodes.input')}
          </span>
        </div>

        <select
          value={inputType}
          onChange={(e) => setInputType(e.target.value as 'text' | 'options')}
          className="w-full text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 p-2"
        >
          <option value="text">Free Text</option>
          <option value="options">Multiple Choice</option>
        </select>
      </div>

      {/* Variable Selection */}
      <div className="mb-6">
        <div className="flex items-center mb-1">
          <Variable className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-1" />
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Save response in:
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={config.variableName}
            onChange={(e) => setConfig({ ...config, variableName: e.target.value })}
            className="flex-1 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select variable</option>
            {variables.map((variable) => (
              <option key={variable.id} value={variable.name}>
                {variable.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Text Input Output */}
      {inputType === 'text' && (
        <div className="relative flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md mb-6">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Type className="w-4 h-4 mr-1" />
            <span>Text received</span>
          </div>
          {renderHandle('text', Position.Right, 'w-3 h-3 bg-blue-500')}
        </div>
      )}

      {/* Multiple Choice Options */}
      {inputType === 'options' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              Options
            </label>
            <button
              onClick={() => setOptions([...options, { text: '' }])}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="relative flex items-center">
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => {
                    const newOptions = [...options];
                    newOptions[index] = { text: e.target.value };
                    setOptions(newOptions);
                  }}
                  placeholder="Option text"
                  className="flex-1 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 pr-8"
                />
                <button
                  onClick={() => setOptions(options.filter((_, i) => i !== index))}
                  className="absolute right-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
                {renderHandle(`option-${index}`, Position.Right, 'w-3 h-3 bg-blue-500')}
              </div>
            ))}

            {/* No match output */}
            <div className="relative flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                No matching option
              </span>
              {renderHandle('no-match', Position.Right, 'w-3 h-3 bg-yellow-500')}
            </div>
          </div>
        </div>
      )}

      {/* Timeout Configuration */}
      <div className="border-t dark:border-gray-700 pt-4">
        <div className="mb-4">
          <div className="flex items-center mb-1">
            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-1" />
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Timeout (minutes)
            </label>
          </div>
          <input
            type="number"
            min="1"
            value={config.timeout}
            onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
            className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Timeout output */}
        <div className="relative flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4 mr-1" />
            <span>Timeout output</span>
          </div>
          {renderHandle('timeout', Position.Right, 'w-3 h-3 bg-red-500')}
        </div>
      </div>
    </div>
  );
}