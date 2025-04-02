import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

// Contexto para gerenciar estado do select
interface SelectContextType {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

// Hook para usar o contexto do select
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
}

export const Select: React.FC<SelectProps> = ({ children, value, onValueChange, className }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <SelectContext.Provider value={{ value, onChange: onValueChange, open, setOpen, triggerRef }}>
      <div className={twMerge("relative", className)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

// Componente trigger do select
interface SelectTriggerProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ children, id, className }) => {
  const { open, setOpen, triggerRef } = useSelectContext();

  return (
    <button
      id={id}
      ref={triggerRef}
      type="button"
      onClick={() => setOpen(!open)}
      className={twMerge(
        "flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-50 dark:placeholder:text-gray-500 dark:focus:border-blue-400",
        className
      )}
      aria-haspopup="listbox"
      aria-expanded={open}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
};

// Componente de valor do select
interface SelectValueProps {
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder, className, children }) => {
  const { value } = useSelectContext();

  return (
    <span className={twMerge("flex-grow truncate", className)}>
      {children || (value ? value : placeholder || "Selecione uma opção")}
    </span>
  );
};

// Componente de conteúdo do select
interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectContent: React.FC<SelectContentProps> = ({ children, className }) => {
  const { open, setOpen, triggerRef } = useSelectContext();
  const contentRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, setOpen, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={twMerge(
        "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800",
        className
      )}
      role="listbox"
    >
      {children}
    </div>
  );
};

// Componente de grupo do select
interface SelectGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectGroup: React.FC<SelectGroupProps> = ({ children, className }) => {
  return (
    <div className={twMerge("px-1 py-1", className)} role="group">
      {children}
    </div>
  );
};

// Componente de item do select
interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}

export const SelectItem: React.FC<SelectItemProps> = ({ children, value, disabled, className }) => {
  const { value: selectedValue, onChange, setOpen } = useSelectContext();
  const isSelected = selectedValue === value;

  const handleSelect = () => {
    if (!disabled) {
      onChange(value);
      setOpen(false);
    }
  };

  return (
    <div
      className={twMerge(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2",
        isSelected && "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
        !isSelected && "hover:bg-gray-100 dark:hover:bg-gray-700/30",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      role="option"
      aria-selected={isSelected}
      onClick={handleSelect}
      data-disabled={disabled ? true : undefined}
    >
      {children}
    </div>
  );
}; 