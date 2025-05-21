import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, ChevronDown, ChevronRight, Clipboard, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Variable } from '../../types/flow';
import { useCustomFieldDefinitions } from '../../hooks/useQueryes';
import { useAuthContext } from '../../contexts/AuthContext';

// Estruturas para as variáveis organizadas
interface CustomerVariableGroup {
  label: string;
  description?: string;
  variables: {
    name: string;
    description?: string;
  }[];
}

interface VariableSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  variables: Variable[];
  onSelectVariable: (variableName: string) => void;
  position?: { x: number; y: number } | null;
}

/**
 * Modal para seleção de variáveis de fluxo, cliente e chat
 */
export function VariableSelectorModal({
  isOpen,
  onClose,
  variables,
  onSelectVariable,
  position = null
}: VariableSelectorModalProps) {
  const { t } = useTranslation(['flows', 'common']);
  const { currentOrganizationMember } = useAuthContext();

  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
    'flow': true,
    'customer': true,
    'chat': false,
  });

  // Buscar campos personalizados da organização
  const { data: customFieldDefinitions = [] } = useCustomFieldDefinitions(currentOrganizationMember?.organization_id);

  // Variáveis do cliente organizadas por grupo
  const customerVariableGroups: CustomerVariableGroup[] = [
    {
      label: t('flows:variables.customerBasicInfo'),
      description: t('flows:variables.customerBasicInfoDesc'),
      variables: [
        { name: 'customer.name', description: t('flows:variables.customerName') },
        { name: 'customer.profile_picture', description: t('flows:variables.customerProfilePic') },
      ]
    },
    {
      label: t('flows:variables.customerContacts'),
      description: t('flows:variables.customerContactsDesc'),
      variables: [
        { name: 'customer.email', description: t('flows:variables.customerEmail') },
        { name: 'customer.whatsapp', description: t('flows:variables.customerWhatsapp') },
        { name: 'customer.instagram', description: t('flows:variables.customerInstagram') },
        // { name: 'customer.facebook_id', description: t('flows:variables.customerFacebook') },
      ]
    },
    {
      label: t('flows:variables.customerCustomFields'),
      description: t('flows:variables.customerCustomFieldsDesc'),
      variables: customFieldDefinitions.map(field => ({ 
        name: `customer.${field.slug}`, 
        description: field.name 
      }))
    }
  ];

  // Variáveis do chat organizadas por grupo
  const chatVariableGroups: CustomerVariableGroup[] = [
    {
      label: t('flows:variables.chatInfo'),
      description: t('flows:variables.chatInfoDesc'),
      variables: [
        { name: 'chat.status', description: t('flows:variables.chatStatus') },
        { name: 'chat.ticket_number', description: t('flows:variables.chatTicketNumber') },
        { name: 'chat.start_time', description: t('flows:variables.chatStartTime') },
        { name: 'chat.last_message_at', description: t('flows:variables.chatLastMessageTime') },
      ]
    }
  ];

  // Filtrar variáveis com base na pesquisa
  const filterVariables = (search: string) => {
    const normalizedSearch = search.toLowerCase();
    
    // Filtrar variáveis do fluxo
    const filteredFlowVariables = variables.filter(
      variable => variable.name.toLowerCase().includes(normalizedSearch)
    );

    // Filtrar grupos de variáveis do cliente
    const filteredCustomerGroups = customerVariableGroups
      .map(group => ({
        ...group,
        variables: group.variables.filter(
          variable => variable.name.toLowerCase().includes(normalizedSearch) ||
                     (variable.description && variable.description.toLowerCase().includes(normalizedSearch))
        )
      }))
      .filter(group => group.variables.length > 0);

    // Filtrar grupos de variáveis do chat
    const filteredChatGroups = chatVariableGroups
      .map(group => ({
        ...group,
        variables: group.variables.filter(
          variable => variable.name.toLowerCase().includes(normalizedSearch) ||
                     (variable.description && variable.description.toLowerCase().includes(normalizedSearch))
        )
      }))
      .filter(group => group.variables.length > 0);

    return {
      flowVariables: filteredFlowVariables,
      customerGroups: filteredCustomerGroups,
      chatGroups: filteredChatGroups
    };
  };

  const { flowVariables, customerGroups, chatGroups } = filterVariables(search);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Quando o modal é fechado, limpar a pesquisa
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calcular a posição do modal caso seja fornecida
  const modalStyle = position ? {
    position: 'absolute' as const,
    top: `${position.y}px`,
    left: `${position.x}px`,
    maxHeight: '400px',
    width: '320px',
    zIndex: 9999
  } : {};

  // Se não houver posição, renderizar em portal
  if (!position) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        <div className="absolute inset-0 bg-gray-500 bg-opacity-30" onClick={onClose} />
        <VariableSelectorContent 
          search={search}
          setSearch={setSearch}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          flowVariables={flowVariables}
          customerGroups={customerGroups}
          chatGroups={chatGroups}
          onSelectVariable={onSelectVariable}
          onClose={onClose}
        />
      </div>,
      document.body
    );
  }

  // Renderizar inline com posição personalizada
  return (
    <div style={modalStyle} className="absolute" onClick={(e) => e.stopPropagation()}>
      <VariableSelectorContent 
        search={search}
        setSearch={setSearch}
        expandedGroups={expandedGroups}
        toggleGroup={toggleGroup}
        flowVariables={flowVariables}
        customerGroups={customerGroups}
        chatGroups={chatGroups}
        onSelectVariable={onSelectVariable}
        onClose={onClose}
      />
    </div>
  );
}

// Componente interno para o conteúdo do seletor de variáveis
function VariableSelectorContent({
  search,
  setSearch,
  expandedGroups,
  toggleGroup,
  flowVariables,
  customerGroups,
  chatGroups,
  onSelectVariable,
  onClose
}: {
  search: string;
  setSearch: (value: string) => void;
  expandedGroups: { [key: string]: boolean };
  toggleGroup: (groupName: string) => void;
  flowVariables: Variable[];
  customerGroups: CustomerVariableGroup[];
  chatGroups: CustomerVariableGroup[];
  onSelectVariable: (variableName: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation(['flows', 'common']);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const handleVariableClick = (variableName: string) => {
    // Copiar para a área de transferência
    navigator.clipboard.writeText(variableName).then(() => {
      setCopiedVar(variableName);
      setTimeout(() => setCopiedVar(null), 1500);
    });
    
    // Continuar com o comportamento atual
    onSelectVariable(variableName);
    onClose();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col w-full max-w-md max-h-[90vh] border border-gray-200 dark:border-gray-700 z-10">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('flows:variables.selectVariable')}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={t('common:search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-800">
        {/* Variáveis do fluxo */}
        {flowVariables.length > 0 && (
          <div className="mb-4">
            <div
              className="flex items-center mb-2 cursor-pointer p-1.5 -ml-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => toggleGroup('flow')}
            >
              {expandedGroups['flow'] ? (
                <ChevronDown className="h-4 w-4 mr-1 text-blue-500" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1 text-blue-500" />
              )}
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {t('flows:variables.flowVariables')}
              </h4>
            </div>

            {expandedGroups['flow'] && (
              <div className="ml-5 space-y-1">
                {flowVariables.map((variable) => (
                  <div
                    key={variable.id}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-md cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    onClick={() => handleVariableClick(`{{${variable.name}}}`)}
                  >
                    <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                      {variable.name}
                    </span>
                    {copiedVar === `{{${variable.name}}}` ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clipboard className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Variáveis do cliente */}
        {customerGroups.length > 0 && (
          <div className="mb-4">
            <div
              className="flex items-center mb-2 cursor-pointer p-1.5 -ml-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => toggleGroup('customer')}
            >
              {expandedGroups['customer'] ? (
                <ChevronDown className="h-4 w-4 mr-1 text-blue-500" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1 text-blue-500" />
              )}
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {t('flows:variables.customerVariables')}
              </h4>
            </div>

            {expandedGroups['customer'] && (
              <div className="ml-5 space-y-3">
                {customerGroups.map((group, idx) => (
                  <div key={`customer-group-${idx}`} className="space-y-1">
                    <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider">
                      {group.label}
                    </h5>
                    {group.variables.map((variable, varIdx) => (
                      <div
                        key={`customer-var-${idx}-${varIdx}`}
                        className="flex items-center justify-between py-1.5 px-2.5 rounded-md cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
                        onClick={() => handleVariableClick(`{{${variable.name}}}`)}
                        title={variable.description || variable.name}
                      >
                        <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                          {variable.name}
                        </span>
                        {copiedVar === `{{${variable.name}}}` ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clipboard className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Variáveis do chat */}
        {chatGroups.length > 0 && (
          <div className="mb-4">
            <div
              className="flex items-center mb-2 cursor-pointer p-1.5 -ml-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => toggleGroup('chat')}
            >
              {expandedGroups['chat'] ? (
                <ChevronDown className="h-4 w-4 mr-1 text-blue-500" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1 text-blue-500" />
              )}
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {t('flows:variables.chatVariables')}
              </h4>
            </div>

            {expandedGroups['chat'] && (
              <div className="ml-5 space-y-3">
                {chatGroups.map((group, idx) => (
                  <div key={`chat-group-${idx}`} className="space-y-1">
                    <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider">
                      {group.label}
                    </h5>
                    {group.variables.map((variable, varIdx) => (
                      <div
                        key={`chat-var-${idx}-${varIdx}`}
                        className="flex items-center justify-between py-1.5 px-2.5 rounded-md cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
                        onClick={() => handleVariableClick(`{{${variable.name}}}`)}
                        title={variable.description || variable.name}
                      >
                        <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                          {variable.name}
                        </span>
                        {copiedVar === `{{${variable.name}}}` ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clipboard className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {flowVariables.length === 0 && customerGroups.length === 0 && chatGroups.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('common:noResultsFound')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 