import { useTranslation } from 'react-i18next';
import { getChannelIcon } from '../../utils/channel';

interface CustomerContact {
  id: string;
  type: string; // 'email', 'whatsapp', 'phone', etc.
  value: string;
  customer_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface CustomerContactsProps {
  contacts?: CustomerContact[];
}

export function CustomerContacts({ contacts }: CustomerContactsProps) {
  const { t } = useTranslation(['customers', 'common']);
  
  if (!contacts || contacts.length === 0) {
    return <span className="text-gray-400 dark:text-gray-500 text-xs md:text-sm italic">{t('customers:noContacts')}</span>;
  }

  // Usar a ordem natural dos contatos
  const sortedContacts = [...contacts];

  return (
    <div className="flex flex-col space-y-1">
      {sortedContacts.map((contact) => (
        <div key={contact.id} className="flex items-center text-sm">
          <img 
            src={getChannelIcon(contact.type)}
            alt={`${contact.type} icon`}
            className="w-4 h-4 mr-2 flex-shrink-0"
          />
          <div className="flex-1 truncate">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {contact.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Adicionar a função ao objeto window para permitir que o componente principal a acesse
declare global {
  interface Window {
    handleContactClick?: (type: 'email' | 'whatsapp' | 'phone' | 'instagram' | 'facebook' | 'telegram', value: string) => void;
  }
}

export default CustomerContacts; 