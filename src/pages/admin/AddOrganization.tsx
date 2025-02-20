import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface FormData {
  organizationName: string;
  organizationSlug: string;
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
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create admin user without signing in
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.adminEmail,
        password: formData.adminPassword,
        email_confirm: true
      });

      if (authError) {
        if (authError.message === 'User already registered') {
          setError('Este email já está cadastrado. Por favor, use outro email.');
          return;
        }
        throw authError;
      }
      
      if (!authData.user) throw new Error('Failed to create user');
      
      const userId = authData.user.id;

      // 2. Create admin profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            email: formData.adminEmail,
            full_name: formData.adminName,
            is_superadmin: false,
            role: 'admin',
          },
        ]);

      if (profileError) throw profileError;

      // 3. Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([
          {
            name: formData.organizationName,
            slug: formData.organizationSlug,
            status: 'active',
          },
        ])
        .select()
        .single();

      if (orgError) throw orgError;

      // 4. Add user as organization owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([
          {
            organization_id: orgData.id,
            user_id: userId,
            role: 'owner',
          },
        ]);

      if (memberError) throw memberError;

      // 5. Create initial subscription (trial)
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'Starter')
        .single();

      if (planData) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14); // 14 days trial

        await supabase
          .from('subscriptions')
          .insert([
            {
              organization_id: orgData.id,
              plan_id: planData.id,
              status: 'trialing',
              current_period_start: new Date().toISOString(),
              current_period_end: trialEnd.toISOString(),
            },
          ]);
      }

      navigate('/app/admin/organizations');
    } catch (err: any) {
      console.error('Error creating organization:', err);
      setError(err.message || 'Erro ao criar organização');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleOrganizationNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      organizationName: name,
      organizationSlug: generateSlug(name)
    }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      organizationSlug: generateSlug(value)
    }));
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
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Dados do Administrador</h2>
              
              <div>
                <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Administrador *
                </label>
                <input
                  type="text"
                  id="adminName"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.adminName}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email do Administrador *
                </label>
                <input
                  type="email"
                  id="adminEmail"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Senha do Administrador *
                </label>
                <input
                  type="password"
                  id="adminPassword"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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