import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Link } from 'react-router-dom';
import { Search, Calendar, User, ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
}

interface BlogCategory {
  id: string;
  name: string;
  count: number;
}

interface TagType {
  name: string;
}

export default function Blog() {
  const { t } = useTranslation('blog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Obter dados do arquivo de tradução
  const posts = t('posts', { returnObjects: true }) as BlogPost[];
  const categories = t('categories', { returnObjects: true }) as BlogCategory[];
  const featuredPosts = t('featuredPosts', { returnObjects: true }) as string[];
  const tags = t('tags', { returnObjects: true }) as TagType[];

  // Filtrar posts com base na pesquisa e categoria selecionada
  const filteredPosts = posts.filter((post) => {
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === null || post.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Obter posts em destaque
  const getFeaturedPosts = () => {
    return posts.filter(post => featuredPosts.includes(post.id));
  };

  // Renderizar um post individual
  const renderPost = (post: BlogPost) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="h-48 overflow-hidden">
          <img 
            src={post.imageUrl} 
            alt={post.title}
            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300" 
          />
        </div>
        <div className="p-5">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-full">
              {post.category}
            </span>
            <span className="mx-2">•</span>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {post.date}
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            {post.title}
          </h3>
          
          <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
            {post.excerpt}
          </p>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <User className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{post.author}</span>
            </div>
            
            <Link 
              to={`/blog/${post.id}`} 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('readMore')}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar post em destaque (maior)
  const renderFeaturedPost = (post: BlogPost) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 md:flex">
        <div className="md:w-1/2 h-64 md:h-auto overflow-hidden">
          <img 
            src={post.imageUrl} 
            alt={post.title}
            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300" 
          />
        </div>
        <div className="p-6 md:w-1/2 flex flex-col justify-between">
          <div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
              <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                {post.category}
              </span>
              <span className="mx-2">•</span>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {post.date}
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              {post.title}
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {post.excerpt}
            </p>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <User className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{post.author}</span>
            </div>
            
            <Link 
              to={`/blog/${post.id}`} 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('readMore')}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PublicLayout>
      <div className="pt-4 pb-8">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                {t('title')}
              </h1>
              <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                {t('intro')}
              </p>
              
              {/* Search Bar */}
              <div className="max-w-xl mx-auto relative">
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Featured Posts Section */}
            {!searchQuery && !selectedCategory && getFeaturedPosts().length > 0 && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                  {t('featuredPostsTitle')}
                </h2>
                <div className="space-y-8">
                  {getFeaturedPosts().map((post, index) => (
                    <div key={index}>
                      {renderFeaturedPost(post)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Posts */}
              <div className="lg:col-span-3">
                {searchQuery || selectedCategory ? (
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {t('searchResults', { count: filteredPosts.length })}
                    </h2>
                    {selectedCategory && (
                      <div className="flex items-center mt-2">
                        <span className="text-gray-600 dark:text-gray-400 mr-2">{t('filterByCategory')}:</span>
                        <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                          {selectedCategory}
                        </span>
                        <button 
                          onClick={() => setSelectedCategory(null)}
                          className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                    {t('latestPosts')}
                  </h2>
                )}

                {filteredPosts.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      {t('noPostsFound')}
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory(null);
                      }}
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300"
                    >
                      {t('clearFilters')}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredPosts.map((post, index) => (
                      <div key={index}>
                        {renderPost(post)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                {/* Categories */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                    {t('categoriesTitle')}
                  </h3>
                  <ul className="space-y-2">
                    {categories.map((category, index) => (
                      <li key={index}>
                        <button
                          onClick={() => setSelectedCategory(category.id)}
                          className={`flex justify-between w-full py-2 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left ${
                            selectedCategory === category.id ? 'text-blue-600 font-medium' : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span>{category.name}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm rounded-full bg-gray-100 dark:bg-gray-700 px-2">
                            {category.count}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Popular Tags */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                    {t('popularTags')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <button
                        key={index}
                        onClick={() => setSearchQuery(tag.name)}
                        className="inline-block px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PublicLayout>
  );
} 