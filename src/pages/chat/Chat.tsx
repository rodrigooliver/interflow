import React from 'react';
import { useParams } from 'react-router-dom';
import { ChatMessages } from '../../components/chat/ChatMessages';
import { useOrganizationContext } from '../../contexts/OrganizationContext';

export default function Chat() {
  const { id } = useParams();
  const { currentOrganization } = useOrganizationContext();

  if (!currentOrganization || !id) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen">
      <ChatMessages 
        chatId={id}
        organizationId={currentOrganization.id}
      />
    </div>
  );
}