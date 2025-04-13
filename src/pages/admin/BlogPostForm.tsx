import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Globe } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useAuthContext } from '../../contexts/AuthContext';
import { useBlog, BlogCategory, BlogTag } from '../../hooks/useBlog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import ContentEditor from '../../components/prompts/ContentEditor';
import { Badge } from '../../components/ui/Badge';

// Interface para o formulário
interface FormState {
  slug: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  translations: {
    [key: string]: {
      title: string;
      excerpt: string;
      content: string;
      image_url: string;
      seo_title: string;
      seo_description: string;
    }
  };
  categories: string[];
  tags: string[];
}

const handleInputChange = (
  field: keyof FormState, 
  value: string | boolean | string[], 
  setFormState: React.Dispatch<React.SetStateAction<FormState>>
) => {
  setFormState(prev => ({
    ...prev,
    [field]: value
  }));
};

const handleTranslationChange = (
  language: string, 
  field: string, 
  value: string,
  setFormState: React.Dispatch<React.SetStateAction<FormState>>
) => {
  setFormState(prev => ({
    ...prev,
    translations: {
      ...prev.translations,
      [language]: {
        ...prev.translations[language],
        [field]: value
      }
    }
  }));
};

const BlogPostForm: React.FC = () => {
  const { t } = useTranslation(['common', 'blog']);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuthContext();
  const toast = useToast();
  const isEditMode = !!id;
  const blog = useBlog();
  
  // Estados do formulário
  const [activeTab, setActiveTab] = useState('content');
  const [activeLanguage, setActiveLanguage] = useState('pt');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    slug: '',
    status: 'draft',
    featured: false,
    translations: {
      pt: {
        title: '',
        excerpt: '',
        content: '',
        image_url: '',
        seo_title: '',
        seo_description: ''
      },
      en: {
        title: '',
        excerpt: '',
        content: '',
        image_url: '',
        seo_title: '',
        seo_description: ''
      },
      es: {
        title: '',
        excerpt: '',
        content: '',
        image_url: '',
        seo_title: '',
        seo_description: ''
      }
    },
    categories: [],
    tags: []
  });
  
  // Buscar dados usando React Query
  const { data: categoriesData = [] } = blog.useCategoriesQuery(activeLanguage);
  const { data: tagsData = [] } = blog.useTagsQuery(activeLanguage);
  const { data: postData, isLoading: isPostLoading } = blog.usePostQuery(id || '', activeLanguage);
  
  // Mutations para criar/atualizar post
  const createPostMutation = blog.useCreatePostMutation();
  const updatePostMutation = blog.useUpdatePostMutation();
  
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
  
  // Preencher o formulário com dados do post em modo de edição
  useEffect(() => {
    if (isEditMode && postData) {
      const updatedTranslations: FormState['translations'] = { ...formState.translations };
      
      // Preencher traduções existentes
      postData.translations.forEach(translation => {
        const lang = translation.language;
        updatedTranslations[lang] = {
          title: translation.title || '',
          excerpt: translation.excerpt || '',
          content: translation.content || '',
          image_url: translation.image_url || '',
          seo_title: translation.seo_title || '',
          seo_description: translation.seo_description || ''
        };
      });
      
      setFormState({
        slug: postData.slug || '',
        status: postData.status || 'draft',
        featured: postData.featured || false,
        translations: updatedTranslations,
        categories: postData.categories?.map(c => c.id) || [],
        tags: postData.tags?.map(t => t.id) || []
      });
    }
  }, [isEditMode, postData]);
  
  const handleStatusChange = (status: 'draft' | 'published' | 'archived') => {
    setFormState(prev => ({
      ...prev,
      status
    }));
  };
  
  const handleFeaturedChange = (featured: boolean) => {
    setFormState(prev => ({
      ...prev,
      featured
    }));
  };
  
  const handleCategoryToggle = (categoryId: string) => {
    const categories = [...formState.categories];
    const index = categories.indexOf(categoryId);
    
    if (index > -1) {
      categories.splice(index, 1);
    } else {
      categories.push(categoryId);
    }
    
    setFormState(prev => ({
      ...prev,
      categories
    }));
  };
  
  const handleTagToggle = (tagId: string) => {
    const tags = [...formState.tags];
    const index = tags.indexOf(tagId);
    
    if (index > -1) {
      tags.splice(index, 1);
    } else {
      tags.push(tagId);
    }
    
    setFormState(prev => ({
      ...prev,
      tags
    }));
  };
  
  const handleSavePost = async () => {
    try {
      setIsSubmitting(true);
      
      // Validar formulário
      const currentTranslation = formState.translations[activeLanguage];
      if (!currentTranslation.title) {
        throw new Error(t('blog:titleRequired'));
      }
      
      if (!currentTranslation.excerpt) {
        throw new Error(t('blog:excerptRequired'));
      }
      
      if (!currentTranslation.content) {
        throw new Error(t('blog:contentRequired'));
      }
      
      if (isEditMode && id) {
        // Atualizar post existente
        await updatePostMutation.mutateAsync({
          id,
          slug: formState.slug,
          status: formState.status,
          featured: formState.featured,
          translation: {
            language: activeLanguage,
            title: formState.translations[activeLanguage].title,
            excerpt: formState.translations[activeLanguage].excerpt,
            content: formState.translations[activeLanguage].content,
            image_url: formState.translations[activeLanguage].image_url,
            seo_title: formState.translations[activeLanguage].seo_title,
            seo_description: formState.translations[activeLanguage].seo_description
          }
        });
      } else {
        // Criar novo post
        await createPostMutation.mutateAsync({
          slug: formState.slug,
          status: formState.status,
          featured: formState.featured,
          translation: {
            language: activeLanguage,
            title: formState.translations[activeLanguage].title,
            excerpt: formState.translations[activeLanguage].excerpt,
            content: formState.translations[activeLanguage].content,
            image_url: formState.translations[activeLanguage].image_url,
            seo_title: formState.translations[activeLanguage].seo_title,
            seo_description: formState.translations[activeLanguage].seo_description
          }
        });
      }
      
      // Navegar de volta para a lista de posts
      navigate('/app/admin/blog');
    } catch (error: unknown) {
      toast.show({
        title: t('common:error'),
        description: error instanceof Error ? error.message : t('blog:errorSavingPost'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Se estiver carregando o post em modo de edição, mostrar loading
  if (isEditMode && isPostLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/app/admin/blog')}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? t('blog:editPost') : t('blog:createPost')}
          </h1>
          
          {/* Status do post */}
          {formState.status === 'draft' && (
            <Badge variant="secondary" className="ml-2">{t('blog:status.draft')}</Badge>
          )}
          {formState.status === 'published' && (
            <Badge variant="default" className="ml-2">{t('blog:status.published')}</Badge>
          )}
          {formState.status === 'archived' && (
            <Badge variant="outline" className="ml-2">{t('blog:status.archived')}</Badge>
          )}
        </div>
        
        <div className="flex gap-4">
          <div className="flex gap-2 items-center">
            <Globe size={16} className="text-gray-500 dark:text-gray-400" />
            <select
              value={activeLanguage}
              onChange={(e) => setActiveLanguage(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-2 py-1 text-sm"
            >
              <option value="pt">{t('common:languages.pt')}</option>
              <option value="en">{t('common:languages.en')}</option>
              <option value="es">{t('common:languages.es')}</option>
            </select>
          </div>
          
          <button
            onClick={handleSavePost}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {t('common:save')}
          </button>
        </div>
      </div>
      
      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
          <TabsTrigger value="content">{t('blog:content')}</TabsTrigger>
          <TabsTrigger value="settings">{t('blog:settings')}</TabsTrigger>
          <TabsTrigger value="seo">{t('blog:seo')}</TabsTrigger>
        </TabsList>
        
        {/* Conteúdo */}
        <TabsContent value="content" className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('blog:title')}
              </label>
              <Input
                value={formState.translations[activeLanguage].title}
                onChange={(e) => handleTranslationChange(activeLanguage, 'title', e.target.value, setFormState)}
                placeholder={t('blog:titlePlaceholder')}
                className="w-full"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('blog:excerpt')}
              </label>
              <Textarea
                value={formState.translations[activeLanguage].excerpt}
                onChange={(e) => handleTranslationChange(activeLanguage, 'excerpt', e.target.value, setFormState)}
                placeholder={t('blog:excerptPlaceholder')}
                className="w-full resize-y"
                rows={3}
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('blog:content')}
              </label>
              <ContentEditor
                content={formState.translations[activeLanguage].content}
                onChange={(value) => handleTranslationChange(activeLanguage, 'content', value, setFormState)}
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('blog:imageUrl')}
              </label>
              <Input
                value={formState.translations[activeLanguage].image_url}
                onChange={(e) => handleTranslationChange(activeLanguage, 'image_url', e.target.value, setFormState)}
                placeholder={t('blog:imageUrlPlaceholder')}
                className="w-full"
              />
              {formState.translations[activeLanguage].image_url && (
                <div className="mt-2 max-w-md">
                  <img 
                    src={formState.translations[activeLanguage].image_url} 
                    alt={formState.translations[activeLanguage].title}
                    className="w-full h-auto rounded-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Error';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* Configurações */}
        <TabsContent value="settings" className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('blog:slug')}
              </label>
              <Input
                value={formState.slug}
                onChange={(e) => handleInputChange('slug', e.target.value, setFormState)}
                placeholder={t('blog:slugPlaceholder')}
                className="w-full"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('blog:slugHelp')}
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('blog:status.label')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleStatusChange('draft')}
                  className={`py-2 px-4 rounded-md border text-center ${
                    formState.status === 'draft'
                      ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 font-medium'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {t('blog:status.draft')}
                </button>
                <button
                  onClick={() => handleStatusChange('published')}
                  className={`py-2 px-4 rounded-md border text-center ${
                    formState.status === 'published'
                      ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 font-medium'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {t('blog:status.published')}
                </button>
                <button
                  onClick={() => handleStatusChange('archived')}
                  className={`py-2 px-4 rounded-md border text-center ${
                    formState.status === 'archived'
                      ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 font-medium'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {t('blog:status.archived')}
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formState.featured}
                  onChange={(e) => handleFeaturedChange(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:focus:ring-blue-400"
                />
                <label htmlFor="featured" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  {t('blog:featured')}
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('blog:featuredHelp')}
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('blog:categoriesTitle')}
              </label>
              <div className="flex flex-wrap gap-2">
                {categoriesData.map((category: BlogCategory) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryToggle(category.id)}
                    className={`py-1 px-3 rounded-full text-sm ${
                      formState.categories.includes(category.id)
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('blog:tagsTitle')}
              </label>
              <div className="flex flex-wrap gap-2">
                {tagsData.map((tag: BlogTag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    className={`py-1 px-3 rounded-full text-sm ${
                      formState.tags.includes(tag.id)
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* SEO */}
        <TabsContent value="seo" className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('blog:seoTitle')}
              </label>
              <Input
                value={formState.translations[activeLanguage].seo_title}
                onChange={(e) => handleTranslationChange(activeLanguage, 'seo_title', e.target.value, setFormState)}
                placeholder={t('blog:seoTitlePlaceholder')}
                className="w-full"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('blog:seoTitleHelp')}
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('blog:seoDescription')}
              </label>
              <Textarea
                value={formState.translations[activeLanguage].seo_description}
                onChange={(e) => handleTranslationChange(activeLanguage, 'seo_description', e.target.value, setFormState)}
                placeholder={t('blog:seoDescriptionPlaceholder')}
                className="w-full resize-y"
                rows={3}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('blog:seoDescriptionHelp')}
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                {t('blog:seoPreview')}
              </h3>
              <div className="mb-1 text-blue-600 dark:text-blue-400 text-xl truncate">
                {formState.translations[activeLanguage].seo_title || formState.translations[activeLanguage].title || t('blog:untitled')}
              </div>
              <div className="text-green-700 dark:text-green-500 text-sm">
                {window.location.origin}/blog/{formState.slug || 'post-slug'}
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mt-1">
                {formState.translations[activeLanguage].seo_description || formState.translations[activeLanguage].excerpt || t('blog:noDescription')}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BlogPostForm; 