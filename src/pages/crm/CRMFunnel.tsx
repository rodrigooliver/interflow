import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { supabase } from '../../lib/supabase';
import { CRMFunnel as CRMFunnelType, CRMStage } from '../../types/crm';
import { Customer } from '../../types/database';
import { KanbanBoard } from '../../components/crm/KanbanBoard';
import { StageModal } from '../../components/crm/StageModal';
import { DeleteStageModal } from '../../components/crm/DeleteStageModal';
import { AddCustomerModal } from '../../components/crm/AddCustomerModal';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';
import { RemoveCustomerModal } from '../../components/crm/RemoveCustomerModal';
import { FunnelHeader } from '../../components/crm/FunnelHeader';
import type { DragEndEvent } from '@dnd-kit/core';

// Tipo composto para cliente com estágio
type CustomerWithStage = Customer & {
  stage?: CRMStage;
};

export default function CRMFunnel() {
  const { t } = useTranslation(['crm', 'common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationContext();
  
  // State
  const [funnel, setFunnel] = useState<CRMFunnelType | null>(null);
  const [stages, setStages] = useState<CRMStage[]>([]);
  const [customers, setCustomers] = useState<CustomerWithStage[]>([]);
  const [error, setError] = useState('');

  // Modal states
  const [showStageModal, setShowStageModal] = useState(false);
  const [showDeleteStageModal, setShowDeleteStageModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showRemoveCustomerModal, setShowRemoveCustomerModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState<CRMStage | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStage | null>(null);
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
        .select(`
          *,
          stage:stage_id(*)
        `)
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

    // Get the customer being dragged
    const customer = customers.find(c => c.id === active.id);
    if (!customer) return;

    // Get target stage
    const targetStage = stages.find(s => s.id === over.id);
    if (!targetStage) return;

    // If trying to move to the same stage, abort
    if (customer.stage_id === targetStage.id) {
      return;
    }

    try {
      // Update customer's stage_id
      const { error } = await supabase
        .from('customers')
        .update({
          stage_id: targetStage.id
        })
        .eq('id', customer.id);

      if (error) throw error;

      // Update local state
      setCustomers(prev =>
        prev.map(c =>
          c.id === customer.id
            ? { ...c, stage_id: targetStage.id, stage: targetStage }
            : c
        )
      );

      // Record the stage change in history
      await supabase
        .from('customer_stage_history')
        .insert({
          customer_id: customer.id,
          stage_id: targetStage.id,
          organization_id: currentOrganization?.id
        });
    } catch (error) {
      console.error('Error updating customer stage:', error);
      setError(t('common:error'));
    }
  }

  async function handleAddCustomer(customerId: string) {
    if (!selectedStage) return;
    setAddingCustomer(true);
    try {
      // Update customer's stage_id
      const { error } = await supabase
        .from('customers')
        .update({
          stage_id: selectedStage.id
        })
        .eq('id', customerId);

      if (error) throw error;

      // Record the stage change in history
      await supabase
        .from('customer_stage_history')
        .insert({
          customer_id: customerId,
          stage_id: selectedStage.id,
          organization_id: currentOrganization?.id
        });

      await loadCustomers();
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
    const stageCustomers = customers.filter(c => c.stage_id === selectedStage.id);
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

  async function handleRemoveCustomerFromFunnel() {
    if (!selectedCustomer) return;
    
    try {
      // Set customer's stage_id to null
      const { error } = await supabase
        .from('customers')
        .update({
          stage_id: null
        })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      // Update local state
      setCustomers(prev =>
        prev.map(c =>
          c.id === selectedCustomer.id
            ? { ...c, stage_id: null, stage: undefined }
            : c
        )
      );
      
      setShowRemoveCustomerModal(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Error removing customer from funnel:', error);
      setError(t('common:error'));
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
        onCustomerAdded={loadCustomers}
      />

      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          stages={stages}
          customers={customers}
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
          onEditCustomer={(customer) => {
            setSelectedCustomer(customer);
            setShowEditCustomerModal(true);
          }}
          onRemoveCustomer={(customer) => {
            setSelectedCustomer(customer);
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
      {showEditCustomerModal && selectedCustomer && (
        <CustomerEditModal
          customer={selectedCustomer}
          onClose={() => {
            setShowEditCustomerModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={loadCustomers}
        />
      )}

      {/* Remove Customer Modal */}
      {showRemoveCustomerModal && selectedCustomer && (
        <RemoveCustomerModal
          customer={selectedCustomer}
          onClose={() => {
            setShowRemoveCustomerModal(false);
            setSelectedCustomer(null);
          }}
          onConfirm={handleRemoveCustomerFromFunnel}
        />
      )}
    </div>
  );
}