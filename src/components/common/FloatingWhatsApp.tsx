import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const FloatingWhatsApp = () => {
  const { t } = useTranslation('landing');
  
  const openWhatsApp = () => {
    // Buscar o código de referral do localStorage
    const storedReferral = localStorage.getItem('@interflow:referral');
    let referralCode = '';
    
    if (storedReferral) {
      try {
        const referralData = JSON.parse(storedReferral);
        if (referralData?.code) {
          referralCode = ` [${referralData.code}]`;
        }
      } catch (error) {
        console.warn('Erro ao parsear referral do localStorage:', error);
      }
    }
    
    // Incluir o código de referral na mensagem
    const message = t('whatsapp.message') + referralCode;
    window.open('https://wa.me/551996003991?text=' + encodeURIComponent(message), '_blank');
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