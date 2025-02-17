import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useOrganization } from '../../hooks/useOrganization';
import { CRMFunnel, CRMStage } from '../../types/crm';

interface CountryCode {
  code: string;
  name: string;
  dial_code: string;
}

const countryCodes: CountryCode[] = [
  { code: 'BR', name: 'Brazil', dial_code: '+55' },
  { code: 'US', name: 'United States', dial_code: '+1' },
  { code: 'PT', name: 'Portugal', dial_code: '+351' },
  { code: 'ES', name: 'Spain', dial_code: '+34' },
  { code: 'FR', name: 'France', dial_code: '+33' },
  { code: 'UK', name: 'United Kingdom', dial_code: '+44' },
];

export default function AddCustomer() {
  const navigate = useNavigate();
  const { t } = useTranslation(['customers', 'crm', 'common']);
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [loadingFunnels, setLoadingFunnels] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    countryCode: 'BR',
    phoneNumber: '',
    email: '',
    funnelId: '',
    stageId: ''
  });
  const [error, setError] = useState('');
  const [funnels, setFunnels] = useState<CRMFunnel[]>([]);
  const [stages, setStages] = useState<CRMStage[]>([]);

  useEffect(() => {
    if (currentOrganization) {
      loadFunnels();
    }
  }, [currentOrganization]);

  async function loadFunnels() {
    try {
      const { data: funnelsData, error: funnelsError } = await supabase
        .from('crm_funnels')
        .select('*')
        .eq('organization_id', currentOrganization?.id)
        .order('created_at', { ascending: false });

      if (funnelsError) throw funnelsError;
      setFunnels(funnelsData || []);

      if (funnelsData && funnelsData.length > 0) {
        setFormData(prev => ({ ...prev, funnelId: funnelsData[0].id }));
        await loadStages(funnelsData[0].id);
      }
    } catch (error) {
      console.error('Error loading funnels:', error);
      setError(t('common:error'));
    } finally {
      setLoadingFunnels(false);
    }
  }

  async function loadStages(funnelId: string) {
    try {
      const { data: stagesData, error: stagesError } = await supabase
        .from('crm_stages')
        .select('*')
        .eq('funnel_id', funnelId)
        .order('position');

      if (stagesError) throw stagesError;
      setStages(stagesData || []);

      if (stagesData && stagesData.length > 0) {
        setFormData(prev => ({ ...prev, stageId: stagesData[0].id }));
      }
    } catch (error) {
      console.error('Error loading stages:', error);
      setError(t('common:error'));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!currentOrganization) {
      setError(t('common:error'));
      setLoading(false);
      return;
    }

    const fullPhoneNumber = countryCodes.find(c => c.code === formData.countryCode)?.dial_code + formData.phoneNumber;

    try {
      // Create customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([{
          name: formData.name,
          phone: fullPhoneNumber,
          email: formData.email,
          organization_id: currentOrganization.id,
        }])
        .select()
        .single();

      if (customerError) throw customerError;

      // Add customer to stage if selected
      if (formData.stageId && customer) {
        const { error: stageError } = await supabase
          .from('crm_customer_stages')
          .insert([{
            customer_id: customer.id,
            stage_id: formData.stageId,
            moved_at: new Date().toISOString()
          }]);

        if (stageError) throw stageError;
      }

      navigate('/customers');
    } catch (err) {
      console.error('Error:', err);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  if (orgLoading || loadingFunnels) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Link
            to="/customers"
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('customers:back')}
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {t('customers:addCustomer')}
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('customers:name')} *
              </label>
              <input
                type="text"
                id="name"
                required
                className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('customers:edit.phone')}
              </label>
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <select
                  className="w-full sm:w-auto h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                  value={formData.countryCode}
                  onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                >
                  {countryCodes.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.dial_code} ({country.name})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  id="phone"
                  className="flex-1 h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="99999-9999"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('customers:edit.email')}
              </label>
              <input
                type="email"
                id="email"
                className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {funnels.length > 0 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="funnel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('crm:funnels.title')}
                  </label>
                  <select
                    id="funnel"
                    className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                    value={formData.funnelId}
                    onChange={(e) => {
                      setFormData({ ...formData, funnelId: e.target.value, stageId: '' });
                      loadStages(e.target.value);
                    }}
                  >
                    {funnels.map(funnel => (
                      <option key={funnel.id} value={funnel.id}>
                        {funnel.name}
                      </option>
                    ))}
                  </select>
                </div>

                {stages.length > 0 && (
                  <div>
                    <label htmlFor="stage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('crm:stages.title')}
                    </label>
                    <select
                      id="stage"
                      className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                      value={formData.stageId}
                      onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                    >
                      {stages.map(stage => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="h-10 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('customers:addCustomer')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}