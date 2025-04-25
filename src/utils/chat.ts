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