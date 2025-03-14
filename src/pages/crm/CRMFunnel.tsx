import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CRMStage } from '../../types/crm';
import { Customer } from '../../types/database';
import { KanbanBoard } from '../../components/crm/KanbanBoard';
import { StageModal } from '../../components/crm/StageModal';
import { DeleteStageModal } from '../../components/crm/DeleteStageModal';
import { AddCustomerModal } from '../../components/crm/AddCustomerModal';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';
import { RemoveCustomerModal } from '../../components/crm/RemoveCustomerModal';
import { FunnelHeader } from '../../components/crm/FunnelHeader';
import type { DragEndEvent } from '@dnd-kit/core';
import { useFunnels } from '../../hooks/useQueryes';

// Tipo composto para cliente com estágio
type CustomerWithStage = Customer & {
  stage?: CRMStage;
};

interface CustomerChat {
  id: string;
  created_at: string;
  last_message_id?: string;
  messages?: {
    id: string;
    content: string;
    created_at: string;
    sender_type: string;
  };
}

interface CustomerTag {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    color: string;
  };
}

export default function CRMFunnel() {
  const { t } = useTranslation(['crm', 'common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrganizationMember } = useAuthContext();
  
  // State
  const [funnel, setFunnel] = useState<Record<string, any> | null>(null);
  const [stages, setStages] = useState<CRMStage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
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

  const { data: funnelData } = useFunnels(currentOrganizationMember?.organization.id);

  useEffect(() => {
    if (funnelData && id) {
      const currentFunnel = funnelData.find((f: Record<string, any>) => f.id === id);
      if (currentFunnel) {
        setFunnel(currentFunnel);
        setStages(currentFunnel.stages || []);
      }
    }
  }, [funnelData, id]);

  useEffect(() => {
    if (currentOrganizationMember && id) {
      loadCustomers();
    }
  }, [currentOrganizationMember, id]);

  async function loadCustomers() {
    if (!currentOrganizationMember) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          stage:stage_id(*),
          contacts:customer_contacts(*),
          tags:customer_tags(
            id,
            tag_id,
            tags(
              id,
              name,
              color
            )
          ),
          chats(
            id,
            created_at,
            last_message_id,
            messages!chats_last_message_id_fkey(
              id,
              content,
              created_at,
              sender_type
            )
          )
        `)
        .eq('organization_id', currentOrganizationMember.organization.id)
        .order('name');

      if (error) throw error;

      // Processar os dados para extrair a última mensagem de cada cliente
      const processedCustomers = data?.map(customer => {
        let lastMessage = null;
        
        if (customer.chats && customer.chats.length > 0) {
          // Ordenar os chats pela data de criação (mais recente primeiro)
          const sortedChats = [...customer.chats]
            .sort((a: CustomerChat, b: CustomerChat) => {
              const dateA = new Date(a.created_at).getTime();
              const dateB = new Date(b.created_at).getTime();
              return dateB - dateA;
            });
          
          // Pegar o chat mais recente que tenha uma mensagem
          const recentChatWithMessage = sortedChats.find(
            (chat: CustomerChat) => chat.messages && chat.last_message_id
          );
          
          if (recentChatWithMessage && recentChatWithMessage.messages) {
            lastMessage = recentChatWithMessage.messages;
          }
        }
        
        // Processar as tags para um formato mais fácil de usar
        const processedTags = customer.tags
          ? customer.tags
              .filter((tagRelation: CustomerTag) => tagRelation.tags)
              .map((tagRelation: CustomerTag) => tagRelation.tags)
          : [];
        
        return {
          ...customer,
          last_message: lastMessage,
          tags: processedTags
        };
      });

      setCustomers(processedCustomers || []);
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
          organization_id: currentOrganizationMember?.organization.id
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
          organization_id: currentOrganizationMember?.organization.id
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

  if (!currentOrganizationMember || !funnel) {
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
        {stages.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center max-w-2xl">
              <div className="flex flex-col items-center justify-center space-y-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="w-16 h-16 text-gray-300 dark:text-gray-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" 
                  />
                </svg>
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  {t('crm:stages.noStages')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  {t('crm:stages.noStagesDescription')}
                </p>
                <button
                  onClick={() => {
                    setSelectedStage(null);
                    setStageForm({ name: '', description: '', color: '#3B82F6' });
                    setShowStageModal(true);
                  }}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="w-4 h-4 mr-2" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 4v16m8-8H4" 
                    />
                  </svg>
                  {t('crm:stages.createFirstStage')}
                </button>
              </div>
            </div>
          </div>
        ) : (
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
        )}
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