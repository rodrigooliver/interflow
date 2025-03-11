import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export const Hero = () => {
  const { t } = useTranslation('landing');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    // Função para criar o efeito de partículas
    const createParticleEffect = () => {
      const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const particles: {x: number; y: number; size: number; speedX: number; speedY: number; color: string}[] = [];
      const particleCount = 50;
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 1,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5,
          color: `rgba(${Math.floor(Math.random() * 100 + 155)}, ${Math.floor(Math.random() * 100 + 155)}, 255, ${Math.random() * 0.5 + 0.2})`
        });
      }
      
      function animate() {
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
          if (!ctx) return;
          
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          
          particle.x += particle.speedX;
          particle.y += particle.speedY;
          
          if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
          if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;
        });
        
        requestAnimationFrame(animate);
      }
      
      animate();
    };
    
    createParticleEffect();
    
    const handleResize = () => {
      const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative isolate overflow-hidden">
      {/* Canvas para efeito de partículas */}
      <canvas id="particle-canvas" className="absolute inset-0 z-0 opacity-30" />
      
      {/* Gradiente de fundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-indigo-900/20 to-transparent z-0" />
      
      {/* Círculos decorativos */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
      
      {/* Grid tecnológico */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)]" style={{ backgroundSize: '20px 20px' }} />
      </div>
      
      <div className="relative z-10 px-6 pt-8 lg:px-8">
        <div className="mx-auto max-w-7xl py-16 sm:py-24 lg:flex lg:items-center lg:gap-x-10 lg:py-28">
          <div 
            className={`w-full lg:w-1/2 lg:pr-8 transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} text-center lg:text-left`}
            style={{ transitionDelay: '200ms' }}
          >
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 leading-tight">
              {t('hero.title')}
            </h1>
            <p className={`mt-4 sm:mt-6 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600 dark:text-gray-300 transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} max-w-2xl mx-auto lg:mx-0`}
               style={{ transitionDelay: '400ms' }}>
              {t('hero.subtitle')}
            </p>
            <div className={`mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-x-6 gap-y-4 transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                 style={{ transitionDelay: '600ms' }}>
              <Link
                to="/signup"
                className="group relative rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-md font-semibold text-white shadow-lg hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105 overflow-hidden w-full sm:w-auto"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"></span>
                <span className="relative z-10">{t('hero.cta')}</span>
                <span className="absolute bottom-0 left-0 w-full h-1 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
              </Link>
              <Link
                to="/demo"
                className="text-md font-semibold leading-6 text-gray-900 dark:text-white flex items-center justify-center group"
              >
                <span>{t('hero.demo')}</span>
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1 ml-1">→</span>
              </Link>
            </div>
            <div className={`mt-4 sm:mt-5 text-sm text-gray-500 dark:text-gray-400 transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                 style={{ transitionDelay: '800ms' }}>
              {t('hero.noCard')}
            </div>
          </div>
          <div className={`mt-10 sm:mt-12 lg:mt-0 w-full lg:w-1/2 transition-all duration-1000 transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}
               style={{ transitionDelay: '400ms' }}>
            <div className="relative group max-w-md mx-auto lg:max-w-none">
              {/* Efeito de brilho */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
              
              <img
                src="/images/dashboard-preview.png"
                alt="InterFlow Chat Dashboard"
                className="relative rounded-xl shadow-2xl ring-1 ring-gray-400/10 dark:ring-gray-700/10 transition-all duration-500 group-hover:shadow-blue-500/20 z-10 w-full"
              />
              
              {/* Efeito de código flutuante */}
              <div className="absolute -right-4 -bottom-4 bg-black/80 text-green-500 px-4 py-2 rounded-lg text-xs font-mono opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 z-20 hidden sm:block">
                <div>{'{'} "ai": "enabled", "mode": "advanced" {'}'}</div>
              </div>
              
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold transform rotate-6 shadow-lg z-20 animate-pulse">
                {t('hero.newAI')}
              </div>
              
              {/* Pontos de conexão */}
              <div className="absolute w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full top-1/4 -left-1.5 animate-ping" style={{ animationDuration: '3s' }}></div>
              <div className="absolute w-2 h-2 sm:w-3 sm:h-3 bg-indigo-500 rounded-full bottom-1/4 -right-1.5 animate-ping" style={{ animationDuration: '4s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 