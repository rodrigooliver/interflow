import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface FormData {
  organizationName: string;
  organizationSlug: string;
  organizationEmail: string;
  organizationWhatsapp: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export default function AddOrganization() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    organizationName: '',
    organizationSlug: '',
    organizationEmail: '',
    organizationWhatsapp: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.organizationName,
          slug: formData.organizationSlug,
          email: formData.organizationEmail,
          whatsapp: formData.organizationWhatsapp
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Create admin user
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.adminPassword,
        options: {
          data: {
            full_name: formData.adminName
          }
        }
      });

      if (userError) throw userError;

      // 3. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userData.user?.id,
          email: formData.adminEmail,
          full_name: formData.adminName,
          role: 'admin'
        });

      if (profileError) throw profileError;

      // 4. Create organization membership
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: userData.user?.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      // 5. Create default subscription
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'Free')
        .single();

      if (planError) throw planError;

      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          organization_id: orgData.id,
          plan_id: planData.id,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false
        });

      if (subscriptionError) throw subscriptionError;

      // Success - redirect to organizations list
      navigate('/app/admin/organizations');
    } catch (error: unknown) {
      console.error('Error creating organization:', error);
      setError(typeof error === 'object' && error !== null && 'message' in error 
        ? (error as { message: string }).message 
        : 'Ocorreu um erro ao criar a organização');
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({
      ...formData,
      organizationName: name,
      organizationSlug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({
      ...formData,
      organizationSlug: slug
    });
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Link
            to="/app/admin/organizations"
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar para Organizações
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Nova Organização</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Dados da Organização</h2>
              
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome da Organização *
                </label>
                <input
                  type="text"
                  id="organizationName"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.organizationName}
                  onChange={handleOrganizationNameChange}
                />
              </div>

              <div>
                <label htmlFor="organizationSlug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  id="organizationSlug"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.organizationSlug}
                  onChange={handleSlugChange}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Identificador único para a organização (apenas letras minúsculas, números e hífens)
                </p>
              </div>

              <div>
                <label htmlFor="organizationEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email da Organização
                </label>
                <input
                  type="email"
                  id="organizationEmail"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.organizationEmail}
                  onChange={(e) => setFormData({ ...formData, organizationEmail: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="organizationWhatsapp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  WhatsApp da Organização
                </label>
                <input
                  type="text"
                  id="organizationWhatsapp"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  placeholder="+55 (11) 98765-4321"
                  value={formData.organizationWhatsapp}
                  onChange={(e) => setFormData({ ...formData, organizationWhatsapp: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Administrador</h2>
              
              <div>
                <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  id="adminName"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="adminEmail"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Senha *
                </label>
                <input
                  type="password"
                  id="adminPassword"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Organização
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}