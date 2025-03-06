import { useTranslation } from 'react-i18next';
import { getChannelIcon } from '../../utils/channel';
import { useState } from 'react';
import { ContactChannelModal } from './ContactChannelModal';

type ContactType = 'email' | 'whatsapp' | 'phone' | 'instagram' | 'facebook' | 'telegram';

interface CustomerContact {
  id: string;
  type: ContactType;
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
  const [selectedContact, setSelectedContact] = useState<CustomerContact | null>(null);
  
  if (!contacts || contacts.length === 0) {
    return <span className="text-gray-400 dark:text-gray-500 text-xs md:text-sm italic">{t('customers:noContacts')}</span>;
  }

  // Usar a ordem natural dos contatos
  const sortedContacts = [...contacts];

  const handleContactClick = (contact: CustomerContact) => {
    setSelectedContact(contact);
  };

  return (
    <>
      <div className="flex flex-col space-y-1">
        {sortedContacts.map((contact) => (
          <button
            key={contact.id}
            onClick={() => handleContactClick(contact)}
            className="flex items-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded transition-colors"
          >
            <img 
              src={getChannelIcon(contact.type)}
              alt={`${contact.type} icon`}
              className="w-4 h-4 mr-2 flex-shrink-0"
            />
            <div className="flex-1 truncate text-left">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {contact.value}
              </span>
            </div>
          </button>
        ))}
      </div>

      {selectedContact && (
        <ContactChannelModal
          contactType={selectedContact.type}
          contactValue={selectedContact.value}
          onClose={() => setSelectedContact(null)}
        />
      )}
    </>
  );
}

// Adicionar a função ao objeto window para permitir que o componente principal a acesse
declare global {
  interface Window {
    handleContactClick?: (type: 'email' | 'whatsapp' | 'phone' | 'instagram' | 'facebook' | 'telegram', value: string) => void;
  }
}

export default CustomerContacts; 