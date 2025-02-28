import React from 'react';
import { Mail, Phone, Clock, Pencil, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Customer } from '../../types/database';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ptBR, enUS, es } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { CRMStage } from '../../types/crm';

// Tipo composto para cliente com estágio
type CustomerWithStage = Customer & {
  stage?: CRMStage;
};

const locales = {
  pt: ptBR,
  en: enUS,
  es: es
};

interface KanbanCardProps {
  customer: Customer;
  index: number;
  onEdit: () => void;
  onEditCustomer: () => void;
  onRemove: () => void;
}

export function KanbanCard({ customer, index, onEdit, onEditCustomer, onRemove }: KanbanCardProps) {
  const { t, i18n } = useTranslation(['common']);
  const [lastMoved, setLastMoved] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    // Fetch the last time this customer was moved to this stage
    async function fetchLastMoved() {
      if (!customer.id || !customer.stage_id) return;
      
      const { data } = await supabase
        .from('customer_stage_history')
        .select('moved_at')
        .eq('customer_id', customer.id)
        .eq('stage_id', customer.stage_id)
        .order('moved_at', { ascending: false })
        .limit(1);
        
      if (data && data.length > 0) {
        setLastMoved(data[0].moved_at);
      }
    }
    
    fetchLastMoved();
  }, [customer.id, customer.stage_id]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: customer.id,
    data: {
      index,
      stageId: customer.stage_id
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
          {customer.name || t('unnamed')}
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
        {customer.whatsapp && (
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Phone className="w-4 h-4 mr-2" />
            {customer.whatsapp}
          </div>
        )}
      </div>

      {/* Tags */}
      {customer.tags && customer.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {customer.tags.map(tag => (
            <div 
              key={tag.id}
              className="px-1.5 py-0.5 rounded-full text-xs"
              style={{ 
                backgroundColor: `${tag.color}20`, // 20% opacity
                color: tag.color,
                border: `1px solid ${tag.color}`
              }}
            >
              {tag.name}
            </div>
          ))}
        </div>
      )}

      {lastMoved && (
        <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3 mr-1" />
          {formatDistanceToNow(new Date(lastMoved), {
            addSuffix: true,
            locale: locales[i18n.language as keyof typeof locales] || enUS
          })}
        </div>
      )}
    </div>
  );
}