import React, { useState } from 'react';
import { StartChatModal } from './StartChatModal';
import { CustomerAddModal } from '../customers/CustomerAddModal';
import { ContactChannelModal } from '../customers/ContactChannelModal';
import { CustomerEditModal } from '../customers/CustomerEditModal';
import { ContactType } from '../../types/database';

interface ChatFlowModalProps {
  onClose: () => void;
}

interface Customer {
  id: string;
  name: string;
  contacts: {
    type: ContactType;
    value: string;
  }[];
}

export function ChatFlowModal({ onClose }: ChatFlowModalProps) {
  const [currentStep, setCurrentStep] = useState<'start' | 'add_customer' | 'edit_customer' | 'channel'>('start');
  const [selectedContact, setSelectedContact] = useState<{type: ContactType, value: string} | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handleAddCustomer = () => {
    setCurrentStep('add_customer');
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCurrentStep('edit_customer');
  };

  const handleSelectContact = (contact: {type: ContactType, value: string}, customer: Customer | null) => {
    setSelectedContact(contact);
    setSelectedCustomer(customer);
    setCurrentStep('channel');
  };

  const handleCustomerAddSuccess = () => {
    setCurrentStep('start');
  };

  const handleCustomerEditSuccess = () => {
    setCurrentStep('start');
  };

  const handleChannelClose = () => {
    onClose();
  };

  // Função para mapear o tipo de contato
  const mapContactType = (type: ContactType): "email" | "whatsapp" | "phone" | "instagram" | "facebook" | "telegram" => {
    switch (type) {
      case ContactType.EMAIL:
        return "email";
      case ContactType.WHATSAPP:
        return "whatsapp";
      case ContactType.PHONE:
        return "phone";
      case ContactType.INSTAGRAM:
        return "instagram";
      case ContactType.FACEBOOK:
        return "facebook";
      case ContactType.TELEGRAM:
        return "telegram";
      default:
        return "whatsapp";
    }
  };

  if (currentStep === 'start') {
    return (
      <StartChatModal
        onClose={onClose}
        onAddCustomer={handleAddCustomer}
        onSelectContact={handleSelectContact}
        onEditCustomer={handleEditCustomer}
      />
    );
  }

  if (currentStep === 'add_customer') {
    return (
      <CustomerAddModal
        onClose={() => setCurrentStep('start')}
        onSuccess={handleCustomerAddSuccess}
      />
    );
  }

  if (currentStep === 'edit_customer' && selectedCustomer) {
    return (
      <CustomerEditModal
        customer={selectedCustomer}
        onClose={() => setCurrentStep('start')}
        onSuccess={handleCustomerEditSuccess}
      />
    );
  }

  if (currentStep === 'channel' && selectedContact) {
    return (
      <ContactChannelModal
        contactType={mapContactType(selectedContact.type)}
        contactValue={selectedContact.value}
        customer={selectedCustomer || undefined}
        onClose={handleChannelClose}
      />
    );
  }

  return null;
} 