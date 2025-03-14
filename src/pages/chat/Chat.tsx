import React from 'react';
import { useParams } from 'react-router-dom';
import { ChatMessages } from '../../components/chat/ChatMessages';
import { useAuthContext } from '../../contexts/AuthContext';

export default function Chat() {
  const { id } = useParams();
  const { currentOrganizationMember } = useAuthContext();

  if (!currentOrganizationMember || !id) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen">
      <ChatMessages 
        chatId={id}
        organizationId={currentOrganizationMember.organization.id}
      />
    </div>
  );
}