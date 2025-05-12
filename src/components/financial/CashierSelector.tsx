import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, ChevronDown, PlusCircle } from 'lucide-react';

interface Cashier {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface CashierSelectorProps {
  cashiers: Cashier[];
  selectedCashierId: string;
  onSelectCashier: (cashierId: string) => void;
  onAddCashier?: () => void;
}

export function CashierSelector({
  cashiers,
  selectedCashierId,
  onSelectCashier,
  onAddCashier
}: CashierSelectorProps) {
  const { t } = useTranslation('financial');
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedCashier = cashiers.find(c => c.id === selectedCashierId) || null;

  // Selecionar automaticamente o primeiro caixa se não houver correspondência
  useEffect(() => {
    if ((!selectedCashier) && cashiers.length > 0) {
      onSelectCashier(cashiers[0].id);
    }
  }, [selectedCashier, cashiers, onSelectCashier]);

  // Fechar o dropdown quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Adicionar listener quando o dropdown estiver aberto
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Remover listener quando o componente for desmontado ou o dropdown for fechado
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => setIsOpen(!isOpen);
  
  // Caso não tenha caixas, mostrar mensagem
  if (cashiers.length === 0 && onAddCashier) {
    return (
      <div className="relative">
        <button
          onClick={onAddCashier}
          className="flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50"
        >
          <div className="flex items-center">
            <PlusCircle className="w-4 h-4 mr-2" />
            <span>{t('cashiers.addCashier')}</span>
          </div>
        </button>
      </div>
    );
  }
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm text-gray-700 dark:text-gray-300 min-w-[220px] hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <div className="flex items-center">
          <Wallet className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
          <span className="truncate">
            {selectedCashier 
              ? selectedCashier.name 
              : t('cashiers.selectCashier')
            }
          </span>
        </div>
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
          <div className="py-1">
            {cashiers.map((cashier) => (
              <button
                key={cashier.id}
                onClick={() => {
                  onSelectCashier(cashier.id);
                  setIsOpen(false);
                }}
                className={`flex items-center w-full px-4 py-2 text-sm text-left ${
                  selectedCashierId === cashier.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {cashier.name}
              </button>
            ))}
            
            {onAddCashier && (
              <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                <button
                  onClick={() => {
                    onAddCashier();
                    setIsOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-left text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {t('cashiers.addCashier')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 