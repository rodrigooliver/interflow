import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useReferral } from '../../../../hooks/useReferral';
import { useTrackingPixel } from '../../../../hooks/useTrackingPixel';
import { generateSlug } from '../../../../utils/string';

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
}

export default function SignupForm() {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const { referral } = useReferral();
  const { trackEvent } = useTrackingPixel();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<SignupFormData>({
    fullName: '',
    email: '',
    password: '',
    organizationName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Criar usuário no Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No user data');

      // 2. Criar profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: 'admin'
        });

      if (profileError) throw profileError;

      // 3. Criar organização
      const organizationSlug = generateSlug(formData.organizationName);
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.organizationName,
          slug: organizationSlug,
          referrer_id: referral?.id || null,
          indication_id: referral?.user_id || null
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 4. Adicionar usuário como membro da organização
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: authData.user.id,
          profile_id: authData.user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      // 5. Criar customer para iniciar chat
      if(referral?.organization_id) {
        const { error: customerError } = await supabase
          .from('customers')
          .insert({
            name: formData.fullName,
            email: formData.email,
            organization_id: referral?.organization_id || null,
            referrer_id: referral?.id || null,
            indication_id: referral?.user_id || null
          });

        if (customerError) throw customerError;
      }
     

      // 6. Disparar evento de tracking
      await trackEvent('SignUp', {
        method: 'email',
        organization_name: formData.organizationName
      });

      // 7. Redirecionar para o app
      setTimeout(() => {
        navigate('/app');
      }, 1500);
    } catch (err) {
      console.error('Erro no cadastro:', err);
      setError(t('auth:signup.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/50 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('auth:signup.fields.fullName')}
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          value={formData.fullName}
          onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('auth:signup.fields.organizationName')}
        </label>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          value={formData.organizationName}
          onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('auth:signup.fields.email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('auth:signup.fields.password')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('common:loading')}
          </>
        ) : (
          t('auth:signup.submit')
        )}
      </button>
    </form>
  );
} 