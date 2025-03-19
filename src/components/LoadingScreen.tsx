import React, { useEffect, memo } from 'react';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../providers/ThemeProvider';

// Usando memo para evitar re-renderizações desnecessárias
export const LoadingScreen = memo(function LoadingScreen() {
  const { theme } = useTheme();
  
  // Pré-carregar as imagens para evitar flashes
  useEffect(() => {
    const preloadImages = () => {
      const lightLogo = new Image();
      lightLogo.src = '/images/logos/interflow-logo.svg';
      
      const darkLogo = new Image();
      darkLogo.src = '/images/logos/interflow-logo-white.svg';
    };
    
    preloadImages();
  }, []);
  
  return (
        // <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#1f0939]">
    <div className="text-center">
        <div className="mb-6 flex justify-center">
          <img 
            src={theme === 'dark' ? '/images/logos/interflow-logo-white.svg' : '/images/logos/interflow-logo.svg'}
            alt="Interflow Logo"
            className="h-16 w-auto animate-pulse"
            loading="eager"
          />
        </div>
        {/* <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" /> */}
      </div>
    </div>
  );
});