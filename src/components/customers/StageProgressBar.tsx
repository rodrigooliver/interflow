import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { CRMStage } from '../../types/crm';
import * as Tooltip from '@radix-ui/react-tooltip';

// Interface para o cliente com estágio
interface CustomerWithStage {
  id: string;
  stage_id: string | null;
  crm_stages?: CRMStage | null;
}

interface BaseStageProgressBarProps {
  customer: CustomerWithStage;
  onStageChange: (customerId: string, stageId: string) => void;
}

interface StageProgressBarProps extends BaseStageProgressBarProps {
  funnels: Array<{
    id: string;
    name: string;
    stages?: Array<{
      id: string;
      name: string;
      color: string;
      position: number;
      funnel_id: string;
    }>;
  }>;
  stages: Array<{
    id: string;
    name: string;
    color: string;
    position: number;
    funnel_id: string;
  }>;
}

// Componente para exibir a barra de progresso do estágio
export function StageProgressBar({ 
  customer, 
  funnels, 
  stages,
  onStageChange
}: StageProgressBarProps) {
  const { t } = useTranslation(['crm', 'common']);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFunnel, setSelectedFunnel] = useState('');
  const [hoveredStageId, setHoveredStageId] = useState<string | null>(null);
  
  // Se o cliente não tem estágio, mostrar o primeiro funil disponível
  if (!customer.stage_id && funnels.length > 0) {
    const firstFunnel = funnels[0];
    const firstFunnelStages = stages
      .filter(s => s.funnel_id === firstFunnel.id)
      .sort((a, b) => a.position - b.position);
    
    return (
      <Tooltip.Provider delayDuration={200}>
        <div className="w-full">
          <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden flex">
            {firstFunnelStages.map((stage, index) => {
              const width = `${100 / firstFunnelStages.length}%`;
              
              return (
                <Tooltip.Root key={stage.id}>
                  <Tooltip.Trigger asChild>
                    <div 
                      className="h-full flex items-center justify-center transition-all relative group cursor-pointer"
                      style={{ 
                        width,
                        backgroundColor: 'transparent'
                      }}
                      onClick={() => onStageChange(customer.id, stage.id)}
                    >
                      {/* Efeito de hover */}
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        style={{ backgroundColor: `${stage.color}60` }}
                      >
                        <span className="text-xs font-medium text-white z-10 px-1 truncate">
                          {stage.name}
                        </span>
                      </div>
                      
                      {/* Divisor entre estágios */}
                      {index < firstFunnelStages.length - 1 && (
                        <div className="absolute right-0 top-0 h-full w-0.5 bg-white dark:bg-gray-800 z-10"></div>
                      )}
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content
                    className="px-2 py-1 text-xs rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    sideOffset={5}
                  >
                    {stage.name}
                    <Tooltip.Arrow className="fill-gray-900 dark:fill-white" />
                  </Tooltip.Content>
                </Tooltip.Root>
              );
            })}
          </div>
        </div>
      </Tooltip.Provider>
    );
  }
  
  // Se o cliente não tem estágio e não há funis disponíveis
  if (!customer.stage_id) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">{t('crm:stages.noStageSelected')}</div>;
  }
  
  // Encontrar o estágio atual do cliente
  const currentStage = customer.crm_stages;
  
  if (!currentStage) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">{t('crm:stages.stageNotFound')}</div>;
  }
  
  // Encontrar o funil do estágio
  const currentFunnel = funnels.find(f => f.id === currentStage.funnel_id);
  
  if (!currentFunnel) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">{t('crm:stages.funnelNotFound')}</div>;
  }
  
  // Encontrar o funil atual com base no estágio do cliente
  const currentStageObj = stages.find(stage => stage.id === customer.stage_id);
  const currentFunnelId = currentStageObj?.funnel_id || currentStage.funnel_id;
  
  // Filtrar estágios do funil selecionado ou do funil atual
  const filteredStages = stages.filter(
    stage => stage.funnel_id === (isEditing ? selectedFunnel : currentFunnelId)
  );
  
  // Ordenar estágios por posição
  const sortedStages = [...filteredStages].sort((a, b) => a.position - b.position);
  
  // Iniciar edição
  const handleStartEdit = () => {
    setIsEditing(true);
    setSelectedFunnel(currentFunnelId || (funnels.length > 0 ? funnels[0].id : ''));
  };
  
  // Salvar mudanças
  const handleSave = () => {
    // Verifica se algum estágio está selecionado (hover)
    if (hoveredStageId) {
      onStageChange(customer.id, hoveredStageId);
    }
    setIsEditing(false);
    setHoveredStageId(null);
  };
  
  // Cancelar edição
  const handleCancel = () => {
    setIsEditing(false);
    setHoveredStageId(null);
  };
  
  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="w-full relative">
        {/* Barra de progresso sem título do funil */}
        <div 
          className="h-8 w-full min-w-[200px] bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex relative"
          onClick={!isEditing ? handleStartEdit : undefined}
        >
          {/* Renderizar estágios do funil */}
          {sortedStages.map((stage, index) => {
            const width = `${100 / sortedStages.length}%`;
            const isCurrentStage = stage.id === customer.stage_id;
            const isSelected = isEditing && stage.id === hoveredStageId;
            
            // Determinar a posição do cliente no funil
            const clientPosition = sortedStages.findIndex(s => s.id === customer.stage_id);
            
            // Um estágio está completo se o cliente já passou por ele
            const isCompleted = clientPosition > -1 && (!isEditing ? index < clientPosition : false);
            
            // Calcular o background color
            let bgColor = 'transparent';
            if (isCurrentStage) bgColor = stage.color;
            else if (isCompleted) bgColor = `${stage.color}80`; // Versão com opacidade
            else if (isSelected) bgColor = `${stage.color}60`; // Versão com mais opacidade para hover
            
            return (
              <Tooltip.Root key={stage.id}>
                <Tooltip.Trigger asChild>
                  <div
                    className="h-full relative flex items-center justify-center cursor-pointer transition-all duration-200 group"
                    style={{ 
                      width,
                      backgroundColor: bgColor
                    }}
                    onMouseEnter={isEditing ? () => setHoveredStageId(stage.id) : undefined}
                    onMouseLeave={isEditing ? () => setHoveredStageId(null) : undefined}
                  >
                    {/* Efeito de hover para simular progressão */}
                    {!isEditing && !isCurrentStage && !isCompleted && (
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ backgroundColor: `${stage.color}40` }}
                      />
                    )}
                    
                    {/* Texto do estágio - somente para o estágio atual ou selecionado */}
                    {(isCurrentStage || isSelected) && (
                      <div 
                        className={`text-xs font-medium truncate px-1 ${
                          isCurrentStage || isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {stage.name}
                      </div>
                    )}
                    
                    {/* Separador entre estágios */}
                    {index < sortedStages.length - 1 && (
                      <div className="absolute right-0 top-0 h-full w-0.5 bg-white dark:bg-gray-800 z-10"></div>
                    )}
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content
                  className="px-2 py-1 text-xs rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  sideOffset={5}
                >
                  {stage.name}
                  <Tooltip.Arrow className="fill-gray-900 dark:fill-white" />
                </Tooltip.Content>
              </Tooltip.Root>
            );
          })}
          
          {/* Botões para salvar/cancelar quando estiver em modo de edição */}
          {isEditing && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
              <button
                onClick={handleSave}
                className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancel}
                className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        {/* Seletor de funil (apenas quando estiver editando) */}
        {isEditing && funnels.length > 1 && (
          <div className="mt-2">
            <select
              value={selectedFunnel}
              onChange={e => {
                const newFunnelId = e.target.value;
                setSelectedFunnel(newFunnelId);
                
                // Selecionar o primeiro estágio do novo funil
                const newFunnel = funnels.find(f => f.id === newFunnelId);
                if (newFunnel) {
                  const firstStage = stages
                    .filter(s => s.funnel_id === newFunnelId)
                    .sort((a, b) => a.position - b.position)[0];
                  
                  if (firstStage) {
                    // Apenas definir o ID do estágio para hover, não mudar ainda
                    setHoveredStageId(firstStage.id);
                  }
                }
              }}
              className="text-xs w-full h-7 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {funnels.map(funnel => (
                <option key={funnel.id} value={funnel.id}>
                  {funnel.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </Tooltip.Provider>
  );
}

export default StageProgressBar; 