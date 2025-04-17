import React from 'react';
import { PublicLayout } from '../../../layouts/PublicLayout';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Share2 } from 'lucide-react';

interface ResourceLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  imageUrl?: string;
  type: string;
  downloadUrl?: string;
  relatedResources?: Array<{
    title: string;
    link: string;
  }>;
}

export function ResourceLayout({
  children,
  title,
  description,
  imageUrl,
  type,
  downloadUrl,
  relatedResources
}: ResourceLayoutProps) {
  const { t } = useTranslation('resources');

  const shareResource = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        text: description,
        url: window.location.href,
      })
      .catch((error) => console.log('Erro ao compartilhar', error));
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert(t('linkCopied')))
        .catch((error) => console.log('Erro ao copiar link', error));
    }
  };

  return (
    <PublicLayout>
      <div className="pt-4 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            
            {/* Breadcrumb e navegação */}
            <div className="my-6">
              <Link 
                to="/resources" 
                className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t('backToResources')}
              </Link>
            </div>

            {/* Cabeçalho do recurso */}
            <div className="mb-10">
              <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-full mb-3">
                {type}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                {title}
              </h1>
              {description && (
                <p className="text-xl text-gray-700 dark:text-gray-300 mb-6">
                  {description}
                </p>
              )}
              
              {/* Imagem principal */}
              {imageUrl && (
                <div className="w-full rounded-lg overflow-hidden mb-8">
                  <img 
                    src={imageUrl} 
                    alt={title}
                    className="w-full h-auto object-cover" 
                  />
                </div>
              )}
              
              {/* Ações */}
              <div className="flex flex-wrap gap-3 mb-8">
                {downloadUrl && (
                  <a 
                    href={downloadUrl}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300"
                    download
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('downloadResource')}
                  </a>
                )}
                <button 
                  onClick={shareResource}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {t('shareResource')}
                </button>
              </div>
            </div>
            
            {/* Conteúdo principal */}
            <div className="prose dark:prose-invert prose-lg max-w-none mb-12">
              {children}
            </div>
            
            {/* Recursos relacionados */}
            {relatedResources && relatedResources.length > 0 && (
              <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                  {t('relatedResources')}
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {relatedResources.map((resource, index) => (
                    <Link 
                      key={index}
                      to={resource.link}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-white dark:hover:bg-gray-700 transition-colors duration-300"
                    >
                      <h4 className="font-medium text-blue-600 dark:text-blue-400">{resource.title}</h4>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
} 