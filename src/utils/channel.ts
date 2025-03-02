export const getChannelIcon = (type: string) => {
  switch (type) {
    case 'whatsapp_official':
    case 'whatsapp_wapi':
    case 'whatsapp_zapi':
    case 'whatsapp_evo':
      return '/images/logos/whatsapp.svg';
    case 'instagram':
      return '/images/logos/instagram.svg';
    case 'facebook':
      return '/images/logos/facebook.svg';
    case 'email':
      return '/images/logos/email.svg';
    case 'telegram':
      return '/images/logos/telegram.svg';
    default:
      return '/images/logos/whatsapp.svg';
  }
}; 