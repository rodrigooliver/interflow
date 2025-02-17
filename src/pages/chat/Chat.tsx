import React from 'react';
import { useParams } from 'react-router-dom';
import { useOrganization } from '../../hooks/useOrganization';
import { ChatMessages } from '../../components/chat/ChatMessages';

export default function Chat() {
  const { id } = useParams();
  const { currentOrganization } = useOrganization();

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