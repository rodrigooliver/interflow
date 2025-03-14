import { useState, useEffect } from 'react';

/**
 * Hook para detectar se uma media query corresponde ao estado atual da janela
 * @param query A media query a ser verificada (ex: '(max-width: 640px)')
 * @returns boolean indicando se a media query corresponde
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Verificar se estamos no navegador
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    
    // Definir o estado inicial
    setMatches(mediaQuery.matches);

    // Criar um listener para atualizar o estado quando a media query mudar
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Adicionar o listener
    mediaQuery.addEventListener('change', handler);

    // Limpar o listener quando o componente for desmontado
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
} 