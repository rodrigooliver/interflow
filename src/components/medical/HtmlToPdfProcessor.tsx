import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, Page, PDFDownloadLink, PDFViewer, StyleSheet } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import { Download, X, Loader } from 'lucide-react';

// Função para decodificar entidades HTML
const decodeHtmlEntities = (html: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
};

// Registrando fontes locais para o PDF
try {
  console.log('Iniciando registro de fontes...');
  
  // const fontPaths = {
  //   regular: '/fonts/Roboto-Regular.ttf',
  //   bold: '/fonts/Roboto-Bold.ttf',
  //   italic: '/fonts/Roboto-Italic.ttf',
  //   boldItalic: '/fonts/Roboto-BoldItalic.ttf'
  // };

  // // Registra a fonte Roboto com todas as variantes
  // Font.register({
  //   family: 'Roboto',
  //   fonts: [
  //     { src: fontPaths.regular },
  //     { src: fontPaths.bold, fontWeight: 700 },
  //     { src: fontPaths.italic, fontStyle: 'italic' },
  //     { src: fontPaths.boldItalic, fontWeight: 700, fontStyle: 'italic' }
  //   ]
  // });


  console.log('Registro de fontes concluído com sucesso');
} catch (error) {
  console.error('Erro ao registrar fontes:', error);
}

// Definindo estilos para o PDF
const styles = StyleSheet.create({
  page: {
    // fontFamily: 'Roboto',
    padding: 20,
    // fontSize: 12,
    lineHeight: 1.5
  }
});

interface HtmlToPdfProcessorProps {
  htmlContent: string;
  filename: string;
  onClose: () => void;
}

const HtmlToPdfProcessor: React.FC<HtmlToPdfProcessorProps> = ({ htmlContent, filename, onClose }) => {
  const { t } = useTranslation(['common', 'medical']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processedHtml, setProcessedHtml] = useState<string>(htmlContent);
  const [showDebug, setShowDebug] = useState(false);
  const [forceDefaultStyles, setForceDefaultStyles] = useState(false);

  // Processa o HTML para substituir fontes e melhorar a compatibilidade
  useEffect(() => {
    try {
      // Decodifica entidades HTML no conteúdo
      const decodedHtml = decodeHtmlEntities(htmlContent);
      
      // Extrai os estilos do documento original
      const styleMatch = decodedHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      const extractedStyles = styleMatch ? styleMatch[1] : '';
      console.log('Extracted Styles:', extractedStyles);
      
      // Prepara estilos adicionais apenas se não existirem no documento original
      // const additionalStyles = '';


      const additionalStyles = `
          p {
            margin: 0;
            line-height: 1.2;
            font-size: 12pt;
          }
          p:empty {
            margin-bottom: 16px;
            height: 16px;
          }
        `;
      
      // Remove DOCTYPE
      let processed = decodedHtml.replace(/<!DOCTYPE[^>]*>/i, '');
      
      // Processa o HTML para manter apenas o conteúdo do body
      const bodyContentMatch = processed.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyContentMatch && bodyContentMatch[1]) {
        processed = bodyContentMatch[1].trim();
      } else {
        processed = processed
          .replace(/<html[^>]*>|<\/html>/gi, '')
          .replace(/<head>[\s\S]*?<\/head>/gi, '');
      }
      
      // Substitui Arial e Helvetica por Roboto
      const processedStyles = extractedStyles
        .replace(/font-family:\s*Arial/gi, 'font-family: Roboto')
        .replace(/font-family:\s*"Arial"/gi, 'font-family: "Roboto"')
        .replace(/font-family:\s*'Arial'/gi, "font-family: 'Roboto'")
        .replace(/Arial,\s*sans-serif/gi, 'Roboto, sans-serif')
        .replace(/font-family:\s*"Helvetica-neue"/gi, 'font-family: "Helvetica"')
        .replace(/font-family:\s*'Helvetica-neue'/gi, "font-family: 'Helvetica'")
        .replace(/Helvetica-neue,\s*sans-serif/gi, 'Helvetica, sans-serif')
        .replace(/font-family:\s*Helvetica-neue/gi, 'font-family: Helvetica');
      
      // Cria um HTML com os estilos originais preservados
      const htmlWithStyles = `
        <div id="document-container">
          <style>
            ${processedStyles}
            ${additionalStyles}
            /* Ajustes mínimos de margem */
            .content > p, .content > h4 {
              margin-bottom: 10px;
            }
          </style>
          ${processed}
        </div>
      `;
      
      console.log('HTML processado:', {
        original: htmlContent.length,
        processed: htmlWithStyles.length,
        extractedStyles: processedStyles.length > 0,
        hasAdditionalStyles: additionalStyles.length > 0,
        forceDefaultStyles,
        content: htmlWithStyles.substring(0, 200) + '...'
      });
      
      setProcessedHtml(htmlWithStyles);
      console.log('HTML processado para compatibilidade com react-pdf');
    } catch (err) {
      console.error('Erro ao processar HTML:', err);
      handleRenderError(err as Error);
    }
  }, [htmlContent, forceDefaultStyles]);

  // Trata erros na renderização
  const handleRenderError = (error: Error) => {
    console.error("Erro ao renderizar PDF:", error);
    setError(t('medical:errorGeneratingPdf'));
    setIsLoading(false);
  };

  // Componente para a renderização do PDF
  const PdfDocument = () => {
    try {
      return (
        <Document>
          <Page 
            size="A4" 
            style={styles.page}
            wrap={true}
          >
            <Html>{processedHtml}</Html>
          </Page>
        </Document>
      );
    } catch (err) {
      handleRenderError(err as Error);
      return null;
    }
  };

  useEffect(() => {
    // Tempo de carregamento para renderização
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-lg shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {filename}
          </h3>
          <div className="flex items-center space-x-2">
            {!isLoading && !error && (
              <>
                <button
                  onClick={() => setForceDefaultStyles(!forceDefaultStyles)}
                  className={`p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 ${forceDefaultStyles ? 'bg-blue-100 rounded-md dark:bg-blue-900' : ''}`}
                  title={forceDefaultStyles ? "Usar estilos originais" : "Forçar estilos padrão"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <PDFDownloadLink 
                  document={<PdfDocument />} 
                  fileName={filename}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {({ loading, error: downloadError }) => {
                    if (downloadError) {
                      console.error('Erro ao preparar download:', downloadError);
                      return <Download className="w-5 h-5 text-red-500" />;
                    }
                    
                    return loading ? 
                      <Loader className="w-5 h-5 animate-spin" /> : 
                      <Download className="w-5 h-5" />;
                  }}
                </PDFDownloadLink>
              </>
            )}
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
        <div className="relative w-full h-[calc(90vh-64px)] bg-gray-100 dark:bg-gray-900">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800">
              <div className="flex flex-col items-center">
                <Loader className="w-8 h-8 mb-2 text-amber-500 animate-spin" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common:loading')}
                </span>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-4">
                <p className="mb-4 text-red-600 dark:text-red-400">
                  {error}
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
                  >
                    {t('common:back')}
                  </button>
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    {showDebug ? 'Ocultar HTML' : 'Mostrar HTML'}
                  </button>
                </div>
                
                {showDebug && (
                  <div className="mt-4 max-h-96 overflow-auto text-left bg-gray-800 text-gray-200 p-4 rounded">
                    <h4 className="mb-2 font-bold">HTML Processado:</h4>
                    <pre className="text-xs whitespace-pre-wrap break-words">
                      {processedHtml}
                    </pre>
                    <h4 className="mt-4 mb-2 font-bold">HTML Original:</h4>
                    <pre className="text-xs whitespace-pre-wrap break-words">
                      {htmlContent}
                    </pre>
                  </div>
                )}
                
              </div>
            </div>
          ) : (
            <PDFViewer width="100%" height="100%" className="border-0">
              <PdfDocument />
            </PDFViewer>
          )}
        </div>
      </div>
    </div>
  );
};

export default HtmlToPdfProcessor; 