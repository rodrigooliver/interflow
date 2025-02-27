import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export const Hero = () => {
  const { t } = useTranslation('landing');

  return (
    <div className="relative isolate px-6 pt-14 lg:px-8">
      <div className="mx-auto max-w-7xl py-24 sm:py-32 lg:flex lg:items-center lg:gap-x-10 lg:py-40">
        <div className="lg:w-1/2 lg:pr-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-x-6 gap-y-4">
            <Link
              to="/signup"
              className="rounded-md bg-blue-600 px-5 py-3 text-md font-semibold text-white shadow-sm hover:bg-blue-500 transition-all transform hover:scale-105"
            >
              {t('hero.cta')}
            </Link>
            <Link
              to="/demo"
              className="text-md font-semibold leading-6 text-gray-900 dark:text-white flex items-center"
            >
              {t('hero.demo')} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            {t('hero.noCard')}
          </div>
        </div>
        <div className="mt-16 lg:mt-0 lg:w-1/2">
          <div className="relative">
            <img
              src="/images/dashboard-preview.png"
              alt="InterFlow Chat Dashboard"
              className="rounded-xl shadow-xl ring-1 ring-gray-400/10 dark:ring-gray-700/10"
            />
            <div className="absolute -top-4 -right-4 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold transform rotate-6">
              {t('hero.newAI')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 