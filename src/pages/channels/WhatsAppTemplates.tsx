import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthContext } from '../../contexts/AuthContext';

// Interfaces
interface WhatsAppTemplate {
  id: string;
  channel_id: string;
  name: string;
  language_code: string;
  category: string;
  status: string;
  components: TemplateComponent[];
  template_id?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
}

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  text?: string;
  example?: {
    header_text?: string[];
    header_text_named_params?: Array<{param_name: string, example: string}>;
    body_text?: string[][];
    body_text_named_params?: Array<{param_name: string, example: string}>;
    header_handle?: string[];
  };
  buttons?: TemplateButton[];
}

interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'OTP' | 'MPM' | 'CATALOG' | 'FLOW' | 'VOICE_CALL' | 'APP';
  text: string;
  url?: string | {
    base_url: string;
    url_suffix_example: string;
  };
  phone_number?: string;
  example?: string[];
  zero_tap_terms_accepted?: boolean;
}

interface FormData {
  name: string;
  language_code: string;
  category: string;
  allow_category_change?: boolean;
  components: TemplateComponent[];
}

export default function WhatsAppTemplates() {
  const { t } = useTranslation(['common', 'channels']);
  const { id: channelId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrganizationMember } = useAuthContext();
  const queryClient = useQueryClient();
  const [isDark, setIsDark] = useState(false);

  // Detectar preferência de tema do sistema
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(darkModeQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    darkModeQuery.addEventListener('change', handler);
    return () => darkModeQuery.removeEventListener('change', handler);
  }, []);

  // Estados
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Formulário
  const [formData, setFormData] = useState<FormData>({
    name: '',
    language_code: 'pt_BR',
    category: 'MARKETING',
    allow_category_change: true,
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '',
        example: { header_text: [''] }
      },
      {
        type: 'BODY',
        text: '',
        example: { body_text: [['']] }
      },
      {
        type: 'FOOTER',
        text: '',
      },
      {
        type: 'BUTTONS',
        buttons: []
      }
    ]
  });

  // Adicione um novo estado para armazenar exemplos personalizados
  const [customExamples, setCustomExamples] = useState<{
    [key: string]: { [variable: string]: string }
  }>({});

  // Queries e Mutations
  const { data: templates, isLoading } = useQuery({
    queryKey: ['whatsapp-templates', channelId],
    queryFn: async ({ signal }) => {
      const response = await api.get(
        `api/${currentOrganizationMember?.organization.id}/channel/whatsapp/${channelId}/templates`,
        { signal }
      );
      return response.data.templates;
    },
    enabled: !!channelId && !!currentOrganizationMember
  });

  const createTemplate = useMutation({
    mutationFn: (data: FormData) => 
      api.post(`/api/${currentOrganizationMember?.organization.id}/channel/whatsapp/${channelId}/templates`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', channelId] });
      toast.success('Template criado com sucesso!');
      setShowModal(false);
      setFormError(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Erro ao criar template';
      setFormError(errorMessage);
      toast.error(errorMessage);
    }
  });

  const updateTemplate = useMutation({
    mutationFn: (data: { templateId: string, formData: Partial<FormData> }) => 
      api.put(`/api/${currentOrganizationMember?.organization.id}/channel/whatsapp/${channelId}/templates/${data.templateId}`, data.formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', channelId] });
      toast.success('Template atualizado com sucesso!');
      setShowModal(false);
      setIsEditing(false);
      setFormError(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Erro ao atualizar template';
      setFormError(errorMessage);
      toast.error(errorMessage);
    }
  });

  const deleteTemplate = useMutation({
    mutationFn: (templateId: string) => 
      api.delete(`/api/${currentOrganizationMember?.organization.id}/channel/whatsapp/${channelId}/templates/${templateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', channelId] });
      toast.success('Template excluído com sucesso!');
      setShowDeleteConfirm(false);
    },
    onError: () => toast.error('Erro ao excluir template')
  });

  // Função para validar o nome do template
  const validateTemplateName = (name: string): boolean => {
    // Regex para verificar se contém apenas letras minúsculas e sublinhados
    const regex = /^[a-z_]+$/;
    return regex.test(name);
  };

  // Função para validar a sequência de variáveis
  const validateVariableSequence = (text: string): { isValid: boolean, errorMessage: string | null } => {
    // Regex para encontrar todas as variáveis posicionais
    const regex = /{{(\d+)}}/g;
    const variables: number[] = [];
    let match;
    
    // Extrair todos os números de variáveis
    while ((match = regex.exec(text)) !== null) {
      variables.push(parseInt(match[1]));
    }
    
    // Se não há variáveis, é válido
    if (variables.length === 0) {
      return { isValid: true, errorMessage: null };
    }
    
    // Verificar se os números estão em sequência começando do 1
    const sorted = [...variables].sort((a, b) => a - b);
    
    // Verificar se começa com 1
    if (sorted[0] !== 1) {
      return { 
        isValid: false, 
        errorMessage: t('channels:form.whatsapp.variablesMustStartWithOne')
      };
    }
    
    // Verificar se não há lacunas na sequência
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] !== sorted[i] + 1) {
        return { 
          isValid: false, 
          errorMessage: t('channels:form.whatsapp.variablesMustBeSequential')
        };
      }
    }
    
    return { isValid: true, errorMessage: null };
  };

  // Estado para armazenar erros de validação de variáveis
  const [variableErrors, setVariableErrors] = useState<{[key: number]: string | null}>({});

  // Função atualizada para processar variáveis nos textos
  const processVariables = (text: string): { processedText: string, variables: string[] } => {
    const regex = /{{(\d+)}}/g;
    const variables: string[] = [];
    let match;
    let processedText = text;
    
    while ((match = regex.exec(text)) !== null) {
      variables.push(match[1]);
    }
    
    return {
      processedText,
      variables
    };
  };

  // Função atualizada para lidar com mudanças nos componentes
  const handleComponentChange = (index: number, newText: string) => {
    const newComponents = [...formData.components];
    const component = newComponents[index];
    
    // Validar a sequência de variáveis
    const { isValid, errorMessage } = validateVariableSequence(newText);
    
    // Atualizar o estado de erros
    setVariableErrors(prev => ({
      ...prev,
      [index]: errorMessage
    }));
    
    // Atualizar o texto do componente
    newComponents[index] = { 
      ...component, 
      text: newText
    };
    
    // Se a sequência for válida, atualizar os exemplos
    if (isValid) {
      // Detectar variáveis no texto
      const { variables } = processVariables(newText);
      
      // Atualizar exemplos automaticamente com base nas variáveis
      if (component.type === 'HEADER' && variables.length > 0) {
        // Para HEADER com variáveis
        const headerExamples = variables.map(v => `exemplo${v}`);
        
        component.example = { 
          ...component.example,
          header_text: headerExamples
        };
      } 
      else if (component.type === 'BODY' && variables.length > 0) {
        // Para BODY com variáveis
        const bodyExamples = variables.map(v => `exemplo${v}`);
        
        component.example = { 
          ...component.example,
          body_text: [bodyExamples]
        };
      }
    }
    
    setFormData(prev => ({ ...prev, components: newComponents }));
  };

  // Função para validar o formulário antes de enviar
  const validateForm = (): boolean => {
    // Verificar se há erros de variáveis
    const hasVariableErrors = Object.values(variableErrors).some(error => error !== null);
    
    if (hasVariableErrors) {
      // Mostrar toast com erro
      toast.error(t('channels:form.whatsapp.fixVariableErrors'));
      return false;
    }
    
    // Verificar se o nome do template é válido
    if (!validateTemplateName(formData.name)) {
      setNameError(t('channels:form.whatsapp.templateNameError'));
      return false;
    }
    
    return true;
  };

  // Handler de submit atualizado
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Validar o formulário
    if (!validateForm()) {
      return;
    }
    
    if (isEditing && selectedTemplate) {
      updateTemplate.mutate({ 
        templateId: selectedTemplate.id, 
        formData: {
          ...(formData.category !== selectedTemplate.category ? { category: formData.category } : {}),
          ...(JSON.stringify(formData.components) !== JSON.stringify(selectedTemplate.components) ? { components: formData.components } : {})
        }
      });
    } else {
    createTemplate.mutate(formData);
    }
  };

  // Função para lidar com a mudança no nome do template
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Converter o texto para minúsculas e substituir caracteres inválidos por sublinhados
    const inputValue = e.target.value;
    
    // Remover caracteres especiais e converter para minúsculas
    // Substitui espaços e caracteres especiais por sublinhados
    // Mantém apenas letras minúsculas, números e sublinhados
    const formattedValue = inputValue
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')  // Substitui caracteres não permitidos por sublinhados
      .replace(/_+/g, '_');         // Evita múltiplos sublinhados consecutivos
    
    setFormData(prev => ({ ...prev, name: formattedValue }));
    
    // Validar em tempo real
    if (formattedValue && !validateTemplateName(formattedValue)) {
      setNameError(t('channels:form.whatsapp.templateNameError'));
    } else {
      setNameError(null);
    }
  };

  const handleDelete = () => {
    if (selectedTemplate) {
      deleteTemplate.mutate(selectedTemplate.id);
    }
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      language_code: template.language_code,
      category: template.category,
      components: template.components
    });
    setIsEditing(true);
    setFormError(null);
    setShowModal(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      language_code: 'pt_BR',
      category: 'MARKETING',
      allow_category_change: true,
      components: [
        {
          type: 'HEADER',
          format: 'TEXT',
          text: '',
          example: { header_text: [''] }
        },
        {
          type: 'BODY',
          text: '',
          example: { body_text: [['']] }
        },
        {
          type: 'FOOTER',
          text: '',
        },
        {
          type: 'BUTTONS',
          buttons: []
        }
      ]
    });
    setIsEditing(false);
    setFormError(null);
    setNameError(null);
    setShowModal(true);
  };

  // Adicione estes estados para gerenciar os exemplos e o modal
  const [showExamplesModal, setShowExamplesModal] = useState(false);
  const [currentComponentIndex, setCurrentComponentIndex] = useState(-1);
  const [currentVariables, setCurrentVariables] = useState<string[]>([]);

  // Função para abrir o modal de exemplos para um componente específico
  const openExamplesModal = (index: number) => {
    const component = formData.components[index];
    if (!component.text) return;
    
    // Extrair variáveis do texto
    const { variables } = processVariables(component.text);
    
    if (variables.length === 0) {
      toast.info(t('channels:form.whatsapp.noVariablesFound'));
      return;
    }
    
    // Inicializar os exemplos existentes
    const existingExamples: { [key: string]: string } = {};
    
    if (component.type === 'HEADER' && component.example?.header_text) {
      variables.forEach((variable, idx) => {
        existingExamples[variable] = component.example?.header_text?.[idx] || '';
      });
    } 
    else if (component.type === 'BODY' && component.example?.body_text) {
      variables.forEach((variable, idx) => {
        existingExamples[variable] = component.example?.body_text?.[0]?.[idx] || '';
      });
    }
    
    // Atualizar o estado dos exemplos personalizados com os valores existentes
    setCustomExamples(prev => ({
      ...prev,
      [component.type]: existingExamples
    }));
    
    setCurrentComponentIndex(index);
    setCurrentVariables(variables);
    setShowExamplesModal(true);
  };

  // Função para atualizar um exemplo personalizado
  const handleExampleChange = (variable: string, value: string) => {
    const componentType = formData.components[currentComponentIndex].type;
    
    setCustomExamples(prev => ({
      ...prev,
      [componentType]: {
        ...prev[componentType],
        [variable]: value
      }
    }));
  };

  // Função para salvar os exemplos personalizados
  const handleSaveExamples = () => {
    const newComponents = [...formData.components];
    const component = newComponents[currentComponentIndex];
    
    if (component.type === 'HEADER') {
      const headerExamples = currentVariables.map(v => 
        customExamples[component.type]?.[v] || `exemplo${v}`
      );
      
      component.example = { 
        ...component.example,
        header_text: headerExamples
      };
    } 
    else if (component.type === 'BODY') {
      const bodyExamples = currentVariables.map(v => 
        customExamples[component.type]?.[v] || `exemplo${v}`
      );
      
      component.example = { 
        ...component.example,
        body_text: [bodyExamples]
      };
    }
    
    setFormData(prev => ({ ...prev, components: newComponents }));
    setShowExamplesModal(false);
    
    toast.success(t('channels:form.whatsapp.examplesSaved'));
  };

  // Adicione esta função junto com os outros handlers
  const handleAddButton = (type: TemplateButton['type']) => {
    const newComponents = [...formData.components];
    const buttonsComponent = newComponents.find(c => c.type === 'BUTTONS');
    
    if (buttonsComponent) {
      const newButton: TemplateButton = {
        type,
        text: '',
        ...(type === 'URL' ? { url: '' } : {}),
        ...(type === 'PHONE_NUMBER' ? { phone_number: '' } : {})
      };
      
      buttonsComponent.buttons = [...(buttonsComponent.buttons || []), newButton];
      setFormData({ ...formData, components: newComponents });
    }
  };

  // Adicione também a função para remover botões
  const handleRemoveButton = (buttonIndex: number) => {
    const newComponents = [...formData.components];
    const buttonsComponent = newComponents.find(c => c.type === 'BUTTONS');
    
    if (buttonsComponent && buttonsComponent.buttons) {
      buttonsComponent.buttons = buttonsComponent.buttons.filter((_, idx) => idx !== buttonIndex);
      setFormData({ ...formData, components: newComponents });
    }
  };

  // Adicione a função para atualizar os dados dos botões
  const handleButtonChange = (buttonIndex: number, field: string, value: string) => {
    const newComponents = [...formData.components];
    const buttonsComponent = newComponents.find(c => c.type === 'BUTTONS');
    
    if (buttonsComponent && buttonsComponent.buttons) {
      buttonsComponent.buttons = buttonsComponent.buttons.map((button, idx) => {
        if (idx === buttonIndex) {
          return {
            ...button,
            [field]: value
          };
        }
        return button;
      });
      
      setFormData({ ...formData, components: newComponents });
    }
  };

  // Componente de Preview do WhatsApp atualizado com variáveis clicáveis
  const WhatsAppPreview = ({ template }: { template: FormData }) => {
    // Função para substituir variáveis por exemplos na prévia, mas mantendo-as clicáveis
    const replaceVariablesWithExamples = (text: string, examples: string[] = [], componentIndex: number): React.ReactNode => {
      if (!text) return text;
      
      const regex = /{{(\d+)}}/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      
      // Clonar o texto para não modificar o original
      const textCopy = text.slice();
      
      // Resetar o regex
      regex.lastIndex = 0;
      
      while ((match = regex.exec(textCopy)) !== null) {
        const variable = match[1];
        const index = parseInt(variable) - 1;
        const example = examples[index] || `exemplo${variable}`;
        
        // Adicionar o texto antes da variável
        if (match.index > lastIndex) {
          parts.push(textCopy.substring(lastIndex, match.index));
        }
        
        // Adicionar a variável como um elemento clicável
        parts.push(
          <span 
            key={match.index}
            onClick={() => openExamplesModal(componentIndex)}
            className={`cursor-pointer px-1 rounded ${
              isDark 
                ? 'bg-blue-800 text-blue-200 hover:bg-blue-700' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            title={t('channels:form.whatsapp.clickToEditExample')}
          >
            {example}
          </span>
        );
        
        lastIndex = match.index + match[0].length;
      }
      
      // Adicionar o restante do texto
      if (lastIndex < textCopy.length) {
        parts.push(textCopy.substring(lastIndex));
      }
      
      return <>{parts}</>;
    };
    
    return (
      <div className={`w-[320px] ${isDark ? 'bg-gray-900' : 'bg-gray-100'} p-4 rounded-lg shadow-lg`}>
        
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-4 rounded-b-lg`}>
          {template.components.map((component, index) => {
            if (component.type === 'HEADER') {
              const headerText = component.text || t('channels:form.whatsapp.headerPlaceholder');
              const headerExamples = component.example?.header_text || [];
              
              return (
                <div key={index} className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {replaceVariablesWithExamples(headerText, headerExamples, index)}
                </div>
              );
            }
            if (component.type === 'BODY') {
              const bodyText = component.text || t('channels:form.whatsapp.bodyPlaceholder');
              const bodyExamples = component.example?.body_text?.[0] || [];
              
              return (
                <div key={index} className={`mb-4 whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {replaceVariablesWithExamples(bodyText, bodyExamples, index)}
                </div>
              );
            }
            if (component.type === 'FOOTER') {
              return component.text ? (
                <div key={index} className={`text-xs italic mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {component.text}
                </div>
              ) : null;
            }
            if (component.type === 'BUTTONS' && component.buttons && component.buttons.length > 0) {
              return (
                <div key={index} className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                  {component.buttons.map((button, buttonIndex) => (
                    <div 
                      key={buttonIndex}
                      className={`text-center py-2 my-1 rounded ${
                        isDark 
                          ? 'bg-gray-700 text-blue-400' 
                          : 'bg-gray-100 text-blue-600'
                      }`}
                    >
                      {button.text || t('channels:form.whatsapp.buttonPlaceholder')}
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  // Adicionar estado de loading para sincronização
  const [isSyncing, setIsSyncing] = useState(false);

  // Função para sincronizar templates
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await api.get(
        `api/${currentOrganizationMember?.organization.id}/channel/whatsapp/${channelId}/templates?sync=true`
      );;
      // await refetch();
      toast.success(t('channels:form.whatsapp.syncSuccess'));
    } catch (error) {
      toast.error(t('channels:form.whatsapp.syncError'));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={`p-4 min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button 
            onClick={() => navigate(`/app/channels/${channelId}/edit/whatsapp_official`)}
            className={`${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
          >
            ← {t('common:back')}
          </button>
          <h1 className="text-2xl font-bold mt-2">{t('channels:form.whatsapp.templates')}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`${
              isDark 
                ? 'bg-green-500 hover:bg-green-400' 
                : 'bg-green-600 hover:bg-green-700'
            } text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50`}
          >
            {isSyncing ? (
              <>
                <span className="animate-spin">⟳</span>
                {t('channels:form.whatsapp.syncing')}
              </>
            ) : (
              <>
                ⟳ {t('channels:form.whatsapp.sync')}
              </>
            )}
          </button>
        <button
            onClick={handleCreate}
          className={`${
            isDark 
              ? 'bg-blue-500 hover:bg-blue-400' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white px-4 py-2 rounded`}
        >
          {t('channels:form.whatsapp.newTemplate')}
        </button>
        </div>
      </div>

      {/* Lista de Templates */}
      {isLoading ? (
        <p>{t('common:loading')}</p>
      ) : templates?.length === 0 ? (
        <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <p className="text-lg mb-4">{t('channels:form.whatsapp.noTemplates')}</p>
          <p className="text-sm">{t('channels:form.whatsapp.createFirstTemplate')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates?.map((template: WhatsAppTemplate) => (
            <div 
              key={template.id} 
              className={`border rounded-lg p-4 ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' 
                  : 'bg-white border-gray-200 hover:shadow-md'
              } transition-all`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{template.name}</h3>
                <span className={`px-2 py-1 rounded text-sm ${
                  template.status === 'APPROVED' 
                    ? isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                    : template.status === 'PENDING'
                    ? isDark ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                    : isDark ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'
                }`}>
                  {t(`channels:form.whatsapp.templateStatus.${template.status.toLowerCase()}`)}
                </span>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                {t('channels:form.whatsapp.language')}: {template.language_code}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                {t('channels:form.whatsapp.category')}: {template.category}
              </p>
              
              {template.rejection_reason && (
                <div className={`${
                  isDark ? 'bg-red-900 text-red-300' : 'bg-red-50 text-red-700'
                } p-2 rounded mb-4 text-sm`}>
                  {template.rejection_reason}
                </div>
              )}

              <div className="flex justify-end gap-2">
                {template.status === 'APPROVED' || template.status === 'REJECTED' || template.status === 'PAUSED' ? (
                  <button
                    onClick={() => handleEdit(template)}
                    className={`${
                      isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                    } px-2 py-1`}
                  >
                    {t('common:edit')}
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowDeleteConfirm(true);
                  }}
                  className={`${
                    isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'
                  } px-2 py-1`}
                >
                  {t('common:delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className={`${
            isDark ? 'bg-gray-800' : 'bg-white'
          } rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto`}>
            <h2 className="text-xl font-bold mb-4">
              {isEditing 
                ? t('channels:form.whatsapp.editTemplate') 
                : t('channels:form.whatsapp.newTemplate')}
            </h2>
            
            {formError && (
              <div className={`${
                isDark ? 'bg-red-900 text-red-300' : 'bg-red-50 text-red-700'
              } p-3 rounded mb-4`}>
                <p className="text-sm">{formError}</p>
              </div>
            )}
            
            {isEditing && (
              <div className={`${
                isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700'
              } p-3 rounded mb-4`}>
                <p className="text-sm">
                  {t('channels:form.whatsapp.editTemplateWarning')}
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                      {t('channels:form.whatsapp.templateName')}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={handleNameChange}
                      className={`w-full border rounded p-2 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      } ${nameError ? (isDark ? 'border-red-500' : 'border-red-500') : ''}`}
                      required
                      disabled={isEditing}
                      placeholder="template_name"
                    />
                    {nameError && (
                      <p className={`text-sm mt-1 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                        {nameError}
                      </p>
                    )}
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t('channels:form.whatsapp.templateNameHelp')}
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                      {t('channels:form.whatsapp.language')}
                    </label>
                    <select
                      value={formData.language_code}
                      onChange={e => setFormData(prev => ({ ...prev, language_code: e.target.value }))}
                      className={`w-full border rounded p-2 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                      disabled={isEditing}
                    >
                      <option value="pt_BR">Português (Brasil)</option>
                      <option value="en_US">English (US)</option>
                      <option value="es_ES">Español</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                      {t('channels:form.whatsapp.category')}
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className={`w-full border rounded p-2 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                      disabled={isEditing && selectedTemplate?.status === 'APPROVED'}
                    >
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utility</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                  </div>

                  {/* Formulário com componentes */}
                  {formData.components.map((component, index) => {
                    if (component.type === 'HEADER' || component.type === 'BODY') {
                      return (
                        <div key={index} className={`border rounded p-4 ${
                          isDark ? 'border-gray-700' : 'border-gray-200'
                        } ${variableErrors[index] ? (isDark ? 'border-red-500' : 'border-red-500') : ''}`}>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className={`font-medium ${isDark ? 'text-gray-300' : ''}`}>
                              {t(`channels:form.whatsapp.componentType.${component.type.toLowerCase()}`)}
                            </h3>
                            
                            <button
                              type="button"
                              onClick={() => openExamplesModal(index)}
                              className={`text-xs px-2 py-1 rounded ${
                                isDark 
                                  ? 'bg-blue-700 text-white hover:bg-blue-600' 
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              {t('channels:form.whatsapp.editExamples')}
                            </button>
                          </div>
                          
                          <textarea
                            value={component.text || ''}
                            onChange={e => handleComponentChange(index, e.target.value)}
                            className={`w-full border rounded p-2 ${
                              isDark 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300'
                            } ${variableErrors[index] ? (isDark ? 'border-red-500' : 'border-red-500') : ''}`}
                            rows={component.type === 'BODY' ? 4 : 2}
                            required
                            placeholder={t(`channels:form.whatsapp.${component.type.toLowerCase()}Placeholder`)}
                          />
                          
                          {variableErrors[index] && (
                            <p className={`text-sm mt-1 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                              {variableErrors[index]}
                            </p>
                          )}
                          
                          <div className={`mt-2 p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {t('channels:form.whatsapp.variablesHelp')} 
                              {component.type === 'HEADER' ? `{{1}}` :  `{{1}}, {{2}}, {{3}} ...`}
                            </p>
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {t(`channels:form.whatsapp.limit${component.type}`)}
                            </p>
                          </div>
                        </div>
                      );
                    } else if (component.type === 'FOOTER') {
                      return (
                    <div key={index} className={`border rounded p-4 ${
                      isDark ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <h3 className={`font-medium mb-2 ${isDark ? 'text-gray-300' : ''}`}>
                        {t(`channels:form.whatsapp.componentType.${component.type.toLowerCase()}`)}
                      </h3>
                      <textarea
                        value={component.text || ''}
                            onChange={e => handleComponentChange(index, e.target.value)}
                        className={`w-full border rounded p-2 ${
                          isDark 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300'
                        }`}
                            rows={2}
                        placeholder={t(`channels:form.whatsapp.${component.type.toLowerCase()}Placeholder`)}
                      />
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {t('channels:form.whatsapp.limitFooter')}
                          </p>
                        </div>
                      );
                    } else if (component.type === 'BUTTONS') {
                      return (
                        <div key={index} className={`border rounded p-4 ${
                          isDark ? 'border-gray-700' : 'border-gray-200'
                        }`}>
                          <h3 className={`font-medium mb-2 ${isDark ? 'text-gray-300' : ''}`}>
                            {t('channels:form.whatsapp.componentType.buttons')}
                          </h3>
                          
                          {component.buttons && component.buttons.length > 0 ? (
                            <div className="space-y-4">
                              {component.buttons.map((button, buttonIndex) => (
                                <div key={buttonIndex} className={`p-3 rounded ${
                                  isDark ? 'bg-gray-700' : 'bg-gray-100'
                                }`}>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {t(`channels:form.whatsapp.buttonType.${button.type.toLowerCase()}`)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveButton(buttonIndex)}
                                      className={`text-red-500 hover:text-red-700`}
                                    >
                                      {t('common:remove')}
                                    </button>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <div>
                                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {t('channels:form.whatsapp.buttonText')}
                                      </label>
                                      <input
                                        type="text"
                                        value={button.text || ''}
                                        onChange={e => handleButtonChange(buttonIndex, 'text', e.target.value)}
                                        className={`w-full border rounded p-2 ${
                                          isDark 
                                            ? 'bg-gray-700 border-gray-600 text-white' 
                                            : 'bg-white border-gray-300'
                                        }`}
                                        placeholder={t('channels:form.whatsapp.buttonTextPlaceholder')}
                                        maxLength={25}
                                      />
                                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {t('channels:form.whatsapp.buttonTextLimit')}
                                      </p>
                                    </div>
                                    
                                    {button.type === 'URL' && (
                                      <div>
                                        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {t('channels:form.whatsapp.buttonUrl')}
                                        </label>
                                        <input
                                          type="url"
                                          value={typeof button.url === 'string' ? button.url : ''}
                                          onChange={e => handleButtonChange(buttonIndex, 'url', e.target.value)}
                                          className={`w-full border rounded p-2 ${
                                            isDark 
                                              ? 'bg-gray-700 border-gray-600 text-white' 
                                              : 'bg-white border-gray-300'
                                          }`}
                                          placeholder="https://exemplo.com"
                                        />
                                      </div>
                                    )}
                                    
                                    {button.type === 'PHONE_NUMBER' && (
                                      <div>
                                        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {t('channels:form.whatsapp.buttonPhone')}
                                        </label>
                                        <input
                                          type="tel"
                                          value={button.phone_number || ''}
                                          onChange={e => handleButtonChange(buttonIndex, 'phone_number', e.target.value)}
                                          className={`w-full border rounded p-2 ${
                                            isDark 
                                              ? 'bg-gray-700 border-gray-600 text-white' 
                                              : 'bg-white border-gray-300'
                                          }`}
                                          placeholder="+5511999999999"
                                        />
                                      </div>
                                    )}
                                  </div>
                    </div>
                  ))}
                            </div>
                          ) : (
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-3`}>
                              {t('channels:form.whatsapp.noButtons')}
                            </p>
                          )}
                          
                          {(!component.buttons || component.buttons.length < 3) && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              <button
                                type="button"
                                onClick={() => handleAddButton('QUICK_REPLY')}
                                className={`px-3 py-1.5 text-xs rounded ${
                                  isDark 
                                    ? 'bg-blue-700 text-white hover:bg-blue-600' 
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                              >
                                + {t('channels:form.whatsapp.addQuickReply')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddButton('URL')}
                                className={`px-3 py-1.5 text-xs rounded ${
                                  isDark 
                                    ? 'bg-green-700 text-white hover:bg-green-600' 
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                + {t('channels:form.whatsapp.addUrl')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddButton('PHONE_NUMBER')}
                                className={`px-3 py-1.5 text-xs rounded ${
                                  isDark 
                                    ? 'bg-purple-700 text-white hover:bg-purple-600' 
                                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                }`}
                              >
                                + {t('channels:form.whatsapp.addPhone')}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    return null;
                  })}

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className={`px-4 py-2 ${
                        isDark ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {t('common:cancel')}
                    </button>
                    <button
                      type="submit"
                      className={`${
                        isDark 
                          ? 'bg-blue-500 hover:bg-blue-400' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white px-4 py-2 rounded`}
                      disabled={createTemplate.isPending || updateTemplate.isPending}
                    >
                      {isEditing 
                        ? (updateTemplate.isPending ? t('common:updating') : t('common:update'))
                        : (createTemplate.isPending ? t('common:creating') : t('common:create'))}
                    </button>
                  </div>
                </div>
              </form>

              <div className="flex flex-col items-center">
                <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-300' : ''}`}>
                  {t('channels:form.whatsapp.preview')}
                </h3>
                <WhatsAppPreview template={formData} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className={`${
            isDark ? 'bg-gray-800' : 'bg-white'
          } rounded-lg p-6 max-w-md w-full`}>
            <h2 className="text-xl font-bold mb-4">{t('channels:form.whatsapp.deleteTemplate')}</h2>
            <p className={isDark ? 'text-gray-300' : ''}>
              {t('channels:form.whatsapp.deleteTemplateConfirm')}
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`px-4 py-2 ${
                  isDark ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {t('common:cancel')}
              </button>
              <button
                onClick={handleDelete}
                className={`${
                  isDark 
                    ? 'bg-red-500 hover:bg-red-400' 
                    : 'bg-red-600 hover:bg-red-700'
                } text-white px-4 py-2 rounded`}
                disabled={deleteTemplate.isPending}
              >
                {deleteTemplate.isPending ? t('common:deleting') : t('common:delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Exemplos */}
      {showExamplesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${
            isDark ? 'bg-gray-800' : 'bg-white'
          } rounded-lg p-6 max-w-md w-full`}>
            <h2 className="text-xl font-bold mb-4">
              {t('channels:form.whatsapp.editExamples')}
            </h2>
            
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {t('channels:form.whatsapp.editExamplesHelp')}
            </p>
            
            <div className="space-y-4 mb-6">
              {currentVariables.map((variable, idx) => (
                <div key={idx}>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                    {`Variável {{${variable}}}`}
                  </label>
                  <input
                    type="text"
                    value={customExamples[formData.components[currentComponentIndex]?.type]?.[variable] || ''}
                    onChange={e => handleExampleChange(variable, e.target.value)}
                    placeholder={`exemplo${variable}`}
                    className={`w-full border rounded p-2 ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExamplesModal(false)}
                className={`px-4 py-2 ${
                  isDark ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {t('common:cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveExamples}
                className={`${
                  isDark 
                    ? 'bg-blue-500 hover:bg-blue-400' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white px-4 py-2 rounded`}
              >
                {t('common:save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 