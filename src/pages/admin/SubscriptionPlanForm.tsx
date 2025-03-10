import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';

interface FormData {
  name_pt: string;
  name_en: string;
  name_es: string;
  description_pt: string;
  description_en: string;
  description_es: string;
  price_brl: number;
  price_usd: number;
  default_currency: 'BRL' | 'USD';
  max_users: number;
  max_customers: number;
  max_channels: number;
  max_flows: number;
  max_teams: number;
  storage_limit: number;
  additional_user_price_brl: number;
  additional_user_price_usd: number;
  additional_channel_price_brl: number;
  additional_channel_price_usd: number;
  additional_flow_price_brl: number;
  additional_flow_price_usd: number;
  additional_team_price_brl: number;
  additional_team_price_usd: number;
  stripe_price_id: string;
  features_pt: string[];
  features_en: string[];
  features_es: string[];
  currentLanguage: 'pt' | 'en' | 'es';
}

const initialFormData: FormData = {
  name_pt: '',
  name_en: '',
  name_es: '',
  description_pt: '',
  description_en: '',
  description_es: '',
  price_brl: 0,
  price_usd: 0,
  default_currency: 'BRL',
  max_users: 1,
  max_customers: 100,
  max_channels: 1,
  max_flows: 5,
  max_teams: 1,
  storage_limit: 104857600, // 100MB em bytes
  additional_user_price_brl: 39.99,
  additional_user_price_usd: 7.99,
  additional_channel_price_brl: 89.99,
  additional_channel_price_usd: 17.99,
  additional_flow_price_brl: 0,
  additional_flow_price_usd: 0,
  additional_team_price_brl: 0,
  additional_team_price_usd: 0,
  stripe_price_id: '',
  features_pt: [],
  features_en: [],
  features_es: [],
  currentLanguage: 'pt'
};

export default function SubscriptionPlanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t, i18n } = useTranslation(['common', 'subscription']);
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    if (id) {
      loadPlan();
    }
  }, [id]);

  async function loadPlan() {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          ...data,
          features_pt: Array.isArray(data.features_pt) ? data.features_pt : [],
          features_en: Array.isArray(data.features_en) ? data.features_en : [],
          features_es: Array.isArray(data.features_es) ? data.features_es : [],
          currentLanguage: 'pt'
        });
      }
    } catch (err) {
      console.error('Erro ao carregar plano:', err);
      setError(t('common:error'));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const planData = {
        ...formData,
        features_pt: Array.isArray(formData.features_pt) ? formData.features_pt : [],
        features_en: Array.isArray(formData.features_en) ? formData.features_en : [],
        features_es: Array.isArray(formData.features_es) ? formData.features_es : []
      };

      // Remover o campo currentLanguage antes de enviar para o banco
      const { currentLanguage, ...dataToSend } = planData;

      if (id) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(dataToSend)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert([dataToSend]);

        if (error) throw error;
      }

      navigate('/app/admin/subscription-plans');
    } catch (err) {
      console.error('Erro ao salvar plano:', err);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  const getCurrentFeatures = () => {
    switch (formData.currentLanguage) {
      case 'en':
        return formData.features_en;
      case 'es':
        return formData.features_es;
      default:
        return formData.features_pt;
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      const feature = newFeature.trim();
      
      setFormData(prev => {
        const updatedData = { ...prev };
        
        // Adicionar o recurso no idioma atual
        if (prev.currentLanguage === 'pt') {
          updatedData.features_pt = Array.isArray(prev.features_pt) 
            ? [...prev.features_pt, feature] 
            : [feature];
        } else if (prev.currentLanguage === 'en') {
          updatedData.features_en = Array.isArray(prev.features_en) 
            ? [...prev.features_en, feature] 
            : [feature];
        } else if (prev.currentLanguage === 'es') {
          updatedData.features_es = Array.isArray(prev.features_es) 
            ? [...prev.features_es, feature] 
            : [feature];
        }
        
        return updatedData;
      });
      
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => {
      const updatedData = { ...prev };
      
      // Remover o recurso do idioma atual
      if (prev.currentLanguage === 'pt') {
        updatedData.features_pt = Array.isArray(prev.features_pt) 
          ? prev.features_pt.filter((_, i) => i !== index) 
          : [];
      } else if (prev.currentLanguage === 'en') {
        updatedData.features_en = Array.isArray(prev.features_en) 
          ? prev.features_en.filter((_, i) => i !== index) 
          : [];
      } else if (prev.currentLanguage === 'es') {
        updatedData.features_es = Array.isArray(prev.features_es) 
          ? prev.features_es.filter((_, i) => i !== index) 
          : [];
      }
      
      return updatedData;
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/app/admin/subscription-plans"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('common:back')}
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {id ? t('subscription:plans.edit') : t('subscription:plans.create')}
        </h1>

        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Nome em diferentes idiomas */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label htmlFor="name_pt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('subscription:plans.form.namePt')} *
              </label>
              <input
                type="text"
                id="name_pt"
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                value={formData.name_pt}
                onChange={(e) => setFormData(prev => ({ ...prev, name_pt: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="name_en" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('subscription:plans.form.nameEn')} *
              </label>
              <input
                type="text"
                id="name_en"
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                value={formData.name_en}
                onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="name_es" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('subscription:plans.form.nameEs')} *
              </label>
              <input
                type="text"
                id="name_es"
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                value={formData.name_es}
                onChange={(e) => setFormData(prev => ({ ...prev, name_es: e.target.value }))}
              />
            </div>
          </div>

          {/* Descrição em diferentes idiomas */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label htmlFor="description_pt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('subscription:plans.form.descriptionPt')}
              </label>
              <textarea
                id="description_pt"
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                value={formData.description_pt}
                onChange={(e) => setFormData(prev => ({ ...prev, description_pt: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="description_en" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('subscription:plans.form.descriptionEn')}
              </label>
              <textarea
                id="description_en"
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                value={formData.description_en}
                onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="description_es" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('subscription:plans.form.descriptionEs')}
              </label>
              <textarea
                id="description_es"
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                value={formData.description_es}
                onChange={(e) => setFormData(prev => ({ ...prev, description_es: e.target.value }))}
              />
            </div>
          </div>

          {/* Preços e moeda padrão */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label htmlFor="price_brl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('subscription:plans.form.priceBrl')} *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">R$</span>
                </div>
                <input
                  type="number"
                  id="price_brl"
                  required
                  min="0"
                  step="0.01"
                  className="pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                  value={formData.price_brl}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_brl: parseFloat(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <label htmlFor="price_usd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('subscription:plans.form.priceUsd')} *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="price_usd"
                  required
                  min="0"
                  step="0.01"
                  className="pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                  value={formData.price_usd}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_usd: parseFloat(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <label htmlFor="default_currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('subscription:plans.form.defaultCurrency')} *
              </label>
              <select
                id="default_currency"
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                value={formData.default_currency}
                onChange={(e) => setFormData(prev => ({ ...prev, default_currency: e.target.value as 'BRL' | 'USD' }))}
              >
                <option value="BRL">Real (BRL)</option>
                <option value="USD">Dólar (USD)</option>
              </select>
            </div>
          </div>

          {/* Limites */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('subscription:plans.form.limits')}
            </h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="max_users" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.maxUsers')} *
                </label>
                <input
                  type="number"
                  id="max_users"
                  required
                  min="1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                  value={formData.max_users}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_users: parseInt(e.target.value) }))}
                />
              </div>

              <div>
                <label htmlFor="max_customers" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.maxCustomers')} *
                </label>
                <input
                  type="number"
                  id="max_customers"
                  required
                  min="1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                  value={formData.max_customers}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_customers: parseInt(e.target.value) }))}
                />
              </div>

              <div>
                <label htmlFor="max_channels" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.maxChannels')} *
                </label>
                <input
                  type="number"
                  id="max_channels"
                  required
                  min="1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                  value={formData.max_channels}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_channels: parseInt(e.target.value) }))}
                />
              </div>

              <div>
                <label htmlFor="max_flows" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.maxFlows')} *
                </label>
                <input
                  type="number"
                  id="max_flows"
                  required
                  min="1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                  value={formData.max_flows}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_flows: parseInt(e.target.value) }))}
                />
              </div>

              <div>
                <label htmlFor="max_teams" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.maxTeams')} *
                </label>
                <input
                  type="number"
                  id="max_teams"
                  required
                  min="1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                  value={formData.max_teams}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_teams: parseInt(e.target.value) }))}
                />
              </div>

              <div>
                <label htmlFor="storage_limit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.storageLimit')} (MB) *
                </label>
                <input
                  type="number"
                  id="storage_limit"
                  required
                  min="1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                  value={formData.storage_limit / 1048576} // Convertendo bytes para MB
                  onChange={(e) => setFormData(prev => ({ ...prev, storage_limit: parseInt(e.target.value) * 1048576 }))}
                />
              </div>
            </div>
          </div>

          {/* Preços adicionais */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('subscription:plans.form.additionalPrices')}
            </h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="additional_user_price_brl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.additionalUserPriceBrl')}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    id="additional_user_price_brl"
                    min="0"
                    step="0.01"
                    className="pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                    value={formData.additional_user_price_brl}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_user_price_brl: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="additional_user_price_usd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.additionalUserPriceUsd')}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="additional_user_price_usd"
                    min="0"
                    step="0.01"
                    className="pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                    value={formData.additional_user_price_usd}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_user_price_usd: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="additional_channel_price_brl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.additionalChannelPriceBrl')}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    id="additional_channel_price_brl"
                    min="0"
                    step="0.01"
                    className="pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                    value={formData.additional_channel_price_brl}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_channel_price_brl: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="additional_channel_price_usd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.additionalChannelPriceUsd')}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="additional_channel_price_usd"
                    min="0"
                    step="0.01"
                    className="pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                    value={formData.additional_channel_price_usd}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_channel_price_usd: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="additional_flow_price_brl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.additionalFlowPriceBrl')}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    id="additional_flow_price_brl"
                    min="0"
                    step="0.01"
                    className="pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                    value={formData.additional_flow_price_brl}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_flow_price_brl: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="additional_flow_price_usd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.additionalFlowPriceUsd')}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="additional_flow_price_usd"
                    min="0"
                    step="0.01"
                    className="pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                    value={formData.additional_flow_price_usd}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_flow_price_usd: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="additional_team_price_brl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.additionalTeamPriceBrl')}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    id="additional_team_price_brl"
                    min="0"
                    step="0.01"
                    className="pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                    value={formData.additional_team_price_brl}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_team_price_brl: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="additional_team_price_usd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:plans.form.additionalTeamPriceUsd')}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="additional_team_price_usd"
                    min="0"
                    step="0.01"
                    className="pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                    value={formData.additional_team_price_usd}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_team_price_usd: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('subscription:plans.form.features')}
            </label>
            
            {/* Seletor de idioma para features */}
            <div className="mb-4">
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                    formData.currentLanguage === 'pt'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, currentLanguage: 'pt' }))}
                >
                  Português
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium ${
                    formData.currentLanguage === 'en'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, currentLanguage: 'en' }))}
                >
                  English
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                    formData.currentLanguage === 'es'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, currentLanguage: 'es' }))}
                >
                  Español
                </button>
              </div>
            </div>
            
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder={t('subscription:plans.form.addFeature')}
              />
              <button
                type="button"
                onClick={addFeature}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common:add')}
              </button>
            </div>
            <ul className="space-y-2">
              {getCurrentFeatures().map((feature, index) => (
                <li key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="text-red-600 hover:text-red-800 dark:hover:text-red-400"
                  >
                    {t('common:remove')}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Stripe */}
          <div>
            <label htmlFor="stripe_price_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('subscription:plans.form.stripePriceId')}
            </label>
            <input
              type="text"
              id="stripe_price_id"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm px-4 py-2"
              value={formData.stripe_price_id}
              onChange={(e) => setFormData(prev => ({ ...prev, stripe_price_id: e.target.value }))}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Link
              to="/app/admin/subscription-plans"
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              {t('common:cancel')}
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? t('common:saving') : t('common:save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 