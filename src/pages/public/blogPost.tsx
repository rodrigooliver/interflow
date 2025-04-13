import { useParams, Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Calendar, User, ArrowLeft, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { useBlog } from '../../hooks/useBlog';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation('blog');
  const { usePublicPostBySlugQuery } = useBlog();
  
  // Buscar o post usando React Query
  const { 
    data: post, 
    isLoading: loading, 
    error: queryError 
  } = usePublicPostBySlugQuery(slug, i18n.language);
  
  const error = queryError ? 'Não foi possível carregar o post. Por favor, tente novamente.' : null;

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !post) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                {error || 'Post não encontrado'}
              </h2>
              <Link 
                to="/blog" 
                className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToBlog')}
              </Link>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link 
              to="/blog" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToBlog')}
            </Link>
          </div>
          
          {/* Post Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                {post.category.name}
              </span>
              <span className="mx-2">•</span>
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(post.published_at).toLocaleDateString(i18n.language, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              {post.title}
            </h1>
            
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-6">
              {post.excerpt}
            </p>
            
            <div className="flex items-center mb-6">
              <User className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Equipe Interflow</span>
            </div>
          </div>
          
          {/* Featured Image */}
          <div className="mb-8 rounded-lg overflow-hidden">
            <img 
              src={post.image_url} 
              alt={post.title}
              className="w-full h-auto" 
            />
          </div>
          
          {/* Post Content */}
          <div className="prose prose-sm max-w-none dark:prose-invert mb-8 blog-content">
            <ReactMarkdown
              components={{
                p: (props) => <p className="my-2 text-gray-800 dark:text-gray-200" {...props} />,
                h1: (props) => <h1 className="mt-4 mb-2 text-2xl font-bold text-gray-900 dark:text-white" {...props} />,
                h2: (props) => <h2 className="mt-3 mb-2 text-xl font-bold text-gray-900 dark:text-white" {...props} />,
                h3: (props) => <h3 className="mt-2 mb-1 text-lg font-bold text-gray-900 dark:text-white" {...props} />,
                ul: (props) => <ul className="pl-5 my-2 list-disc space-y-1 text-gray-800 dark:text-gray-200" {...props} />,
                ol: (props) => <ol className="pl-5 my-2 list-decimal space-y-1 text-gray-800 dark:text-gray-200" {...props} />,
                li: (props) => <li className="mb-0.5" {...props} />,
                blockquote: (props) => <blockquote className="pl-3 border-l-2 border-gray-300 dark:border-gray-600 italic my-2 text-gray-700 dark:text-gray-300" {...props} />,
                pre: (props) => <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto my-2" {...props} />,
                code: (props) => <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm text-gray-800 dark:text-gray-200" {...props} />,
                a: (props) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
                img: (props) => <img className="my-2 rounded-md max-w-full h-auto" {...props} />
              }}
            >
              {post.content || ''}
            </ReactMarkdown>
          </div>
          
          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                {t('tagsTitle')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/blog?tag=${tag.name}`}
                    className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          {/* Related Posts (futuramente) */}
        </div>
      </div>
    </PublicLayout>
  );
} 