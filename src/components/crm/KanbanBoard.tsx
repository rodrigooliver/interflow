import React from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CRMStage, CRMCustomerStage } from '../../types/crm';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  stages: CRMStage[];
  customerStages: CRMCustomerStage[];
  onDragEnd: (result: DragEndEvent) => void;
  onEditStage: (stage: CRMStage) => void;
  onDeleteStage: (stage: CRMStage) => void;
  onAddCustomer: (stage: CRMStage) => void;
  onEditCustomer: (customerStage: CRMCustomerStage) => void;
  onRemoveCustomer: (customerStage: CRMCustomerStage) => void;
}

export function KanbanBoard({
  stages,
  customerStages,
  onDragEnd,
  onEditStage,
  onDeleteStage,
  onAddCustomer,
  onEditCustomer,
  onRemoveCustomer
}: KanbanBoardProps) {
  const [activeCustomerStage, setActiveCustomerStage] = React.useState<CRMCustomerStage | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeCustomer = customerStages.find(cs => cs.id === active.id);
    setActiveCustomerStage(activeCustomer || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCustomerStage(null);
    onDragEnd(event);
  };

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 p-6 overflow-x-auto min-h-[calc(100vh-12rem)]">
        {stages.map((stage) => (
          <SortableContext
            key={stage.id}
            id={stage.id}
            items={customerStages.filter(cs => cs.stage_id === stage.id).map(cs => cs.id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              stage={stage}
              customers={customerStages.filter(cs => cs.stage_id === stage.id)}
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
        {activeCustomerStage && (
          <div className="transform-none">
            <div className="animate-pulse border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-lg p-1">
              <KanbanCard
                customerStage={activeCustomerStage}
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