import React, { useState, useCallback } from 'react';
import { Pencil, Check } from 'lucide-react';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';

interface BaseNodeProps {
  id: string;
  data: {
    label?: string;
    [key: string]: any;
  };
  icon: React.ReactNode;
}

export function BaseNode({ id, data, icon }: BaseNodeProps) {
  const { updateNodeData } = useFlowEditor();
  const [isEditing, setIsEditing] = useState(false);
  const [editedLabel, setEditedLabel] = useState(data.label || '');

  const handleLabelChange = useCallback(async (newLabel: string) => {
    try {
      await updateNodeData(id, { ...data, label: newLabel });
    } catch (error) {
      console.error('Error updating node label:', error);
    }
  }, [id, data, updateNodeData]);

  return (
    <div className="px-1 pb-2 pt-1 border-gray-200 dark:border-gray-700 flex items-center justify-between">
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editedLabel}
            onChange={(e) => setEditedLabel(e.target.value)}
            onBlur={() => {
              handleLabelChange(editedLabel);
              setIsEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLabelChange(editedLabel);
                setIsEditing(false);
              }
              if (e.key === 'Escape') {
                setEditedLabel(data.label || '');
                setIsEditing(false);
              }
            }}
            className="text-sm px-2 py-1 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            autoFocus
          />
          <button
            onClick={() => {
              handleLabelChange(editedLabel);
              setIsEditing(false);
            }}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 group">
          {icon}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {editedLabel || data.label || id}
          </span>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
} 