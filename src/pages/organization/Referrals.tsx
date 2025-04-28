import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Link2, Plus, Loader2, X, AlertTriangle, Copy, Code } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Referral {
  id: string;
  organization_id: string;
  user_id: string;
  code: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface TrackingPixel {
  id: string;
  organization_id: string;
  referral_id: string;
  name: string;
  type: 'facebook' | 'google' | 'tiktok' | 'custom';
  pixel_id: string;
  token: string;
  configuration: Record<string, unknown>;
  status: 'active' | 'inactive';
  created_at: string;
}

interface ReferralFormData {
  code: string;
  status: 'active' | 'inactive';
}

interface TrackingPixelFormData {
  name: string;
  type: 'facebook' | 'google' | 'tiktok' | 'custom';
  pixel_id: string;
  token: string;
  status: 'active';
}

function generateFriendlyCode(fullName: string): string {
  // Remove acentos e caracteres especiais
  const normalized = fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Converte para minúsculas e remove caracteres não alfanuméricos
  const clean = normalized.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Pega os primeiros caracteres
  const base = clean.slice(0, 8);
  // Adiciona um número aleatório de 4 dígitos
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${base}${random}`;
}

export default function Referrals() {
  const { t } = useTranslation(['referrals', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const { profileId } = useParams();
  
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [referralForm, setReferralForm] = useState<ReferralFormData>({
    code: '',
    status: 'active',
  });
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [showPixelsModal, setShowPixelsModal] = useState(false);
  const [trackingPixels, setTrackingPixels] = useState<TrackingPixel[]>([]);
  const [loadingPixels, setLoadingPixels] = useState(false);
  const [showAddPixelModal, setShowAddPixelModal] = useState(false);
  const [savingPixel, setSavingPixel] = useState(false);
  const [pixelForm, setPixelForm] = useState<TrackingPixelFormData>({
    name: '',
    type: 'facebook',
    pixel_id: '',
    token: '',
    status: 'active'
  });

  useEffect(() => {
    if (currentOrganizationMember && profileId) {
      loadReferrals();
      loadProfile();
    }
  }, [currentOrganizationMember, profileId]);

  useEffect(() => {
    if (showCreateModal && profile) {
      setReferralForm({
        ...referralForm,
        code: generateFriendlyCode(profile.full_name),
      });
    }
  }, [showCreateModal, profile]);

  async function loadProfile() {
    if (!profileId) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', profileId)
        .single();

      if (error) throw error;
      setProfile(profile);
    } catch (error) {
      console.error('Error loading profile:', error);
      setError(t('common:error'));
    }
  }

  async function loadReferrals() {
    if (!currentOrganizationMember || !profileId) return;

    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*, profile:profiles(full_name, email)')
        .eq('organization_id', currentOrganizationMember.organization.id)
        .eq('user_id', profileId);

      if (error) throw error;
      setReferrals(data || []);
    } catch (error) {
      console.error('Error loading referrals:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  async function loadTrackingPixels(referralId: string) {
    setLoadingPixels(true);
    try {
      const { data, error } = await supabase
        .from('tracking_pixels')
        .select('*')
        .eq('referral_id', referralId);

      if (error) throw error;
      setTrackingPixels(data || []);
    } catch (error) {
      console.error('Error loading tracking pixels:', error);
      setError(t('common:error'));
    } finally {
      setLoadingPixels(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganizationMember || !profileId) return;

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('referrals')
        .insert([
          {
            organization_id: currentOrganizationMember.organization.id,
            user_id: profileId,
            code: referralForm.code,
            status: referralForm.status,
          },
        ]);

      if (error) throw error;

      await loadReferrals();
      setShowCreateModal(false);
      setReferralForm({ code: '', status: 'active' });
    } catch (error: unknown) {
      console.error('Error creating referral:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReferral) return;

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('referrals')
        .update({
          code: referralForm.code,
          status: referralForm.status,
        })
        .eq('id', selectedReferral.id);

      if (error) throw error;

      await loadReferrals();
      setShowEditModal(false);
      setSelectedReferral(null);
    } catch (error: unknown) {
      console.error('Error updating referral:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedReferral) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('referrals')
        .delete()
        .eq('id', selectedReferral.id);

      if (error) throw error;

      await loadReferrals();
      setShowDeleteModal(false);
      setSelectedReferral(null);
    } catch (error: unknown) {
      console.error('Error deleting referral:', error);
      setError(t('common:error'));
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddPixel(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReferral || !currentOrganizationMember) return;

    setSavingPixel(true);
    try {
      const { error } = await supabase
        .from('tracking_pixels')
        .insert([
          {
            organization_id: currentOrganizationMember.organization.id,
            referral_id: selectedReferral.id,
            name: pixelForm.name,
            type: pixelForm.type,
            pixel_id: pixelForm.pixel_id,
            token: pixelForm.token,
            configuration: {},
            status: pixelForm.status,
          },
        ]);

      if (error) throw error;

      await loadTrackingPixels(selectedReferral.id);
      setShowAddPixelModal(false);
      setPixelForm({
        name: '',
        type: 'facebook',
        pixel_id: '',
        token: '',
        status: 'active'
      });
    } catch (error) {
      console.error('Error adding pixel:', error);
      setError(t('common:error'));
    } finally {
      setSavingPixel(false);
    }
  }

  async function handleDeletePixel(pixelId: string) {
    if (!selectedReferral) return;

    try {
      const { error } = await supabase
        .from('tracking_pixels')
        .delete()
        .eq('id', pixelId);

      if (error) throw error;

      await loadTrackingPixels(selectedReferral.id);
    } catch (error) {
      console.error('Error deleting pixel:', error);
      setError(t('common:error'));
    }
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code);
    // Você pode adicionar uma notificação de sucesso aqui
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Link2 className="w-6 h-6 mr-2" />
            {t('referrals:title')}
          </h1>
          {profile && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {profile.full_name} ({profile.email})
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          title={t('referrals:actions.create')}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('referrals:table.code')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('referrals:table.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('referrals:table.created')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('referrals:table.pixels')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('referrals:table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {referrals.map((referral) => (
              <tr key={referral.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900 dark:text-white font-medium">
                      {referral.code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(referral.code)}
                      className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title={t('referrals:actions.copy')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    referral.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                    {t(`referrals:status.${referral.status}`)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(referral.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => {
                      setSelectedReferral(referral);
                      loadTrackingPixels(referral.id);
                      setShowPixelsModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    title={t('referrals:actions.managePixels')}
                  >
                    <Code className="w-4 h-4" />
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setSelectedReferral(referral);
                        setReferralForm({
                          code: referral.code,
                          status: referral.status,
                        });
                        setShowEditModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      title={t('referrals:actions.edit')}
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReferral(referral);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center justify-center w-8 h-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
                      title={t('referrals:actions.delete')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {showCreateModal ? t('referrals:create.title') : t('referrals:edit.title')}
              </h3>
              <button
                onClick={() => {
                  if (showCreateModal) {
                    setShowCreateModal(false);
                  } else {
                    setShowEditModal(false);
                  }
                  setSelectedReferral(null);
                }}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={showCreateModal ? handleCreate : handleEdit} className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('referrals:form.code')}
                  </label>
                  <input
                    type="text"
                    id="code"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={referralForm.code}
                    onChange={(e) => setReferralForm({ ...referralForm, code: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('referrals:form.status')}
                  </label>
                  <select
                    id="status"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={referralForm.status}
                    onChange={(e) => setReferralForm({ ...referralForm, status: e.target.value as 'active' | 'inactive' })}
                  >
                    <option value="active">{t('referrals:status.active')}</option>
                    <option value="inactive">{t('referrals:status.inactive')}</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    if (showCreateModal) {
                      setShowCreateModal(false);
                    } else {
                      setShowEditModal(false);
                    }
                    setSelectedReferral(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {showCreateModal ? t('common:create') : t('common:save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedReferral && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('referrals:delete.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('referrals:delete.confirmation', { code: selectedReferral.code })}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedReferral(null);
                  }}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common:deleting')}
                    </>
                  ) : (
                    t('common:confirmDelete')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Pixels Modal */}
      {showPixelsModal && selectedReferral && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('referrals:pixels.title')} - {selectedReferral.code}
              </h3>
              <button
                onClick={() => setShowPixelsModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('referrals:pixels.list')}
                </h4>
                <button
                  onClick={() => setShowAddPixelModal(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('referrals:pixels.add')}
                </button>
              </div>

              {loadingPixels ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('referrals:pixels.name')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('referrals:pixels.type')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('referrals:pixels.id')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('referrals:pixels.token')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('referrals:pixels.status')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('referrals:pixels.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {trackingPixels.map((pixel) => (
                        <tr key={pixel.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {pixel.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                            {pixel.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {pixel.pixel_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {pixel.token ? <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{pixel.token.substring(0, 8)}...</span> : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              pixel.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}>
                              {t(`referrals:status.${pixel.status}`)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <button
                              onClick={() => handleDeletePixel(pixel.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {trackingPixels.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            {t('referrals:pixels.empty')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Pixel Modal */}
      {showAddPixelModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('referrals:pixels.addNew')}
              </h3>
              <button
                onClick={() => setShowAddPixelModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPixel} className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="pixelName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('referrals:pixels.name')}
                  </label>
                  <input
                    type="text"
                    id="pixelName"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={pixelForm.name}
                    onChange={(e) => setPixelForm({ ...pixelForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="pixelType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('referrals:pixels.type')}
                  </label>
                  <select
                    id="pixelType"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={pixelForm.type}
                    onChange={(e) => setPixelForm({ ...pixelForm, type: e.target.value as TrackingPixel['type'] })}
                  >
                    <option value="facebook">{t('referrals:pixels.types.facebook')}</option>
                    <option value="google">{t('referrals:pixels.types.google')}</option>
                    <option value="tiktok">{t('referrals:pixels.types.tiktok')}</option>
                    <option value="custom">{t('referrals:pixels.types.custom')}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="pixelId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('referrals:pixels.id')}
                  </label>
                  <input
                    type="text"
                    id="pixelId"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={pixelForm.pixel_id}
                    onChange={(e) => setPixelForm({ ...pixelForm, pixel_id: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="pixelToken" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('referrals:pixels.token')}
                  </label>
                  <input
                    type="text"
                    id="pixelToken"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={pixelForm.token}
                    onChange={(e) => setPixelForm({ ...pixelForm, token: e.target.value })}
                    placeholder={t('referrals:pixels.tokenPlaceholder')}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddPixelModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingPixel}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {savingPixel && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('common:save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 