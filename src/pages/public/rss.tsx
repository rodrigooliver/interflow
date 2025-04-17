import React from 'react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { useBlog } from '../../hooks/useBlog';
import { useTranslation } from 'react-i18next';

export default function RSS() {
  const { i18n } = useTranslation(['common', 'blog']);
  const { usePublicPostsQuery } = useBlog();
  
  // Buscar posts reais do blog com React Query
  const { 
    data: posts = [], 
    isLoading: loading, 
    error: queryError 
  } = usePublicPostsQuery(i18n.language);
  
  const error = queryError ? 'Não foi possível carregar o feed. Tente novamente mais tarde.' : null;

  // Função para formatar a data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  // Função para gerar o XML do feed RSS
  const generateRSSXML = () => {
    const xmlItems = posts.map(item => `
      <item>
        <title>${item.title}</title>
        <link>https://interflow.chat/blog/${item.slug}</link>
        <pubDate>${new Date(item.published_at).toUTCString()}</pubDate>
        <description><![CDATA[${item.excerpt}]]></description>
        ${item.image_url ? `<enclosure url="${item.image_url}" type="image/jpeg" />` : ''}
      </item>
    `).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>Interflow - Blog de Atendimento ao Cliente e Automação</title>
        <link>https://interflow.chat</link>
        <description>As últimas novidades sobre atendimento ao cliente, automação e tecnologias para comunicação com clientes.</description>
        <language>pt-br</language>
        <atom:link href="https://interflow.chat/rss" rel="self" type="application/rss+xml" />
        ${xmlItems}
      </channel>
    </rss>`;

    return xml;
  };

  // Função para baixar o arquivo XML
  const downloadRSS = () => {
    const xml = generateRSSXML();
    const blob = new Blob([xml], { type: 'application/rss+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interflow-feed.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <PublicLayout>
      <div className="pt-4 pb-16">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">
                  Feed RSS do Interflow
                </h1>
                <p className="text-lg text-gray-700 dark:text-gray-300">
                  Mantenha-se atualizado com as últimas novidades e artigos
                </p>
              </div>
              
              <div className="mt-4 md:mt-0 space-x-4">
                <button 
                  onClick={downloadRSS}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md transition-colors duration-300 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 0H5v10h10V5z" clipRule="evenodd" />
                    <path d="M4 6h12M4 10h12M4 14h12" strokeWidth="2" stroke="currentColor" />
                  </svg>
                  Baixar XML
                </button>
                
                <a 
                  href="https://feedly.com/i/subscription/feed/https://interflow.chat/rss" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors duration-300 inline-flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  Adicionar ao Feedly
                </a>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md mb-8">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                Como usar este feed RSS
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Um feed RSS permite que você acompanhe nossas atualizações sem precisar visitar o site regularmente. 
                Use qualquer leitor de RSS, como Feedly, Inoreader ou NetNewsWire, para assinar este feed.
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md font-mono text-sm">
                <p className="mb-2 font-semibold text-gray-800 dark:text-gray-200">URL do Feed:</p>
                <p className="text-blue-600 dark:text-blue-400 break-all">https://interflow.chat/rss</p>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-md">
                {error}
              </div>
            ) : (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Publicações Recentes
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {posts.map((post) => (
                    <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                      {post.image_url && (
                        <div className="w-full pt-[56.25%] relative overflow-hidden">
                          <img 
                            src={post.image_url} 
                            alt={post.title}
                            className="absolute top-0 left-0 w-full h-full object-cover" 
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {formatDate(post.published_at)}
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                          {post.title}
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                          {post.excerpt}
                        </p>
                        <a 
                          href={`/blog/${post.slug}`} 
                          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300"
                        >
                          Ler artigo
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                Por que assinar nosso feed RSS?
              </h2>
              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-2">
                <li>Receba notificações automáticas sobre novos conteúdos</li>
                <li>Economize tempo sem precisar verificar o site regularmente</li>
                <li>Acompanhe apenas os tópicos que interessam a você</li>
                <li>Mantenha-se atualizado sobre as últimas tendências em atendimento e automação</li>
                <li>Acesse o conteúdo no seu próprio ritmo, quando for conveniente</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </PublicLayout>
  );
} 