import { supabase } from '../lib/supabase';

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
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-teal-500'
  ];
  
  // Use name to generate consistent color
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}; 