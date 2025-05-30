import React from 'react';
import { supabase } from '../lib/supabase';
import { 
  Image, 
  Video, 
  Mic, 
  FileText, 
  Sticker, 
  Mail, 
  UserPlus, 
  LogIn, 
  LogOut, 
  UserCog, 
  XCircle, 
  Users, 
  FileCode 
} from 'lucide-react';

export const handleImageError = async (chatId: string) => {
  try {
    const { error } = await supabase
      .from('chats')
      .update({ profile_picture: null })
      .eq('id', chatId);
    
    if (error) {
      console.error('Erro ao atualizar profile_picture:', error.message);
    }
  } catch (err) {
    console.error(`Erro ao atualizar imagem do chat ${chatId}:`, err);
  }
};

export const getRandomColor = (name: string) => {
  // Usando apenas cores que existem no CSS compilado
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-indigo-500',
    'bg-red-500'
  ];
  
  // Lidar com nomes vazios ou inválidos
  let processedName = 'Anônimo';
  
  if (name && typeof name === 'string' && name.trim().length > 0) {
    processedName = name.trim();
  }
  
  // Calcular um índice baseado nos caracteres do nome
  let sum = 0;
  for (let i = 0; i < processedName.length; i++) {
    sum += processedName.charCodeAt(i);
  }
  
  return colors[sum % colors.length];
};

// Função para obter o ícone baseado no tipo de mensagem
export const getMessageTypeIcon = (messageType: string, className: string = "w-4 h-4") => {
  switch (messageType) {
    case 'image':
      return <Image className={className} />;
    case 'video':
      return <Video className={className} />;
    case 'audio':
      return <Mic className={className} />;
    case 'document':
      return <FileText className={className} />;
    case 'sticker':
      return <Sticker className={className} />;
    case 'email':
      return <Mail className={className} />;
    case 'user_start':
      return <UserPlus className={className} />;
    case 'user_entered':
      return <LogIn className={className} />;
    case 'user_left':
      return <LogOut className={className} />;
    case 'user_transferred':
      return <UserCog className={className} />;
    case 'user_closed':
      return <XCircle className={className} />;
    case 'user_join':
      return <Users className={className} />;
    case 'template':
      return <FileCode className={className} />;
    default:
      return null;
  }
}; 