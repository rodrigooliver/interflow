import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Plus, GitMerge } from 'lucide-react';
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
import { FunnelModal } from '../../components/crm/FunnelModal';
import type { DragEndEvent } from '@dnd-kit/core';
import { useFunnels } from '../../hooks/useQueryes';

// Tipo composto para cliente com estágio
type CustomerWithStage = Customer & {
  stage?: CRMStage;
};

// Interface estendida para funil com propriedade 'default'
interface FunnelWithDefault {
  id: string;
  name: string;
  stages: CRMStage[];
  default?: boolean;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  description?: string;
  [key: string]: unknown;
}

export default function CRMFunnel() {
  const { t } = useTranslation(['crm', 'common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrganizationMember } = useAuthContext();
  
  // State com tipo atualizado para FunnelWithDefault
  const [funnel, setFunnel] = useState<FunnelWithDefault | null>(null);
  const [stages, setStages] = useState<CRMStage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState('');
  const [noFunnels, setNoFunnels] = useState(false);
  const [showCreateFunnelModal, setShowCreateFunnelModal] = useState(false);

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
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const { data: funnelData, isLoading: funnelLoading } = useFunnels(currentOrganizationMember?.organization.id);

  useEffect(() => {
    if (funnelData && funnelData.length > 0) {
      if (id) {
        // Se um ID específico for fornecido na URL
        const currentFunnel = funnelData.find((f) => f.id === id);
        if (currentFunnel) {
          setFunnel(currentFunnel as unknown as FunnelWithDefault);
          setStages(currentFunnel.stages as CRMStage[]);
          loadCustomers(currentFunnel.id);
        } else {
          // ID não encontrado, tentar redirecionar para o funil padrão ou o primeiro
          findDefaultOrFirstFunnel();
        }
      } else {
        // Nenhum ID fornecido, tentar encontrar o funil padrão ou o primeiro
        findDefaultOrFirstFunnel();
      }
    } else if (funnelData && funnelData.length === 0 && !funnelLoading) {
      // Não existem funis
      setNoFunnels(true);
    }
  }, [funnelData, id, funnelLoading]);

  const findDefaultOrFirstFunnel = () => {
    if (!funnelData || funnelData.length === 0) {
      setNoFunnels(true);
      return;
    }

    // Tentar encontrar o funil padrão (default: true)
    const defaultFunnel = funnelData.find((f) => f.default === true);
    
    if (defaultFunnel) {
      setFunnel(defaultFunnel as unknown as FunnelWithDefault);
      setStages(defaultFunnel.stages as CRMStage[]);
      loadCustomers(defaultFunnel.id);
      // Atualizar a URL para mostrar o ID do funil padrão
      navigate(`/app/crm/${defaultFunnel.id}`, { replace: true });
    } else {
      // Caso não exista um funil padrão, pegar o primeiro da lista
      const firstFunnel = funnelData[0];
      setFunnel(firstFunnel as unknown as FunnelWithDefault);
      setStages(firstFunnel.stages as CRMStage[]);
      loadCustomers(firstFunnel.id);
      // Atualizar a URL para mostrar o ID do primeiro funil
      navigate(`/app/crm/${firstFunnel.id}`, { replace: true });
    }
  };

  async function loadCustomers(funnelId?: string) {
    if (!currentOrganizationMember || (!id && !funnelId)) return;

    setLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          stage:stage_id!inner(*),
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
            external_id,
            created_at,
            last_message_id,
            status,
            title,
            messages!chats_last_message_id_fkey(
              id,
              content,
              created_at,
              sender_type
            ),
            channel_details:chat_channels(
              id,
              name,
              type
            )
          ),
          tasks!customers_last_task_fkey(
            id,
            title,
            status,
            checklist
          )
        `)
        .eq('organization_id', currentOrganizationMember.organization.id)
        .eq('stage.funnel_id', funnelId)
        .order('name');

      if (error) throw error;

      // Definir diretamente os clientes sem processamento adicional
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      setError(t('common:error'));
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent, stageOrder?: number) {
    const { active, over } = event;
    
    if (!active || !over) return;

    console.log('Drag End Event:', { active: active.id, over: over.id, stageOrder });

    // Get the customer being dragged
    const customer = customers.find(c => c.id === active.id);
    if (!customer) return;

    // Verificar se o target é um stage ou outro cliente
    const isTargetStage = stages.some(s => s.id === over.id);
    const isTargetCustomer = customers.some(c => c.id === over.id);
    
    let targetStageId: string | null = null;
    
    if (isTargetStage) {
      // Se o alvo for um estágio, usar diretamente esse ID
      targetStageId = over.id as string;
      console.log('Target é um estágio:', targetStageId);
    } else if (isTargetCustomer) {
      // Se o alvo for outro cliente, usar o estágio desse cliente
      const targetCustomer = customers.find(c => c.id === over.id);
      targetStageId = targetCustomer?.stage_id || null;
      console.log('Target é um cliente no estágio:', targetStageId);
    }

    if (!targetStageId) {
      console.log('Não foi possível determinar o estágio de destino');
      return;
    }
    
    // Get target stage
    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage) {
      console.log('Estágio de destino não encontrado');
      return;
    }

    // Se está na mesma coluna e não há stageOrder, não precisamos atualizar o estágio no banco de dados
    if (customer.stage_id === targetStageId && !stageOrder) {
      console.log('Cliente já está no estágio de destino e não houve mudança na ordem, ignorando');
      return;
    }
    
    // Se mudou apenas a ordem, precisamos atualizar apenas o stage_order
    if (customer.stage_id === targetStageId && stageOrder) {
      console.log(`Atualizando apenas a ordem do cliente: ${stageOrder}`);
      try {
        const { error } = await supabase
          .from('customers')
          .update({
            stage_order: stageOrder
          })
          .eq('id', customer.id);

        if (error) {
          console.error('Erro ao atualizar ordem do cliente:', error);
          throw error;
        }

        // Update local state
        setCustomers(prev =>
          prev.map(c =>
            c.id === customer.id
              ? { ...c, stage_order: stageOrder }
              : c
          ) as Customer[]
        );
        
        console.log('Ordem do cliente atualizada com sucesso');
      } catch (error) {
        console.error('Error updating customer order:', error);
        setError(t('common:error'));
      }
      return;
    }

    console.log(`Movendo cliente ${customer.id} do estágio ${customer.stage_id} para o estágio ${targetStageId}`);

    try {
      // Determinar o valor de stage_order a usar - usar exatamente o valor calculado pelo componente
      const orderToUse = typeof stageOrder === 'number' ? stageOrder : 1000;
      console.log(`Valor stage_order a ser usado: ${orderToUse}, tipo: ${typeof stageOrder}`);
      
      // Update customer's stage_id and stage_order
      const { error } = await supabase
        .from('customers')
        .update({
          stage_id: targetStageId,
          stage_order: orderToUse
        })
        .eq('id', customer.id);

      if (error) {
        console.error('Erro ao atualizar estágio do cliente:', error);
        throw error;
      }

      // Update local state
      setCustomers(prev =>
        prev.map(c =>
          c.id === customer.id
            ? { ...c, stage_id: targetStageId, stage: targetStage, stage_order: orderToUse }
            : c
        ) as Customer[]
      );

      // Record the stage change in history
      await supabase
        .from('customer_stage_history')
        .insert({
          customer_id: customer.id,
          stage_id: targetStageId,
          organization_id: currentOrganizationMember?.organization.id
        });
      
      console.log('Cliente movido com sucesso');
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

  // Redirecionamento para a página de criação de funil
  const handleCreateFunnel = () => {
    setShowCreateFunnelModal(true);
  };

  // Função chamada após a criação bem-sucedida de um funil
  const handleFunnelCreated = async (funnelId?: string) => {
    // Se o hook já tiver carregado, ele vai atualizar automaticamente com o novo funil
    // devido à invalidação do cache que fizemos no FunnelModal
    setNoFunnels(false);
    setShowCreateFunnelModal(false);
    
    // Se recebemos o ID do funil criado, selecioná-lo automaticamente
    if (funnelId && funnelData) {
      // Navegar para o novo funil
      handleFunnelSelect(funnelId);
    }
  };

  const handleFunnelSelect = (funnelId: string) => {
    // Garantir que o funil selecionado seja atualizado em tempo real
    if (funnelData) {
      const selectedFunnel = funnelData.find(f => f.id === funnelId);
      if (selectedFunnel) {
        setFunnel(selectedFunnel as unknown as FunnelWithDefault);
        setStages(selectedFunnel.stages as CRMStage[]);
        loadCustomers(selectedFunnel.id);
      }
    }
    // Redirecionar para o funil selecionado
    navigate(`/app/crm/${funnelId}`);
  };

  // Efeito para cadastrar um subscription para atualizações na tabela de tarefas
  useEffect(() => {
    if (!currentOrganizationMember || !funnel) return;

    // Escutar por alterações nas tarefas
    const taskSubscription = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('Task update detected:', payload);
          
          // Quando uma tarefa for alterada, recarregar os clientes
          // para garantir que os dados estão atualizados
          if (funnel?.id) {
            loadCustomers(funnel.id);
          }
        }
      )
      .subscribe();

    // Limpar subscrição ao desmontar
    return () => {
      supabase.removeChannel(taskSubscription);
    };
  }, [currentOrganizationMember, funnel]);

  if (!currentOrganizationMember) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-gray-500 dark:text-gray-400">
            {t('common:loading')}
          </div>
        </div>
      </div>
    );
  }

  if (funnelLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (noFunnels) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto text-center">
          <GitMerge className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {t('crm:funnels.noFunnels')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {t('crm:funnels.createFirst')}
          </p>
          <button
            onClick={handleCreateFunnel}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('crm:funnels.newFunnel')}
          </button>
        </div>
        {/* Modal para criar funil quando não existem funis */}
        {showCreateFunnelModal && currentOrganizationMember && (
            <FunnelModal
              onClose={() => setShowCreateFunnelModal(false)}
              funnel={null}
              organizationId={currentOrganizationMember.organization.id}
              onSuccess={handleFunnelCreated}
            />
          )}
      </div>
    );
  }

  if (!funnel) {
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
        funnel={funnel as any}
        onBack={() => navigate('/app/crm/funnels')}
        onAddStage={() => {
          setSelectedStage(null);
          setStageForm({ name: '', description: '', color: '#3B82F6' });
          setShowStageModal(true);
        }}
        onCustomerAdded={() => loadCustomers(funnel.id)}
        allFunnels={funnelData as any || []}
        onSelectFunnel={handleFunnelSelect}
        organizationId={currentOrganizationMember.organization.id}
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
        ) : loadingCustomers ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <span className="ml-3 text-lg text-gray-700 dark:text-gray-300">{t('common:loading')}</span>
          </div>
        ) : (
          <KanbanBoard
            stages={stages}
            customers={customers as CustomerWithStage[]}
            onDragEnd={(event, stageOrder) => {
              console.log("KanbanBoard onDragEnd:", { event, stageOrder });
              handleDragEnd(event, stageOrder);
            }}
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
          onSuccess={() => loadCustomers(funnel.id)}
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