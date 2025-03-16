import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';

const locales = {
  pt: ptBR,
  en: enUS,
  es: es
};

/**
 * Formata a data da última mensagem de acordo com o padrão:
 * - Se for hoje: mostra apenas o horário (HH:mm)
 * - Se for ontem: mostra "Ontem"
 * - Se for esta semana: mostra o dia da semana
 * - Se for anterior à semana atual: mostra a data completa (dd/MM/yyyy)
 */
export const formatLastMessageTime = (timestamp: string, language: string, translationFn: (key: string) => string) => {
  if (!timestamp) return '--:--';
  
  const date = new Date(timestamp);
  const locale = locales[language as keyof typeof locales] || enUS;
  
  if (isToday(date)) {
    // Se for hoje, mostra apenas o horário
    return format(date, 'HH:mm', { locale });
  } else if (isYesterday(date)) {
    // Se for ontem, mostra "Ontem"
    return translationFn('time.yesterday');
  } else if (isThisWeek(date)) {
    // Se for esta semana, mostra o dia da semana
    return format(date, 'EEEE', { locale });
  } else {
    // Se for anterior à semana atual, mostra a data completa
    return format(date, 'dd/MM/yyyy', { locale });
  }
}; 