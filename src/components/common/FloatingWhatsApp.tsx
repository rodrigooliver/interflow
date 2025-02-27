import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const FloatingWhatsApp = () => {
  const { t } = useTranslation('landing');
  
  const openWhatsApp = () => {
    window.open('https://wa.me/551996003991?text=' + encodeURIComponent(t('whatsapp.message')), '_blank');
  };
  
  return (
    <button 
      onClick={openWhatsApp}
      className="fixed bottom-6 right-6 bg-green-500 text-white rounded-full p-4 shadow-lg hover:bg-green-600 transition-colors z-50 flex items-center"
    >
      <MessageCircle className="h-6 w-6 mr-2" />
      <span className="font-medium">{t('whatsapp.text')}</span>
    </button>
  );
}; 