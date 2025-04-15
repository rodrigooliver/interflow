import { Pencil, Trash2, MoreVertical, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { CRMStage } from '../../types/crm';
import { Customer } from '../../types/database';
import { KanbanCard } from './KanbanCard';
import { useState, useRef, useEffect } from 'react';

// Definir o tipo CustomerWithStage para compatibilidade com KanbanCard
type CustomerWithStage = Customer & {
  stage?: CRMStage;
  last_message?: {
    id: string;
    content: string;
    created_at: string;
    sender_type: string;
  };
  chats?: Array<{
    id: string;
    created_at: string;
    last_message_id?: string;
    messages?: {
      id: string;
      content: string;
      created_at: string;
      sender_type: string;
    };
  }>;
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }> | Array<{
    tag_id: string;
    tags: {
      id: string;
      name: string;
      color: string;
    };
  }>;
};

interface KanbanColumnProps {
  stage: CRMStage;
  customers: CustomerWithStage[];
  onEdit: () => void;
  onDelete: () => void;
  onAddCustomer: () => void;
  onEditCustomer: (customer: CustomerWithStage) => void;
  onRemoveCustomer: (customer: CustomerWithStage) => void;
}

export function KanbanColumn({
  stage,
  customers,
  onEdit,
  onDelete,
  onAddCustomer,
  onEditCustomer,
  onRemoveCustomer
}: KanbanColumnProps) {
  const { t } = useTranslation(['crm', 'common']);
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar o menu quando clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Converter o tipo dos customers para CustomerWithStage
  const customersWithStage = customers.map(customer => {
    return {
      ...customer,
      stage: stage
    } as CustomerWithStage;
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 bg-gray-100 dark:bg-gray-800/50 rounded-lg ${
        isOver ? 'ring-2 ring-dashed ring-blue-500 dark:ring-blue-400' : ''
      }`}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {stage.name}
            </h3>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({customers.length})
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onAddCustomer}
              className="p-2 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              title={t('crm:customers.addToStage', { stage: stage.name })}
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <div className="relative" ref={menuRef}>
              <button 
                onClick={toggleMenu}
                className="p-2 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10">
                  <button
                    onClick={() => {
                      onEdit();
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    {t('crm:stages.editStage')}
                  </button>
                  <button
                    onClick={() => {
                      onDelete();
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('crm:stages.deleteStage')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`space-y-3 ${isOver ? 'opacity-50' : ''}`}>
          {customersWithStage.map((customer, index) => (
            <KanbanCard
              key={customer.id}
              customer={customer}
              index={index}
              onEditCustomer={() => onEditCustomer(customer)}
              onRemove={() => onRemoveCustomer(customer)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}