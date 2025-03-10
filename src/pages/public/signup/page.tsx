import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SignupForm from './components/SignupForm';
import { PublicLayout } from '../../../layouts/PublicLayout';

export default function SignupPage() {
  const { t } = useTranslation();
  
  return (
    <PublicLayout>
      <div className="flex min-h-[calc(100vh-5rem)] items-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white mt-10 ">
            {t('signup.title')}
          </h2>
          <p className="mt-2 mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('signup.subtitle')}{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
              {t('signup.login_link')}
            </Link>
          </p>

          <div className=" bg-white dark:bg-gray-800 shadow rounded-lg">
            <SignupForm />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
} 