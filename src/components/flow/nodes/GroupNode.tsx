import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';
import { Pencil, Check, Settings, RectangleHorizontal } from 'lucide-react';

interface GroupNodeProps {
  id: string;
  data: {
    label?: string;
    color?: string;
    width?: number;
    height?: number;
  };
}

const colorOptions = [
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#f97316', label: 'Laranja' },
  { value: '#eab308', label: 'Amarelo' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#06b6d4', label: 'Ciano' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#6b7280', label: 'Cinza' },
];

export function GroupNode({ id, data }: GroupNodeProps) {
  const { updateNodeData } = useFlowEditor();
  
  const [color, setColor] = useState(data.color || '#6b7280');
  const [width, setWidth] = useState(data.width || 300);
  const [height, setHeight] = useState(data.height || 200);
  const [label, setLabel] = useState(data.label || 'Grupo');
  const [isEditing, setIsEditing] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [initialMousePos, setInitialMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  const groupRef = useRef<HTMLDivElement>(null);

  const handleColorChange = useCallback((newColor: string) => {
    setColor(newColor);
    
    // Forçar atualização da variável CSS
    if (groupRef.current) {
      groupRef.current.style.setProperty('--group-bg-color', newColor + '33');
      groupRef.current.style.backgroundColor = newColor + '33';
    }
    
    updateNodeData(id, {
      ...data,
      color: newColor
    });
  }, [id, data, updateNodeData]);

  const handleSizeChange = useCallback((dimension: 'width' | 'height', value: number) => {
    const newData = { ...data };
    if (dimension === 'width') {
      setWidth(value);
      newData.width = value;
    } else {
      setHeight(value);
      newData.height = value;
    }
    updateNodeData(id, newData);
  }, [id, data, updateNodeData]);

  const handleLabelChange = useCallback((newLabel: string) => {
    setLabel(newLabel);
    updateNodeData(id, {
      ...data,
      label: newLabel
    });
  }, [id, data, updateNodeData]);

  // Função para iniciar o redimensionamento
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Impede que o ReactFlow processe este evento
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }
    
    // Captura posição inicial do mouse e tamanho atual
    setInitialMousePos({ x: e.clientX, y: e.clientY });
    setInitialSize({ width, height });
    
    setIsResizing(true);
    setResizeHandle(handle);
    
    // Define cursor específico para cada tipo de handle
    const cursorMap: Record<string, string> = {
      'n': 'ns-resize',
      's': 'ns-resize', 
      'e': 'ew-resize',
      'w': 'ew-resize',
      'ne': 'ne-resize',
      'nw': 'nw-resize',
      'se': 'se-resize',
      'sw': 'sw-resize'
    };
    
    document.body.style.cursor = cursorMap[handle] || 'default';
    
    // Adiciona classe para indicar que está redimensionando
    if (groupRef.current) {
      groupRef.current.classList.add('resizing');
    }
  }, [width, height]);

  // Função para redimensionar durante o movimento do mouse
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !groupRef.current) return;

    e.preventDefault();
    
    // Calcular a diferença da posição do mouse desde o início
    const deltaX = e.clientX - initialMousePos.x;
    const deltaY = e.clientY - initialMousePos.y;
    
    let newWidth = initialSize.width;
    let newHeight = initialSize.height;

    // Calcular novas dimensões baseado no tipo de handle e delta do mouse
    if (resizeHandle.includes('e')) {
      // Redimensionamento pela borda direita
      newWidth = Math.max(200, initialSize.width + deltaX);
    }
    if (resizeHandle.includes('w')) {
      // Redimensionamento pela borda esquerda
      newWidth = Math.max(200, initialSize.width - deltaX);
    }
    if (resizeHandle.includes('s')) {
      // Redimensionamento pela borda inferior
      newHeight = Math.max(150, initialSize.height + deltaY);
    }
    if (resizeHandle.includes('n')) {
      // Redimensionamento pela borda superior
      newHeight = Math.max(150, initialSize.height - deltaY);
    }

    // Atualizar dimensões
    setWidth(Math.round(newWidth));
    setHeight(Math.round(newHeight));
  }, [isResizing, resizeHandle, initialMousePos, initialSize]);

  // Função para finalizar o redimensionamento
  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle('');
      document.body.style.cursor = 'default';
      
      // Remove classe de redimensionamento
      if (groupRef.current) {
        groupRef.current.classList.remove('resizing');
      }
      
      // Salvar as novas dimensões
      updateNodeData(id, {
        ...data,
        width,
        height
      });
    }
  }, [isResizing, id, data, width, height, updateNodeData]);

  // Event listeners para redimensionamento
  useEffect(() => {
    if (isResizing) {
      // Adicionar classe ao body para prevenir seleção
      document.body.classList.add('no-select');
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.body.classList.remove('no-select');
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Aplicar cor quando o componente montar ou a cor mudar
  useEffect(() => {
    if (groupRef.current) {
      const bgColor = color + '33';
      
      groupRef.current.style.setProperty('--group-bg-color', bgColor);
      groupRef.current.style.backgroundColor = bgColor;
    }
  }, [color]);

  return (
    <div 
      ref={groupRef}
      className={`group-node-container border-2 border-dashed rounded-lg relative ${isResizing ? 'resizing' : ''}`}
      style={{
        borderColor: color,
        backgroundColor: color + '33',
        '--group-bg-color': color + '33',
        width: `${width}px`,
        height: `${height}px`,
        zIndex: -1,
        pointerEvents: 'none', // Permite que cliques passem através para o canvas
      } as React.CSSProperties & { '--group-bg-color': string }}
    >
      {/* Handles de redimensionamento */}
      <div className="resize-handles">
        {/* Cantos */}
        <div 
          className="resize-handle resize-handle-nw nodrag"
          onMouseDown={(e) => handleResizeStart(e, 'nw')}
        />
        <div 
          className="resize-handle resize-handle-ne nodrag"
          onMouseDown={(e) => handleResizeStart(e, 'ne')}
        />
        <div 
          className="resize-handle resize-handle-sw nodrag"
          onMouseDown={(e) => handleResizeStart(e, 'sw')}
        />
        <div 
          className="resize-handle resize-handle-se nodrag"
          onMouseDown={(e) => handleResizeStart(e, 'se')}
        />
        
        {/* Bordas */}
        <div 
          className="resize-handle resize-handle-n nodrag"
          onMouseDown={(e) => handleResizeStart(e, 'n')}
        />
        <div 
          className="resize-handle resize-handle-s nodrag"
          onMouseDown={(e) => handleResizeStart(e, 's')}
        />
        <div 
          className="resize-handle resize-handle-w nodrag"
          onMouseDown={(e) => handleResizeStart(e, 'w')}
        />
        <div 
          className="resize-handle resize-handle-e nodrag"
          onMouseDown={(e) => handleResizeStart(e, 'e')}
        />
      </div>

      {/* Cabeçalho do grupo */}
      <div 
        className="absolute top-2 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm p-2"
        style={{ 
          zIndex: 1000,
          width: `${width - 16}px`, // Largura total menos 16px (8px de cada lado)
          left: '8px', // 8px da borda esquerda
          backgroundColor: 'transparent',
          backdropFilter: 'blur(4px)', // Adiciona um leve blur para melhor legibilidade
          pointerEvents: 'auto', // Garante que o header seja interativo
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Área de arrasto - permite mover o grupo */}
            <div 
              className="flex items-center gap-2 cursor-move px-2 py-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors" 
              title="Arrastar grupo"
              style={{ pointerEvents: 'auto' }}
            >
              <RectangleHorizontal className="w-4 h-4 text-gray-500" />
              {isEditing ? (
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onBlur={() => {
                    handleLabelChange(label);
                    setIsEditing(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLabelChange(label);
                      setIsEditing(false);
                    }
                    if (e.key === 'Escape') {
                      setLabel(data.label || 'Grupo');
                      setIsEditing(false);
                    }
                  }}
                  className="text-sm px-1 py-1 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white nodrag"
                  autoFocus
                />
              ) : (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 nodrag"
                title="Editar nome"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
            {isEditing && (
              <button
                onClick={() => {
                  handleLabelChange(label);
                  setIsEditing(false);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 nodrag"
                title="Confirmar"
              >
                <Check className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 nodrag"
              title="Configurações"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {/* Configurações expandidas */}
        {isConfigOpen && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
            {/* Seletor de cor */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cor do Grupo
              </label>
              <div className="flex gap-1 flex-wrap">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleColorChange(option.value)}
                    className={`w-5 h-5 rounded border-2 nodrag ${
                      color === option.value ? 'border-gray-800 dark:border-white' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: option.value }}
                    title={option.label}
                  />
                ))}
              </div>
            </div>

            {/* Controles de tamanho */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Largura
                </label>
                <input
                  type="number"
                  min="200"
                  max="800"
                  value={width}
                  onChange={(e) => handleSizeChange('width', Number(e.target.value))}
                  className="w-full p-1 text-xs border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white nodrag"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Altura
                </label>
                <input
                  type="number"
                  min="150"
                  max="600"
                  value={height}
                  onChange={(e) => handleSizeChange('height', Number(e.target.value))}
                  className="w-full p-1 text-xs border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white nodrag"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Área de conteúdo do grupo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isResizing && (
          <div className="bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm font-mono">
            {width} × {height}
          </div>
        )}
      </div>
    </div>
  );
} 