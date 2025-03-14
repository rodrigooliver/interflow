import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatMessages } from '../../components/chat/ChatMessages';
import { useAuthContext } from '../../contexts/AuthContext';

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrganizationMember } = useAuthContext();

  if (!currentOrganizationMember || !id) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen">
      <ChatMessages 
        chatId={id}
        organizationId={currentOrganizationMember.organization.id}
        onBack={() => navigate('/app/chats')}
      />
    </div>
  );
}