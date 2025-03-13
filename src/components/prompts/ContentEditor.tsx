import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Maximize2, FileText } from 'lucide-react';
import MDEditor, { commands } from '@uiw/react-md-editor';

interface ContentEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({ content, onChange }) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'live'>('edit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    // Function to detect changes in fullscreen state
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // Add listeners for fullscreen events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Clean up listeners when component is unmounted
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

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
    <div className="flex-grow flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
          <FileText className="w-4 h-4 mr-2" />
          {t('prompts:form.content') || 'Conteúdo'} *
        </label>
        <div className="flex items-center space-x-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">
            {previewMode === 'edit' && t('prompts:editor.editMode', 'Edição')}
            {previewMode === 'live' && t('prompts:editor.splitMode', 'Visualização dividida')}
            {previewMode === 'preview' && t('prompts:editor.previewMode', 'Visualização')}
          </div>
          <button
            type="button"
            onClick={() => {
              setPreviewMode(prevMode => {
                if (prevMode === 'edit') return 'live';
                if (prevMode === 'live') return 'preview';
                return 'edit';
              });
            }}
            className={`p-1.5 ${
              previewMode !== 'edit' 
                ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800'
            } rounded-md transition-colors`}
            title={t('prompts:togglePreview', 'Alternar visualização')}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const editorContainer = document.querySelector('.w-md-editor');
              if (editorContainer) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  editorContainer.requestFullscreen();
                }
              }
            }}
            className={`p-1.5 ${
              isFullscreen 
                ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800'
            } rounded-md transition-colors`}
            title={t('prompts:toggleFullscreen', 'Alternar tela cheia')}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="relative flex-grow flex flex-col min-h-0" style={{ minHeight: '350px' }}>
        <MDEditor
          value={content}
          onChange={(value) => onChange(value || '')}
          height="100%"
          preview={previewMode}
          className="w-full h-full border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors"
          data-color-mode={colorMode}
          commands={[
            commands.bold,
            commands.italic,
            commands.strikethrough,
            commands.hr,
            commands.title,
            commands.divider,
            commands.link,
            commands.quote,
            commands.code,
            commands.codeBlock,
            commands.image,
            commands.divider,
            commands.unorderedListCommand,
            commands.orderedListCommand,
            commands.checkedListCommand,
            commands.divider,
            commands.help
          ]}
          extraCommands={[]}
        />
        {previewMode !== 'preview' && (
          <div className="absolute bottom-3 right-3 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-md z-10">
            {content.length} {t('prompts:form.characters', 'caracteres')}
          </div>
        )}
      </div>
      <div className="flex flex-col space-y-1 mt-1 mb-4">
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