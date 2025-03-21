import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Maximize2 } from 'lucide-react';
import MDEditor, { commands } from '@uiw/react-md-editor';

interface ContentEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({ content, onChange }) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'live'>('edit');
  const [isExpanded, setIsExpanded] = useState(false);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    // Function to detect theme changes
    const detectThemeChange = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setColorMode(isDarkMode ? 'dark' : 'light');
    };

    // Observer to detect changes to the 'dark' class on the HTML element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          detectThemeChange();
        }
      });
    });

    // Start observation
    observer.observe(document.documentElement, { attributes: true });

    // Detect initial theme
    detectThemeChange();

    // Clean up observer when component is unmounted
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`flex-grow flex flex-col min-h-0 ${isExpanded ? 'fixed inset-0 z-50 bg-white dark:bg-gray-800' : ''}`}>
      <div className={`relative flex-grow flex flex-col min-h-0 ${isExpanded ? 'h-screen' : ''}`} style={{ minHeight: isExpanded ? '100vh' : '350px' }}>
        <MDEditor
          value={content}
          onChange={(value) => onChange(value || '')}
          height="100%"
          preview={previewMode}
          className="w-full h-full border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors"
          data-color-mode={colorMode}
          commands={[
            {
              ...commands.bold,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.italic,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.strikethrough,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.hr,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.title,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            commands.divider,
            {
              ...commands.link,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.quote,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.code,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.codeBlock,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.image,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            commands.divider,
            {
              ...commands.unorderedListCommand,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.orderedListCommand,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.checkedListCommand,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            commands.divider,
            {
              name: 'preview',
              keyCommand: 'preview',
              buttonProps: { 
                'aria-label': t('prompts:togglePreview', 'Alternar visualização'),
                className: `p-1.5 rounded-md transition-colors ${
                  previewMode !== 'edit'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`
              },
              icon: (
                <Eye className="w-4 h-4" />
              ),
              execute: () => {
                setPreviewMode(prevMode => {
                  if (prevMode === 'edit') return 'live';
                  if (prevMode === 'live') return 'preview';
                  return 'edit';
                });
                return true;
              }
            },
            {
              name: 'expand',
              keyCommand: 'expand',
              buttonProps: { 
                'aria-label': t('prompts:toggleFullscreen', 'Alternar tela cheia'),
                className: `p-1.5 rounded-md transition-colors ${
                  isExpanded
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`
              },
              icon: (
                <Maximize2 className="w-4 h-4" />
              ),
              execute: () => {
                setIsExpanded(!isExpanded);
                return true;
              }
            },
            commands.divider,
            {
              ...commands.help,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            }
          ]}
          extraCommands={[]}
        />
        {previewMode !== 'preview' && (
          <div className="absolute bottom-3 right-3 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-md z-10">
            {content.length} {t('prompts:form.characters', 'caracteres')}
          </div>
        )}
      </div>
      <div className="flex-col space-y-1 mt-1 mb-4 hidden sm:flex">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('prompts:form.contentHelp', 'Este é o prompt de sistema que define o comportamento da IA.')}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          <span className="font-medium">{t('prompts:form.tip', 'Dica')}:</span> {t('prompts:form.markdownTip', 'Você pode usar formatação Markdown como')} <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">**{t('prompts:form.bold', 'negrito')}**</code>, <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">*{t('prompts:form.italic', 'itálico')}*</code>, <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">`{t('prompts:form.code', 'código')}`</code>, {t('prompts:form.andMore', 'listas e muito mais')}.
        </p>
      </div>
    </div>
  );
};

export default ContentEditor; 