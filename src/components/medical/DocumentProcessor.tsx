import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, X, Loader } from 'lucide-react';
import { EmrDocumentTemplate } from '../../types/medicalRecord';
import DocumentViewer from './DocumentViewer';
import PdfViewer from './PdfViewer';
import HtmlToPdfProcessor from './HtmlToPdfProcessor';
import api from '../../lib/api';
import { useAuthContext } from '../../contexts/AuthContext';
import { AxiosError } from 'axios';

interface ViewerData {
  url: string;
  filename: string;
  format: string;
}

interface DocumentProcessorProps {
  template: EmrDocumentTemplate;
  variables: Record<string, unknown>;
  onClose: () => void;
}

const DocumentProcessor: React.FC<DocumentProcessorProps> = ({ template, variables, onClose }) => {
  const { t } = useTranslation(['common', 'medical']);
  const { currentOrganizationMember } = useAuthContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewerData, setViewerData] = useState<ViewerData | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processDocument = async (format: 'html' | 'pdf' | 'docx') => {
    if (!currentOrganizationMember) {
      setError('Usuário não autenticado');
      return;
    }

    try {
      setError(null);
      setViewerData(null);
      setHtmlContent(null);
      setIsProcessing(true);
      
      console.log('Iniciando processamento:', format);
      
      // Se for PDF, precisamos obter o HTML primeiro e renderizar no frontend
      const requestFormat = format === 'pdf' ? 'html' : format;
      
      // Faz a requisição para o backend
      const response = await api.post(
        `/api/${currentOrganizationMember.organization.id}/medical/documents/process`,
        {
          template_id: template.id,
          variables,
          format: requestFormat,
        },
        {
          responseType: 'blob',
          headers: {
            'Accept': requestFormat === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/html'
          }
        }
      );

      console.log('Resposta recebida:', {
        status: response.status,
        contentType: response.headers['content-type'],
        contentDisposition: response.headers['content-disposition']
      });

      // Verifica se a resposta é válida
      if (!(response.data instanceof Blob)) {
        throw new Error('Resposta inválida do servidor');
      }

      const contentType = response.headers['content-type'];
      
      // Verifica se é uma resposta de erro em JSON
      if (contentType?.includes('application/json')) {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || 'Erro desconhecido');
      }

      // Extrai o nome do arquivo
      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      let filename = filenameMatch?.[1] || `documento.${format}`;
      
      // Ajusta a extensão do arquivo para PDF se necessário
      if (format === 'pdf' && filename.endsWith('.html')) {
        filename = filename.replace('.html', '.pdf');
      }

      // Cria o blob e a URL
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      console.log('Documento processado:', { filename, format: requestFormat, url });

      // Para DOCX, faz download direto
      if (format === 'docx') {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return;
      }

      // Se for PDF, converte o HTML para PDF no frontend
      if (format === 'pdf') {
        // Converte o Blob para texto (HTML)
        const htmlText = await blob.text();
        setHtmlContent(htmlText);
        console.log('HTML recebido para conversão em PDF:', { size: htmlText.length });
      } else {
        // Adiciona estilo de fundo branco ao HTML
        const htmlText = await blob.text();
        const htmlWithBackground = `
          <style>
            body, html {
              font-family: sans-serif;
              background-color: white !important;
              padding: 20px;
              margin: 0;
            }
            p {
              margin: 0;
              line-height: 1.2;
              font-size: 12pt;
            }
            p:empty {
              margin-bottom: 16px;
              height: 16px;
            }
          </style>
          ${htmlText}`;
        const modifiedBlob = new Blob([htmlWithBackground], { type: contentType });
        const modifiedUrl = window.URL.createObjectURL(modifiedBlob);

        setViewerData({
          url: modifiedUrl,
          filename,
          format
        });
      }
      
    } catch (error) {
      console.error('Erro ao processar documento:', {
        error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        type: error instanceof Blob ? 'Blob' : typeof error,
        response: (error as AxiosError)?.response,
        status: (error as AxiosError)?.response?.status
      });
      
      // Verifica se é um erro de rede
      if ((error as AxiosError)?.response?.status) {
        setError(`Erro no servidor (${(error as AxiosError).response?.status}): ${(error as AxiosError).response?.statusText}`);
      } else if (error instanceof Error) {
        setError(`Falha ao processar documento: ${error.message}`);
      } else {
        setError('Falha ao processar documento. Tente novamente.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseViewer = () => {
    if (viewerData?.url) {
      window.URL.revokeObjectURL(viewerData.url);
    }
    setViewerData(null);
    setHtmlContent(null);
    setError(null);
  };

  // Renderiza o visualizador apropriado
  if (htmlContent) {
    return (
      <HtmlToPdfProcessor 
        htmlContent={htmlContent}
        filename={`${template.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`}
        onClose={handleCloseViewer}
      />
    );
  }

  if (viewerData) {
    if (viewerData.format === 'pdf') {
      return (
        <PdfViewer
          url={viewerData.url}
          filename={viewerData.filename}
          onClose={handleCloseViewer}
        />
      );
    }

    return (
      <DocumentViewer
        url={viewerData.url}
        filename={viewerData.filename}
        onClose={handleCloseViewer}
      />
    );
  }

  // Interface principal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('medical:generateDocument')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-100 rounded-lg dark:bg-gray-700">
            <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
              {template.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {template.description}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => processDocument('html')}
              disabled={isProcessing}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {isProcessing ? t('common:processing') : t('medical:generateHtml')}
            </button>

            <button
              onClick={() => processDocument('pdf')}
              disabled={isProcessing}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {isProcessing ? t('common:processing') : t('medical:generatePdf')}
            </button>

            <button
              onClick={() => processDocument('docx')}
              disabled={isProcessing}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {isProcessing ? t('common:processing') : t('medical:generateDocx')}
            </button>
          </div>

          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-100 rounded-md dark:bg-red-900 dark:text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentProcessor; 