import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListFilter, FilePlus } from 'lucide-react';

interface TemplateOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface ExtraContextTemplateSelectorProps {
  onSelect: (template: string) => void;
}

const ExtraContextTemplateSelector: React.FC<ExtraContextTemplateSelectorProps> = ({ onSelect }) => {
  const { t } = useTranslation(['prompts']);

  const templates: TemplateOption[] = [
    {
      id: 'whatsapp_list',
      title: t('prompts:templates.whatsappList.title'),
      description: t('prompts:templates.whatsappList.description'),
      icon: <ListFilter className="w-8 h-8 text-green-600" />
    },
    {
      id: 'blank',
      title: t('prompts:templates.blank.title'),
      description: t('prompts:templates.blank.description'),
      icon: <FilePlus className="w-8 h-8 text-blue-600" />
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-4">
        {t('prompts:selectTemplate')}
      </h3>
      <div className="grid grid-cols-1 gap-4">
        {templates.map((template) => (
          <button
            key={template.id}
            className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left flex items-start gap-4"
            onClick={() => onSelect(template.id)}
          >
            <div className="flex-shrink-0">
              {template.icon}
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {template.title}
              </h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {template.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExtraContextTemplateSelector; 