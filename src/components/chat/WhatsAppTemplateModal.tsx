import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

interface WhatsAppTemplate {
  id: string;
  name: string;
  components: {
    type: string;
    text?: string;
    example?: {
      header_text?: string[];
      body_text?: string[][];
    };
  }[];
}

interface WhatsAppTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  onSendTemplate: (template: WhatsAppTemplate, variables: { [key: string]: string }) => void;
}

export function WhatsAppTemplateModal({ isOpen, onClose, channelId, onSendTemplate }: WhatsAppTemplateModalProps) {
  const { t } = useTranslation(['channels', 'common']);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [variables, setVariables] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, channelId]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('channel_id', channelId)
        .eq('status', 'APPROVED');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      setError(t('channels:errors.loadingTemplates'));
    } finally {
      setLoading(false);
    }
  };

  const extractVariables = (template: WhatsAppTemplate): string[] => {
    const variables: string[] = [];
    template.components.forEach(component => {
      if (component.text) {
        const matches = component.text.match(/{{(\d+)}}/g) || [];
        matches.forEach(match => {
          const variable = match.replace(/[{}]/g, '');
          if (!variables.includes(variable)) {
            variables.push(variable);
          }
        });
      }
    });
    return variables.sort((a, b) => parseInt(a) - parseInt(b));
  };

  const handleTemplateSelect = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    const templateVariables = extractVariables(template);
    const initialVariables: { [key: string]: string } = {};
    templateVariables.forEach(variable => {
      initialVariables[variable] = '';
    });
    setVariables(initialVariables);
  };

  const handleSend = () => {
    if (!selectedTemplate) return;
    
    // Verificar se todas as variáveis foram preenchidas
    const missingVariables = Object.entries(variables).some(([_, value]) => !value.trim());
    if (missingVariables) {
      setError(t('channels:form.whatsapp.fillAllVariables'));
      return;
    }

    onSendTemplate(selectedTemplate, variables);
    onClose();
  };

  const getTemplatesUrl = () => {
    return `/app/channels/${channelId}/templates`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`${
        isDark ? 'bg-gray-800' : 'bg-white'
      } rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        <h2 className="text-xl font-bold mb-4 dark:text-gray-200">
          {t('channels:form.whatsapp.selectTemplate')}
        </h2>

        {error && (
          <div className={`mb-4 p-3 rounded ${
            isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-50 text-red-600'
          }`}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-12 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {!selectedTemplate ? (
              templates.length > 0 ? (
                <div className="grid gap-2">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`w-full text-left p-3 rounded transition-colors ${
                        isDark 
                          ? 'hover:bg-gray-700 bg-gray-750' 
                          : 'hover:bg-gray-50 bg-gray-100'
                      }`}
                    >
                      <div className="font-medium dark:text-gray-200">{template.name}</div>
                      <div className={`text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {template.components.find(c => c.type === 'BODY')?.text?.substring(0, 100)}...
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={`text-center p-6 rounded ${
                  isDark ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className={`text-4xl mb-2 ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    📝
                  </div>
                  <h3 className={`text-lg font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {t('channels:form.whatsapp.noTemplates')}
                  </h3>
                  <p className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {t('channels:form.whatsapp.createTemplateFirst')}
                  </p>
                  <button
                    onClick={() => window.open(getTemplatesUrl(), '_blank')}
                    className={`mt-4 px-4 py-2 rounded ${
                      isDark 
                        ? 'bg-blue-500 hover:bg-blue-400 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {t('channels:form.whatsapp.goToTemplates')}
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className="mb-4">
                  <h3 className="font-medium mb-2">{selectedTemplate.name}</h3>
                  <div className={`p-3 rounded ${
                    isDark ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    {selectedTemplate.components.map((component, index) => (
                      <div key={index} className="mb-2">
                        {component.text}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {extractVariables(selectedTemplate).map(variable => (
                    <div key={variable}>
                      <label className={`block text-sm font-medium mb-1 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {t('channels:form.whatsapp.variable')} {variable}
                      </label>
                      <input
                        type="text"
                        value={variables[variable] || ''}
                        onChange={e => setVariables(prev => ({
                          ...prev,
                          [variable]: e.target.value
                        }))}
                        className={`w-full p-2 rounded border ${
                          isDark 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300'
                        }`}
                        placeholder={t('channels:form.whatsapp.enterValue')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className={`px-4 py-2 ${
              isDark ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {t('common:cancel')}
          </button>
          {selectedTemplate && (
            <button
              onClick={handleSend}
              className={`px-4 py-2 rounded ${
                isDark 
                  ? 'bg-blue-500 hover:bg-blue-400 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {t('channels:form.whatsapp.sendTemplate')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 