import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';
import { ConditionModal } from './ConditionModal';

interface SubCondition {
  type: 'variable' | 'clientData';
  field: string;
  operator: 'equalTo' | 'notEqual' | 'contains' | 'doesNotContain' | 
           'greaterThan' | 'lessThan' | 'isSet' | 'isEmpty' | 
           'startsWith' | 'endsWith' | 'matchesRegex' | 'doesNotMatchRegex' |
           'inList' | 'notInList';
  value: string;
}

export interface Condition {
  logicOperator: 'AND' | 'OR';
  subConditions: SubCondition[];
}

interface ConditionNodeProps {
  data: {
    conditions?: Condition[];
  };
  id: string;
  isConnectable: boolean;
}

// Componente para renderizar texto com variáveis destacadas
function RenderConditionWithVariables({ text }: { text: string }) {
  // Regex para encontrar variáveis no formato {{variableName}}
  const regex = /\{\{([^}]+)\}\}/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  // Encontrar todas as ocorrências de variáveis no texto
  while ((match = regex.exec(text)) !== null) {
    // Adicionar texto antes da variável
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
        key: `text-${lastIndex}`
      });
    }
    
    // Adicionar a variável
    parts.push({
      type: 'variable',
      content: match[1], // Nome da variável sem as chaves
      key: `var-${match.index}`
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Adicionar o texto restante após a última variável
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
      key: `text-${lastIndex}`
    });
  }
  
  return (
    <>
      {parts.map((part) => {
        if (part.type === 'variable') {
          return (
            <span 
              key={part.key} 
              className="px-1 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded"
            >
              {`{{${part.content}}}`}
            </span>
          );
        }
        return <span key={part.key}>{part.content}</span>;
      })}
    </>
  );
}

export function ConditionNode({ data, id, isConnectable }: ConditionNodeProps) {
  const { t } = useTranslation('flows');
  const { updateNodeData, variables } = useFlowEditor();
  const [localConditions, setLocalConditions] = useState<Condition[]>(
    data.conditions || [{
      logicOperator: 'AND' as const,
      subConditions: [{
        type: 'variable' as const,
        field: '',
        operator: 'equalTo' as const,
        value: ''
      }]
    }]
  );
  const [activeModalIndex, setActiveModalIndex] = useState<number | null>(null);

  // Função para formatar a descrição de uma subcondição
  const formatSubCondition = (subCondition: SubCondition) => {
    if (!subCondition.field) return '';
    
    // Obter o nome da variável se for tipo variável
    let fieldName = subCondition.field;
    if (subCondition.type === 'variable') {
      const variableData = variables.find(v => v.name === subCondition.field);
      if (variableData) {
        fieldName = `{{${variableData.name}}}`;
      }
    } else {
      // Tradução dos campos de cliente
      const clientDataMap: Record<string, string> = {
        'custumer_name': t('nodes.condition.clientData.name'),
        'custumer_surname': t('nodes.condition.clientData.surname'),
        'custumer_phone': t('nodes.condition.clientData.phone'),
        'custumer_email': t('nodes.condition.clientData.email'),
        'chat_funil': t('nodes.condition.clientData.funnel'),
        'chat_price': t('nodes.condition.clientData.saleValue'),
        'chat_team': t('nodes.condition.clientData.team'),
        'chat_attendant': t('nodes.condition.clientData.attendant'),
        'chat_tag': t('nodes.condition.clientData.tags')
      };
      fieldName = clientDataMap[subCondition.field] || subCondition.field;
    }
    
    // Tradução do operador
    const operatorMap: Record<string, string> = {
      'equalTo': t('nodes.condition.operators.equalTo'),
      'notEqual': t('nodes.condition.operators.notEqual'),
      'contains': t('nodes.condition.operators.contains'),
      'doesNotContain': t('nodes.condition.operators.doesNotContain'),
      'greaterThan': t('nodes.condition.operators.greaterThan'),
      'lessThan': t('nodes.condition.operators.lessThan'),
      'isSet': t('nodes.condition.operators.isSet'),
      'isEmpty': t('nodes.condition.operators.isEmpty'),
      'startsWith': t('nodes.condition.operators.startsWith'),
      'endsWith': t('nodes.condition.operators.endsWith'),
      'matchesRegex': t('nodes.condition.operators.matchesRegex'),
      'doesNotMatchRegex': t('nodes.condition.operators.doesNotMatchRegex'),
      'inList': t('nodes.condition.operators.inList'),
      'notInList': t('nodes.condition.operators.notInList'),
    };
    
    const operatorText = operatorMap[subCondition.operator] || subCondition.operator;
    
    // Para operadores que não necessitam de valor
    if (['isSet', 'isEmpty'].includes(subCondition.operator)) {
      return `${fieldName} ${operatorText}`;
    }
    
    // Para outros operadores, incluir o valor
    return `${fieldName} ${operatorText} ${subCondition.value}`;
  };

  // Função para formatar a descrição completa da condição
  const formatConditionDescription = (condition: Condition) => {
    if (!condition.subConditions || condition.subConditions.length === 0) {
      return t('nodes.condition.noConditions');
    }
    
    // Se tiver apenas uma subcondição, mostra diretamente
    if (condition.subConditions.length === 1) {
      return formatSubCondition(condition.subConditions[0]);
    }
    
    // Limita a exibição a 2 subcondições para não ficar muito extenso
    const firstSubCondition = formatSubCondition(condition.subConditions[0]);
    if (condition.subConditions.length === 2) {
      return `${firstSubCondition} ${condition.logicOperator} ${formatSubCondition(condition.subConditions[1])}`;
    }
    
    // Se tiver mais de 2, mostra a primeira e indica quantas mais existem
    return `${firstSubCondition} ${condition.logicOperator} +${condition.subConditions.length - 1} ${t('nodes.condition.otherConditions')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 relative">
      <BaseNode 
        id={id} 
        data={data}
        type="condition"
      />
      
      <div className="space-y-4">
        {localConditions?.map((condition, index) => (
          <div key={index} className="relative bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
            <div 
              onClick={() => setActiveModalIndex(index)}
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-2 rounded-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300 mr-2">
                    {index === 0 ? t('nodes.condition.if') : t('nodes.condition.elseIf')}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 text-xs line-clamp-2 max-w-[270px]">
                    <RenderConditionWithVariables text={formatConditionDescription(condition)} />
                  </span>
                </div>
                {index > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newConditions = localConditions.filter((_, i) => i !== index);
                      setLocalConditions(newConditions);
                      updateNodeData(id, { ...data, conditions: newConditions });
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full ml-2"
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <Handle
              type="source"
              position={Position.Right}
              id={`condition-${index}`}
              style={{ top: '50%', transform: 'translateY(-50%)' }}
              isConnectable={isConnectable}
              className="w-3 h-3 -mr-2 bg-blue-500"
            />
          </div>
        ))}

        {/* Modal para edição das condições */}
        {activeModalIndex !== null && localConditions[activeModalIndex] && (
          <ConditionModal
            condition={localConditions[activeModalIndex]}
            onClose={() => setActiveModalIndex(null)}
            onSave={(updatedCondition) => {
              const newConditions = [...localConditions];
              newConditions[activeModalIndex] = updatedCondition;
              setLocalConditions(newConditions);
              updateNodeData(id, { ...data, conditions: newConditions });
              setActiveModalIndex(null);
            }}
            variables={variables}
          />
        )}

        <button
          onClick={() => {
            const newConditions = [...localConditions, {
              logicOperator: 'AND' as const,
              subConditions: [{ 
                type: 'variable' as const, 
                field: '', 
                operator: 'equalTo' as const, 
                value: '' 
              }]
            }];
            setLocalConditions(newConditions);
            updateNodeData(id, { ...data, conditions: newConditions });
          }}
          className="w-full p-2 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-dashed border-gray-300 dark:border-gray-600"
        >
          <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('nodes.condition.addCondition')}
          </span>
        </button>

        {/* Else handle */}
        <div className="relative bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('nodes.condition.else')}
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="else"
            style={{ top: '50%', transform: 'translateY(-50%)' }}
            isConnectable={isConnectable}
            className="w-3 h-3 -mr-2 bg-red-500"
          />
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 -ml-2 bg-gray-300 dark:bg-gray-600"
      />
    </div>
  );
}