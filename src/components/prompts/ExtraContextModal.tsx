import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { Loader2 } from 'lucide-react';
import ExtraContextTemplateSelector from './ExtraContextTemplateSelector';

interface ExtraContext {
  id: string;
  title: string;
  description: string;
  content: string;
  type: 'whatsapp_list';
}

interface ExtraContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (context: ExtraContext) => void;
  initialContext?: ExtraContext;
}

const ExtraContextModal: React.FC<ExtraContextModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialContext
}) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [context, setContext] = useState<ExtraContext>({
    id: initialContext?.id || crypto.randomUUID(),
    title: initialContext?.title || '',
    description: initialContext?.description || '',
    content: initialContext?.content || '',
    type: 'whatsapp_list'
  });

  // WhatsApp List template - now dynamically generated when needed
  const getWhatsAppListTemplate = () => {
    return `### *${t('prompts:templates.whatsappList.formatHeading', 'Format for list when requesting health center service list, which can be more specific lists of service types')}* (json format):
\`\`\`
{
    "title": "${t('prompts:templates.whatsappList.titleExample', 'Example title')}",
    "description": "${t('prompts:templates.whatsappList.descriptionExample', 'Description')}",
    "buttonText": "${t('prompts:templates.whatsappList.buttonText', 'Button name:')}",
    "sections": [
        {
            "title": "${t('prompts:templates.whatsappList.sectionTitle', 'Section 1 Title')}",
            "rows": [
                {
                    "title": "${t('prompts:templates.whatsappList.optionTitle', 'Option 1')}",
                    "description": "${t('prompts:templates.whatsappList.optionDescription', 'Description of option 1')}",
                },
                {
                    "title": "${t('prompts:templates.whatsappList.optionTitle2', 'Option 2')}",
                    "description": "${t('prompts:templates.whatsappList.optionDescription2', 'Description of option 2')}",
                }
            ]
        },
        {
            "title": "${t('prompts:templates.whatsappList.sectionTitle2', 'Section 2 Title')}",
            "rows": [
                {
                    "title": "${t('prompts:templates.whatsappList.optionTitle', 'Option 1')}",
                    "description": "${t('prompts:templates.whatsappList.optionDescription', 'Description of option 1')}",
                }
            ]
        }
    ]
}
\`\`\``;
  };

  useEffect(() => {
    if (initialContext) {
      setContext(initialContext);
      setSelectedTemplate('edit'); // Skip template selection when editing
    } else {
      // Reset on new modal open
      setSelectedTemplate(null);
      setContext({
        id: crypto.randomUUID(),
        title: '',
        description: '',
        content: '',
        type: 'whatsapp_list'
      });
    }
  }, [initialContext, isOpen]);

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template);
    
    if (template === 'whatsapp_list') {
      setContext({
        ...context,
        title: t('prompts:templates.whatsappList.defaultTitle'),
        description: t('prompts:templates.whatsappList.defaultDescription'),
        content: getWhatsAppListTemplate(),
        type: 'whatsapp_list'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(context);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialContext ? t('prompts:editExtraContext') : t('prompts:addExtraContext')}
    >
      {!selectedTemplate && !initialContext ? (
        <ExtraContextTemplateSelector onSelect={handleTemplateSelect} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('prompts:title')}
            </label>
            <input
              type="text"
              value={context.title}
              onChange={(e) => setContext({ ...context, title: e.target.value })}
              className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('prompts:description')}
            </label>
            <textarea
              value={context.description}
              onChange={(e) => setContext({ ...context, description: e.target.value })}
              className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('prompts:content')}
            </label>
            <textarea
              value={context.content}
              onChange={(e) => setContext({ ...context, content: e.target.value })}
              className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              rows={12}
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {t('common:cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('common:save')
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ExtraContextModal; 