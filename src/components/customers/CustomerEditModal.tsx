import React, { useState } from 'react';
import { X, Loader2, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '../../hooks/useOrganization';
import { supabase } from '../../lib/supabase';
import { Customer } from '../../types/database';

interface CustomerEditModalProps {
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

const countryCodes = [
  { code: 'BR', name: 'Brazil', dial_code: '+55' },
  { code: 'US', name: 'United States', dial_code: '+1' },
  { code: 'PT', name: 'Portugal', dial_code: '+351' },
  { code: 'ES', name: 'Spain', dial_code: '+34' },
  { code: 'FR', name: 'France', dial_code: '+33' },
  { code: 'UK', name: 'United Kingdom', dial_code: '+44' },
];

export function CustomerEditModal({ customer, onClose, onSuccess }: CustomerEditModalProps) {
  const { t } = useTranslation(['customers', 'common']);
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatWhatsAppNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 7) {
      return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
  };

  const getInitialWhatsAppData = () => {
    if (!customer.whatsapp) {
      return { countryCode: 'BR', whatsappNumber: '' };
    }

    const countryCode = countryCodes.find(cc => customer.whatsapp?.startsWith(cc.dial_code));
    if (countryCode) {
      const whatsappNumber = customer.whatsapp.slice(countryCode.dial_code.length);
      return {
        countryCode: countryCode.code,
        whatsappNumber: formatWhatsAppNumber(whatsappNumber)
      };
    }

    return { countryCode: 'BR', whatsappNumber: '' };
  };

  const [formData, setFormData] = useState({
    name: customer.name,
    email: customer.email || '',
    facebookId: customer.facebook_id || '',
    instagramId: customer.instagram_id || '',
    ...getInitialWhatsAppData()
  });

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatWhatsAppNumber(e.target.value);
    setFormData(prev => ({ ...prev, whatsappNumber: formattedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!currentOrganization) {
      setError(t('common:error'));
      setLoading(false);
      return;
    }

    const cleanWhatsAppNumber = formData.whatsappNumber.replace(/\D/g, '');
    const fullWhatsAppNumber = cleanWhatsAppNumber ? 
      countryCodes.find(c => c.code === formData.countryCode)?.dial_code + cleanWhatsAppNumber :
      null;

    try {
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: formData.name,
          whatsapp: fullWhatsAppNumber,
          email: formData.email || null,
          facebook_id: formData.facebookId || null,
          instagram_id: formData.instagramId || null
        })
        .eq('id', customer.id)
        .eq('organization_id', currentOrganization.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating customer:', err);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('customers:edit.title')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
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
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                <img src="/whatsapp.svg" alt="WhatsApp" className="w-4 h-4 mr-2" />
                WhatsApp
              </label>
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <select
                  className="w-32 h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                  value={formData.countryCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value }))}
                >
                  {countryCodes.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.dial_code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  id="whatsapp"
                  className="flex-1 h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                  value={formData.whatsappNumber}
                  onChange={handleWhatsAppChange}
                  placeholder="99 99999-9999"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {countryCodes.find(c => c.code === formData.countryCode)?.name}
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                {t('customers:edit.email')}
              </label>
              <input
                type="email"
                id="email"
                className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                <img src="/facebook.svg" alt="Facebook" className="w-4 h-4 mr-2" />
                Facebook ID
              </label>
              <input
                type="text"
                id="facebook"
                className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                value={formData.facebookId}
                onChange={(e) => setFormData(prev => ({ ...prev, facebookId: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                <img src="/instagram.svg" alt="Instagram" className="w-4 h-4 mr-2" />
                Instagram ID
              </label>
              <input
                type="text"
                id="instagram"
                className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                value={formData.instagramId}
                onChange={(e) => setFormData(prev => ({ ...prev, instagramId: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common:back')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('common:saving')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}