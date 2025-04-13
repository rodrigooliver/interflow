-- Ativar Row Level Security (RLS) em todas as tabelas do blog
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tag_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

-- Função para verificar se o usuário atual é superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT p.is_superadmin INTO is_admin
  FROM auth.users u
  JOIN public.profiles p ON u.id = p.id
  WHERE u.id = auth.uid();
  
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para blog_categories
-- Leitura: qualquer pessoa pode ler
CREATE POLICY "Qualquer pessoa pode visualizar categorias" ON public.blog_categories
  FOR SELECT USING (true);

-- Criação, atualização, exclusão: apenas superadmins
CREATE POLICY "Apenas superadmins podem criar categorias" ON public.blog_categories
  FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem atualizar categorias" ON public.blog_categories
  FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem excluir categorias" ON public.blog_categories
  FOR DELETE USING (public.is_superadmin());

-- Políticas para blog_category_translations
-- Leitura: qualquer pessoa pode ler
CREATE POLICY "Qualquer pessoa pode visualizar traduções de categorias" ON public.blog_category_translations
  FOR SELECT USING (true);

-- Criação, atualização, exclusão: apenas superadmins
CREATE POLICY "Apenas superadmins podem criar traduções de categorias" ON public.blog_category_translations
  FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem atualizar traduções de categorias" ON public.blog_category_translations
  FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem excluir traduções de categorias" ON public.blog_category_translations
  FOR DELETE USING (public.is_superadmin());

-- Políticas para blog_tags
-- Leitura: qualquer pessoa pode ler
CREATE POLICY "Qualquer pessoa pode visualizar tags" ON public.blog_tags
  FOR SELECT USING (true);

-- Criação, atualização, exclusão: apenas superadmins
CREATE POLICY "Apenas superadmins podem criar tags" ON public.blog_tags
  FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem atualizar tags" ON public.blog_tags
  FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem excluir tags" ON public.blog_tags
  FOR DELETE USING (public.is_superadmin());

-- Políticas para blog_tag_translations
-- Leitura: qualquer pessoa pode ler
CREATE POLICY "Qualquer pessoa pode visualizar traduções de tags" ON public.blog_tag_translations
  FOR SELECT USING (true);

-- Criação, atualização, exclusão: apenas superadmins
CREATE POLICY "Apenas superadmins podem criar traduções de tags" ON public.blog_tag_translations
  FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem atualizar traduções de tags" ON public.blog_tag_translations
  FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem excluir traduções de tags" ON public.blog_tag_translations
  FOR DELETE USING (public.is_superadmin());

-- Políticas para blog_posts
-- Leitura: qualquer pessoa pode ler posts publicados, superadmins podem ler todos
CREATE POLICY "Qualquer pessoa pode visualizar posts publicados" ON public.blog_posts
  FOR SELECT USING (
    status = 'published' OR public.is_superadmin()
  );

-- Criação, atualização, exclusão: apenas superadmins
CREATE POLICY "Apenas superadmins podem criar posts" ON public.blog_posts
  FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem atualizar posts" ON public.blog_posts
  FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem excluir posts" ON public.blog_posts
  FOR DELETE USING (public.is_superadmin());

-- Políticas para blog_post_translations
-- Leitura: qualquer pessoa pode ler traduções de posts publicados, superadmins podem ler todos
CREATE POLICY "Qualquer pessoa pode visualizar traduções de posts publicados" ON public.blog_post_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts p
      WHERE p.id = post_id AND (p.status = 'published' OR public.is_superadmin())
    )
  );

-- Criação, atualização, exclusão: apenas superadmins
CREATE POLICY "Apenas superadmins podem criar traduções de posts" ON public.blog_post_translations
  FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem atualizar traduções de posts" ON public.blog_post_translations
  FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem excluir traduções de posts" ON public.blog_post_translations
  FOR DELETE USING (public.is_superadmin());

-- Políticas para blog_post_categories
-- Leitura: qualquer pessoa pode ler posts publicados, superadmins podem ler todos
CREATE POLICY "Qualquer pessoa pode visualizar categorias de posts publicados" ON public.blog_post_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts p
      WHERE p.id = post_id AND (p.status = 'published' OR public.is_superadmin())
    )
  );

-- Criação, atualização, exclusão: apenas superadmins
CREATE POLICY "Apenas superadmins podem criar relações post-categoria" ON public.blog_post_categories
  FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem atualizar relações post-categoria" ON public.blog_post_categories
  FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem excluir relações post-categoria" ON public.blog_post_categories
  FOR DELETE USING (public.is_superadmin());

-- Políticas para blog_post_tags
-- Leitura: qualquer pessoa pode ler posts publicados, superadmins podem ler todos
CREATE POLICY "Qualquer pessoa pode visualizar tags de posts publicados" ON public.blog_post_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts p
      WHERE p.id = post_id AND (p.status = 'published' OR public.is_superadmin())
    )
  );

-- Criação, atualização, exclusão: apenas superadmins
CREATE POLICY "Apenas superadmins podem criar relações post-tag" ON public.blog_post_tags
  FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem atualizar relações post-tag" ON public.blog_post_tags
  FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "Apenas superadmins podem excluir relações post-tag" ON public.blog_post_tags
  FOR DELETE USING (public.is_superadmin());

-- Funções de API para gerenciamento de blog

-- Criar uma categoria com suas traduções
CREATE OR REPLACE FUNCTION public.create_blog_category(
  slug TEXT,
  translations JSONB -- Formato: [{"language": "pt", "name": "Nome", "description": "Descrição"}, ...]
)
RETURNS UUID AS $$
DECLARE
  category_id UUID;
  translation JSONB;
BEGIN
  -- Verificar permissões
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Apenas superadmins podem criar categorias de blog';
  END IF;

  -- Inserir categoria
  INSERT INTO public.blog_categories (slug)
  VALUES (slug)
  RETURNING id INTO category_id;
  
  -- Inserir traduções
  FOR translation IN SELECT * FROM jsonb_array_elements(translations)
  LOOP
    INSERT INTO public.blog_category_translations (
      category_id, 
      language, 
      name, 
      description
    ) VALUES (
      category_id,
      translation->>'language',
      translation->>'name',
      translation->>'description'
    );
  END LOOP;
  
  RETURN category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar uma tag com suas traduções
CREATE OR REPLACE FUNCTION public.create_blog_tag(
  slug TEXT,
  translations JSONB -- Formato: [{"language": "pt", "name": "Nome"}, ...]
)
RETURNS UUID AS $$
DECLARE
  tag_id UUID;
  translation JSONB;
BEGIN
  -- Verificar permissões
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Apenas superadmins podem criar tags de blog';
  END IF;

  -- Inserir tag
  INSERT INTO public.blog_tags (slug)
  VALUES (slug)
  RETURNING id INTO tag_id;
  
  -- Inserir traduções
  FOR translation IN SELECT * FROM jsonb_array_elements(translations)
  LOOP
    INSERT INTO public.blog_tag_translations (
      tag_id, 
      language, 
      name
    ) VALUES (
      tag_id,
      translation->>'language',
      translation->>'name'
    );
  END LOOP;
  
  RETURN tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar tradução a um post existente
CREATE OR REPLACE FUNCTION public.add_blog_post_translation(
  post_id UUID,
  language VARCHAR(5),
  title TEXT,
  excerpt TEXT,
  content TEXT,
  image_url TEXT DEFAULT NULL,
  seo_title TEXT DEFAULT NULL,
  seo_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  translation_id UUID;
BEGIN
  -- Verificar permissões
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Apenas superadmins podem adicionar traduções de posts';
  END IF;

  -- Verificar se o post existe
  IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE id = post_id) THEN
    RAISE EXCEPTION 'Post não encontrado';
  END IF;
  
  -- Verificar se a tradução já existe
  IF EXISTS (SELECT 1 FROM public.blog_post_translations WHERE post_id = add_blog_post_translation.post_id AND language = add_blog_post_translation.language) THEN
    RAISE EXCEPTION 'Tradução para este idioma já existe';
  END IF;
  
  -- Inserir tradução
  INSERT INTO public.blog_post_translations (
    post_id, 
    language, 
    title, 
    excerpt, 
    content, 
    image_url, 
    seo_title, 
    seo_description
  ) VALUES (
    post_id,
    language,
    title,
    excerpt,
    content,
    image_url,
    COALESCE(seo_title, title),
    COALESCE(seo_description, excerpt)
  ) RETURNING id INTO translation_id;
  
  RETURN translation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obter post por slug
CREATE OR REPLACE FUNCTION public.get_blog_post_by_slug(
  slug TEXT,
  lang VARCHAR(5) DEFAULT 'pt'
)
RETURNS TABLE (
  id UUID,
  post_slug TEXT,
  title TEXT,
  excerpt TEXT,
  content TEXT,
  image_url TEXT,
  featured BOOLEAN,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_id UUID,
  author_name TEXT,
  author_avatar TEXT,
  seo_title TEXT,
  seo_description TEXT,
  categories JSONB,
  tags JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH post_data AS (
    SELECT 
      p.id,
      p.slug,
      p.featured,
      p.published_at,
      p.created_at,
      p.updated_at,
      p.author_id,
      pt.title,
      pt.excerpt,
      pt.content,
      pt.image_url,
      pt.seo_title,
      pt.seo_description,
      u.raw_user_meta_data->>'full_name' AS author_name,
      u.raw_user_meta_data->>'avatar_url' AS author_avatar
    FROM 
      public.blog_posts p
    JOIN 
      public.blog_post_translations pt ON p.id = pt.post_id AND pt.language = lang
    LEFT JOIN 
      auth.users u ON p.author_id = u.id
    WHERE 
      p.slug = get_blog_post_by_slug.slug
      AND (p.status = 'published' OR public.is_superadmin())
    LIMIT 1
  ),
  categories_data AS (
    SELECT 
      pc.post_id,
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'slug', c.slug,
          'name', ct.name
        )
      ) AS categories
    FROM 
      public.blog_post_categories pc
    JOIN 
      public.blog_categories c ON pc.category_id = c.id
    JOIN 
      public.blog_category_translations ct ON c.id = ct.category_id AND ct.language = lang
    WHERE 
      pc.post_id IN (SELECT id FROM post_data)
    GROUP BY 
      pc.post_id
  ),
  tags_data AS (
    SELECT 
      pt.post_id,
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'slug', t.slug,
          'name', tt.name
        )
      ) AS tags
    FROM 
      public.blog_post_tags pt
    JOIN 
      public.blog_tags t ON pt.tag_id = t.id
    JOIN 
      public.blog_tag_translations tt ON t.id = tt.tag_id AND tt.language = lang
    WHERE 
      pt.post_id IN (SELECT id FROM post_data)
    GROUP BY 
      pt.post_id
  )
  SELECT 
    pd.id,
    pd.slug AS post_slug,
    pd.title,
    pd.excerpt,
    pd.content,
    pd.image_url,
    pd.featured,
    pd.published_at,
    pd.created_at,
    pd.updated_at,
    pd.author_id,
    pd.author_name,
    pd.author_avatar,
    pd.seo_title,
    pd.seo_description,
    COALESCE(cd.categories, '[]'::jsonb) AS categories,
    COALESCE(td.tags, '[]'::jsonb) AS tags
  FROM 
    post_data pd
  LEFT JOIN 
    categories_data cd ON pd.id = cd.post_id
  LEFT JOIN 
    tags_data td ON pd.id = td.post_id;
END;
$$ LANGUAGE plpgsql; 