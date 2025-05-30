import { 
  Pencil, 
  X, 
  CheckSquare, 
  Calendar, 
  Tag, 
  User, 
  AlertCircle,
  Archive,
  Clock,
  Hourglass,
  CheckCircle,
  XCircle,
  Check,
  Loader2,
  ArchiveRestore,
  Play,
  AlertTriangle
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ptBR, enUS, es } from 'date-fns/locale';
import { TaskWithRelations } from '../../types/tasks';
import { useState, useRef, useEffect } from 'react';
import { CustomerEditModal } from '../customers/CustomerEditModal';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const locales = {
  pt: ptBR,
  en: enUS,
  es: es
};

interface TaskCardProps {
  task: TaskWithRelations;
  onEdit: () => void;
  onRemove: () => void;
  onToggleArchived: () => void;
  onUpdateStatus?: (taskId: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') => void;
  isLastInColumn?: boolean;
}

export function TaskCard({ 
  task, 
  onEdit, 
  onRemove, 
  onToggleArchived,
  onUpdateStatus,
  isLastInColumn = false
}: TaskCardProps) {
  const { t, i18n } = useTranslation(['tasks', 'common']);
  const [showDetails, setShowDetails] = useState(false);
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [showCustomerEditModal, setShowCustomerEditModal] = useState(false);
  const [contentOverflows, setContentOverflows] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [updatingChecklistItem, setUpdatingChecklistItem] = useState<string | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task.id,
    data: {
      stageId: task.stage_id
    }
  });

  // Efeito para verificar se o conteúdo transborda e precisa de scroll
  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current && cardRef.current) {
        const cardHeight = cardRef.current.clientHeight;
        const contentHeight = contentRef.current.scrollHeight;
        const shouldScroll = contentHeight > cardHeight || isLastInColumn;
        setContentOverflows(shouldScroll);
      }
    };

    // Verificar quando o componente é montado e quando os detalhes são mostrados/escondidos
    checkOverflow();
    
    // Adicionar verificação após um breve atraso para garantir que o DOM foi atualizado
    const timeoutId = setTimeout(checkOverflow, 100);
    
    // Adicionar listener para redimensionamento da janela
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [showDetails, isLastInColumn, task.description?.length]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    maxHeight: contentOverflows || isLastInColumn ? '350px' : 'none',
  };

  // Verificar se a tarefa está concluída
  const isCompleted = task.status === 'completed';

  // Formatar a data de vencimento
  const formattedDueDate = task.due_date 
    ? formatDistanceToNow(new Date(task.due_date), { 
        addSuffix: true,
        locale: locales[i18n.language as keyof typeof locales] || locales.en
      })
    : null;

  // Verificar se a tarefa está vencida
  const isOverdue = task.due_date 
    ? new Date(task.due_date) < new Date() && task.status !== 'completed' 
    : false;

  // Calcular progresso da checklist
  const checklistItems = task.checklist || [];
  const checkedItems = checklistItems.filter(item => item.completed).length;
  const totalItems = checklistItems.length;
  const hasChecklist = totalItems > 0;
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  // Verificar se a tarefa pode ser iniciada ou concluída
  const canBeStarted = task.status === 'pending';
  const canBeCompleted = task.status === 'in_progress';

  // Função para atualizar o status com base no estado atual
  const handleUpdateStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateStatus) return;
    
    if (canBeStarted) {
      onUpdateStatus(task.id, 'in_progress');
    } else if (canBeCompleted) {
      onUpdateStatus(task.id, 'completed');
    }
  };

  // Função para lidar com o arquivamento/desarquivamento com loading
  const handleToggleArchived = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsArchiveLoading(true);
    
    // Chama a função onToggleArchived
    // Nota: O estado de loading permanecerá ativo até que o componente
    // seja re-renderizado com o novo estado da tarefa
    onToggleArchived();
    
    // Não desativamos o loading aqui, ele permanecerá até que a tarefa seja atualizada
    // e o componente seja re-renderizado com os novos dados
  };

  // Função para abrir o modal de edição do cliente
  const handleOpenCustomerEditModal = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que o clique chegue ao card e abra detalhes
    setShowCustomerEditModal(true);
  };

  // Função para fechar o modal de edição do cliente
  const handleCloseCustomerEditModal = () => {
    setShowCustomerEditModal(false);
  };

  // Função para lidar com o sucesso da edição do cliente
  const handleCustomerEditSuccess = () => {
    
    // Invalidar cache de tarefas agrupadas por estágio
    queryClient.invalidateQueries({ queryKey: ['tasks-by-stage'] });
    
    // Fechar o modal
    setShowCustomerEditModal(false);
  };

  // Nova função para alternar o estado de um item da checklist
  const toggleChecklistItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation(); // Impedir que abra os detalhes do cartão
    
    try {
      setUpdatingChecklistItem(itemId);
      
      // Encontra o item atual e inverte seu status
      const updatedChecklist = task.checklist.map(item => {
        if (item.id === itemId) {
          return { ...item, completed: !item.completed };
        }
        return item;
      });
      
      // Atualiza a tarefa no banco de dados
      const { error } = await supabase
        .from('tasks')
        .update({ checklist: updatedChecklist })
        .eq('id', task.id);
        
      if (error) throw error;
      
      // Atualiza o cache para refletir as mudanças
      queryClient.invalidateQueries({ queryKey: ['tasks-by-stage'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Atualiza localmente para uma experiência mais responsiva
      toast.success(t('tasks:checklist.itemUpdated', 'Item atualizado'));
      
    } catch (error) {
      console.error('Erro ao atualizar item da checklist:', error);
      toast.error(t('tasks:checklist.updateError', 'Erro ao atualizar item'));
    } finally {
      setUpdatingChecklistItem(null);
    }
  };

  // Funções para obter informações de estilo com base no status
  const getStatusInfo = (status: TaskWithRelations['status']) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'gray',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          textColor: 'text-gray-700 dark:text-gray-300',
          label: t('tasks:statuses.pending')
        };
      case 'in_progress':
        return {
          icon: Hourglass,
          color: 'blue',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-700 dark:text-blue-300',
          label: t('tasks:statuses.in_progress')
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'green',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          textColor: 'text-green-700 dark:text-green-300',
          label: t('tasks:statuses.completed')
        };
      case 'cancelled':
        return {
          icon: XCircle,
          color: 'red',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-700 dark:text-red-300',
          label: t('tasks:statuses.cancelled')
        };
      default:
        return {
          icon: Clock,
          color: 'gray',
          bgColor: 'bg-gray-50 dark:bg-gray-800',
          borderColor: 'border-gray-200 dark:border-gray-700',
          textColor: 'text-gray-700 dark:text-gray-300',
          label: 'Unknown'
        };
    }
  };

  const statusInfo = getStatusInfo(task.status);
  const StatusIcon = statusInfo.icon;

  return (
    <>
      <div
        ref={(node) => {
          // Combinar as referências
          setNodeRef(node);
          if (cardRef && node) {
            // Usar Object.assign para contornar a propriedade readonly
            Object.assign(cardRef, { current: node });
          }
        }}
        style={style}
        {...attributes}
        {...listeners}
        className={`bg-white dark:bg-gray-800 p-2 sm:p-2.5 md:p-3 rounded-md shadow-sm border relative 
        ${contentOverflows || isLastInColumn ? 'overflow-hidden' : ''}
        ${isOverdue ? 'border-red-300 dark:border-red-700' : statusInfo.borderColor} 
        ${task.is_archived ? 'opacity-60' : ''} 
        ${isCompleted ? 'opacity-70' : ''}
        mb-2 cursor-grab group`}
        data-id={task.id}
        data-card="true"
        onClick={() => setShowDetails(!showDetails)}
        onMouseEnter={() => setShowCompleteButton(true)}
        onMouseLeave={() => setShowCompleteButton(false)}
        onTouchStart={() => setShowCompleteButton(true)}
        onTouchEnd={() => setTimeout(() => setShowCompleteButton(false), 1500)}
      >
        {/* Barra de status na lateral esquerda */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${
          statusInfo.color === 'gray' ? 'bg-gray-500 dark:bg-gray-600' :
          statusInfo.color === 'blue' ? 'bg-blue-500 dark:bg-blue-600' :
          statusInfo.color === 'green' ? 'bg-green-500 dark:bg-green-600' :
          statusInfo.color === 'red' ? 'bg-red-500 dark:bg-red-600' :
          'bg-gray-500 dark:bg-gray-600'
        }`}></div>

        <div className="flex flex-col h-full">
          {/* Status badge no topo com botão concluir sobreposto */}
          <div className="flex justify-between items-start relative">
            {/* Status original (que ficará oculto quando o botão concluir estiver visível) */}
            <div className={`flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs whitespace-nowrap ${statusInfo.bgColor} ${statusInfo.textColor} ${
              showCompleteButton && (canBeStarted || canBeCompleted) && (onUpdateStatus !== undefined) ? 'invisible' : 'visible'
            }`}>
              <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 flex-shrink-0" />
              <span className="truncate max-w-[60px] sm:max-w-none">{statusInfo.label}</span>
            </div>
            
            {/* Botão para iniciar ou concluir tarefa (sobreposto ao status) */}
            {(canBeStarted || canBeCompleted) && (onUpdateStatus !== undefined) && (
              <button
                onClick={handleUpdateStatus}
                className={`absolute left-0 top-0 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs whitespace-nowrap ${
                  canBeStarted 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50' 
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                } flex items-center transition-opacity duration-200 ${
                  showCompleteButton ? 'opacity-100' : 'opacity-0 pointer-events-none'
                } shadow-sm hover:shadow cursor-pointer transform hover:scale-105 transition-all duration-150`}
                title={canBeStarted ? t('tasks:startTask') : t('tasks:markAsCompleted')}
              >
                {canBeStarted ? (
                  <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 flex-shrink-0" />
                ) : (
                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 flex-shrink-0" />
                )}
                <span className="hidden sm:inline truncate">
                  {canBeStarted ? t('tasks:startTask') : t('tasks:markAsCompleted')}
                </span>
                <span className="sm:hidden truncate max-w-[40px]">
                  {canBeStarted ? t('tasks:start') : t('tasks:done')}
                </span>
              </button>
            )}
            
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              {/* Indicador de prioridade */}
              <div className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs whitespace-nowrap flex items-center ${
                task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                task.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                task.priority === 'low' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}>
                {task.priority === 'high' && <AlertTriangle className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 flex-shrink-0 sm:hidden" />}
                <span>{t(`tasks:priorities.${task.priority}`)}</span>
              </div>
              
              {/* Botões de ação */}
              <div className="flex space-x-0.5 sm:space-x-1 flex-shrink-0">
                <button
                  onClick={handleToggleArchived}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-0.5 sm:p-1 touch-manipulation"
                  title={task.is_archived ? t('unarchived') : t('archived')}
                  disabled={isArchiveLoading}
                >
                  {isArchiveLoading ? (
                    <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                  ) : task.is_archived ? (
                    <ArchiveRestore className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  ) : (
                    <Archive className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-0.5 sm:p-1 touch-manipulation"
                >
                  <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-0.5 sm:p-1 touch-manipulation"
                >
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-start mt-0.5 sm:mt-1">
            <div className="flex-1 min-w-0 pr-1 sm:pr-2">
              <h3 className={`text-xs sm:text-sm text-gray-900 dark:text-white leading-tight ${showDetails ? '' : 'line-clamp-2 sm:truncate'} ${isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                {task.title}
                {task.is_archived && (
                  <span className="ml-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 italic">
                    ({t('archived')})
                  </span>
                )}
              </h3>
            </div>
          </div>

          {/* Conteúdo com scroll quando necessário */}
          <div 
            ref={contentRef}
            className={`flex-1 mt-1 sm:mt-1.5 space-y-1 sm:space-y-1.5 ${isCompleted ? 'text-gray-500 dark:text-gray-400' : ''} 
              ${contentOverflows || isLastInColumn ? 'overflow-y-auto custom-scrollbar' : ''}`}
          >
            {/* Due Date */}
            {formattedDueDate && (
              <div className={`flex items-center text-xs ${
                isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'
              }`}>
                <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{formattedDueDate}</span>
                {isOverdue && (
                  <AlertCircle className="w-3 h-3 ml-1 text-red-500 dark:text-red-400 flex-shrink-0" />
                )}
              </div>
            )}

            {/* Checklist Progress */}
            {hasChecklist && (
              <div className="flex flex-col space-y-0.5">
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <CheckSquare className="w-3 h-3 mr-1" />
                  <span>
                    {t('tasks:checklist.progress', { count: checkedItems, total: totalItems })}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full ${
                      progress === 100 ? 'bg-green-500' : 
                      progress > 50 ? 'bg-blue-500' : 
                      progress > 0 ? 'bg-amber-500' : 'bg-gray-400'
                    }`} 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Tags e Atribuições */}
            <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-1">
              {/* Labels/Tags */}
              {task.labels && task.labels.length > 0 && (
                <div className="flex items-center space-x-0.5 sm:space-x-1">
                  <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-500 dark:text-gray-400" />
                  <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                    {task.labels.length}
                  </span>
                </div>
              )}

              {/* Assignees count */}
              {task.assignees && task.assignees.length > 0 && (
                <div className="flex items-center space-x-0.5 sm:space-x-1">
                  <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-500 dark:text-gray-400" />
                  <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                    {task.assignees.length}
                  </span>
                </div>
              )}

              {/* Customer if exists */}
              {task.customer && (
                <div 
                  className={`ml-auto text-[10px] sm:text-xs px-1 py-0.5 rounded cursor-pointer truncate max-w-[80px] sm:max-w-[100px] ${
                    isCompleted 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' 
                      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                  }`}
                  onClick={handleOpenCustomerEditModal}
                  title={t('customers:edit.title')}
                >
                  {task.customer.name}
                </div>
              )}
            </div>

            {/* Detalhes expandidos */}
            {showDetails && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
                {/* Descrição */}
                {task.description && (
                  <div className={`text-sm ${isCompleted ? 'text-gray-500 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    {task.description}
                  </div>
                )}

                {/* Lista de itens de checklist */}
                {hasChecklist && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('tasks:checklist.title')}
                    </div>
                    {checklistItems.map((item, index) => (
                      <div key={item.id || index} className="flex items-start space-x-2 group">
                        <div 
                          className={`mt-0.5 w-3.5 h-3.5 rounded-sm flex-shrink-0 flex items-center justify-center
                            ${updatingChecklistItem === item.id ? 'bg-gray-300 dark:bg-gray-600 animate-pulse' : 
                            item.completed 
                            ? 'bg-green-500 text-white' 
                            : 'border border-gray-300 dark:border-gray-600'}
                            cursor-pointer hover:shadow-sm hover:border-blue-400 dark:hover:border-blue-500`} 
                          onClick={(e) => toggleChecklistItem(e, item.id)}
                        >
                          {updatingChecklistItem === item.id ? (
                            <Loader2 className="w-2 h-2 animate-spin text-gray-600 dark:text-gray-300" />
                          ) : item.completed && (
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span 
                          className={`text-xs ${
                            item.completed 
                              ? 'text-gray-400 dark:text-gray-500 line-through' 
                              : 'text-gray-700 dark:text-gray-300'
                          } cursor-pointer group-hover:text-blue-600 dark:group-hover:text-blue-400`}
                          onClick={(e) => toggleChecklistItem(e, item.id)}
                        >
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Etiquetas detalhadas */}
                {task.labels && task.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {task.labels.map(label => (
                      <div 
                        key={label.id}
                        className={`px-1.5 py-0.5 rounded-full text-xs ${isCompleted ? 'opacity-60' : ''}`}
                        style={{ 
                          backgroundColor: isCompleted ? '#f3f4f6' : `${label.color}20`, // mudança para cinza claro se concluído
                          color: isCompleted ? '#9ca3af' : label.color,
                          border: isCompleted ? '1px solid #e5e7eb' : `1px solid ${label.color}`
                        }}
                      >
                        {label.name}
                      </div>
                    ))}
                  </div>
                )}

                {/* Responsáveis */}
                {task.assignees && task.assignees.length > 0 && (
                  <div className="flex flex-wrap items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                      {t('tasks:assignees.title')}:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {task.assignees.map(assignee => (
                        <div 
                          key={assignee.id}
                          className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5 text-xs dark:text-gray-300"
                        >
                          {assignee.profile?.avatar_url ? (
                            <img 
                              src={assignee.profile.avatar_url} 
                              alt={assignee.profile.full_name || ''}
                              className="w-4 h-4 rounded-full mr-1"
                            />
                          ) : (
                            <User className="w-3 h-3 mr-1" />
                          )}
                          <span className="truncate max-w-[100px] dark:text-gray-300">
                            {assignee.profile?.full_name || assignee.user_id}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de edição do cliente */}
      {showCustomerEditModal && task.customer && (
        <CustomerEditModal
          customer={task.customer}
          onClose={handleCloseCustomerEditModal}
          onSuccess={handleCustomerEditSuccess}
        />
      )}
    </>
  );
} 