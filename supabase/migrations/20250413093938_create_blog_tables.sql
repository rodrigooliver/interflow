-- Criação de enum para status dos posts
CREATE TYPE public.blog_post_status AS ENUM (
  'draft',      -- Rascunho
  'published',  -- Publicado
  'archived'    -- Arquivado
);

-- Criação da tabela de categorias de blog
CREATE TABLE public.blog_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criação da tabela de traduções de categorias
CREATE TABLE public.blog_category_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  language VARCHAR(5) NOT NULL, -- pt, en, es, etc.
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, language)
);

-- Criação da tabela de tags de blog
CREATE TABLE public.blog_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criação da tabela de traduções de tags
CREATE TABLE public.blog_tag_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  language VARCHAR(5) NOT NULL, -- pt, en, es, etc.
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tag_id, language)
);

-- Criação da tabela de posts de blog
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  author_id UUID REFERENCES auth.users(id),
  featured BOOLEAN NOT NULL DEFAULT false,
  status blog_post_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb, -- Para eventuais metadados adicionais
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criação da tabela de traduções de posts
CREATE TABLE public.blog_post_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  language VARCHAR(5) NOT NULL, -- pt, en, es, etc.
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  seo_title VARCHAR(255),
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, language)
);

-- Criação da tabela de relacionamento entre posts e categorias
CREATE TABLE public.blog_post_categories (
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, category_id)
);

-- Criação da tabela de relacionamento entre posts e tags
CREATE TABLE public.blog_post_tags (
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, tag_id)
);

-- Função para atualizar o timestamp de updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualização automática de updated_at nas tabelas
CREATE TRIGGER update_blog_categories_updated_at
BEFORE UPDATE ON public.blog_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_category_translations_updated_at
BEFORE UPDATE ON public.blog_category_translations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_tags_updated_at
BEFORE UPDATE ON public.blog_tags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_tag_translations_updated_at
BEFORE UPDATE ON public.blog_tag_translations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_post_translations_updated_at
BEFORE UPDATE ON public.blog_post_translations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Criação de índices para otimização de consultas
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_featured ON public.blog_posts(featured);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at);
CREATE INDEX idx_blog_post_translations_language ON public.blog_post_translations(language);
CREATE INDEX idx_blog_category_translations_language ON public.blog_category_translations(language);
CREATE INDEX idx_blog_tag_translations_language ON public.blog_tag_translations(language);

-- Função para gerar slugs automaticamente
CREATE OR REPLACE FUNCTION public.generate_slug(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Converte para minúsculas
  result := LOWER(input_text);
  
  -- Remove acentos
  result := unaccent(result);
  
  -- Substitui espaços e caracteres especiais por hífens
  result := REGEXP_REPLACE(result, '[^a-z0-9]+', '-', 'g');
  
  -- Remove hífens duplicados
  result := REGEXP_REPLACE(result, '-+', '-', 'g');
  
  -- Remove hífens no início e no fim
  result := TRIM(BOTH '-' FROM result);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para criar um post com tradução em um idioma específico
CREATE OR REPLACE FUNCTION public.create_blog_post(
  title TEXT,
  excerpt TEXT,
  content TEXT,
  language VARCHAR(5),
  category_slugs TEXT[],
  tag_slugs TEXT[],
  image_url TEXT DEFAULT NULL,
  featured BOOLEAN DEFAULT false,
  status blog_post_status DEFAULT 'draft',
  seo_title TEXT DEFAULT NULL,
  seo_description TEXT DEFAULT NULL,
  author_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  post_id UUID;
  post_slug TEXT;
  category_id UUID;
  tag_id UUID;
BEGIN
  -- Gerar slug a partir do título
  post_slug := public.generate_slug(title);
  
  -- Verificar se já existe um post com esse slug
  IF EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = post_slug) THEN
    post_slug := post_slug || '-' || to_char(NOW(), 'YYYYMMDD');
  END IF;
  
  -- Inserir o post
  INSERT INTO public.blog_posts (
    slug, author_id, featured, status, 
    published_at, created_at, updated_at
  ) VALUES (
    post_slug, author_id, featured, status, 
    CASE WHEN status = 'published' THEN NOW() ELSE NULL END,
    NOW(), NOW()
  ) RETURNING id INTO post_id;
  
  -- Inserir a tradução do post
  INSERT INTO public.blog_post_translations (
    post_id, language, title, excerpt, content, 
    image_url, seo_title, seo_description
  ) VALUES (
    post_id, language, title, excerpt, content, 
    image_url, COALESCE(seo_title, title), COALESCE(seo_description, excerpt)
  );
  
  -- Associar categorias
  IF array_length(category_slugs, 1) > 0 THEN
    FOR i IN 1..array_length(category_slugs, 1) LOOP
      SELECT id INTO category_id FROM public.blog_categories WHERE slug = category_slugs[i];
      IF FOUND THEN
        INSERT INTO public.blog_post_categories (post_id, category_id)
        VALUES (post_id, category_id);
      END IF;
    END LOOP;
  END IF;
  
  -- Associar tags
  IF array_length(tag_slugs, 1) > 0 THEN
    FOR i IN 1..array_length(tag_slugs, 1) LOOP
      SELECT id INTO tag_id FROM public.blog_tags WHERE slug = tag_slugs[i];
      IF FOUND THEN
        INSERT INTO public.blog_post_tags (post_id, tag_id)
        VALUES (post_id, tag_id);
      END IF;
    END LOOP;
  END IF;
  
  RETURN post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter posts publicados com traduções, categorias e tags
CREATE OR REPLACE FUNCTION public.get_published_blog_posts(
  lang VARCHAR(5) DEFAULT 'pt',
  limit_count INTEGER DEFAULT 10,
  offset_count INTEGER DEFAULT 0,
  tag_filter TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  featured_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
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
      u.raw_user_meta_data->>'full_name' AS author_name,
      u.raw_user_meta_data->>'avatar_url' AS author_avatar
    FROM 
      public.blog_posts p
    JOIN 
      public.blog_post_translations pt ON p.id = pt.post_id AND pt.language = lang
    LEFT JOIN 
      auth.users u ON p.author_id = u.id
    WHERE 
      p.status = 'published'
      AND (NOT featured_only OR p.featured = true)
      AND (
        category_filter IS NULL 
        OR EXISTS (
          SELECT 1 FROM public.blog_post_categories pc
          JOIN public.blog_categories c ON pc.category_id = c.id
          WHERE pc.post_id = p.id AND c.slug = category_filter
        )
      )
      AND (
        tag_filter IS NULL 
        OR EXISTS (
          SELECT 1 FROM public.blog_post_tags pt
          JOIN public.blog_tags t ON pt.tag_id = t.id
          WHERE pt.post_id = p.id AND t.slug = tag_filter
        )
      )
    ORDER BY 
      p.featured DESC, p.published_at DESC
    LIMIT limit_count
    OFFSET offset_count
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
    pd.slug,
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