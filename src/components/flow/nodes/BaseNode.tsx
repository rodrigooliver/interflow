import React, { useState } from 'react';
import { Pencil, Check } from 'lucide-react';

interface BaseNodeProps {
  id: string;
  data: any;
  onLabelChange?: (newLabel: string) => void;
  icon: React.ReactNode;
}

export function BaseNode({ id, data, onLabelChange, icon }: BaseNodeProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [label, setLabel] = useState(data.label || '');

  const handleLabelSave = () => {
    if (onLabelChange) {
        console.log('Saving label', label);
      onLabelChange(label);
    }
    setIsEditingLabel(false);
  };

  return (
    <div className="px-1 pb-2 pt-1 border-gray-200 dark:border-gray-700 flex items-center justify-between">
      {isEditingLabel ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleLabelSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSave();
              if (e.key === 'Escape') {
                setLabel(data.label || '');
                setIsEditingLabel(false);
              }
            }}
            className="text-sm px-2 py-1 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            autoFocus
          />
          <button
            onClick={handleLabelSave}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 group">
          {icon}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {data.label || id}
          </span>
          <button
            onClick={() => setIsEditingLabel(true)}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
} 