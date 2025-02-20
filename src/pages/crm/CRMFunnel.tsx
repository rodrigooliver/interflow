import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '../../hooks/useOrganization';
import { supabase } from '../../lib/supabase';
import { CRMFunnel as CRMFunnelType, CRMStage, CRMCustomerStage } from '../../types/crm';
import { Customer } from '../../types/database';
import { KanbanBoard } from '../../components/crm/KanbanBoard';
import { StageModal } from '../../components/crm/StageModal';
import { DeleteStageModal } from '../../components/crm/DeleteStageModal';
import { AddCustomerModal } from '../../components/crm/AddCustomerModal';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';
import { RemoveCustomerModal } from '../../components/crm/RemoveCustomerModal';
import { FunnelHeader } from '../../components/crm/FunnelHeader';
import type { DragEndEvent } from '@dnd-kit/core';

export default function CRMFunnel() {
  const { t } = useTranslation(['crm', 'common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  
  // State
  const [funnel, setFunnel] = useState<CRMFunnelType | null>(null);
  const [stages, setStages] = useState<CRMStage[]>([]);
  const [customerStages, setCustomerStages] = useState<CRMCustomerStage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState('');

  // Modal states
  const [showStageModal, setShowStageModal] = useState(false);
  const [showDeleteStageModal, setShowDeleteStageModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showRemoveCustomerModal, setShowRemoveCustomerModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState<CRMStage | null>(null);
  const [selectedCustomerStage, setSelectedCustomerStage] = useState<CRMCustomerStage | null>(null);
  const [stageForm, setStageForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  // Loading states
  const [creatingStage, setCreatingStage] = useState(false);
  const [deletingStage, setDeletingStage] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);

  useEffect(() => {
    if (currentOrganization && id) {
      loadFunnel();
      loadCustomers();
    }
  }, [currentOrganization, id]);

  async function loadFunnel() {
    try {
      const { data: funnelData, error: funnelError } = await supabase
        .from('crm_funnels')
        .select('*')
        .eq('id', id)
        .single();

      if (funnelError) throw funnelError;

      if (funnelData) {
        setFunnel(funnelData);

        const { data: stagesData, error: stagesError } = await supabase
          .from('crm_stages')
          .select('*')
          .eq('funnel_id', id)
          .order('position');

        if (stagesError) throw stagesError;
        setStages(stagesData || []);

        if (stagesData && stagesData.length > 0) {
          const { data: customerStagesData, error: customerStagesError } = await supabase
            .from('crm_customer_stages')
            .select(`
              *,
              customer:customers(*)
            `)
            .in('stage_id', stagesData.map(s => s.id));

          if (customerStagesError) throw customerStagesError;
          setCustomerStages(customerStagesData || []);
        }
      }
    } catch (error) {
      console.error('Error loading funnel:', error);
      setError(t('common:error'));
    }
  }

  async function loadCustomers() {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      setError(t('common:error'));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (!active || !over) return;

    // Get the current customer stage
    const customerStage = customerStages.find(cs => cs.id === active.id);
    if (!customerStage) return;

    // Get source and target stages
    const sourceStage = stages.find(s => s.id === customerStage.stage_id);
    const targetStage = stages.find(s => s.id === over.id);

    // If source or target stage not found, abort
    if (!sourceStage || !targetStage) return;

    // If trying to move to the same stage, abort
    if (sourceStage.id === targetStage.id) {
      return;
    }

    try {
      const { error } = await supabase
        .from('crm_customer_stages')
        .update({
          stage_id: targetStage.id,
          moved_at: new Date().toISOString()
        })
        .eq('id', active.id);

      if (error) throw error;

      setCustomerStages(prev =>
        prev.map(cs =>
          cs.id === active.id
            ? { ...cs, stage_id: targetStage.id, moved_at: new Date().toISOString() }
            : cs
        )
      );
    } catch (error) {
      console.error('Error updating customer stage:', error);
      setError(t('common:error'));
    }
  }

  async function handleAddCustomer(customerId: string) {
    if (!selectedStage) return;
    setAddingCustomer(true);
    try {
      const { error } = await supabase
        .from('crm_customer_stages')
        .insert({
          customer_id: customerId,
          stage_id: selectedStage.id,
          moved_at: new Date().toISOString()
        });

      if (error) throw error;

      await loadFunnel();
    } catch (error) {
      console.error('Error adding customer to stage:', error);
      setError(t('common:error'));
    } finally {
      setAddingCustomer(false);
    }
  }

  async function handleCreateStage(e: React.FormEvent) {
    e.preventDefault();
    if (!funnel) return;

    setCreatingStage(true);
    try {
      const position = stages.length;
      const { data, error } = await supabase
        .from('crm_stages')
        .insert([
          {
            funnel_id: funnel.id,
            name: stageForm.name,
            description: stageForm.description,
            color: stageForm.color,
            position
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setStages([...stages, data]);
      setShowStageModal(false);
      setStageForm({ name: '', description: '', color: '#3B82F6' });
    } catch (error) {
      console.error('Error creating stage:', error);
      setError(t('common:error'));
    } finally {
      setCreatingStage(false);
    }
  }

  async function handleUpdateStage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStage) return;

    setCreatingStage(true);
    try {
      const { error } = await supabase
        .from('crm_stages')
        .update({
          name: stageForm.name,
          description: stageForm.description,
          color: stageForm.color
        })
        .eq('id', selectedStage.id);

      if (error) throw error;

      setStages(prev =>
        prev.map(stage =>
          stage.id === selectedStage.id
            ? { ...stage, ...stageForm }
            : stage
        )
      );
      setShowStageModal(false);
      setSelectedStage(null);
      setStageForm({ name: '', description: '', color: '#3B82F6' });
    } catch (error) {
      console.error('Error updating stage:', error);
      setError(t('common:error'));
    } finally {
      setCreatingStage(false);
    }
  }

  async function handleDeleteStage() {
    if (!selectedStage) return;
    
    // Check if stage has customers
    const stageCustomers = customerStages.filter(cs => cs.stage_id === selectedStage.id);
    if (stageCustomers.length > 0) {
      setError(t('crm:funnels.delete.hasCustomers'));
      return;
    }
    
    setDeletingStage(true);
    try {
      const { error } = await supabase
        .from('crm_stages')
        .delete()
        .eq('id', selectedStage.id);

      if (error) throw error;

      setStages(prev => prev.filter(stage => stage.id !== selectedStage.id));
      setShowDeleteStageModal(false);
      setSelectedStage(null);
    } catch (error) {
      console.error('Error deleting stage:', error);
      setError(t('common:error'));
    } finally {
      setDeletingStage(false);
    }
  }

  const handleCloseDeleteStageModal = () => {
    setShowDeleteStageModal(false);
    setSelectedStage(null);
    setError(''); // Clear error message when closing modal
  };

  if (!currentOrganization || !funnel) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <FunnelHeader
        funnelName={funnel.name}
        funnel={funnel}
        onBack={() => navigate('/app/crm')}
        onAddStage={() => {
          setSelectedStage(null);
          setStageForm({ name: '', description: '', color: '#3B82F6' });
          setShowStageModal(true);
        }}
        onCustomerAdded={loadFunnel}
      />

      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          stages={stages}
          customerStages={customerStages}
          onDragEnd={handleDragEnd}
          onEditStage={(stage) => {
            setSelectedStage(stage);
            setStageForm({
              name: stage.name,
              description: stage.description || '',
              color: stage.color
            });
            setShowStageModal(true);
          }}
          onDeleteStage={(stage) => {
            setSelectedStage(stage);
            setShowDeleteStageModal(true);
          }}
          onAddCustomer={(stage) => {
            setSelectedStage(stage);
            setShowAddCustomerModal(true);
          }}
          onEditCustomer={(customerStage) => {
            setSelectedCustomerStage(customerStage);
            setShowEditCustomerModal(true);
          }}
          onRemoveCustomer={(customerStage) => {
            setSelectedCustomerStage(customerStage);
            setShowRemoveCustomerModal(true);
          }}
        />
      </div>

      {/* Stage Modal */}
      {showStageModal && (
        <StageModal
          onSubmit={selectedStage ? handleUpdateStage : handleCreateStage}
          onClose={() => {
            setShowStageModal(false);
            setSelectedStage(null);
            setStageForm({ name: '', description: '', color: '#3B82F6' });
          }}
          formData={stageForm}
          onChange={setStageForm}
          isEditing={!!selectedStage}
          loading={creatingStage}
          error={error}
        />
      )}

      {/* Delete Stage Modal */}
      {showDeleteStageModal && selectedStage && (
        <DeleteStageModal
          stage={selectedStage}
          onConfirm={handleDeleteStage}
          onCancel={handleCloseDeleteStageModal}
          loading={deletingStage}
          error={error}
        />
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && selectedStage && funnel && (
        <AddCustomerModal
          onAdd={handleAddCustomer}
          onClose={() => {
            setShowAddCustomerModal(false);
            setSelectedStage(null);
          }}
          customers={customers}
          stageName={selectedStage.name}
          loading={addingCustomer}
          funnelId={funnel.id}
        />
      )}

      {/* Edit Customer Modal */}
      {showEditCustomerModal && selectedCustomerStage?.customer && (
        <CustomerEditModal
          customer={selectedCustomerStage.customer}
          onClose={() => {
            setShowEditCustomerModal(false);
            setSelectedCustomerStage(null);
          }}
          onSuccess={loadFunnel}
        />
      )}

      {/* Remove Customer Modal */}
      {showRemoveCustomerModal && selectedCustomerStage && (
        <RemoveCustomerModal
          customerStage={selectedCustomerStage}
          onClose={() => {
            setShowRemoveCustomerModal(false);
            setSelectedCustomerStage(null);
          }}
          onSuccess={loadFunnel}
        />
      )}
    </div>
  );
}