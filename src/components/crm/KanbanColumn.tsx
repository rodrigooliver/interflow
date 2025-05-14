import { Pencil, Trash2, MoreVertical, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { CRMStage } from '../../types/crm';
import { Customer } from '../../types/database';
import { KanbanCard } from './KanbanCard';
import { useState, useRef, useEffect } from 'react';

// Note: Os tipos CustomerDbTag e CustomerTag devem ser compatíveis 
// com os equivalentes em KanbanCard.tsx
interface CustomerDbTag {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    color: string;
  };
}

interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

interface CustomerChat {
  id: string;
  created_at: string;
  last_message_id?: string;
  external_id?: string;
  status?: 'pending' | 'in_progress' | 'closed' | 'await_closing';
  title: string;
  channel_details?: {
    id: string;
    name: string;
    type: string;
  };
  messages?: {
    id: string;
    content: string;
    created_at: string;
    sender_type: string;
  };
}

// Interface para o item do checklist da tarefa
interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

// Interface para a tarefa do cliente
interface CustomerTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  checklist: ChecklistItem[];
}

// Definir o tipo CustomerWithStage para compatibilidade com KanbanCard
type CustomerWithStage = Customer & {
  stage?: CRMStage;
  last_message?: {
    id: string;
    content: string;
    created_at: string;
    sender_type: string;
  };
  chats?: CustomerChat[];
  tags?: CustomerDbTag[] | CustomerTag[];
  sale_price?: number;
  tasks?: CustomerTask;
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
  // Usar o ID do estágio como identificador dropável
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: {
      type: 'column',
      stage: stage,
      isEmpty: customers.length === 0
    }
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

  // Adicionar log durante o isOver para debug
  useEffect(() => {
    if (isOver) {
      console.log(`Hover sobre a coluna ${stage.name} (${stage.id}), vazia: ${customersWithStage.length === 0}`);
    }
  }, [isOver, stage, customersWithStage.length]);
  
  // Verificar se a coluna está vazia
  const isEmpty = customersWithStage.length === 0;

  // Calcula o valor total de sale_price para todos os clientes na coluna
  const totalSalePrice = customersWithStage.reduce((total, customer) => {
    return total + (customer.sale_price || 0);
  }, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 bg-gray-100 dark:bg-gray-800/50 rounded-lg flex flex-col h-full max-h-[calc(100vh-8rem)] ${
        isOver ? 'bg-blue-50/50 dark:bg-blue-900/5' : ''
      }`}
      data-is-empty={isEmpty}
      data-id={stage.id}
      data-column-type="stage"
    >
      <div className="p-4 flex flex-col h-full overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
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
            <div className="mt-1 ml-5 text-sm font-medium text-green-600 dark:text-green-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSalePrice)}
            </div>
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

        <div 
          className={`space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar`}
          data-column-content={stage.id}
        >
          {isEmpty ? (
            <div 
              className={`h-48 border-2 border-dashed transition-all ${
                isOver 
                  ? 'border-blue-300/70 dark:border-blue-600/70 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-gray-200 dark:border-gray-700'
              } rounded-md flex items-center justify-center`}
              data-empty-placeholder="true"
              data-column-id={stage.id}
            >
              <span className={`text-sm ${
                isOver 
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                {isOver 
                  ? t('crm:customers.dropHere') 
                  : t('crm:customers.noCustomersInStage')}
              </span>
            </div>
          ) : (
            <>
              {customersWithStage.map((customer, index) => (
                <KanbanCard
                  key={customer.id}
                  customer={{...customer}}
                  index={index}
                  onEditCustomer={() => onEditCustomer(customer)}
                  onRemove={() => onRemoveCustomer(customer)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}