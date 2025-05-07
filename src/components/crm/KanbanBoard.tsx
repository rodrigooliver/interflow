import React from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  DragStartEvent,
  closestCorners,
  DragOverEvent,
  pointerWithin,
  CollisionDetection
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CRMStage } from '../../types/crm';
import { Customer } from '../../types/database';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

// Tipo composto para cliente com estágio
type CustomerWithStage = Customer & {
  stage?: CRMStage;
  stage_order?: number;
  sale_price?: number;
};

interface KanbanBoardProps {
  stages: CRMStage[];
  customers: CustomerWithStage[];
  onDragEnd: (result: DragEndEvent, stageOrder?: number) => void;
  onEditStage: (stage: CRMStage) => void;
  onDeleteStage: (stage: CRMStage) => void;
  onAddCustomer: (stage: CRMStage) => void;
  onEditCustomer: (customer: CustomerWithStage) => void;
  onRemoveCustomer: (customer: CustomerWithStage) => void;
}

export function KanbanBoard({
  stages,
  customers,
  onDragEnd,
  onEditStage,
  onDeleteStage,
  onAddCustomer,
  onEditCustomer,
  onRemoveCustomer
}: KanbanBoardProps) {
  const [activeCustomer, setActiveCustomer] = React.useState<CustomerWithStage | null>(null);
  // Estado local para atualizar imediatamente a UI após o drop
  const [localCustomers, setLocalCustomers] = React.useState<CustomerWithStage[]>(customers);
  // Estado para rastrear a coluna sobre a qual o item está sendo arrastado
  const [activeContainer, setActiveContainer] = React.useState<string | null>(null);
  // Guardar o container original do cliente sendo arrastado
  const [originalContainer, setOriginalContainer] = React.useState<string | null>(null);
  // Guardar a cópia original dos clientes antes de qualquer simulação
  const [originalLocalCustomers, setOriginalLocalCustomers] = React.useState<CustomerWithStage[]>([]);

  // Atualizar o estado local quando os clientes mudam
  React.useEffect(() => {
    // Ordenar os clientes pelo stage_order para garantir que a visualização está correta
    const sortedCustomers = [...customers].sort((a, b) => {
      // Primeiro, agrupar por stage_id
      if (a.stage_id !== b.stage_id) {
        // Se algum dos stage_id for nulo, tratar adequadamente
        if (a.stage_id === null) return 1;
        if (b.stage_id === null) return -1;
        return a.stage_id > b.stage_id ? 1 : -1;
      }
      
      // Depois, ordenar pelo stage_order dentro da mesma coluna
      const orderA = a.stage_order || 1000;
      const orderB = b.stage_order || 1000;
      return orderA - orderB;
    });
    
    setLocalCustomers(sortedCustomers);
  }, [customers]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Estratégia de detecção de colisão personalizada para lidar melhor com colunas vazias
  const customCollisionDetection: CollisionDetection = ({
    droppableContainers,
    droppableRects,
    collisionRect,
    ...args
  }) => {
    // Primeiro, tentar detectar colisões com a estratégia pointerWithin
    const pointerCollisions = pointerWithin({
      droppableContainers,
      droppableRects,
      collisionRect,
      ...args
    });
    
    // Se não houver colisões, usar closestCorners que é mais abrangente
    if (!pointerCollisions.length) {
      return closestCorners({
        droppableContainers,
        droppableRects,
        collisionRect,
        ...args
      });
    }
    
    return pointerCollisions;
  };

  // Função para encontrar o ID do estágio a partir do elemento over
  const findStageIdFromElement = (id: string): string | null => {
    // Verificar se o ID pertence a um cliente
    const isCustomer = localCustomers.some(customer => customer.id === id);
    
    if (isCustomer) {
      // Se for um cliente, encontrar o estágio associado
      const customer = localCustomers.find(c => c.id === id);
      return customer?.stage_id || null;
    } else {
      // Se não for um cliente, verificar se é um estágio
      const isStage = stages.some(stage => stage.id === id);
      return isStage ? id : null;
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedCustomer = localCustomers.find(c => c.id === active.id);
    
    if (draggedCustomer) {
      // Salvar o estado original dos clientes antes de qualquer simulação
      setOriginalLocalCustomers([...localCustomers]);
      
      // Armazenar a coluna original (para comparação no drop)
      const currentStageId = draggedCustomer.stage_id || null;
      setOriginalContainer(currentStageId);
      setActiveContainer(currentStageId);
      setActiveCustomer(draggedCustomer);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    
    if (!over || !activeCustomer) return;
    
    // Verificar se estamos sobre uma coluna diretamente, não apenas sobre um cliente
    const overId = over.id as string;
    
    // Verificar se o elemento sobre o qual estamos é um estágio
    const isStage = stages.some(stage => stage.id === overId);
    
    if (isStage) {
      // Se voltamos para a coluna original, restaurar o estado original
      if (overId === originalContainer) {
        setActiveContainer(overId);
        setLocalCustomers(originalLocalCustomers);
        return;
      }
      
      setActiveContainer(overId);
      
      // Simulação visual imediata: move o cliente para o estágio alvo durante o hover
      if (activeCustomer.stage_id !== overId) {
        simulateMove(activeCustomer.id, overId);
      }
      return;
    }
    
    // Verificar se o over é do tipo "column" (colunas vazias ou não-vazias)
    if (over.data?.current?.type === 'column') {
      const columnId = over.id as string;
      // Se voltamos para a coluna original, restaurar o estado original
      if (columnId === originalContainer) {
        setActiveContainer(columnId);
        setLocalCustomers(originalLocalCustomers);
        return;
      }
      
      setActiveContainer(columnId);
      
      // Simulação visual imediata: move o cliente para o estágio alvo durante o hover
      if (activeCustomer.stage_id !== columnId) {
        simulateMove(activeCustomer.id, columnId);
      }
      return;
    }
    
    // Se não for um estágio, pode ser um cliente
    const overCustomer = localCustomers.find(c => c.id === overId);
    if (overCustomer && overCustomer.stage_id) {
      // Se voltamos para a coluna original, restaurar o estado original
      if (overCustomer.stage_id === originalContainer) {
        setActiveContainer(originalContainer);
        setLocalCustomers(originalLocalCustomers);
        return;
      }
      
      if (activeContainer !== overCustomer.stage_id) {
        setActiveContainer(overCustomer.stage_id);
        
        // Simulação visual imediata: move o cliente para o estágio do cliente alvo
        if (activeCustomer.stage_id !== overCustomer.stage_id) {
          simulateMove(activeCustomer.id, overCustomer.stage_id);
        }
      }
    }
  };
  
  // Função para simular visualmente a movimentação de um cliente para outro estágio
  const simulateMove = (customerId: string, targetStageId: string) => {
    // Verificar se o cliente está sendo arrastado e é diferente do estágio atual
    const customer = localCustomers.find(c => c.id === customerId);
    if (!customer || customer.stage_id === targetStageId) return;
    
    // Encontrar o estágio alvo
    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage) return;
    
    // Criar uma cópia da lista de clientes
    const updatedCustomers = localCustomers.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          stage_id: targetStageId,
          stage: targetStage
        } as CustomerWithStage;
      }
      return c;
    });
    
    // Atualizar o estado local para refletir a mudança visual
    setLocalCustomers(updatedCustomers);
  };
  
  // Calcular um novo stage_order para inserção entre dois clientes
  const calculateNewOrder = (prevOrder: number | null, nextOrder: number | null): number => {
    // Se não há cliente anterior, usar um valor menor que o próximo
    if (prevOrder === null && nextOrder !== null) {
      // Se não tem cliente anterior, usar valor 500 unidades antes do próximo
      const result = Math.max(0, nextOrder - 500);
      return result;
    }
    
    // Se não há próximo cliente, usar um valor maior que o anterior
    if (prevOrder !== null && nextOrder === null) {
      // Se não tem próximo cliente, adiciona 1000 ao anterior
      const result = prevOrder + 1000;
      return result;
    }
    
    // Se temos ambos, calcular um valor intermediário
    if (prevOrder !== null && nextOrder !== null) {
      // Garantir uma distância mínima para evitar problemas de precisão
      if (nextOrder - prevOrder < 2) {
        // Se os valores são muito próximos, fazer uma reordenação manual
        const result = prevOrder + 1000;
        return result;
      }
      
      // Garantir um valor inteiro intermediário entre os dois
      const result = Math.floor(prevOrder + (nextOrder - prevOrder) / 2);
      return result;
    }
    
    // Valor padrão se nenhum dos casos anteriores
    return 1000;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      // Restaurar posição original
      setLocalCustomers(originalLocalCustomers);
      setActiveCustomer(null);
      setActiveContainer(null);
      setOriginalContainer(null);
      setOriginalLocalCustomers([]);
      return;
    }
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Encontrar o cliente ativo
    const activeCustomer = localCustomers.find(c => c.id === activeId);
    if (!activeCustomer) {
      // Restaurar posição original
      setLocalCustomers(originalLocalCustomers);
      setActiveCustomer(null);
      setActiveContainer(null);
      setOriginalContainer(null);
      setOriginalLocalCustomers([]);
      return;
    }
    
    // Determinar o estágio de destino
    let targetStageId: string | null = null;
    
    // Verificar primeiro se o over é uma coluna baseada no data-type
    if (over.data?.current?.type === 'column') {
      targetStageId = overId;
    } else {
      // Caso contrário, usar a lógica padrão
      targetStageId = findStageIdFromElement(overId);
    }
    
    // Se não conseguiu determinar o estágio a partir do elemento over,
    // usar o activeContainer (estágio atual do hover)
    if (!targetStageId && activeContainer) {
      targetStageId = activeContainer;
    }
    
    if (!targetStageId) {
      // Restaurar posição original
      setLocalCustomers(originalLocalCustomers);
      setActiveCustomer(null);
      setActiveContainer(null);
      setOriginalContainer(null);
      setOriginalLocalCustomers([]);
      return;
    }
    
    // Verifica se é um drop real para uma coluna diferente ou se é um caso onde
    // o drag terminou no mesmo elemento mas a coluna mudou durante o drag
    const stageChanged = targetStageId !== originalContainer;
    
    // Se for drop no mesmo elemento e a coluna não mudou, ignorar
    if (active.id === over.id && !stageChanged) {
      // Restaurar posição original
      setLocalCustomers(originalLocalCustomers);
      setActiveCustomer(null);
      setActiveContainer(null);
      setOriginalContainer(null);
      setOriginalLocalCustomers([]);
      return;
    }
    
    // Clonar a lista de clientes para manipulação
    let newCustomers = [...localCustomers];
    let newStageOrder: number | null = null;
    
    // Calcular o novo stage_order baseado na posição de drop
    const stageCustomers = localCustomers
      .filter(c => c.stage_id === targetStageId && c.id !== activeId)
      .sort((a, b) => (a.stage_order || 1000) - (b.stage_order || 1000));
    
    // Se for uma coluna vazia ou drop diretamente sobre a coluna
    if (stageCustomers.length === 0) {
      // Coluna vazia, usar valor padrão
      newStageOrder = 1000; 
    } 
    // Se for drop sobre a coluna (não sobre um card)
    else if (over.data?.current?.type === 'column' || over.id === targetStageId) {
      // Colocar no final da coluna
      const lastOrder = stageCustomers.length > 0 
        ? (stageCustomers[stageCustomers.length - 1].stage_order || 1000)
        : 0;
      newStageOrder = lastOrder + 1000;
    } 
    // Se for drop sobre outro card
    else {
      // Tentar encontrar o card sobre o qual o drop foi feito
      const overIndex = stageCustomers.findIndex(c => c.id === overId);
      
      if (overIndex !== -1) {
        const overCustomer = stageCustomers[overIndex];
        const prevCustomer = overIndex > 0 ? stageCustomers[overIndex - 1] : null;
        const nextCustomer = overIndex < stageCustomers.length - 1 ? stageCustomers[overIndex + 1] : null;
        
        // Usar o próprio evento para determinar se inserir antes ou depois
        // DragOverEvent contém informações sobre o ponteiro e o elemento alvo
        const eventData = event.activatorEvent as PointerEvent;
        
        // Obter as coordenadas do elemento alvo a partir do evento dnd-kit
        const { over } = event;
        let insertAfter = false;
        
        if (over && over.rect && eventData) {
          // Extrair apenas o que precisa do evento
          const mouseX = eventData.clientX;
          
          // Encontrar o card original e o card alvo na lista ORIGINAL (antes do arrasto)
          // Isso evita o problema de o card ativo ter sido removido da lista atual
          const originalActiveIndex = originalLocalCustomers.findIndex(c => c.id === activeId);
          const originalOverIndex = originalLocalCustomers.findIndex(c => c.id === overId);
          
          // Estratégia 1: Baseada na direção do movimento usando posições originais
          if (originalActiveIndex !== -1 && originalOverIndex !== -1) {
            // Se é um movimento para cima, inserir ANTES
            if (originalActiveIndex > originalOverIndex) {
              insertAfter = false;
            } 
            // Se é um movimento para baixo, inserir DEPOIS
            else if (originalActiveIndex < originalOverIndex) {
              insertAfter = true;
            }
            // Se é o mesmo card (não deveria acontecer), não mudar
            else {
              insertAfter = false;
            }
          } 
          // Fallback: usar posição atual na lista se disponível
          else {
            // Tentar encontrar na lista atual
            const currentOverIndex = stageCustomers.findIndex(c => c.id === overId);
            
            // Se encontrou, olhar para cards adjacentes para decidir
            if (currentOverIndex !== -1) {
              const prevIndex = currentOverIndex - 1;
              const nextIndex = currentOverIndex + 1;
              
              // Se tem um card anterior, comparar para ver se é o que está sendo arrastado
              if (prevIndex >= 0 && stageCustomers[prevIndex].id === activeId) {
                insertAfter = false; // Manter na mesma posição
              }
              // Se tem um card posterior, comparar para ver se é o que está sendo arrastado
              else if (nextIndex < stageCustomers.length && stageCustomers[nextIndex].id === activeId) {
                insertAfter = true; // Manter na mesma posição
              }
              // Se não tem adjacentes ou não são o card arrastado, usar posição horizontal
              else {
                const windowWidth = window.innerWidth;
                const rightHalf = mouseX > windowWidth / 2;
                insertAfter = rightHalf;
              }
            }
            // Último recurso: posição horizontal
            else {
              const windowWidth = window.innerWidth;
              const rightHalf = mouseX > windowWidth / 2;
              insertAfter = rightHalf;
            }
          }
        } else {
          // Fallback para caso não tenha informações de posição
        }
        
        // Preparar os valores de ordem com base na decisão de inserir antes ou depois
        let prevOrder, nextOrder;
        
        if (insertAfter) {
          // Inserir DEPOIS do cartão alvo
          prevOrder = overCustomer ? (overCustomer.stage_order || 1000) : null;
          nextOrder = nextCustomer ? (nextCustomer.stage_order || 2000) : null;
        } else {
          // Inserir ANTES do cartão alvo (comportamento padrão anterior)
          prevOrder = prevCustomer ? (prevCustomer.stage_order || 0) : null;
          nextOrder = overCustomer ? (overCustomer.stage_order || 2000) : null;
        }
        
        // Calcular valor entre os dois cards
        newStageOrder = calculateNewOrder(prevOrder, nextOrder);
      } else {
        // Não encontrou o card alvo, colocar no final
        const lastOrder = stageCustomers.length > 0 
          ? (stageCustomers[stageCustomers.length - 1].stage_order || 1000)
          : 0;
        newStageOrder = lastOrder + 1000;
      }
    }
    
    // Se o destino for um estágio diferente do original
    if (stageChanged) {
      // Mover cliente para o outro estágio
      newCustomers = newCustomers.map(customer => {
        if (customer.id === activeId) {
          const targetStage = stages.find(s => s.id === targetStageId);
          return {
            ...customer,
            stage_id: targetStageId,
            stage: targetStage,
            stage_order: newStageOrder
          } as CustomerWithStage;
        }
        return customer;
      });
      
      // IMPORTANTE: Para garantir que o backend seja notificado da mudança,
      // vamos criar um evento modificado que indica claramente a coluna de destino
      if (targetStageId) {
        // Criar uma cópia do evento com o over.id modificado para o ID da coluna
        const modifiedEvent = {
          ...event,
          over: {
            ...over,
            id: targetStageId
          }
        };
        
        // Atualizar estado local
        setLocalCustomers(newCustomers);
        setActiveCustomer(null);
        setActiveContainer(null);
        setOriginalContainer(null);
        setOriginalLocalCustomers([]);
        
        // Chamar callback com o evento modificado e o novo stage_order
        onDragEnd(modifiedEvent, newStageOrder);
        return;
      }
    } else {
      // Se for para o mesmo estágio, apenas atualizar a ordem
      newCustomers = newCustomers.map(customer => {
        if (customer.id === activeId) {
          return {
            ...customer,
            stage_order: newStageOrder
          } as CustomerWithStage;
        }
        return customer;
      });
      
      // Atualizar estado local com a nova ordenação
      setLocalCustomers(newCustomers);
      setActiveCustomer(null);
      setActiveContainer(null);
      setOriginalContainer(null);
      setOriginalLocalCustomers([]);
      
      // Chamar callback com o evento original e novo stage_order
      onDragEnd(event, newStageOrder);
      return;
    }
    
    // Atualizar estado local
    setLocalCustomers(newCustomers);
    setActiveCustomer(null);
    setActiveContainer(null);
    setOriginalContainer(null);
    setOriginalLocalCustomers([]);
    
    // Chamar callback com o evento original
    onDragEnd(event, newStageOrder);
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 p-6 overflow-x-auto h-full flex-1 w-full pb-20 md:pb-4 custom-scrollbar">
        {stages.map((stage) => {
          // Ordenar clientes pelo stage_order
          const stageCustomers = localCustomers
            .filter(c => c.stage_id === stage.id)
            .sort((a, b) => (a.stage_order || 1000) - (b.stage_order || 1000));
            
          return (
            <SortableContext
              key={stage.id}
              id={stage.id}
              items={stageCustomers.map(c => c.id)}
              strategy={rectSortingStrategy}
            >
              <KanbanColumn
                stage={stage}
                customers={stageCustomers as any}
                onEdit={() => onEditStage(stage)}
                onDelete={() => onDeleteStage(stage)}
                onAddCustomer={() => onAddCustomer(stage)}
                onEditCustomer={onEditCustomer}
                onRemoveCustomer={onRemoveCustomer}
              />
            </SortableContext>
          );
        })}
      </div>

      <DragOverlay>
        {activeCustomer && (
          <div className="transform-none">
            <div className="animate-pulse border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-lg p-1">
              <KanbanCard
                customer={activeCustomer as any}
                index={0}
                onEditCustomer={() => {}}
                onRemove={() => {}}
              />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}