import React from 'react';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  className?: string;
  showLabel?: boolean;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <input
      type="color"
      value={value || '#60A5FA'}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full h-10 cursor-pointer rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:focus:ring-blue-600 ${className}`}
    />
  );
} 