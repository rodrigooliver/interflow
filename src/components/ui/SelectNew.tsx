import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

// Tipos
type SelectContextType = {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SelectContext = createContext<SelectContextType | undefined>(undefined);

const useSelectContext = () => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select component');
  }
  return context;
};

// Componente principal Select
interface SelectProps {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  defaultOpen?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  children,
  value,
  onValueChange,
  className = '',
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className={`relative ${className}`}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

// SelectTrigger
interface SelectTriggerProps {
  children?: React.ReactNode;
  className?: string;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  className = '',
}) => {
  const { open, setOpen } = useSelectContext();

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white transition-colors ${className}`}
    >
      {children}
      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'transform rotate-180' : ''}`} />
    </button>
  );
};

// SelectValue
interface SelectValueProps {
  placeholder?: React.ReactNode;
}

export const SelectValue: React.FC<SelectValueProps> = ({
  placeholder,
}) => {
  const { value } = useSelectContext();
  
  return (
    <span className={`block truncate ${!value ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
      {value ? value : placeholder}
    </span>
  );
};

// SelectContent
interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export const SelectContent: React.FC<SelectContentProps> = ({
  children,
  className = '',
  align = 'start',
}) => {
  const { open, setOpen } = useSelectContext();
  const ref = useRef<HTMLDivElement>(null);

  // Fechar o dropdown quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setOpen]);

  if (!open) return null;

  const alignClass = align === 'center' ? 'left-1/2 transform -translate-x-1/2' : 
                    align === 'end' ? 'right-0' : 'left-0';

  return (
    <div 
      ref={ref}
      className={`absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg dark:bg-gray-800 py-1 overflow-auto ${alignClass} ${className}`}
      style={{ maxHeight: '15rem' }}
    >
      {children}
    </div>
  );
};

// SelectItem
interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
}

export const SelectItem: React.FC<SelectItemProps> = ({
  children,
  value,
  className = '',
  disabled = false,
}) => {
  const { value: selectedValue, onValueChange, setOpen } = useSelectContext();
  const isSelected = selectedValue === value;

  const handleSelect = () => {
    if (!disabled) {
      onValueChange(value);
      setOpen(false);
    }
  };

  return (
    <div
      onClick={handleSelect}
      className={`px-3 py-2 text-sm cursor-pointer select-none
        ${isSelected ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-900 dark:text-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
        ${className}`}
    >
      {children}
    </div>
  );
}; 