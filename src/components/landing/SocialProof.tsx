import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef } from 'react';

export const SocialProof = () => {
  const { t } = useTranslation('landing');
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 } 
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    // Rotação automática dos depoimentos
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 8000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const testimonials = [
    {
      id: 1,
      content: t('socialProof.testimonial1.content'),
      author: t('socialProof.testimonial1.author'),
      role: t('socialProof.testimonial1.role'),
      company: t('socialProof.testimonial1.company'),
      image: '/images/testimonials/testimonial1.png',
      result: t('socialProof.testimonial1.result'),
      rating: 5
    },
    {
      id: 2,
      content: t('socialProof.testimonial2.content'),
      author: t('socialProof.testimonial2.author'),
      role: t('socialProof.testimonial2.role'),
      company: t('socialProof.testimonial2.company'),
      image: '/images/testimonials/testimonial3.png',
      result: t('socialProof.testimonial2.result'),
      rating: 5
    },
    {
      id: 3,
      content: t('socialProof.testimonial3.content'),
      author: t('socialProof.testimonial3.author'),
      role: t('socialProof.testimonial3.role'),
      company: t('socialProof.testimonial3.company'),
      image: '/images/testimonials/testimonial2.png',
      result: t('socialProof.testimonial3.result'),
      rating: 5
    }
  ];

  const companies = ['empresa1', 'empresa2', 'empresa3', 'empresa4'];

  return (
    <div ref={sectionRef} className="relative overflow-hidden py-20">
      {/* Fundo com gradiente e efeitos */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 -z-10" />
      
      {/* Círculos decorativos */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -z-5" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -z-5" />
      
      {/* Grid tecnológico */}
      <div className="absolute inset-0 opacity-5 -z-5">
        <div className="h-full w-full bg-[linear-gradient(rgba(59,130,246,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,.1)_1px,transparent_1px)]" style={{ backgroundSize: '30px 30px' }} />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div className={`transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">
            {t('socialProof.title')}
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-16">
            {t('socialProof.subtitle')}
          </p>
        </div>
        
        {/* Logos das empresas */}
        <div className="relative mb-24">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          
          <div className={`relative max-w-5xl mx-auto transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
               style={{ transitionDelay: '200ms' }}>
            
            <div className="flex flex-wrap justify-center items-center">
              <div className="text-center py-4 px-6 md:px-10">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">{t('socialProof.trustedBy')}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 lg:gap-16">
                  {companies.map((company, index) => (
                    <div 
                      key={company} 
                      className="relative group bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                      style={{ transitionDelay: `${200 + index * 100}ms` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                      <img
                        src={`/images/logos/${company}.svg`}
                        alt={t(`socialProof.companies.${company}`)}
                        className="h-16 md:h-20 w-full object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-105 relative z-10"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center mt-10">
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{t('socialProof.joinOthers')}</span>
                <svg className="ml-2 w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Depoimento em destaque - Versão melhorada */}
        <div className="mb-20">
          <div className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-xl transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
               style={{ transitionDelay: '400ms' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5"></div>
            
            {/* Padrão decorativo */}
            <div className="absolute right-0 top-0 h-full w-1/3 overflow-hidden">
              <svg className="absolute right-0 top-0 h-full w-full text-blue-600/5 dark:text-blue-400/5" viewBox="0 0 100 100" preserveAspectRatio="none" fill="currentColor">
                <polygon points="0,0 100,0 100,100" />
              </svg>
            </div>
            
            <div className="relative z-10 px-6 py-12 md:px-12 md:py-16 flex flex-col md:flex-row items-start">
              <div className="md:w-2/3 md:pr-12">
                <div className="flex items-center mb-8">
                  <div className="text-blue-600 dark:text-blue-400 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('socialProof.featuredTestimonial')}</h3>
                </div>
                
                {/* Carrossel de depoimentos */}
                <div className="relative min-h-[250px]">
                  {testimonials.map((testimonial, index) => (
                    <div 
                      key={testimonial.id}
                      className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                        activeIndex === index 
                          ? 'opacity-100 translate-x-0 relative z-10' 
                          : 'opacity-0 translate-x-8 z-0'
                      }`}
                    >
                      <div className="relative">
                        <svg className="absolute -top-6 -left-2 h-12 w-12 text-blue-600/20 dark:text-blue-400/20" fill="currentColor" viewBox="0 0 32 32">
                          <path d="M9.5,18c0,2.5-2,4.5-4.5,4.5S0.5,20.5,0.5,18s2-4.5,4.5-4.5c0.2,0,0.4,0,0.6,0.1c-0.3-0.9-0.6-1.7-0.6-2.1 c0-3,2.5-7,7-7v4c-2,0-3,2-3,3s1,1,1,1C13,12.5,9.5,13.6,9.5,18z M25.5,18c0,2.5-2,4.5-4.5,4.5S16.5,20.5,16.5,18s2-4.5,4.5-4.5 c0.2,0,0.4,0,0.6,0.1c-0.3-0.9-0.6-1.7-0.6-2.1c0-3,2.5-7,7-7v4c-2,0-3,2-3,3s1,1,1,1C29,12.5,25.5,13.6,25.5,18z" />
                        </svg>
                        
                        <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 pl-4 leading-relaxed">
                          {testimonial.content}
                        </p>
                      </div>
                      
                      <div className="mt-6 flex items-center">
                        <div className="relative h-14 w-14">
                          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 blur-sm opacity-30"></div>
                          <img 
                            src={testimonial.image} 
                            alt={testimonial.author}
                            className="relative h-14 w-14 rounded-full border-2 border-white dark:border-gray-700 object-cover z-10" 
                          />
                        </div>
                        <div className="ml-4">
                          <p className="font-semibold text-gray-900 dark:text-white">{testimonial.author}</p>
                          <p className="text-gray-500 dark:text-gray-400 text-sm">{testimonial.role}, {testimonial.company}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Indicadores de navegação */}
                <div className="flex space-x-2 mt-10">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveIndex(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        activeIndex === index 
                          ? 'bg-blue-600 w-10' 
                          : 'bg-gray-300 dark:bg-gray-600 w-2 hover:bg-gray-400 dark:hover:bg-gray-500'
                      }`}
                      aria-label={t('socialProof.viewTestimonial', { number: index + 1 })}
                    />
                  ))}
                </div>
              </div>
              
              <div className="md:w-1/3 mt-10 md:mt-0">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg shadow-inner">
                  <div className="flex items-center mb-6">
                    <div className="mr-3 text-blue-600 dark:text-blue-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{t('socialProof.resultsAchieved')}</h4>
                  </div>
                  
                  <div className="space-y-4 min-h-[120px] relative">
                    {testimonials.map((testimonial, index) => (
                      <div 
                        key={testimonial.id}
                        className={`absolute inset-0 transition-all duration-700 ${
                          activeIndex === index 
                            ? 'opacity-100 translate-y-0 relative' 
                            : 'opacity-0 translate-y-4'
                        }`}
                      >
                        <p className="text-blue-700 dark:text-blue-300 font-medium mb-3">{testimonial.result}</p>
                        
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full" 
                               style={{ width: '85%' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Grade de depoimentos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={testimonial.id} 
              className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
              style={{ transitionDelay: `${600 + index * 150}ms` }}
            >
              <div className="flex items-center space-x-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-6">"{testimonial.content.substring(0, 150)}..."</p>
              
              <div className="flex items-center mt-auto">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.author}
                  className="h-10 w-10 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm" 
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{testimonial.author}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{testimonial.company}</p>
                </div>
                <div className="ml-auto">
                  <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full font-medium">
                    {t('socialProof.verifiedCustomer')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 