import React from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CRMStage } from '../../types/crm';
import { Customer } from '../../types/database';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

// Tipo composto para cliente com estágio
type CustomerWithStage = Customer & {
  stage?: CRMStage;
};

interface KanbanBoardProps {
  stages: CRMStage[];
  customers: CustomerWithStage[];
  onDragEnd: (result: DragEndEvent) => void;
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

  // Atualizar o estado local quando os clientes mudam
  React.useEffect(() => {
    setLocalCustomers(customers);
  }, [customers]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedCustomer = localCustomers.find(c => c.id === active.id);
    setActiveCustomer(draggedCustomer || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // Atualizar o estado local imediatamente para evitar animação de retorno
      const updatedCustomers = localCustomers.map(customer => {
        if (customer.id === active.id) {
          return {
            ...customer,
            stage_id: over.id as string
          };
        }
        return customer;
      });
      
      setLocalCustomers(updatedCustomers);
    }
    
    setActiveCustomer(null);
    // Chamamos o onDragEnd depois da atualização local
    onDragEnd(event);
  };

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 p-6 overflow-x-auto h-full flex-1 w-full pb-20 md:pb-4">
        {stages.map((stage) => (
          <SortableContext
            key={stage.id}
            id={stage.id}
            items={localCustomers.filter(c => c.stage_id === stage.id).map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              stage={stage}
              customers={localCustomers.filter(c => c.stage_id === stage.id)}
              onEdit={() => onEditStage(stage)}
              onDelete={() => onDeleteStage(stage)}
              onAddCustomer={() => onAddCustomer(stage)}
              onEditCustomer={onEditCustomer}
              onRemoveCustomer={onRemoveCustomer}
            />
          </SortableContext>
        ))}
      </div>

      <DragOverlay>
        {activeCustomer && (
          <div className="transform-none">
            <div className="animate-pulse border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-lg p-1">
              <KanbanCard
                customer={activeCustomer}
                index={0}
                onEdit={() => {}}
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