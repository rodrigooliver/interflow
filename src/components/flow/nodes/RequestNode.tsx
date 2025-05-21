import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { BaseNode } from './BaseNode';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';
import { Loader2, Play, Globe, Sparkles } from 'lucide-react';
import api from '../../../lib/api';
import { useAuthContext } from '../../../contexts/AuthContext';
import { VariableSelectorModal } from '../../flow/VariableSelectorModal';

interface RequestNodeProps {
  data: {
    request?: {
      method: string;
      url: string;
      headers: { key: string; value: string }[];
      params: { key: string; value: string }[];
      body: string;
      bodyType: 'json' | 'form' | 'text' | 'none';
      variableMappings: { variable: string; jsonPath: string }[];
    };
    variables: { id: string; name: string }[];
    label?: string;
  };
  isConnectable: boolean;
  id: string;
}

const Portal = ({ children }: { children: React.ReactNode }) => {
  return createPortal(children, document.body);
};

// Ícone do RequestNode
const RequestIcon = () => (
  <Globe className="w-5 h-5 mr-2 text-indigo-500" />
);

// Função para extrair propriedades aninhadas de um objeto JSON
const extractProperties = (obj: Record<string, unknown> | unknown[], prefix = ''): { path: string; value: unknown }[] => {
  if (!obj || typeof obj !== 'object') return [];
  
  let properties: { path: string; value: unknown }[] = [];
  
  // Processar arrays
  if (Array.isArray(obj)) {
    // Adicionar a propriedade do array em si
    if (prefix) {
      properties.push({ path: prefix, value: obj });
    }
    
    // Processar apenas o primeiro item do array para evitar listas muito grandes
    if (obj.length > 0) {
      const item = obj[0];
      const itemPath = `${prefix}[0]`;
      
      // Adicionar o item do array
      properties.push({ path: itemPath, value: item });
      
      // Processar propriedades do item recursivamente se for objeto
      if (item && typeof item === 'object') {
        properties = [...properties, ...extractProperties(item as Record<string, unknown>, itemPath)];
      }
    }
    
    return properties;
  }
  
  // Processar objetos
  Object.entries(obj).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    
    // Adicionar a propriedade atual
    properties.push({ path, value });
    
    // Processar recursivamente
    if (value && typeof value === 'object') {
      properties = [...properties, ...extractProperties(value as Record<string, unknown> | unknown[], path)];
    }
  });
  
  return properties;
};

export function RequestNode({ id, data, isConnectable }: RequestNodeProps) {
  const { t } = useTranslation('flows');
  const { variables, updateNodeData } = useFlowEditor();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentOrganizationMember } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [testResponse, setTestResponse] = useState<Record<string, unknown> | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [extractedProperties, setExtractedProperties] = useState<{ path: string; value: unknown }[]>([]);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'response'>('params');
  const [localConfig, setLocalConfig] = useState({
    method: data.request?.method || 'GET',
    url: data.request?.url || '',
    headers: data.request?.headers || [],
    params: data.request?.params || [],
    body: data.request?.body || '',
    bodyType: data.request?.bodyType || 'none',
    variableMappings: data.request?.variableMappings || []
  });
  const [showVariableSelector, setShowVariableSelector] = useState(false);
  const [currentEditField, setCurrentEditField] = useState<{
    type: 'param' | 'header' | 'body';
    index?: number;
  } | null>(null);

  // Atualiza estado local
  const handleConfigChange = (updates: Partial<typeof localConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
  };

  // Salva no banco quando perde o foco
  const handleConfigBlur = useCallback(() => {
    updateNodeData(id, {
      ...data,
      request: localConfig
    });
  }, [id, data, localConfig, updateNodeData]);

  // Sincronizar parâmetros da URL com a lista de parâmetros
  useEffect(() => {
    if (localConfig.url) {
      try {
        const url = new URL(localConfig.url);
        
        // Extrair parâmetros da URL
        const urlParams: { key: string; value: string }[] = [];
        url.searchParams.forEach((value, key) => {
          urlParams.push({ key, value });
        });
        
        // Se houver parâmetros na URL que não estão na lista de parâmetros, adicioná-los
        if (urlParams.length > 0) {
          const currentParamKeys = new Set(localConfig.params.map(p => p.key));
          const newParams = [...localConfig.params];
          
          urlParams.forEach(param => {
            if (!currentParamKeys.has(param.key)) {
              newParams.push(param);
            }
          });
          
          if (newParams.length !== localConfig.params.length) {
            handleConfigChange({ params: newParams });
            handleConfigBlur();
          }
        }
      } catch {
        // Não é uma URL válida, ignorar
      }
    }
  }, [localConfig.url]);

  // Manipula adição de novos headers
  const addHeader = () => {
    const newHeaders = [...localConfig.headers, { key: '', value: '' }];
    handleConfigChange({ headers: newHeaders });
  };

  // Remove um header
  const removeHeader = (index: number) => {
    const newHeaders = [...localConfig.headers];
    newHeaders.splice(index, 1);
    handleConfigChange({ headers: newHeaders });
    handleConfigBlur();
  };

  // Atualiza um header
  const updateHeader = (index: number, key: string, value: string) => {
    const newHeaders = [...localConfig.headers];
    newHeaders[index] = { key, value };
    handleConfigChange({ headers: newHeaders });
  };

  // Manipula adição de novos params
  const addParam = () => {
    const newParams = [...localConfig.params, { key: '', value: '' }];
    handleConfigChange({ params: newParams });
  };

  // Remove um param
  const removeParam = (index: number) => {
    const newParams = [...localConfig.params];
    newParams.splice(index, 1);
    handleConfigChange({ params: newParams });
    handleConfigBlur();

    // Atualizar a URL removendo o parâmetro
    updateUrlFromParams(newParams);
  };

  // Atualiza um param e a URL
  const updateParam = (index: number, key: string, value: string) => {
    const newParams = [...localConfig.params];
    newParams[index] = { key, value };
    handleConfigChange({ params: newParams });

    // Atualizar a URL com o novo parâmetro quando o nome ou valor são alterados
    if (key && value) {
      updateUrlFromParams(newParams);
    }
  };

  // Atualiza a URL com base nos parâmetros
  const updateUrlFromParams = (params: { key: string; value: string }[]) => {
    try {
      // Verificar se é uma URL válida
      const url = new URL(localConfig.url);
      
      // Limpar todos os parâmetros existentes
      url.search = '';
      
      // Adicionar os parâmetros da lista
      params.forEach(param => {
        if (param.key && param.value) {
          url.searchParams.append(param.key, param.value);
        }
      });
      
      // Atualizar o estado local com a nova URL
      handleConfigChange({ url: url.toString() });
    } catch {
      // Não é uma URL válida, ignorar
    }
  };

  // Adiciona um novo mapeamento de variável
  const addVariableMapping = () => {
    const newMappings = [...localConfig.variableMappings, { variable: '', jsonPath: '' }];
    handleConfigChange({ variableMappings: newMappings });
  };

  // Remove um mapeamento de variável
  const removeVariableMapping = (index: number) => {
    const newMappings = [...localConfig.variableMappings];
    newMappings.splice(index, 1);
    handleConfigChange({ variableMappings: newMappings });
    handleConfigBlur();
  };

  // Atualiza um mapeamento de variável
  const updateVariableMapping = (index: number, field: 'variable' | 'jsonPath', value: string) => {
    const newMappings = [...localConfig.variableMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    handleConfigChange({ variableMappings: newMappings });
  };

  // Função para construir os headers da requisição
  const buildHeaders = () => {
    const headers: Record<string, string> = {};
    
    // Log para depuração dos headers configurados
    console.log('Headers configurados:', localConfig.headers);
    
    localConfig.headers.forEach(header => {
      if (header.key && header.value) {
        headers[header.key] = header.value;
        console.log(`Adicionando header: ${header.key} = ${header.value}`);
      }
    });
    
    console.log('Headers processados:', headers);
    return headers;
  };

  // Função para executar a requisição de teste
  const executeTestRequest = async () => {
    setLoading(true);
    setTestResponse(null);
    setTestError(null);
    setExtractedProperties([]);
    
    // Mudar para a aba de respostas ao iniciar o teste
    setActiveTab('response');
    
    try {
      // Verificar se a URL é válida
      if (!localConfig.url) {
        throw new Error(t('nodes.request.missingUrl'));
      }
      
      // Verificar JSON válido para requisições POST/PUT/PATCH com body JSON
      if (localConfig.method !== 'GET' && localConfig.bodyType === 'json' && localConfig.body) {
        try {
          JSON.parse(localConfig.body);
        } catch (jsonError) {
          throw new Error(`JSON inválido no corpo da requisição: ${(jsonError as Error).message}`);
        }
      }
      
      // Enviar requisição ao backend para evitar problemas de CORS
      console.log('Enviando requisição via backend');
      
      const response = await api.post(`/api/${currentOrganizationMember?.organization.id}/flow/test-node-request`, {
        method: localConfig.method,
        url: localConfig.url,
        headers: buildHeaders(),
        params: localConfig.params,
        body: localConfig.body,
        bodyType: localConfig.bodyType,
        timeout: 15000
      });
      
      console.log('Resposta do backend:', response);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro desconhecido ao processar requisição');
      }
      
      // Dados retornados pelo backend
      const responseData = response.data.data;
      setTestResponse(responseData);
      
      // Extrair propriedades da resposta
      const properties = extractProperties(responseData as Record<string, unknown>);
      setExtractedProperties(properties);
    } catch (error) {
      console.error('Erro na requisição:', error);
      
      setTestError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  // Função para adicionar propriedades selecionadas como mapeamentos
  const addPropertyAsMapping = (path: string) => {
    // Verificar se já existe um mapeamento para este path
    const existingMapping = localConfig.variableMappings.find(m => m.jsonPath === path);
    
    if (!existingMapping) {
      const newMappings = [...localConfig.variableMappings, { variable: '', jsonPath: path }];
      handleConfigChange({ variableMappings: newMappings });
      handleConfigBlur();
    }
  };

  // Função para abrir o seletor de variáveis
  const openVariableSelector = (type: 'param' | 'header' | 'body', index?: number) => {
    setCurrentEditField({ type, index });
    setShowVariableSelector(true);
  };

  // Função para inserir a variável selecionada no campo correto
  const handleInsertVariable = (variableName: string) => {
    if (!currentEditField) return;

    if (currentEditField.type === 'param' && currentEditField.index !== undefined) {
      const newParams = [...localConfig.params];
      newParams[currentEditField.index].value = 
        newParams[currentEditField.index].value + variableName;
      handleConfigChange({ params: newParams });
      handleConfigBlur();
    } 
    else if (currentEditField.type === 'header' && currentEditField.index !== undefined) {
      const newHeaders = [...localConfig.headers];
      newHeaders[currentEditField.index].value = 
        newHeaders[currentEditField.index].value + variableName;
      handleConfigChange({ headers: newHeaders });
      handleConfigBlur();
    } 
    else if (currentEditField.type === 'body') {
      handleConfigChange({ body: localConfig.body + variableName });
      handleConfigBlur();
    }

    setShowVariableSelector(false);
  };

  // Renderiza o conteúdo com base na aba ativa
  const renderTabContent = () => {
    switch (activeTab) {
      case 'params':
        return (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('nodes.request.queryParams')}
              </h3>
              <button
                onClick={addParam}
                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              >
                + {t('nodes.request.addParam')}
              </button>
            </div>
            
            {localConfig.params.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                {t('nodes.request.noParams')}
              </div>
            ) : (
              <div className="space-y-2">
                {localConfig.params.map((param, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={param.key}
                      placeholder={t('nodes.request.key')}
                      onChange={(e) => updateParam(index, e.target.value, param.value)}
                      onBlur={handleConfigBlur}
                      className="w-1/2 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <div className="w-1/2 relative flex">
                      <input
                        type="text"
                        value={param.value}
                        placeholder={t('nodes.request.value')}
                        onChange={(e) => updateParam(index, param.key, e.target.value)}
                        onBlur={handleConfigBlur}
                        className="w-full p-2 text-sm border rounded-l-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => openVariableSelector('param', index)}
                        className="flex items-center px-2 border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-r-md text-blue-600 dark:text-blue-400"
                        title={t('flows:variables.insertVariable')}
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeParam(index)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'headers':
        return (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('nodes.request.headers')}
              </h3>
              <button
                onClick={addHeader}
                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              >
                + {t('nodes.request.addHeader')}
              </button>
            </div>
            
            {localConfig.headers.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                {t('nodes.request.noHeaders')}
              </div>
            ) : (
              <div className="space-y-2">
                {localConfig.headers.map((header, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={header.key}
                      placeholder={t('nodes.request.key')}
                      onChange={(e) => updateHeader(index, e.target.value, header.value)}
                      onBlur={handleConfigBlur}
                      className="w-1/2 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <div className="w-1/2 relative flex">
                      <input
                        type="password"
                        value={header.value}
                        placeholder={t('nodes.request.value')}
                        onChange={(e) => updateHeader(index, header.key, e.target.value)}
                        onBlur={handleConfigBlur}
                        className="w-full p-2 text-sm border rounded-l-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => openVariableSelector('header', index)}
                        className="flex items-center px-2 border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-r-md text-blue-600 dark:text-blue-400"
                        title={t('flows:variables.insertVariable')}
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeHeader(index)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'body':
        return (
          <div>
            <div className="mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('nodes.request.body')}
              </h3>
              <div className="mb-2">
                <select
                  value={localConfig.bodyType}
                  onChange={(e) => handleConfigChange({ bodyType: e.target.value as 'json' | 'form' | 'text' | 'none' })}
                  onBlur={handleConfigBlur}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="none">{t('nodes.request.noBody')}</option>
                  <option value="json">JSON</option>
                  <option value="form">Form Data</option>
                  <option value="text">Raw Text</option>
                </select>
              </div>
              
              {localConfig.bodyType !== 'none' && (
                <div className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <div></div>
                    <button
                      type="button"
                      onClick={() => openVariableSelector('body')}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      {t('flows:variables.insertVariable')}
                    </button>
                  </div>
                  <textarea
                    value={localConfig.body}
                    onChange={(e) => handleConfigChange({ body: e.target.value })}
                    onBlur={handleConfigBlur}
                    rows={6}
                    placeholder={localConfig.bodyType === 'json' ? '{\n  "key": "value"\n}' : ''}
                    className="w-full p-2 text-sm font-mono border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        );
        
      case 'response':
        return (
          <div>
            {/* Resultado do teste */}
            {(testResponse || testError) && (
              <div className="mb-4 border rounded-md border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('nodes.request.testResult')}
                  </h3>
                </div>
                
                {testError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm">
                    <p className="font-medium">{t('nodes.request.testError')}</p>
                    <p className="mt-1 whitespace-pre-wrap">{testError}</p>
                  </div>
                )}
                
                {testResponse && (
                  <div className="p-4">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('nodes.request.responseData')}
                      </h4>
                      <pre className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded text-xs font-mono overflow-auto max-h-40">
                        {JSON.stringify(testResponse, null, 2)}
                      </pre>
                    </div>
                    
                    {extractedProperties.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('nodes.request.extractedProperties')}
                        </h4>
                        <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead>
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">
                                  {t('nodes.request.path')}
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">
                                  {t('nodes.request.value')}
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">
                                  {t('nodes.request.action')}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {extractedProperties.map((prop, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-300 font-mono">
                                    {prop.path}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 font-mono truncate max-w-[200px]">
                                    {typeof prop.value === 'object' 
                                      ? JSON.stringify(prop.value) 
                                      : String(prop.value)}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      onClick={() => addPropertyAsMapping(prop.path as string)}
                                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                                    >
                                      {t('nodes.request.addProperty')}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mapeamento de resposta para variáveis */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('nodes.request.responseMapping')}
                </h3>
                <button
                  onClick={addVariableMapping}
                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                >
                  + {t('nodes.request.addMapping')}
                </button>
              </div>
              
              {localConfig.variableMappings.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                  {t('nodes.request.noMappings')}
                </div>
              ) : (
                <div className="space-y-2">
                  {localConfig.variableMappings.map((mapping, index) => (
                    <div key={index} className="flex space-x-2">
                      <select
                        value={mapping.variable}
                        onChange={(e) => updateVariableMapping(index, 'variable', e.target.value)}
                        onBlur={handleConfigBlur}
                        className="w-1/2 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">{t('nodes.variable.selectVariable')}</option>
                        {variables.map((variable) => (
                          <option key={variable.id} value={variable.name}>
                            {variable.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={mapping.jsonPath}
                        placeholder="result.data.nome"
                        onChange={(e) => updateVariableMapping(index, 'jsonPath', e.target.value)}
                        onBlur={handleConfigBlur}
                        className="w-1/2 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => removeVariableMapping(index)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t('nodes.request.mappingDescription')}
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800">
      <div 
        onClick={() => setIsModalOpen(true)}
        className="flex items-center p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
      >
        <div className="flex items-center space-x-2">
          <RequestIcon />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {data.label || t('nodes.request.defaultLabel')}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
              {localConfig.method} {localConfig.url || 'https://...'}
            </span>
          </div>
        </div>
      </div>

      <div className="node-content">
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
        />

        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
        />
      </div>

      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsModalOpen(false)} />
            <div className="fixed right-0 top-0 h-full bg-white dark:bg-gray-800 w-[700px] shadow-xl overflow-y-auto custom-scrollbar">
              <div className="p-6">
                <div className="relative mb-1">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="absolute right-0 top-0 z-10 text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Fechar</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  <BaseNode 
                    id={id} 
                    data={data} 
                    onLabelChange={(newLabel) => {
                      const event = new CustomEvent('nodeDataChanged', {
                        detail: { nodeId: id, data: { ...data, label: newLabel } }
                      });
                      document.dispatchEvent(event);
                    }}
                    icon={<RequestIcon />}
                  />
                </div>

                <div className="space-y-4 mt-4">
                  {/* Método e URL */}
                  <div className="flex space-x-2">
                    <div className="w-1/5">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t('nodes.request.method')}
                      </label>
                      <select
                        value={localConfig.method}
                        onChange={(e) => handleConfigChange({ method: e.target.value })}
                        onBlur={handleConfigBlur}
                        className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                        <option value="HEAD">HEAD</option>
                        <option value="OPTIONS">OPTIONS</option>
                      </select>
                    </div>
                    <div className="w-4/5">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t('nodes.request.url')}
                      </label>
                      <div className="flex">
                        <input
                          type="text"
                          value={localConfig.url}
                          placeholder="https://api.example.com/endpoint"
                          onChange={(e) => handleConfigChange({ url: e.target.value })}
                          onBlur={handleConfigBlur}
                          className="w-full p-2 text-sm border rounded-l-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                        />
                        <button
                          onClick={executeTestRequest}
                          disabled={loading || !localConfig.url}
                          className="flex items-center px-3 py-2 text-sm font-medium rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                          title={t('nodes.request.testRequest')}
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Abas para diferentes seções */}
                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-4">
                      <button
                        onClick={() => setActiveTab('params')}
                        className={`py-2 px-1 text-sm font-medium ${
                          activeTab === 'params' 
                            ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' 
                            : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {t('nodes.request.params')}
                      </button>
                      <button
                        onClick={() => setActiveTab('headers')}
                        className={`py-2 px-1 text-sm font-medium ${
                          activeTab === 'headers' 
                            ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' 
                            : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {t('nodes.request.headers')}
                      </button>
                      <button
                        onClick={() => setActiveTab('body')}
                        className={`py-2 px-1 text-sm font-medium ${
                          activeTab === 'body' 
                            ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' 
                            : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {t('nodes.request.body')}
                      </button>
                      <button
                        onClick={() => setActiveTab('response')}
                        className={`py-2 px-1 text-sm font-medium ${
                          activeTab === 'response' 
                            ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' 
                            : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {t('nodes.request.response')}
                      </button>
                    </nav>
                  </div>

                  {/* Conteúdo da aba ativa */}
                  {renderTabContent()}
                </div>

                {showVariableSelector && (
                  <VariableSelectorModal
                    isOpen={showVariableSelector}
                    onClose={() => setShowVariableSelector(false)}
                    variables={variables}
                    onSelectVariable={handleInsertVariable}
                  />
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
} 