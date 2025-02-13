import React from 'react';
import { Mail, Phone, Clock, Pencil, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CRMCustomerStage } from '../../types/crm';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ptBR, enUS, es } from 'date-fns/locale';

const locales = {
  pt: ptBR,
  en: enUS,
  es: es
};

interface KanbanCardProps {
  customerStage: CRMCustomerStage;
  index: number;
  onEdit: () => void;
  onEditCustomer: () => void;
  onRemove: () => void;
}

export function KanbanCard({ customerStage, index, onEdit, onEditCustomer, onRemove }: KanbanCardProps) {
  const { customer } = customerStage;
  const { i18n } = useTranslation();
  
  if (!customer) return null;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: customerStage.id,
    data: {
      index,
      stageId: customerStage.stage_id
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="flex justify-between items-start">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          {customer.name}
        </h4>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditCustomer();
            }}
            className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
            title="Editar cliente"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
            title="Remover do funil"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-1 mt-2">
        {customer.email && (
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Mail className="w-4 h-4 mr-2" />
            {customer.email}
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Phone className="w-4 h-4 mr-2" />
            {customer.phone}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-gray-400">
        <Clock className="w-3 h-3 mr-1" />
        {formatDistanceToNow(new Date(customerStage.moved_at), {
          addSuffix: true,
          locale: locales[i18n.language as keyof typeof locales] || enUS
        })}
      </div>
    </div>
  );
}