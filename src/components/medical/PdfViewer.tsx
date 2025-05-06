import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';
import { Download, X, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configuração necessária para o worker do PDF
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PdfViewerProps {
  url: string;
  filename: string;
  onClose: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url, filename, onClose }) => {
  const { t } = useTranslation(['common', 'medical']);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Erro ao carregar PDF:', error);
    setError(t('medical:errorLoadingPdf'));
    setIsLoading(false);
  };

  const handlePreviousPage = () => {
    setPageNumber(page => Math.max(page - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber(page => Math.min(page + 1, numPages || page));
  };

  const handleDownload = () => {
    try {
      console.log('Iniciando download do PDF:', filename);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-lg shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {filename}
            </h3>
            {numPages && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('common:pageOf', { current: pageNumber, total: numPages })}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              title={t('common:download')}
            >
              <Download className="w-5 h-5" />
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
        <div className="relative w-full h-[calc(90vh-64px)] bg-gray-100 dark:bg-gray-900 overflow-auto">
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

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-4">
                <p className="mb-4 text-red-600 dark:text-red-400">
                  {error}
                </p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
                >
                  {t('common:downloadPdf')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center">
                    <Loader className="w-8 h-8 text-amber-500 animate-spin" />
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-lg"
                  width={Math.min(window.innerWidth * 0.8, 800)}
                />
              </Document>

              {numPages && numPages > 1 && (
                <div className="flex items-center justify-center mt-4 space-x-4">
                  <button
                    onClick={handlePreviousPage}
                    disabled={pageNumber <= 1}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {pageNumber} / {numPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={pageNumber >= numPages}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfViewer; 