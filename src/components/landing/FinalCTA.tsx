import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export const FinalCTA = () => {
  const { t } = useTranslation('landing');
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-blue-600 py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {t('finalCTA.title')}
        </h2>
        <p className="mt-6 text-lg leading-8 text-blue-100">
          {t('finalCTA.subtitle')}
        </p>
        
        <div className="mt-8 flex justify-center">
          <div className="flex space-x-4 text-white">
            <div className="flex flex-col items-center">
              <div className="bg-blue-800 rounded-lg px-4 py-2 text-2xl font-bold">
                {timeLeft.hours.toString().padStart(2, '0')}
              </div>
              <span className="text-sm mt-1">{t('finalCTA.hours')}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-blue-800 rounded-lg px-4 py-2 text-2xl font-bold">
                {timeLeft.minutes.toString().padStart(2, '0')}
              </div>
              <span className="text-sm mt-1">{t('finalCTA.minutes')}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-blue-800 rounded-lg px-4 py-2 text-2xl font-bold">
                {timeLeft.seconds.toString().padStart(2, '0')}
              </div>
              <span className="text-sm mt-1">{t('finalCTA.seconds')}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-10">
          <Link
            to="/signup"
            className="rounded-md bg-white px-6 py-4 text-lg font-semibold text-blue-600 shadow-sm hover:bg-blue-50 transition-all transform hover:scale-105"
          >
            {t('finalCTA.cta')}
          </Link>
        </div>
        
        <p className="mt-6 text-sm text-blue-200">
          {t('finalCTA.guarantee')}
        </p>
      </div>
    </div>
  );
}; 