import React, { useState, useEffect, useRef } from 'react';
import { MessageStatus } from './MessageStatus';
import { FileText, UserPlus, UserMinus, UserCog, CheckCircle, MessageSquare, MoreVertical, Reply, X, Info, ChevronRight, ChevronDown, Trash2, Loader2, RefreshCw, Menu, Ban, Users, CheckSquare, Clock, Hourglass, XCircle, ZoomIn, ZoomOut, RotateCcw, Edit3 } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { Chat, Message } from '../../types/database';
import { useTranslation } from 'react-i18next';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { getMessageTypeIcon } from '../../utils/chat';
import './styles.css';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/DropdownMenu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { TaskModal } from '../tasks/TaskModal';
import { useAuthContext } from '../../contexts/AuthContext';
import { EditMessageModal } from './EditMessageModal';

// Adicionar a propriedade tasks ao tipo Message
interface MessageWithTasks extends Message {
  tasks?: TaskObject;
}

// Interface para o objeto de tarefa que pode estar presente no metadata
interface TaskObject {
  id?: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  checklist?: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
}

// Interface para dados de localização
interface LocationData {
  latitude: number;
  longitude: number;
  jpegThumbnail?: string;
}

// Interface para configurações de funcionalidades por canal
interface ChannelFeatures {
  canReplyToMessages: boolean;
  canSendAudio: boolean;
  canSendTemplates: boolean;
  has24HourWindow: boolean;
  canSendAfter24Hours: boolean;
  canDeleteMessages: boolean;
  canEditMessages: boolean;
}

// Interfaces para o formato de lista do WhatsApp
interface WhatsAppListRow {
  title: string;
  description: string;
}

interface WhatsAppListSection {
  title: string;
  rows: WhatsAppListRow[];
}

interface WhatsAppList {
  title: string;
  description: string;
  buttonText: string;
  sections: WhatsAppListSection[];
}

// Adicionar interface para o estado do zoom
interface ZoomState {
  scale: number;
  translateX: number;
  translateY: number;
  isDragging: boolean;
  lastPanPoint: { x: number; y: number } | null;
  hasDragged: boolean;
}

interface MessageBubbleProps {
  message: MessageWithTasks
  chatStatus: string;
  onReply?: (message: MessageWithTasks) => void;
  isHighlighted?: boolean;
  channelFeatures?: ChannelFeatures;
  onDeleteMessage?: (message: MessageWithTasks) => void;
  isPending?: boolean;
  onRetry?: (message: MessageWithTasks) => void;
  isDeleting?: boolean;
  chat?: Chat;
}

export function MessageBubble({ 
  message, 
  chatStatus, 
  onReply, 
  isHighlighted = false,
  channelFeatures = {
    canReplyToMessages: true,
    canSendAudio: false,
    canSendTemplates: false,
    has24HourWindow: false,
    canSendAfter24Hours: true,
    canDeleteMessages: false,
    canEditMessages: false
  },
  onDeleteMessage,
  isPending = false,
  onRetry,
  isDeleting = false,
  chat
}: MessageBubbleProps) {
  const { t } = useTranslation('chats');
  const { currentOrganizationMember } = useAuthContext();
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [expandedMetadataKeys, setExpandedMetadataKeys] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // Ref para o container da imagem
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Estado para controle de zoom
  const [zoomState, setZoomState] = useState<ZoomState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
    isDragging: false,
    lastPanPoint: null,
    hasDragged: false
  });

  // Função para controle de zoom com wheel
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomState(prev => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * delta, 0.5), 5)
    }));
  };

  // Adicionar/remover listener de wheel quando modal abre/fecha
  useEffect(() => {
    if (imageModalOpen && imageContainerRef.current) {
      const container = imageContainerRef.current;
      container.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [imageModalOpen]);

  const {
    content,
    created_at,
    sender_type,
    status,
    error_message,
    attachments,
    type,
    sender_agent,
    metadata
  } = message;
  
  // Verificar se existe uma lista no metadata
  const whatsappList = metadata?.list as WhatsAppList | undefined;
  
  // Extrair reações se existirem no metadata
  const reactions = metadata?.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;
  
  // Se a mensagem tiver status 'deleted', mostrar um formato especial
  if (status === 'deleted') {
    const isAgent = sender_type === 'agent';
    return (
      <div className={`flex ${isAgent ? 'justify-end' : 'justify-start'} group relative w-full ${isHighlighted ? 'highlighted-message' : ''}`}>
        <div 
          className={`p-2 max-w-[85%] md:max-w-[75%] lg:max-w-[65%] rounded-lg p-1 relative ${
            isAgent
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400'
          } italic`}
        >
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4" />
            <span className='text-sm'>{t('messageStatus.deleted')}</span>
          </div>
          <div className={`flex items-center justify-end space-x-1 text-xs mt-1 ${
            isAgent
              ? 'text-blue-100 dark:text-blue-200'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            <span>{new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Se a mensagem for uma resposta a uma mensagem que foi apagada, precisamos verificar
  if (message.response_to && message.response_to.status === 'deleted') {
    // Remover a referência à mensagem deletada
    message.response_to = undefined;
  }
  
  const isAgent = sender_type === 'agent';
  const isSystem = sender_type === 'system';
  const isCustomer = sender_type === 'customer';

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  // Função para verificar se a mensagem tem menos de 48 horas
  const canDeleteMessage = () => {
    if (!created_at) return false;
    
    // Mensagens pendentes podem ser excluídas a qualquer momento
    if (isPending) return true;
    
    const messageDate = new Date(created_at);
    const now = new Date();
    const diffHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    return diffHours <= 48;
  };

  // Função para verificar se a mensagem pode ser editada (últimos 15 minutos)
  const canEditMessage = () => {
    if (!created_at) return false;
    if (!isAgent) return false;
    if (type !== 'text') return false;
    
    const messageDate = new Date(created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - messageDate.getTime()) / (1000 * 60);
    
    return diffMinutes <= 15;
  };

  // Função para abrir o modal de edição
  const handleEditClick = () => {
    setEditModalOpen(true);
  };

  // Verificação combinada para habilitar exclusão
  const isDeletionAllowed = channelFeatures.canDeleteMessages && onDeleteMessage && canDeleteMessage() && isAgent;
  
  const handleDelete = async () => {
    if (!onDeleteMessage || !canDeleteMessage()) return;
    
    setError(null);
    
    try {
      await onDeleteMessage(message);
      setShowDeleteModal(false);
    } catch (err) {
      setError(t("errors.deleteMessage"));
      console.error("Erro ao excluir mensagem:", err);
      // Não fechar o modal em caso de erro
    }
  };

  // Função para formatar data e hora
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };


  // Função para renderizar o valor do metadata de forma amigável
  const renderMetadataValue = (value: unknown, depth = 0, path = ''): React.ReactNode => {
    if (value === null) return <span className="text-gray-500 dark:text-gray-400">null</span>;
    if (value === undefined) return <span className="text-gray-500 dark:text-gray-400">undefined</span>;
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length === 0) return <span className="text-gray-500 dark:text-gray-400">[]</span>;
        
        const isExpanded = expandedMetadataKeys.includes(path);
        
        return (
          <div className="ml-4">
            <div 
              className="flex items-center cursor-pointer" 
              onClick={() => toggleMetadataExpand(path)}
            >
              {isExpanded ? 
                <ChevronDown className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" /> : 
                <ChevronRight className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
              }
              <span className="text-blue-600 dark:text-blue-400">Array[{value.length}]</span>
            </div>
            
            {isExpanded && (
              <div className="ml-4 border-l-2 border-gray-300 dark:border-gray-600 pl-2">
                {value.map((item, index) => (
                  <div key={index} className="my-1">
                    <span className="text-gray-600 dark:text-gray-300">{index}: </span>
                    {renderMetadataValue(item, depth + 1, `${path}.${index}`)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      } else {
        const entries = Object.entries(value);
        if (entries.length === 0) return <span className="text-gray-500 dark:text-gray-400">{"{}"}</span>;
        
        const isExpanded = expandedMetadataKeys.includes(path);
        
        return (
          <div className="ml-4">
            <div 
              className="flex items-center cursor-pointer" 
              onClick={() => toggleMetadataExpand(path)}
            >
              {isExpanded ? 
                <ChevronDown className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" /> : 
                <ChevronRight className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
              }
              <span className="text-blue-600 dark:text-blue-400">Object{`{${entries.length}}`}</span>
            </div>
            
            {isExpanded && (
              <div className="ml-4 border-l-2 border-gray-300 dark:border-gray-600 pl-2">
                {entries.map(([key, val]) => (
                  <div key={key} className="my-1">
                    <span className="text-gray-600 dark:text-gray-300">{key}: </span>
                    {renderMetadataValue(val, depth + 1, `${path}.${key}`)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
    }
    
    if (typeof value === 'string') {
      // Verificar se é uma URL
      if (/^https?:\/\//.test(value)) {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-blue-400 underline hover:opacity-80 break-all"
          >
            {value}
          </a>
        );
      }
      
      // Verificar se é uma data ISO
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return <span className="text-green-600 dark:text-green-400">{date.toLocaleString()}</span>;
        }
      }
      
      return <span className="text-green-600 dark:text-green-400">"{value}"</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-purple-600 dark:text-purple-400">{value}</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-orange-600 dark:text-orange-400">{value.toString()}</span>;
    }
    
    return <span>{String(value)}</span>;
  };

  // Função para alternar a expansão de um nó do metadata
  const toggleMetadataExpand = (path: string) => {
    setExpandedMetadataKeys(prev => 
      prev.includes(path) 
        ? prev.filter(key => key !== path)
        : [...prev, path]
    );
  };

  // Função para renderizar ícone do sistema
  const renderSystemIcon = () => {
    switch (type) {
      case 'user_start':
        return <MessageSquare className="w-4 h-4" />;
      case 'user_entered':
        return <UserPlus className="w-4 h-4" />;
      case 'user_left':
        return <UserMinus className="w-4 h-4" />;
      case 'user_transferred':
      case 'user_transferred_himself':
        return <UserCog className="w-4 h-4" />;
      case 'team_transferred':
        return <Users className="w-4 h-4" />;
      case 'user_join':
        return <UserPlus className="w-4 h-4" />;
      case 'user_closed':
        return <CheckCircle className="w-4 h-4" />;
      case 'task':
        return <CheckSquare className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Função para obter a mensagem do sistema
  const getSystemMessage = (): React.ReactNode => {
    const agentName = sender_agent?.full_name || t('unnamed');
    
    switch (type) {
      case 'user_start':
        return t('systemMessages.userStart', { name: agentName });
      case 'user_entered':
        return t('systemMessages.userEntered', { name: agentName });
      case 'user_left':
        return t('systemMessages.userLeft', { name: agentName });
      case 'user_transferred':
        return t('systemMessages.userTransfer', { name: agentName });
      case 'user_transferred_himself':
        return t('systemMessages.userTransferredHimself', { name: agentName });
      case 'team_transferred':
        return t('systemMessages.teamTransferred', { name: content });
      case 'user_join':
        return t('systemMessages.userJoin', { name: agentName });
      case 'user_closed':
        return t('systemMessages.userClosed', { name: agentName });
      case 'task': {
        // Verificar primeiro pelo objeto tasks na mensagem e depois por task_id no metadata
        let task: TaskObject | null = null;
        
        if (message.tasks) {
          // Novo formato com objeto tasks diretamente na mensagem
          task = message.tasks as TaskObject;
        } else if (metadata?.task) {
          // Formato alternativo com task no metadata
          task = metadata.task as TaskObject;
        } else if (metadata?.task_id) {
          // Formato antigo com task_id
          task = {
            title: metadata.task_title as string || t('systemMessages.taskUnknown', 'tarefa'),
            status: 'pending'
          };
        }
        
        if (!task) {
          return content || '';
        }
        
        // Adicionar informações de status
        const statusLabels: Record<string, string> = {
          'pending': t('tasks:statuses.pending'),
          'in_progress': t('tasks:statuses.in_progress'),
          'completed': t('tasks:statuses.completed'),
          'cancelled': t('tasks:statuses.cancelled')
        };
        
        // Obter o status
        const status = task.status || 'pending';
        
        // Calcular progresso da checklist se disponível
        let checklistProgress = null;
        if (task.checklist && task.checklist.length > 0) {
          const items = task.checklist;
          const completed = items.filter(item => item.completed).length;
          const total = items.length;
          const progress = Math.round((completed / total) * 100);
          
          checklistProgress = {
            completed,
            total,
            progress
          };
        }
        
        // Estilos do status
        const getStatusInfo = (status: string) => {
          switch (status) {
            case 'pending':
              return {
                icon: Clock,
                bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                textColor: 'text-blue-700 dark:text-blue-300'
              };
            case 'in_progress':
              return {
                icon: Hourglass,
                bgColor: 'bg-amber-50 dark:bg-amber-900/20',
                textColor: 'text-amber-700 dark:text-amber-300'
              };
            case 'completed':
              return {
                icon: CheckCircle,
                bgColor: 'bg-green-50 dark:bg-green-900/20',
                textColor: 'text-green-700 dark:text-green-300'
              };
            case 'cancelled':
              return {
                icon: XCircle,
                bgColor: 'bg-red-50 dark:bg-red-900/20',
                textColor: 'text-red-700 dark:text-red-300'
              };
            default:
              return {
                icon: Clock,
                bgColor: 'bg-gray-50 dark:bg-gray-800',
                textColor: 'text-gray-700 dark:text-gray-300'
              };
          }
        };
        
        const statusInfo = getStatusInfo(status);
        const StatusIcon = statusInfo.icon;
        const isCompleted = status === 'completed';
        
        return (
          <div 
            className="flex flex-col w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setTaskModalOpen(true);
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className={`flex items-center px-2 py-0.5 rounded-full text-xs ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                <span>{statusLabels[status]}</span>
              </div>
              
              {/* Barra de progresso ao lado do status */}
              {checklistProgress && (
                <div className="flex items-center ml-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-1.5">
                    {checklistProgress.completed}/{checklistProgress.total}
                  </span>
                  <div className="w-16 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        checklistProgress.progress === 100 ? 'bg-green-500' : 
                        checklistProgress.progress > 50 ? 'bg-blue-500' : 
                        checklistProgress.progress > 0 ? 'bg-amber-500' : 'bg-gray-400'
                      }`} 
                      style={{ width: `${checklistProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <h3 className={`text-xs  ${isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-400'}`}>
              {task.title || t('systemMessages.taskUnknown', 'tarefa')}
            </h3>
          </div>
        );
      }
      default:
        return content || '';
    }
  };

  // Função para extrair nome de arquivo mais descritivo da URL quando possível
  const extractFileNameFromUrl = (url: string, defaultName: string): string => {
    if (!url) return defaultName;
    
    // Nomes genéricos que devem ser substituídos se houver informações melhores
    const genericNames = ['attachment', 'file', 'document', 'download'];
    
    // Se o nome não for genérico, retorná-lo como está
    if (defaultName && !genericNames.includes(defaultName.toLowerCase())) {
      return defaultName;
    }
    
    try {
      // Tentar extrair o nome do arquivo da query string
      const urlObj = new URL(url);
      const queryParams = urlObj.search.substring(1).split('&');
      
      // Verifica se o último segmento da query contém uma extensão de arquivo
      for (const param of queryParams) {
        // Caso específico como ?boleto.pdf no exemplo
        if (param.includes('.')) {
          const possibleFileName = param.split('=')[0];
          if (possibleFileName.includes('.')) {
            return possibleFileName;
          }
        }
        
        // Caso normal como file=boleto.pdf
        const [, value] = param.split('=');
        if (value && value.includes('.')) {
          return decodeURIComponent(value);
        }
      }
      
      // Tentar extrair do pathname
      const pathSegments = urlObj.pathname.split('/');
      const lastSegment = pathSegments[pathSegments.length - 1];
      
      // Verificar se o último segmento tem um formato de arquivo
      if (lastSegment && lastSegment.includes('.')) {
        return lastSegment;
      }
      
      // Para URLs como /pdf/pnry8rkwxtovucpv?boleto.pdf
      // Verificar se o tipo do documento está no caminho
      const fileTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
      for (const segment of pathSegments) {
        if (fileTypes.includes(segment.toLowerCase())) {
          // Tenta construir um nome descritivo
          return `${segment}-${lastSegment}.${segment}`;
        }
      }
      
      // Se não encontrou nos caminhos fáceis, verificar o caminho completo
      const fullPath = urlObj.pathname + urlObj.search;
      const extensionMatch = fullPath.match(/\.(pdf|doc|docx|xls|xlsx|csv|txt|jpg|jpeg|png|gif)(\?|$)/i);
      
      if (extensionMatch) {
        // Tenta extrair um nome mais significativo incluindo a extensão
        return `${lastSegment}.${extensionMatch[1]}`;
      }
    } catch (e) {
      console.error("Erro ao analisar URL:", e);
    }
    
    // Retornar nome padrão se não conseguir extrair nada melhor
    return defaultName;
  };

  // Função para inferir o tipo MIME pelo nome do arquivo ou extensão
  const inferMimeType = (fileName: string, defaultType: string = 'application/octet-stream'): string => {
    if (!fileName || !fileName.includes('.')) return defaultType;
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension) return defaultType;
    
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'mp3': 'audio/mpeg',
      'mp4': 'video/mp4',
      'wav': 'audio/wav',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      'tar': 'application/x-tar',
      'html': 'text/html',
      'json': 'application/json'
    };
    
    return mimeTypes[extension] || defaultType;
  };

  // Funções para controle de zoom
  const resetZoom = () => {
    setZoomState({
      scale: 1,
      translateX: 0,
      translateY: 0,
      isDragging: false,
      lastPanPoint: null,
      hasDragged: false
    });
  };

  const zoomIn = () => {
    setZoomState(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.5, 5)
    }));
  };

  const zoomOut = () => {
    setZoomState(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.5, 0.5)
    }));
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Só fazer zoom se não houve arraste
    if (!zoomState.hasDragged) {
      if (zoomState.scale === 1) {
        zoomIn();
      } else {
        resetZoom();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomState.scale > 1) {
      e.preventDefault();
      setZoomState(prev => ({
        ...prev,
        isDragging: true,
        lastPanPoint: { x: e.clientX, y: e.clientY },
        hasDragged: false // Reset flag quando inicia o arraste
      }));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (zoomState.isDragging && zoomState.lastPanPoint && zoomState.scale > 1) {
      e.preventDefault();
      const deltaX = e.clientX - zoomState.lastPanPoint.x;
      const deltaY = e.clientY - zoomState.lastPanPoint.y;
      
      // Detectar se houve movimento significativo (mais de 5px)
      const hasMoved = Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5;
      
      setZoomState(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY,
        lastPanPoint: { x: e.clientX, y: e.clientY },
        hasDragged: prev.hasDragged || hasMoved // Marcar que houve arraste
      }));
    }
  };

  const handleMouseUp = () => {
    setZoomState(prev => ({
      ...prev,
      isDragging: false,
      lastPanPoint: null
      // Manter hasDragged para o próximo clique
    }));
    
    // Reset hasDragged após um pequeno delay para permitir o clique
    setTimeout(() => {
      setZoomState(prev => ({
        ...prev,
        hasDragged: false
      }));
    }, 100);
  };

  // Funções para touch/gestos no mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoomState.scale > 1) {
      const touch = e.touches[0];
      setZoomState(prev => ({
        ...prev,
        isDragging: true,
        lastPanPoint: { x: touch.clientX, y: touch.clientY },
        hasDragged: false
      }));
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoomState.isDragging && zoomState.lastPanPoint && zoomState.scale > 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - zoomState.lastPanPoint.x;
      const deltaY = touch.clientY - zoomState.lastPanPoint.y;
      
      const hasMoved = Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5;
      
      setZoomState(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY,
        lastPanPoint: { x: touch.clientX, y: touch.clientY },
        hasDragged: prev.hasDragged || hasMoved
      }));
    }
  };

  const handleTouchEnd = () => {
    setZoomState(prev => ({
      ...prev,
      isDragging: false,
      lastPanPoint: null
    }));
    
    setTimeout(() => {
      setZoomState(prev => ({
        ...prev,
        hasDragged: false
      }));
    }, 100);
  };

  // Reset zoom quando modal abre/fecha
  const openImageModal = (image: { url: string; name: string }) => {
    setSelectedImage(image);
    setImageModalOpen(true);
    resetZoom();
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    resetZoom();
  };

  // Função para renderizar anexos
  const renderAttachment = (attachment: { url: string; type: string; name?: string; file_name?: string; mime_type?: string | null }) => {
    // Normalizar campos
    const attachmentName = attachment.name || attachment.file_name || 'attachment';
    const attachmentType = attachment.mime_type || attachment.type || '';
    
    // Extrair nome mais descritivo da URL quando o nome for genérico
    const betterName = extractFileNameFromUrl(attachment.url, attachmentName);
    
    // Inferir tipo MIME se não estiver definido ou for genérico
    const betterType = attachmentType === 'document' || !attachmentType ? 
      inferMimeType(betterName, 'application/pdf') : attachmentType;
    
    // Determinar ícone baseado no tipo
    const FileIcon = FileText;
    let fileClass = "text-gray-500 dark:text-gray-400";
    
    if (betterType.startsWith('application/pdf')) {
      fileClass = "text-red-500 dark:text-red-400";
    } else if (betterType.includes('sheet') || betterType.includes('excel') || betterType.includes('csv')) {
      fileClass = "text-green-500 dark:text-green-400";
    } else if (betterType.includes('word') || betterType.includes('document')) {
      fileClass = "text-blue-500 dark:text-blue-400";
    }

    if (betterType.startsWith('image') || betterType.startsWith('image/')) {
      return (
        <div className="max-w-full mb-1">
          <div 
            onClick={() => openImageModal({ url: attachment.url, name: betterName })}
            className="cursor-pointer hover:opacity-90 transition-opacity"
          >
            <img
              src={attachment.url}
              alt={betterName}
              className="max-w-full w-auto rounded-lg h-[200px] object-contain"
            />
          </div>
        </div>
      );
    }

    // if (betterType.startsWith('audio') || betterType.startsWith('audio/')) {
    //   return (
    //     <div className="w-[300px]">
    //       <div className="bg-gray-200 dark:bg-gray-800/50 rounded-full p-2">
    //         <AudioPlayer
    //           src={attachment.url}
    //           fileName={betterName}
    //         />
    //       </div>
    //       {content && (
    //         <div className="mt-2">
    //           <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
    //             {t('voice.transcription')}:
    //           </span>
    //           <div className="mt-1 text-sm">
    //             {content}
    //           </div>
    //         </div>
    //       )}
    //     </div>
    //   );
    // }

    return (
      <div className="max-w-full">
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors overflow-hidden max-w-[200px] md:max-w-[300px]"
        >
          <FileIcon className={`w-4 h-4 flex-shrink-0 ${fileClass}`} />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0">
            {betterName}
          </span>
        </a>
      </div>
    );
  };

  // Renderização condicional baseada no tipo de mensagem
  let messageContent;
  
  if (isSystem) {
    messageContent = (
      <div className="flex justify-center my-2 relative group">
        <div className={`flex items-center flex-row gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 ${
          isHighlighted ? 'ring-2 ring-blue-500 dark:ring-blue-400 animate-pulse' : ''
        }`}>
          {renderSystemIcon()}
          <div className='flex-1'>{getSystemMessage()}</div>
          
          <span className="text-xs text-gray-500">
            {new Date(created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          <div className="absolute right-0 top-0 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side={isCustomer ? "right" : "left"}
              >
                <DropdownMenuItem onClick={() => setDetailsModalOpen(true)}>
                  <Info className="w-4 h-4 mr-2" />
                  {t('actions.details')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  } else if (message.type === 'audio') {
    messageContent = (
      <div className={`flex ${isAgent ? 'justify-end' : 'justify-start'} group relative w-full ${isHighlighted ? 'highlighted-message' : ''}`}>
        <div className={` min-w-[300px] max-w-[85%] md:max-w-[75%] lg:max-w-[65%] rounded-lg p-2 relative ${
          isAgent
            ? 'bg-gradient-to-r from-blue-700 to-blue-800 dark:from-blue-800/80 dark:to-blue-900/80 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
        } ${isPending ? '0.5 opacity-50' : ''} ${isDeleting ? 'opacity-70 border-2 border-dashed border-red-300 dark:border-red-500 animate-pulse' : ''}`}>
          <AudioPlayer src={message?.attachments ? message?.attachments[0]?.url : ''} fileName={message?.attachments ? message?.attachments[0]?.name : ''} />
          
          {message.content && (
            <div className="mt-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('voice.transcription')}:
              </span>
              <div className="mt-1 text-sm">
                {message.content}
              </div>
            </div>
          )}
          {/* Exibir horário */}
          <div className="absolute bottom-0 right-2 text-xs opacity-20">
            <span>{new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    );
  } else if (message.type === 'location') {
    // Extrair dados de localização dos metadados
    const locationData = metadata?.location as LocationData | undefined;
    const latitude = locationData?.latitude;
    const longitude = locationData?.longitude;
    const jpegThumbnail = locationData?.jpegThumbnail;

    // Criar URL do Google Maps
    const googleMapsUrl = latitude && longitude 
      ? `https://www.google.com/maps?q=${latitude},${longitude}&z=15`
      : null;

    messageContent = (
      <div className={`flex ${isAgent ? 'justify-end' : 'justify-start'} group relative w-full ${isHighlighted ? 'highlighted-message' : ''}`}>
        <div className={`max-w-[85%] md:max-w-[75%] lg:max-w-[65%] rounded-lg p-1 relative ${
          isAgent
            ? 'bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-700/80 dark:to-blue-900/60 text-gray-300 dark:text-gray-300'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        } ${isPending ? 'mt-0.5 opacity-50' : ''} ${isDeleting ? 'opacity-70 border-2 border-dashed border-red-300 dark:border-red-500 animate-pulse' : ''}`}>
          
          {/* Dropdown Menu */}
          <div className={`absolute top-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity ${
            isCustomer ? 'right-0 mr-1 mt-1' : 'right-0 mr-1 mt-1'
          }`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side={isCustomer ? "right" : "left"}
              >
                {chatStatus === 'in_progress' && channelFeatures.canReplyToMessages && onReply && (
                  <DropdownMenuItem onClick={handleReply}>
                    <Reply className="w-4 h-4 mr-2" />
                    {t('actions.reply')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setDetailsModalOpen(true)}>
                  <Info className="w-4 h-4 mr-2" />
                  {t('actions.details')}
                </DropdownMenuItem>
                {isDeletionAllowed && (
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteModal(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('actions.delete')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col gap-2 p-1">
            {/* Thumbnail da localização ou ícone padrão */}
            <div 
              className="relative cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                if (googleMapsUrl) {
                  window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              {jpegThumbnail ? (
                <img
                  src={`data:image/jpeg;base64,${jpegThumbnail}`}
                  alt="Localização"
                  className="w-full max-w-[250px] h-[150px] object-cover rounded-lg"
                />
              ) : (
                <div className="w-full max-w-[250px] h-[150px] bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <svg 
                      className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t('location.clickToOpen', 'Clique para abrir no mapa')}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Overlay com ícone do Google Maps */}
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                <div className="bg-white bg-opacity-80 rounded-full p-2 opacity-0 hover:opacity-100 transition-opacity">
                  <svg 
                    className="w-6 h-6 text-blue-600" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Coordenadas */}
            {/* {latitude && longitude && (
              <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                <span>{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
              </div>
            )} */}

            {/* Conteúdo da mensagem se houver */}
            {content && (
              <div className={`${isAgent ? 'mr-12' : 'mr-[30px]'} -mb-1 px-2 pt-1`}>
                <MarkdownRenderer content={content} className='text-sm' />
              </div>
            )}
          </div>

          <div className={`flex items-center justify-end space-x-1 text-xs mt-1 -mb-0.5 ${isAgent ? 'mr-0.5' : 'mr-1'} opacity-40 ${
            isAgent
              ? 'text-blue-100 dark:text-blue-200'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {metadata?.edited === true && (
              <span className="italic">{t('messageStatus.edited')}</span>
            )}
            <span>{new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isAgent && status && (
              <>
                <MessageStatus 
                  status={status} 
                  errorMessage={error_message}
                  isPending={isPending}
                />
                {status === 'failed' && onRetry && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetry(message);
                      }}
                      className="ml-2 px-2 py-0.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs flex items-center whitespace-nowrap"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {t('actions.retry')}
                    </button>
                    {isDeletionAllowed && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteModal(true);
                        }}
                        className="px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs flex items-center whitespace-nowrap"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {t('actions.delete')}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  } else {
    messageContent = (
      <div 
        id={`message-${message.id}`}
        className={`flex ${isAgent ? 'justify-end' : 'justify-start'} group relative w-full ${isHighlighted ? 'highlighted-message' : ''}  ${hasReactions ? 'mb-4' : ''}`}
        onDoubleClick={handleReply}
      >
        <div
          className={`max-w-[85%] md:max-w-[75%] lg:max-w-[65%] rounded-lg p-1 relative ${
            isAgent
              ? 'bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-700/80 dark:to-blue-900/60 text-gray-300 dark:text-gray-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          } ${isPending ? 'mt-0.5 opacity-50' : ''} ${isDeleting ? 'opacity-70 border-2 border-dashed border-red-300 dark:border-red-500 animate-pulse' : ''}`}
        >
          {isDeleting && (
            <div className="absolute -top-6 right-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs px-3 py-1 rounded-full flex items-center z-10 shadow-md animate-pulse border border-red-300 dark:border-red-700">
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              <span className="font-medium">{t('messageStatus.deleting', 'Excluindo...')}</span>
            </div>
          )}
          {message.response_to && (
            <button 
              onClick={() => {
                // Encontrar e rolar até a mensagem original
                const element = document.getElementById(`message-${message.response_to?.id}`);
                element?.scrollIntoView({ behavior: 'auto', block: 'center' });
                // Adicionar um highlight temporário
                element?.classList.add('highlight-message');
                setTimeout(() => element?.classList.remove('highlight-message'), 2000);
              }}
              className={`
                mb-2 text-sm rounded-md p-2 w-full max-w-full text-left
                hover:opacity-90 transition-opacity cursor-pointer min-w-[150px]
                overflow-hidden break-words
                ${isAgent 
                  ? 'bg-blue-900/90 dark:bg-blue-950 text-blue-50 dark:text-blue-100' 
                  : 'bg-gray-300/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              <div className="font-medium flex items-center gap-1">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  message.response_to.sender_type === 'agent' 
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' 
                    : `bg-blue-400/30 dark:bg-blue-900/60 ${isAgent ? 'text-blue-200 dark:text-blue-300' : 'text-blue-700 dark:text-gray-300'}`
                }`}>
                  {message.response_to.sender_type === 'agent' ? t('you') : chat?.customer?.name || t('customer')}:
                </span>
              </div>
              <div className="mt-1 break-words overflow-hidden line-clamp-2 text-ellipsis max-w-[400px] max-h-[35px] overflow-x-hidden">
                {message.response_to.content ? (
                  <MarkdownRenderer content={message.response_to.content} />
                ) : message.response_to.type ? (
                  <span className="flex items-center gap-1 italic">
                    {getMessageTypeIcon(message.response_to.type, "w-3 h-3")}
                    {t(`messageTypes.${message.response_to.type}`)}
                  </span>
                ) : (
                  message.response_to.content
                )}
              </div>
            </button>
          )}
          
          {/* Dropdown Menu */}
          <div className={`absolute top-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity ${
            isCustomer ? 'right-0 mr-1 mt-1' : 'right-0 mr-1 mt-1'
          }`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side={isCustomer ? "right" : "left"}
              >
                {chatStatus === 'in_progress' && channelFeatures.canReplyToMessages && onReply && (
                  <DropdownMenuItem onClick={handleReply}>
                    <Reply className="w-4 h-4 mr-2" />
                    {t('actions.reply')}
                  </DropdownMenuItem>
                )}
                {canEditMessage() && channelFeatures.canEditMessages && (
                  <DropdownMenuItem onClick={handleEditClick}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    {t('actions.edit')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setDetailsModalOpen(true)}>
                  <Info className="w-4 h-4 mr-2" />
                  {t('actions.details')}
                </DropdownMenuItem>
                {isDeletionAllowed && (
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteModal(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('actions.delete')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col gap-3">
            {attachments?.map((attachment, index) => (
              <div key={index} className={`max-w-full overflow-hidden ${attachment.type.startsWith('image') ? (content ? '-mb-[12px]' : '-mb-[22px]') : '-mb-2'}`}>
                {renderAttachment(attachment)}
              </div>
            ))}

            {/* Renderizar a lista do WhatsApp se estiver presente no metadata */}
            {whatsappList && (
              <WhatsappList list={whatsappList} />
            )}

            {/* Existing message content - não exibir quando tiver lista */}
            {content && !whatsappList && (
              <div className={`${isAgent ? 'mr-12' : 'mr-[30px]'} -mb-1 px-2 pt-1`}>
                <MarkdownRenderer content={content} className='text-sm' />
              </div>
            )}
          </div>

          <div className={`flex items-center justify-end space-x-1 text-xs mt-1 -mb-0.5 ${isAgent ? 'mr-0.5' : 'mr-1'} opacity-40 ${
            isAgent
              ? 'text-blue-100 dark:text-blue-200'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {metadata?.edited === true && (
              <span className="italic">{t('messageStatus.edited')}</span>
            )}
            <span>{new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isAgent && status && (
              <>
                <MessageStatus 
                  status={status} 
                  errorMessage={error_message}
                  isPending={isPending}
                />
                {status === 'failed' && onRetry && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetry(message);
                      }}
                      className="ml-2 px-2 py-0.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs flex items-center whitespace-nowrap"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {t('actions.retry')}
                    </button>
                    {isDeletionAllowed && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteModal(true);
                        }}
                        className="px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs flex items-center whitespace-nowrap"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {t('actions.delete')}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Exibir as reações */}
          {hasReactions && (
            <div className="absolute -bottom-4 right-4 flex flex-row gap-1 z-10">
              {Object.entries(reactions).map(([senderId, reaction], index) => (
                <div 
                  key={`${senderId}-${index}`} 
                  className="text-xs leading-none bg-white dark:bg-gray-800 rounded-full pt-1 pb-0.5 px-2 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  {reaction.reaction}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {messageContent}

      {/* Modal de imagem com zoom - atualizado */}
      {imageModalOpen && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 overflow-hidden"
          onClick={closeImageModal}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Controles de zoom */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button 
                className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  closeImageModal();
                }}
              >
                <X className="w-5 h-5" />
              </button>
              <button 
                className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomIn();
                }}
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button 
                className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomOut();
                }}
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button 
                className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  resetZoom();
                }}
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Indicador de zoom */}
            {zoomState.scale !== 1 && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm z-10">
                {Math.round(zoomState.scale * 100)}%
              </div>
            )}

            {/* Container da imagem */}
            <div 
              ref={imageContainerRef}
              className="relative w-full h-full flex items-center justify-center overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                cursor: zoomState.scale > 1 
                  ? (zoomState.isDragging ? 'grabbing' : 'grab')
                  : 'zoom-in'
              }}
            >
              <img 
                src={selectedImage.url} 
                alt={selectedImage.name} 
                className="max-w-none select-none"
                style={{
                  transform: `scale(${zoomState.scale}) translate(${zoomState.translateX / zoomState.scale}px, ${zoomState.translateY / zoomState.scale}px)`,
                  transition: zoomState.isDragging ? 'none' : 'transform 0.2s ease-out',
                  maxHeight: zoomState.scale === 1 ? '85vh' : 'none',
                  maxWidth: zoomState.scale === 1 ? '85vw' : 'none',
                  objectFit: 'contain'
                }}
                onClick={handleImageClick}
                draggable={false}
              />
            </div>

            {/* Nome da imagem */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-center max-w-[80%] truncate">
              {selectedImage.name}
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes da mensagem - compartilhado */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 dark:text-gray-100">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">{t('messageDetails.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.id')}:</div>
              <div className="break-all text-gray-900 dark:text-gray-100">{message.id}</div>
              
              <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.type')}:</div>
              <div className="text-gray-900 dark:text-gray-100">{message.type}</div>
              
              <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.senderType')}:</div>
              <div className="text-gray-900 dark:text-gray-100">{message.sender_type}</div>
              
              <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.status')}:</div>
              <div className="text-gray-900 dark:text-gray-100">{message.status || '-'}</div>
              
              <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.createdAt')}:</div>
              <div className="text-gray-900 dark:text-gray-100">{formatDateTime(message.created_at)}</div>
              
              {message.sender_agent && (
                <>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.sentBy')}:</div>
                  <div className="text-gray-900 dark:text-gray-100">{message.sender_agent.full_name}</div>
                </>
              )}
              
              {message.external_id && (
                <>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.externalId')}:</div>
                  <div className="break-all text-gray-900 dark:text-gray-100">{message.external_id}</div>
                </>
              )}
              
              {message.session_id && (
                <>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.sessionId')}:</div>
                  <div className="break-all text-gray-900 dark:text-gray-100">{message.session_id}</div>
                </>
              )}
              
              {message.response_message_id && (
                <>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.responseMessageId')}:</div>
                  <div className="break-all text-gray-900 dark:text-gray-100">{message.response_message_id}</div>
                </>
              )}
              
              {message.error_message && (
                <>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.errorMessage')}:</div>
                  <div className="text-red-500 dark:text-red-400">{message.error_message}</div>
                </>
              )}
            </div>
            
            {message.content && (
              <div className="space-y-1">
                <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.content')}:</div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                  {message.content}
                </div>
              </div>
            )}
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2">
                <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.attachments')}:</div>
                <div className="space-y-2">
                  {message.attachments.map((attachment, index) => (
                    <div key={index} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">{t('messageDetails.name')}:</span> <span className="text-gray-900 dark:text-gray-100">{attachment.name}</span></div>
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">{t('messageDetails.type')}:</span> <span className="text-gray-900 dark:text-gray-100">{attachment.type}</span></div>
                      <div className="truncate"><span className="font-medium text-gray-700 dark:text-gray-300">{t('messageDetails.url')}:</span> <span className="text-gray-900 dark:text-gray-100">{attachment.url}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {message.metadata && Object.keys(message.metadata).length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.metadata')}:</div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                  {renderMetadataValue(message.metadata, 0, 'root')}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={(open) => {
        // Só permite fechar o modal se não estiver deletando
        if (!isDeleting) {
          setShowDeleteModal(open);
        }
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t("deleteConfirmation.title")}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              {t("deleteConfirmation.message")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <svg className="h-5 w-5 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  {t("deleteConfirmation.warning")}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {t("deleteConfirmation.cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 flex items-center"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("actions.deleting")}
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("deleteConfirmation.confirm")}
                  </>
                )}
              </Button>
            </div>
            {error && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal da tarefa */}
      {taskModalOpen && (
        <TaskModal
          onClose={() => setTaskModalOpen(false)}
          organizationId={currentOrganizationMember?.organization_id}
          taskId={
            // Obter ID da tarefa do objeto na mensagem ou metadata
            message.tasks && message.tasks.id
              ? String(message.tasks.id)
              : metadata && 'task' in metadata && (metadata.task as TaskObject).id
                ? String((metadata.task as TaskObject).id)
                : metadata && 'task_id' in metadata && metadata.task_id
                  ? String(metadata.task_id)
                  : ''
          }
          mode="edit"
          chatId={typeof message.chat_id === 'object' ? (message.chat_id as { id: string }).id : String(message.chat_id)}
        />
      )}

      {/* Modal de edição */}
      <EditMessageModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        messageId={String(message.id)}
        chatId={typeof message.chat_id === 'object' ? (message.chat_id as { id: string }).id : String(message.chat_id)}
        initialContent={content || ''}
        organizationId={currentOrganizationMember?.organization.id}
      />
    </>
  );
}

// Componente para renderizar uma lista no formato do WhatsApp
function WhatsappList({ list }: { list: WhatsAppList }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!list) return null;

  return (
    <>
      <div className="w-full mt-2">
        {/* Título e descrição como texto normal */}
        <div className="mb-2">
          <MarkdownRenderer content={`**${list.title}**`} />
          <div className="text-sm mt-1">{list.description}</div>
        </div>

        {/* Botão com estilo WhatsApp */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full p-2.5 text-center flex justify-center items-center rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors gap-1.5"
        >
          <Menu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-blue-600 dark:text-blue-400 font-medium">{list.buttonText}</span>
        </button>
      </div>

      {/* Modal da lista */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold">{list.title}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-gray-600 dark:text-gray-300 mb-4">{list.description}</p>
              
              {list.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-4 last:mb-0">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-t-lg font-medium">
                    {section.title}
                  </div>
                  
                  <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg">
                    {section.rows.map((row, rowIndex) => (
                      <div 
                        key={rowIndex} 
                        className="p-3 border-t border-gray-200 dark:border-gray-700 first:border-t-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="font-bold">{row.title}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{row.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}