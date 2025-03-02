import React from 'react';
import { Mail, Phone, Pencil, X, MessageSquare } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Customer } from '../../types/database';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ptBR, enUS, es } from 'date-fns/locale';
import { CRMStage } from '../../types/crm';

// Tipo composto para cliente com estágio
type CustomerWithStage = Customer & {
  stage?: CRMStage;
  last_message?: {
    id: string;
    content: string;
    created_at: string;
    sender_type: string;
  };
  tags?: Array<CustomerTag>;
};

interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

const locales = {
  pt: ptBR,
  en: enUS,
  es: es
};

interface KanbanCardProps {
  customer: CustomerWithStage;
  index: number;
  onEditCustomer: () => void;
  onRemove: () => void;
}

export function KanbanCard({ customer, index, onEditCustomer, onRemove }: KanbanCardProps) {
  const { t, i18n } = useTranslation(['common']);
  
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
  };

  // Encontrar contatos específicos
  const emailContact = customer.contacts?.find(contact => contact.type === 'email');
  const whatsappContact = customer.contacts?.find(contact => contact.type === 'whatsapp');
  const phoneContact = customer.contacts?.find(contact => contact.type === 'phone');

  // Formatar a última mensagem
  const formatLastMessage = () => {
    if (!customer.last_message) return null;
    
    const message = customer.last_message;
    const currentLocale = locales[i18n.language as keyof typeof locales] || locales.en;
    
    try {
      const timeAgo = formatDistanceToNow(new Date(message.created_at), { 
        addSuffix: true,
        locale: currentLocale
      });
      
      // Limitar o tamanho da mensagem
      const truncatedContent = message.content.length > 30 
        ? `${message.content.substring(0, 30)}...` 
        : message.content;
      
      return {
        content: truncatedContent,
        timeAgo,
        senderType: message.sender_type
      };
    } catch (error) {
      console.error('Error formatting date:', error);
      return null;
    }
  };

  const lastMessage = formatLastMessage();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 mb-2 cursor-grab"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            {customer.name}
          </h3>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={onEditCustomer}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onRemove}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-1 mt-2">
        {emailContact && (
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Mail className="w-4 h-4 mr-2" />
            {emailContact.value}
          </div>
        )}
        {(whatsappContact || phoneContact) && (
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Phone className="w-4 h-4 mr-2" />
            {whatsappContact?.value || phoneContact?.value}
          </div>
        )}
      </div>

      {lastMessage && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
          <div className="flex items-start">
            <MessageSquare className="w-4 h-4 mr-2 mt-0.5 text-gray-500 dark:text-gray-400" />
            <div>
              <p className="text-gray-700 dark:text-gray-300">{lastMessage.content}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {lastMessage.senderType === 'customer' ? t('common:customer') : t('common:agent')} • {lastMessage.timeAgo}
              </p>
            </div>
          </div>
        </div>
      )}

      {customer.tags && customer.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {customer.tags.map((tag: CustomerTag) => (
            <div 
              key={tag.id}
              className="px-1.5 py-0.5 rounded-full text-xs"
              style={{ 
                backgroundColor: `${tag.color || '#3B82F6'}20`, // 20% opacity
                color: tag.color || '#3B82F6',
                border: `1px solid ${tag.color || '#3B82F6'}`
              }}
            >
              {tag.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}