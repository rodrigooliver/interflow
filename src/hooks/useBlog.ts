import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../contexts/AuthContext';
import { updateSitemapWithBlogPosts } from '../utils/sitemapUpdater';

// Tipos para o blog
export interface BlogPostTranslation {
  id?: string;
  post_id?: string;
  language: string;
  title: string;
  excerpt: string;
  content?: string;
  image_url?: string;
  seo_title?: string;
  seo_description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
}

export interface BlogTag {
  id: string;
  slug: string;
  name: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_id?: string;
  author_name?: string;
  author_avatar?: string;
  translations: BlogPostTranslation[];
  categories?: BlogCategory[];
  tags?: BlogTag[];
}

// Tipo para post público
export interface PublicBlogPost {
  id: string;
  slug: string;
  featured: boolean;
  published_at: string;
  title: string;
  excerpt: string;
  content?: string;
  image_url: string;
  category: {
    id: string;
    slug: string;
    name: string;
  };
  tags: {
    id: string;
    name: string;
  }[];
}

// Tipo para categoria pública com contagem
export interface PublicBlogCategory {
  id: string;
  slug: string;
  name: string;
  count: number;
}

export const useBlog = () => {
  const { t } = useTranslation(['common', 'blog']);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const isSuperAdmin = profile?.is_superadmin || false;

  // Função para buscar posts do blog
  const getPosts = async ({
    page = 1,
    pageSize = 10,
    language = 'pt',
    status = 'all',
    featured = null,
    tag = null,
    category = null
  }: {
    page?: number;
    pageSize?: number;
    language?: string;
    status?: string;
    featured?: boolean | null;
    tag?: string | null;
    category?: string | null;
  }) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('blog_posts')
      .select(`
        id,
        slug,
        status,
        featured,
        published_at,
        created_at,
        updated_at,
        author_id,
        blog_post_translations!inner (
          id,
          language,
          title,
          excerpt,
          image_url
        )
      `, { count: 'exact' })
      .eq('blog_post_translations.language', language)
      .order('updated_at', { ascending: false })
      .range(from, to);

    // Aplicar filtros adicionais
    if (status !== 'all') {
      query = query.eq('status', status);
    } else if (!isSuperAdmin) {
      // Se não for superadmin, mostrar apenas posts publicados
      query = query.eq('status', 'published');
    }

    if (featured !== null) {
      query = query.eq('featured', featured);
    }

    // Filtrar por tag se especificado
    if (tag) {
      // Primeiro buscar o ID da tag com base no slug
      const { data: tagData } = await supabase
        .from('blog_tags')
        .select('id')
        .eq('slug', tag)
        .single();
      
      if (tagData?.id) {
        // Buscar os IDs dos posts com essa tag
        const { data: taggedPosts } = await supabase
          .from('blog_post_tags')
          .select('post_id')
          .eq('tag_id', tagData.id);
        
        if (taggedPosts?.length) {
          const postIds = taggedPosts.map(p => p.post_id);
          query = query.in('id', postIds);
        }
      }
    }

    // Filtrar por categoria se especificado
    if (category) {
      // Primeiro buscar o ID da categoria com base no slug
      const { data: categoryData } = await supabase
        .from('blog_categories')
        .select('id')
        .eq('slug', category)
        .single();
      
      if (categoryData?.id) {
        // Buscar os IDs dos posts com essa categoria
        const { data: categorizedPosts } = await supabase
          .from('blog_post_categories')
          .select('post_id')
          .eq('category_id', categoryData.id);
        
        if (categorizedPosts?.length) {
          const postIds = categorizedPosts.map(p => p.post_id);
          query = query.in('id', postIds);
        }
      }
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transformar os dados para o formato esperado
    const posts: BlogPost[] = data.map(post => {
      const translations = post.blog_post_translations || [];
      return {
        ...post,
        translations: translations
      };
    });

    return {
      posts,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  };

  // Buscar um post por ID
  const getPostById = async (id: string, language = 'pt') => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        id,
        slug,
        status,
        featured,
        published_at,
        created_at,
        updated_at,
        author_id,
        blog_post_translations (
          id,
          language,
          title,
          excerpt,
          content,
          image_url,
          seo_title,
          seo_description
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    // Filtrar traduções para o idioma solicitado
    const translations = data.blog_post_translations || [];
    const preferredTranslation = translations.find(t => t.language === language) || translations[0];

    return {
      ...data,
      translations,
      currentTranslation: preferredTranslation
    } as BlogPost;
  };

  // Buscar categorias do blog
  const getCategories = async (language = 'pt') => {
    const { data, error } = await supabase
      .from('blog_categories')
      .select(`
        id,
        slug,
        blog_category_translations!inner (
          id,
          language,
          name,
          description
        )
      `)
      .eq('blog_category_translations.language', language);

    if (error) {
      throw error;
    }

    return data.map(category => ({
      id: category.id,
      slug: category.slug,
      name: category.blog_category_translations[0]?.name || '',
      description: category.blog_category_translations[0]?.description || ''
    }));
  };

  // Buscar tags do blog
  const getTags = async (language = 'pt') => {
    const { data, error } = await supabase
      .from('blog_tags')
      .select(`
        id,
        slug,
        blog_tag_translations!inner (
          id,
          language,
          name
        )
      `)
      .eq('blog_tag_translations.language', language);

    if (error) {
      throw error;
    }

    return data.map(tag => ({
      id: tag.id,
      slug: tag.slug,
      name: tag.blog_tag_translations[0]?.name || ''
    }));
  };

  // Criar novo post
  const createPost = async (postData: Partial<BlogPost> & { translation: BlogPostTranslation }) => {
    if (!isSuperAdmin) {
      throw new Error(t('common:noPermission'));
    }

    const { translation, ...post } = postData;
    
    // Gerar slug se não fornecido
    if (!post.slug) {
      post.slug = translation.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-');
    }

    // Etapa 1: Inserir o post
    const { data: newPost, error: postError } = await supabase
      .from('blog_posts')
      .insert({
        slug: post.slug,
        status: post.status || 'draft',
        featured: post.featured || false,
        published_at: post.status === 'published' ? new Date().toISOString() : null
      })
      .select('id')
      .single();

    if (postError) {
      throw postError;
    }

    // Etapa 2: Inserir a tradução
    const { error: translationError } = await supabase
      .from('blog_post_translations')
      .insert({
        post_id: newPost.id,
        language: translation.language,
        title: translation.title,
        excerpt: translation.excerpt,
        content: translation.content || '',
        image_url: translation.image_url,
        seo_title: translation.seo_title || translation.title,
        seo_description: translation.seo_description || translation.excerpt
      });

    if (translationError) {
      // Se falhar na criação da tradução, tenta remover o post para não deixar órfão
      await supabase.from('blog_posts').delete().eq('id', newPost.id);
      throw translationError;
    }

    return newPost.id;
  };

  // Atualizar post existente
  const updatePost = async (
    id: string, 
    postData: Partial<BlogPost> & { translation?: Partial<BlogPostTranslation> }
  ) => {
    if (!isSuperAdmin) {
      throw new Error(t('common:noPermission'));
    }

    const { translation, ...postUpdates } = postData;
    
    // Atualizar post
    if (Object.keys(postUpdates).length > 0) {
      // Se estiver alterando status para published, atualizar published_at
      if (postUpdates.status === 'published') {
        postUpdates.published_at = new Date().toISOString();
      }
      
      const { error: postError } = await supabase
        .from('blog_posts')
        .update(postUpdates)
        .eq('id', id);

      if (postError) {
        throw postError;
      }
    }
    
    // Atualizar tradução se fornecida
    if (translation && Object.keys(translation).length > 0) {
      const { error: translationError } = await supabase
        .from('blog_post_translations')
        .update({
          title: translation.title,
          excerpt: translation.excerpt,
          content: translation.content,
          image_url: translation.image_url,
          seo_title: translation.seo_title || translation.title,
          seo_description: translation.seo_description || translation.excerpt
        })
        .eq('post_id', id)
        .eq('language', translation.language);

      if (translationError) {
        throw translationError;
      }
    }

    return id;
  };

  // Excluir post
  const deletePost = async (id: string) => {
    if (!isSuperAdmin) {
      throw new Error(t('common:noPermission'));
    }

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  };

  // ==================== Funções para API Pública ====================

  // Buscar posts públicos
  const getPublicPosts = async (language: string) => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          id,
          slug,
          featured,
          published_at,
          blog_post_translations!blog_post_translations_post_id_fkey(
            title,
            excerpt,
            image_url
          ),
          blog_post_categories!blog_post_categories_post_id_fkey(
            category:blog_categories!blog_post_categories_category_id_fkey(
              id,
              slug,
              blog_category_translations!blog_category_translations_category_id_fkey(
                name
              )
            )
          ),
          blog_post_tags!blog_post_tags_post_id_fkey(
            tag:blog_tags!blog_post_tags_tag_id_fkey(
              id,
              slug,
              blog_tag_translations!blog_tag_translations_tag_id_fkey(
                name
              )
            )
          )
        `)
        .eq('status', 'published')
        .eq('blog_post_translations.language', language)
        .eq('blog_post_categories.category.blog_category_translations.language', language)
        .eq('blog_post_tags.tag.blog_tag_translations.language', language)
        .order('published_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transformar dados dos posts
      const transformedPosts: PublicBlogPost[] = (data || []).map((post) => ({
        id: post.id,
        slug: post.slug,
        featured: post.featured,
        published_at: post.published_at,
        title: post.blog_post_translations[0]?.title || '',
        excerpt: post.blog_post_translations[0]?.excerpt || '',
        image_url: post.blog_post_translations[0]?.image_url || '',
        category: post.blog_post_categories[0]?.category ? {
          id: post.blog_post_categories[0].category.id,
          slug: post.blog_post_categories[0].category.slug,
          name: post.blog_post_categories[0].category.blog_category_translations[0]?.name || ''
        } : { id: '', slug: '', name: '' },
        tags: post.blog_post_tags.map((tagRel) => ({
          id: tagRel.tag.id,
          name: tagRel.tag.blog_tag_translations[0]?.name || ''
        }))
      }));

      return transformedPosts;
    } catch (error) {
      console.error('Erro ao buscar posts públicos:', error);
      throw error;
    }
  };

  // Buscar post público por slug
  const getPublicPostBySlug = async (slug: string, language: string) => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          id,
          slug,
          featured,
          published_at,
          blog_post_translations!blog_post_translations_post_id_fkey(
            title,
            excerpt,
            content,
            image_url
          ),
          blog_post_categories!blog_post_categories_post_id_fkey(
            category:blog_categories!blog_post_categories_category_id_fkey(
              id,
              slug,
              blog_category_translations!blog_category_translations_category_id_fkey(
                name
              )
            )
          ),
          blog_post_tags!blog_post_tags_post_id_fkey(
            tag:blog_tags!blog_post_tags_tag_id_fkey(
              id,
              slug,
              blog_tag_translations!blog_tag_translations_tag_id_fkey(
                name
              )
            )
          )
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .eq('blog_post_translations.language', language)
        .eq('blog_post_categories.category.blog_category_translations.language', language)
        .eq('blog_post_tags.tag.blog_tag_translations.language', language)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      // Transformar os dados para o formato adequado
      const postData: PublicBlogPost = {
        id: data.id,
        slug: data.slug,
        featured: data.featured,
        published_at: data.published_at,
        title: data.blog_post_translations[0]?.title || '',
        excerpt: data.blog_post_translations[0]?.excerpt || '',
        content: data.blog_post_translations[0]?.content || '',
        image_url: data.blog_post_translations[0]?.image_url || '',
        category: data.blog_post_categories[0]?.category ? {
          id: data.blog_post_categories[0].category.id,
          slug: data.blog_post_categories[0].category.slug,
          name: data.blog_post_categories[0].category.blog_category_translations[0]?.name || ''
        } : { id: '', slug: '', name: '' },
        tags: data.blog_post_tags.map((tagRel) => ({
          id: tagRel.tag.id,
          name: tagRel.tag.blog_tag_translations[0]?.name || ''
        }))
      };

      return postData;
    } catch (error) {
      console.error('Erro ao buscar post por slug:', error);
      throw error;
    }
  };

  // Buscar categorias públicas com contagem
  const getPublicCategories = async (language: string) => {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select(`
          id,
          slug,
          blog_category_translations!blog_category_translations_category_id_fkey(
            name
          ),
          blog_post_categories!blog_post_categories_category_id_fkey(
            post:blog_posts!blog_post_categories_post_id_fkey(
              id,
              status
            )
          )
        `)
        .eq('blog_category_translations.language', language);

      if (error) {
        throw error;
      }

      // Transformar dados das categorias com contagem
      const transformedCategories: PublicBlogCategory[] = (data || []).map((category) => {
        // Contar posts publicados (status = 'published')
        const publishedPostsCount = category.blog_post_categories.filter(
          (postCat) => postCat.post && postCat.post.status === 'published'
        ).length;
        
        return {
          id: category.id,
          slug: category.slug,
          name: category.blog_category_translations[0]?.name || '',
          count: publishedPostsCount
        };
      });

      return transformedCategories;
    } catch (error) {
      console.error('Erro ao buscar categorias públicas:', error);
      throw error;
    }
  };

  // Buscar tags públicas
  const getPublicTags = async (language: string) => {
    try {
      const { data, error } = await supabase
        .from('blog_tags')
        .select(`
          id,
          slug,
          blog_tag_translations!blog_tag_translations_tag_id_fkey(
            name
          )
        `)
        .eq('blog_tag_translations.language', language);

      if (error) {
        throw error;
      }

      // Transformar dados das tags
      const transformedTags: BlogTag[] = (data || []).map((tag) => ({
        id: tag.id,
        slug: tag.slug,
        name: tag.blog_tag_translations[0]?.name || ''
      }));

      return transformedTags;
    } catch (error) {
      console.error('Erro ao buscar tags públicas:', error);
      throw error;
    }
  };

  // ==================== Queries React Query ====================

  // Queries para Painel Administrativo
  const usePostsQuery = (params = {}) => {
    return useQuery({
      queryKey: ['blog_posts', params],
      queryFn: () => getPosts(params),
      staleTime: 1000 * 60 * 5, // 5 minutos
    });
  };

  const usePostQuery = (id: string, language = 'pt') => {
    return useQuery({
      queryKey: ['blog_post', id, language],
      queryFn: () => getPostById(id, language),
      staleTime: 1000 * 60 * 5, // 5 minutos
      enabled: !!id
    });
  };

  const useCategoriesQuery = (language = 'pt') => {
    return useQuery({
      queryKey: ['blog_categories', language],
      queryFn: () => getCategories(language),
      staleTime: 1000 * 60 * 30, // 30 minutos
    });
  };

  const useTagsQuery = (language = 'pt') => {
    return useQuery({
      queryKey: ['blog_tags', language],
      queryFn: () => getTags(language),
      staleTime: 1000 * 60 * 30, // 30 minutos
    });
  };

  // ==================== Queries React Query para Páginas Públicas ====================

  // Query para posts públicos (com cache mais longo)
  const usePublicPostsQuery = (language = 'pt') => {
    return useQuery({
      queryKey: ['public_blog_posts', language],
      queryFn: () => getPublicPosts(language),
      staleTime: 1000 * 60 * 15, // 15 minutos
      gcTime: 1000 * 60 * 60, // 1 hora
    });
  };

  // Query para post público por slug (com cache mais longo)
  const usePublicPostBySlugQuery = (slug: string | undefined, language = 'pt') => {
    return useQuery({
      queryKey: ['public_blog_post', slug, language],
      queryFn: () => getPublicPostBySlug(slug || '', language),
      staleTime: 1000 * 60 * 15, // 15 minutos
      gcTime: 1000 * 60 * 60, // 1 hora
      enabled: !!slug
    });
  };

  // Query para categorias públicas (com cache mais longo)
  const usePublicCategoriesQuery = (language = 'pt') => {
    return useQuery({
      queryKey: ['public_blog_categories', language],
      queryFn: () => getPublicCategories(language),
      staleTime: 1000 * 60 * 30, // 30 minutos
      gcTime: 1000 * 60 * 60 * 2, // 2 horas
    });
  };

  // Query para tags públicas (com cache mais longo)
  const usePublicTagsQuery = (language = 'pt') => {
    return useQuery({
      queryKey: ['public_blog_tags', language],
      queryFn: () => getPublicTags(language),
      staleTime: 1000 * 60 * 30, // 30 minutos
      gcTime: 1000 * 60 * 60 * 2, // 2 horas
    });
  };

  // // Função para atualizar o sitemap de forma assíncrona
  // const updateSitemap = async () => {
  //   if (typeof window !== 'undefined') {
  //     try {
  //       // Verificar se estamos em ambiente de produção
  //       const isProd = process.env.NODE_ENV === 'production';
        
  //       // Em desenvolvimento, apenas logamos que atualizaria
  //       if (!isProd) {
  //         console.log('[DEV] Simulando atualização do sitemap (desativado em desenvolvimento)');
  //         return;
  //       }
        
  //       // Em produção, tentamos atualizar o sitemap
  //       console.log('Atualizando sitemap após alteração em posts do blog...');
  //       const success = await updateSitemapWithBlogPosts();
        
  //       if (success) {
  //         console.log('Sitemap atualizado com sucesso');
  //       } else {
  //         console.warn('Não foi possível atualizar o sitemap automaticamente');
  //       }
  //     } catch (error) {
  //       console.error('Erro ao atualizar sitemap:', error);
  //     }
  //   }
  // };

  const useCreatePostMutation = () => {
    return useMutation({
      mutationFn: createPost,
      onSuccess: (_, variables) => {
        // Invalidar consultas para forçar atualização de dados
        queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
        toast.show({
          title: t('common:success'),
          description: t('blog:postCreated'),
          variant: 'success',
        });
        
        // Atualizar sitemap de forma assíncrona se o post foi publicado diretamente
        if (variables.status === 'published') {
          // updateSitemap();
        }
      },
      onError: (error: Error) => {
        toast.show({
          title: t('common:error'),
          description: error.message || t('blog:errorCreatingPost'),
          variant: 'destructive',
        });
      }
    });
  };

  const useUpdatePostMutation = () => {
    return useMutation({
      mutationFn: ({ id, ...data }: { 
        id: string, 
        translation?: Partial<BlogPostTranslation>, 
        status?: 'draft' | 'published' | 'archived', 
        featured?: boolean, 
        slug?: string 
      }) => updatePost(id, data),
      onSuccess: (_, variables) => {
        // Invalidar consultas para forçar atualização de dados
        queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
        queryClient.invalidateQueries({ queryKey: ['blog_post', variables.id] });
        
        // Invalidar também os dados públicos
        queryClient.invalidateQueries({ queryKey: ['public_blog_posts'] });
        queryClient.invalidateQueries({ queryKey: ['public_blog_post'] });
        queryClient.invalidateQueries({ queryKey: ['public_blog_categories'] });
        
        toast.show({
          title: t('common:success'),
          description: t('blog:postUpdated'),
          variant: 'success',
        });
        
        // Atualizar sitemap de forma assíncrona se o post foi publicado
        if (variables.status === 'published') {
          // updateSitemap();
        }
      },
      onError: (error: Error) => {
        toast.show({
          title: t('common:error'),
          description: error.message || t('blog:errorUpdatingPost'),
          variant: 'destructive',
        });
      }
    });
  };

  const useDeletePostMutation = () => {
    return useMutation({
      mutationFn: deletePost,
      onSuccess: () => {
        // Invalidar consultas para forçar atualização de dados
        queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
        queryClient.invalidateQueries({ queryKey: ['public_blog_posts'] });
        queryClient.invalidateQueries({ queryKey: ['public_blog_categories'] });
        
        toast.show({
          title: t('common:success'),
          description: t('blog:postDeleted'),
          variant: 'success',
        });
        
        // Atualizar sitemap de forma assíncrona após excluir um post
        // updateSitemap();
      },
      onError: (error: Error) => {
        toast.show({
          title: t('common:error'),
          description: error.message || t('blog:errorDeletingPost'),
          variant: 'destructive',
        });
      }
    });
  };

  return {
    // Queries para Admin
    usePostsQuery,
    usePostQuery,
    useCategoriesQuery,
    useTagsQuery,
    
    // Queries para Public
    usePublicPostsQuery,
    usePublicPostBySlugQuery,
    usePublicCategoriesQuery,
    usePublicTagsQuery,
    
    // Mutations
    useCreatePostMutation,
    useUpdatePostMutation,
    useDeletePostMutation,
    
    // Funções diretas, caso necessário
    getPosts,
    getPostById,
    getCategories,
    getTags,
    getPublicPosts,
    getPublicPostBySlug,
    getPublicCategories,
    getPublicTags,
    createPost,
    updatePost,
    deletePost
  };
}; 