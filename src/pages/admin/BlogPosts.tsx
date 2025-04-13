import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Filter, Eye } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useAuthContext } from '../../contexts/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { useBlog, BlogPostTranslation } from '../../hooks/useBlog';

const BlogPosts: React.FC = () => {
  const { t } = useTranslation(['common', 'blog']);
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const toast = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: 'all',
    language: 'pt'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Usar o hook useBlog para gerenciar os posts
  const blog = useBlog();
  const { 
    data: postsData, 
    isLoading, 
    isError 
  } = blog.usePostsQuery({
    page: currentPage,
    pageSize: 10,
    language: filters.language,
    status: filters.status,
  });
  
  const { mutate: deletePostMutation } = blog.useDeletePostMutation();
  
  // Extrair dados dos posts e informações de paginação
  const posts = postsData?.posts || [];
  const totalPages = postsData?.totalPages || 1;
  
  // Verificar permissões de superadmin
  useEffect(() => {
    if (profile && !profile.is_superadmin) {
      navigate('/app');
      toast.show({
        title: t('common:accessDenied'),
        description: t('common:noPermission'),
        variant: 'destructive',
      });
    }
  }, [profile, navigate, toast, t]);
  
  const handleDeletePost = async (id: string) => {
    if (window.confirm(t('blog:confirmDeletePost'))) {
      deletePostMutation(id);
    }
  };
  
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };
  
  const clearFilters = () => {
    setFilters({
      status: 'all',
      language: 'pt'
    });
    setCurrentPage(1);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default">{t('blog:status.published')}</Badge>;
      case 'draft':
        return <Badge variant="secondary">{t('blog:status.draft')}</Badge>;
      case 'archived':
        return <Badge variant="outline">{t('blog:status.archived')}</Badge>;
      default:
        return null;
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-red-800 dark:text-red-200">
          <h2 className="text-xl font-bold mb-2">{t('common:error')}</h2>
          <p>{t('common:errorFetchingData')}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('blog:managePosts')}
        </h1>
        <Link
          to="/app/admin/blog/new"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center gap-2"
        >
          <Plus size={16} />
          {t('blog:newPost')}
        </Link>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <Filter size={16} />
          {t('common:filters')}
        </button>
        
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('blog:status.label')}
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
              >
                <option value="all">{t('common:all')}</option>
                <option value="published">{t('blog:status.published')}</option>
                <option value="draft">{t('blog:status.draft')}</option>
                <option value="archived">{t('blog:status.archived')}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common:language')}
              </label>
              <select
                value={filters.language}
                onChange={(e) => handleFilterChange('language', e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
              >
                <option value="pt">{t('common:languages.pt')}</option>
                <option value="en">{t('common:languages.en')}</option>
                <option value="es">{t('common:languages.es')}</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('common:clearFilters')}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {posts.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('blog:title')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('blog:status.label')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('blog:lastUpdated')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('blog:featured')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('common:actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {posts.map((post) => {
                  // Encontrar a tradução para o idioma selecionado nos filtros
                  const translation = post.translations.find(
                    (t: BlogPostTranslation) => t.language === filters.language
                  ) || post.translations[0];
                  
                  return (
                    <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {translation.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {translation.excerpt.length > 100 
                            ? `${translation.excerpt.substring(0, 100)}...` 
                            : translation.excerpt}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(post.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(post.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {post.featured ? (
                          <span className="text-green-600 dark:text-green-400">✓</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                            title={t('common:view')}
                          >
                            <Eye size={18} />
                          </a>
                          <Link
                            to={`/app/admin/blog/edit/${post.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title={t('common:edit')}
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title={t('common:delete')}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('common:pageInfo', { current: currentPage, total: totalPages })}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50"
              >
                {t('common:previous')}
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50"
              >
                {t('common:next')}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('blog:noPostsCreated')}
          </p>
          <Link
            to="/app/admin/blog/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
          >
            <Plus size={16} />
            {t('blog:createFirstPost')}
          </Link>
        </div>
      )}
    </div>
  );
};

export default BlogPosts; 