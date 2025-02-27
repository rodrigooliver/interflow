import { useTranslation } from 'react-i18next';

export const SocialProof = () => {
  const { t } = useTranslation('landing');

  const testimonials = [
    {
      id: 1,
      content: t('socialProof.testimonial1.content'),
      author: t('socialProof.testimonial1.author'),
      role: t('socialProof.testimonial1.role'),
      company: t('socialProof.testimonial1.company'),
      image: '/images/testimonial1.jpg',
      result: t('socialProof.testimonial1.result')
    },
    {
      id: 2,
      content: t('socialProof.testimonial2.content'),
      author: t('socialProof.testimonial2.author'),
      role: t('socialProof.testimonial2.role'),
      company: t('socialProof.testimonial2.company'),
      image: '/images/testimonial2.jpg',
      result: t('socialProof.testimonial2.result')
    },
    {
      id: 3,
      content: t('socialProof.testimonial3.content'),
      author: t('socialProof.testimonial3.author'),
      role: t('socialProof.testimonial3.role'),
      company: t('socialProof.testimonial3.company'),
      image: '/images/testimonial3.jpg',
      result: t('socialProof.testimonial3.result')
    }
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-800 py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2 className="text-center text-2xl font-semibold text-gray-900 dark:text-white mb-12">
          {t('socialProof.title')}
        </h2>
        
        <div className="mx-auto flex flex-wrap justify-center gap-8 mb-16">
        {/* , 'empresa5' */}
          {['empresa1', 'empresa2', 'empresa3', 'empresa4'].map((company) => (
            <img
              key={company}
              src={`/images/logos/${company}.svg`}
              alt={company}
              className="h-30 object-contain grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all"
            />
          ))}
        </div>
        
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className="rounded-xl bg-white dark:bg-gray-700 p-6 shadow-md hover:shadow-lg transition-shadow"
            >
              <p className="text-gray-700 dark:text-gray-300 mb-6">"{testimonial.content}"</p>
              <div className="flex items-center">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.author}
                  className="h-12 w-12 rounded-full mr-4" 
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{testimonial.author}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}, {testimonial.company}</p>
                </div>
              </div>
              <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{testimonial.result}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 