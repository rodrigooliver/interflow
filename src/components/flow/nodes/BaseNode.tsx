import React, { useState, useCallback } from 'react';
import { Pencil, Check } from 'lucide-react';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';
import { getNodeIcon } from '../../../utils/nodeIcons';
import { NodeType } from '../../../types/flow';

interface BaseNodeProps {
  id: string;
  data: {
    label?: string;
    [key: string]: unknown;
  };
  type: NodeType;
  onLabelChange?: (newLabel: string) => void;
}

export function BaseNode({ id, data, type, onLabelChange }: BaseNodeProps) {
  const { updateNodeData } = useFlowEditor();
  const [isEditing, setIsEditing] = useState(false);
  const [editedLabel, setEditedLabel] = useState(data.label || '');

  const handleLabelChange = useCallback(async (newLabel: string) => {
    try {
      if (onLabelChange) {
        onLabelChange(newLabel);
      } else {
        await updateNodeData(id, { ...data, label: newLabel });
      }
    } catch (error) {
      console.error('Error updating node label:', error);
    }
  }, [id, data, updateNodeData, onLabelChange]);

  const nodeIcon = getNodeIcon(type);

  return (
    <div className="px-1 pb-1 pt-0 border-gray-200 dark:border-gray-700 flex items-center justify-between">
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
            className="text-sm px-2 py-1 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white nodrag"
            autoFocus
          />
          <button
            onClick={() => {
              handleLabelChange(editedLabel);
              setIsEditing(false);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 nodrag"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {nodeIcon}
            <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              {data.label || ''}
            </span>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-gray-500/50 hover:text-gray-600 dark:hover:text-gray-300 nodrag"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
} 