export const getChannelIcon = (type: string) => {
  switch (type) {
    case 'whatsapp_official':
    case 'whatsapp_wapi':
    case 'whatsapp_zapi':
    case 'whatsapp_evo':
      return '/whatsapp.svg';
    case 'instagram':
      return '/instagram.svg';
    case 'facebook':
      return '/facebook.svg';
    case 'email':
      return '/email.svg';
    default:
      return '/whatsapp.svg';
  }
}; 