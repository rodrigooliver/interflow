import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X, Loader, Printer } from 'lucide-react';

interface DocumentViewerProps {
  url: string;
  filename: string;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ url, filename, onClose }) => {
  const { t } = useTranslation(['common', 'medical']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('DocumentViewer montado com URL:', url);
    return () => {
      console.log('DocumentViewer desmontado');
    };
  }, [url]);

  const handleDownload = () => {
    try {
      console.log('Iniciando download:', filename);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('Download iniciado com sucesso');
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      setError(t('medical:errorDownloadingDocument'));
    }
  };

  const handleIframeLoad = () => {
    console.log('iframe carregado');
    setIsLoading(false);
  };

  const handleIframeError = () => {
    console.error('Erro ao carregar iframe');
    setIsLoading(false);
    setError(t('medical:errorLoadingDocument'));
  };

  const handlePrint = () => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-lg shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {filename}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              title={t('common:download')}
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              title={t('common:print')}
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              title={t('common:close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative w-full h-[calc(90vh-64px)]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800">
              <div className="flex flex-col items-center">
                <Loader className="w-8 h-8 mb-2 text-amber-500 animate-spin" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common:loading')}
                </span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-red-500 dark:text-red-400 mb-2">
                  {error}
                </div>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
                >
                  {t('common:downloadInstead')}
                </button>
              </div>
            </div>
          )}

          <iframe
            src={url}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-same-origin allow-scripts allow-modals"
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer; 