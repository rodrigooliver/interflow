import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  DragStartEvent,
  DragOverEvent,
  closestCorners,
  pointerWithin,
  CollisionDetection
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { TaskStage, TaskWithRelations } from '../../types/tasks';
import { TaskColumn } from './TaskColumn';
import { TaskCard } from './TaskCard';
import { useUpdateTaskStageOrder } from '../../hooks/useTasks';
import { Plus } from 'lucide-react';
import { StageDialog } from './StageDialog';

interface TaskBoardProps {
  stages: TaskStage[];
  tasks: TaskWithRelations[];
  onEditStage: (stage: TaskStage) => void;
  onDeleteStage: (stage: TaskStage) => void;
  onAddTask: (stage: TaskStage) => void;
  onEditTask: (task: TaskWithRelations) => void;
  onRemoveTask: (task: TaskWithRelations) => void;
  onToggleArchived: (task: TaskWithRelations) => void;
  onUpdateTaskStatus?: (taskId: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') => void;
  organizationId: string;
  showingArchived?: boolean;
  projectId?: string;
}

export function TaskBoard({
  stages,
  tasks,
  onEditStage,
  onDeleteStage,
  onAddTask,
  onEditTask,
  onRemoveTask,
  onToggleArchived,
  onUpdateTaskStatus,
  organizationId,
  showingArchived = false,
  projectId
}: TaskBoardProps) {
  const { t } = useTranslation('tasks');
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [localTasks, setLocalTasks] = useState<TaskWithRelations[]>(tasks);
  const [activeContainer, setActiveContainer] = useState<string | null>(null);
  const [originalContainer, setOriginalContainer] = useState<string | null>(null);
  const [originalLocalTasks, setOriginalLocalTasks] = useState<TaskWithRelations[]>([]);
  const [showStageDialog, setShowStageDialog] = useState(false);
  
  const updateTaskStageOrder = useUpdateTaskStageOrder();

  // Atualizar o estado local quando as tarefas mudam
  React.useEffect(() => {
    // Ordenar as tarefas pelo stage_order
    const sortedTasks = [...tasks].sort((a, b) => {
      // Primeiro, agrupar por stage_id
      if (a.stage_id !== b.stage_id) {
        if (a.stage_id === null) return 1;
        if (b.stage_id === null) return -1;
        return a.stage_id > b.stage_id ? 1 : -1;
      }
      
      // Depois, ordenar pelo stage_order dentro da mesma coluna
      const orderA = a.stage_order || 1000;
      const orderB = b.stage_order || 1000;
      return orderA - orderB;
    });
    
    setLocalTasks(sortedTasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Adicionar um delay de 250ms antes de iniciar o arrastar para dispositivos móveis
      activationConstraint: {
        delay: 250,
        tolerance: 8,
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
    // Verificar se o ID pertence a uma tarefa
    const isTask = localTasks.some(task => task.id === id);
    
    if (isTask) {
      // Se for uma tarefa, encontrar o estágio associado
      const task = localTasks.find(t => t.id === id);
      return task?.stage_id || null;
    } else {
      // Se não for uma tarefa, verificar se é um estágio
      const isStage = stages.some(stage => stage.id === id);
      return isStage ? id : null;
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedTask = localTasks.find(t => t.id === active.id);
    
    if (draggedTask) {
      // Salvar o estado original das tarefas antes de qualquer simulação
      setOriginalLocalTasks([...localTasks]);
      
      // Armazenar a coluna original (para comparação no drop)
      const currentStageId = draggedTask.stage_id || null;
      setOriginalContainer(currentStageId);
      setActiveContainer(currentStageId);
      setActiveTask(draggedTask);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    
    if (!over || !activeTask) return;
    
    // Verificar se estamos sobre uma coluna diretamente, não apenas sobre uma tarefa
    const overId = over.id as string;
    
    // Verificar se o elemento sobre o qual estamos é um estágio
    const isStage = stages.some(stage => stage.id === overId);
    
    if (isStage) {
      // Se voltamos para a coluna original, restaurar o estado original
      if (overId === originalContainer) {
        setActiveContainer(overId);
        setLocalTasks(originalLocalTasks);
        return;
      }
      
      setActiveContainer(overId);
      
      // Simulação visual imediata: move a tarefa para o estágio alvo durante o hover
      if (activeTask.stage_id !== overId) {
        simulateMove(activeTask.id, overId);
      }
      return;
    }
    
    // Verificar se o over é do tipo "column" (colunas vazias ou não-vazias)
    if (over.data?.current?.type === 'column') {
      const columnId = over.id as string;
      // Se voltamos para a coluna original, restaurar o estado original
      if (columnId === originalContainer) {
        setActiveContainer(columnId);
        setLocalTasks(originalLocalTasks);
        return;
      }
      
      setActiveContainer(columnId);
      
      // Simulação visual imediata: move a tarefa para o estágio alvo durante o hover
      if (activeTask.stage_id !== columnId) {
        simulateMove(activeTask.id, columnId);
      }
      return;
    }
    
    // Se não for um estágio, pode ser uma tarefa
    const overTask = localTasks.find(t => t.id === overId);
    if (overTask && overTask.stage_id) {
      // Se voltamos para a coluna original, restaurar o estado original
      if (overTask.stage_id === originalContainer) {
        setActiveContainer(originalContainer);
        setLocalTasks(originalLocalTasks);
        return;
      }
      
      if (activeContainer !== overTask.stage_id) {
        setActiveContainer(overTask.stage_id);
        
        // Simulação visual imediata: move a tarefa para o estágio da tarefa alvo
        if (activeTask.stage_id !== overTask.stage_id) {
          simulateMove(activeTask.id, overTask.stage_id);
        }
      }
    }
  };
  
  // Função para simular visualmente a movimentação de uma tarefa para outro estágio
  const simulateMove = (taskId: string, targetStageId: string) => {
    // Verificar se a tarefa está sendo arrastada e é diferente do estágio atual
    const task = localTasks.find(t => t.id === taskId);
    if (!task || task.stage_id === targetStageId) return;
    
    // Encontrar o estágio alvo
    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage) return;
    
    // Criar uma cópia da lista de tarefas
    const updatedTasks = localTasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          stage_id: targetStageId,
          stage: targetStage
        } as TaskWithRelations;
      }
      return t;
    });
    
    // Atualizar o estado local para refletir a mudança visual
    setLocalTasks(updatedTasks);
  };
  
  // Calcular um novo stage_order para inserção entre duas tarefas
  const calculateNewOrder = (prevOrder: number | null, nextOrder: number | null): number => {
    // Se não há tarefa anterior, usar um valor menor que o próximo
    if (prevOrder === null && nextOrder !== null) {
      // Se não tem tarefa anterior, usar valor 500 unidades antes do próximo
      const result = Math.max(0, nextOrder - 500);
      return result;
    }
    
    // Se não há próxima tarefa, usar um valor maior que a anterior
    if (prevOrder !== null && nextOrder === null) {
      // Se não tem próxima tarefa, adiciona 1000 ao anterior
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
      setLocalTasks(originalLocalTasks);
      setActiveTask(null);
      setActiveContainer(null);
      setOriginalContainer(null);
      setOriginalLocalTasks([]);
      return;
    }
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Encontrar a tarefa ativa
    const activeTask = localTasks.find(t => t.id === activeId);
    if (!activeTask) {
      // Restaurar posição original
      setLocalTasks(originalLocalTasks);
      setActiveTask(null);
      setActiveContainer(null);
      setOriginalContainer(null);
      setOriginalLocalTasks([]);
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
      setLocalTasks(originalLocalTasks);
      setActiveTask(null);
      setActiveContainer(null);
      setOriginalContainer(null);
      setOriginalLocalTasks([]);
      return;
    }
    
    // Verifica se é um drop real para uma coluna diferente ou se é um caso onde
    // o drag terminou no mesmo elemento mas a coluna mudou durante o drag
    const stageChanged = targetStageId !== originalContainer;
    
    // Se for drop no mesmo elemento e a coluna não mudou, ignorar
    if (active.id === over.id && !stageChanged) {
      // Restaurar posição original
      setLocalTasks(originalLocalTasks);
      setActiveTask(null);
      setActiveContainer(null);
      setOriginalContainer(null);
      setOriginalLocalTasks([]);
      return;
    }
    
    // Calcular o novo stage_order baseado na posição de drop
    const stageTasks = localTasks
      .filter(t => t.stage_id === targetStageId && t.id !== activeId)
      .sort((a, b) => (a.stage_order || 1000) - (b.stage_order || 1000));
    
    let newStageOrder: number | null = null;
    
    // Se for uma coluna vazia ou drop diretamente sobre a coluna
    if (stageTasks.length === 0) {
      // Coluna vazia, usar valor padrão
      newStageOrder = 1000; 
    } 
    // Se for drop sobre a coluna (não sobre um card)
    else if (over.data?.current?.type === 'column' || over.id === targetStageId) {
      // Colocar no final da coluna
      const lastOrder = stageTasks.length > 0 
        ? (stageTasks[stageTasks.length - 1].stage_order || 1000)
        : 0;
      newStageOrder = lastOrder + 1000;
    } 
    // Se for drop sobre outro card
    else {
      // Tentar encontrar o card sobre o qual o drop foi feito
      const overIndex = stageTasks.findIndex(t => t.id === overId);
      
      if (overIndex !== -1) {
        const overTask = stageTasks[overIndex];
        const prevTask = overIndex > 0 ? stageTasks[overIndex - 1] : null;
        const nextTask = overIndex < stageTasks.length - 1 ? stageTasks[overIndex + 1] : null;
        
        // Usar o próprio evento para determinar se inserir antes ou depois
        // DragOverEvent contém informações sobre o ponteiro e o elemento alvo
        const eventData = event.activatorEvent as PointerEvent;
        
        // Obter as coordenadas do elemento alvo a partir do evento dnd-kit
        const { over } = event;
        let insertAfter = false;
        
        if (over && over.rect && eventData) {
          // Extrair apenas o que precisa do evento
          const mouseY = eventData.clientY;
          const overRect = over.rect;
          
          // Se o mouse está abaixo da metade do elemento, inserir após
          insertAfter = mouseY > overRect.top + overRect.height / 2;
        }
        
        // Preparar os valores de ordem com base na decisão de inserir antes ou depois
        let prevOrder, nextOrder;
        
        if (insertAfter) {
          // Inserir DEPOIS da tarefa alvo
          prevOrder = overTask ? (overTask.stage_order || 1000) : null;
          nextOrder = nextTask ? (nextTask.stage_order || 2000) : null;
        } else {
          // Inserir ANTES da tarefa alvo
          prevOrder = prevTask ? (prevTask.stage_order || 0) : null;
          nextOrder = overTask ? (overTask.stage_order || 2000) : null;
        }
        
        // Calcular valor entre as duas tarefas
        newStageOrder = calculateNewOrder(prevOrder, nextOrder);
      } else {
        // Não encontrou a tarefa alvo, colocar no final
        const lastOrder = stageTasks.length > 0 
          ? (stageTasks[stageTasks.length - 1].stage_order || 1000)
          : 0;
        newStageOrder = lastOrder + 1000;
      }
    }
    
    // Atualizar a tarefa no backend
    if (targetStageId && activeTask) {
      updateTaskStageOrder.mutate({
        taskId: activeTask.id,
        stageId: targetStageId,
        order: newStageOrder || 1000,
        organizationId
      });
    }
    
    // Resetar estados
    setActiveTask(null);
    setActiveContainer(null);
    setOriginalContainer(null);
    setOriginalLocalTasks([]);
  };

  return (
    <div className="flex flex-col h-full">
      {showingArchived && (
        <div className="mt-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 sm:px-4 sm:py-2 -mb-1 rounded-md text-xs sm:text-sm mx-2 sm:mx-4">
          {t('viewingArchivedTasks')}
        </div>
      )}
      
      <DndContext 
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 sm:gap-6 p-2 sm:p-4 overflow-x-auto h-full flex-1 w-full pb-20 md:pb-4 custom-scrollbar">
          {stages.map((stage) => {
            // Ordenar tarefas pelo stage_order
            const stageTasks = localTasks
              .filter(t => t.stage_id === stage.id)
              .sort((a, b) => (a.stage_order || 1000) - (b.stage_order || 1000));
              
            return (
              <SortableContext
                key={stage.id}
                id={stage.id}
                items={stageTasks.map(t => t.id)}
                strategy={rectSortingStrategy}
              >
                <div className="pl-0 pr-0 first:pl-0 last:pr-0">
                  <TaskColumn
                    stage={stage}
                    tasks={stageTasks}
                    onEdit={() => onEditStage(stage)}
                    onDelete={() => onDeleteStage(stage)}
                    onAddTask={() => onAddTask(stage)}
                    onEditTask={onEditTask}
                    onRemoveTask={onRemoveTask}
                    onToggleArchived={onToggleArchived}
                    onUpdateTaskStatus={onUpdateTaskStatus}
                  />
                </div>
              </SortableContext>
            );
          })}
          
          {/* Botão para adicionar nova etapa */}
          <div className="flex-shrink-0 w-10 self-start mt-1 pl-1 pr-3">
            <button
              onClick={() => setShowStageDialog(true)}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-blue-600 text-white rounded-md hover:bg-blue-700"
              title={t('stages.addStage')}
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="transform-none">
              <div className="animate-pulse border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-lg p-1">
                <TaskCard
                  task={activeTask}
                  onEdit={() => {}}
                  onRemove={() => {}}
                  onToggleArchived={() => {}}
                />
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {showStageDialog && (
        <StageDialog 
          onClose={() => setShowStageDialog(false)}
          organizationId={organizationId}
          positionCount={stages.length}
          projectId={projectId}
        />
      )}
    </div>
  );
} 