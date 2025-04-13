import { parseStringPromise, Builder } from 'xml2js';
import fs from 'fs';
import path from 'path';
import { supabase } from '../lib/supabase';

interface PostData {
  slug: string;
  published_at: string;
}

interface SitemapUrl {
  loc: string[];
  lastmod: string[];
  changefreq: string[];
  priority: string[];
}

interface SitemapObject {
  urlset: {
    $: Record<string, string>;
    url: SitemapUrl[];
  }
}

/**
 * Realiza uma busca direta no banco de dados para sitemap.
 * Esta função pode ser usada em ambiente Node.js sem depender do cliente Supabase do browser.
 */
async function fetchPublishedPosts(): Promise<PostData[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, published_at, updated_at')
      .eq('status', 'published');
    
    if (error) {
      console.error('Erro ao buscar posts do blog:', error);
      return [];
    }
    
    return data as PostData[];
  } catch (error) {
    console.error('Erro ao buscar posts para o sitemap:', error);
    return [];
  }
}

/**
 * Atualiza o sitemap.xml com os posts do blog
 * @param baseUrl URL base do site, por padrão https://interflow.chat
 */
export async function updateSitemapWithBlogPosts(baseUrl = 'https://interflow.chat'): Promise<boolean> {
  try {
    // Caminho para o sitemap.xml
    const sitemapPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(sitemapPath)) {
      console.error('Arquivo sitemap.xml não encontrado em:', sitemapPath);
      return false;
    }

    // Ler o conteúdo do sitemap atual
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    
    // Converter XML para objeto JavaScript
    const sitemapObj = await parseStringPromise(sitemapContent) as SitemapObject;
    
    // Buscar todos os posts publicados do blog
    const posts = await fetchPublishedPosts();
    
    if (!posts || posts.length === 0) {
      console.warn('Nenhum post do blog encontrado');
      return false;
    }
    
    // Filtrar URLs existentes para remover entradas de blog antigas
    const filteredUrls = sitemapObj.urlset.url.filter((url: SitemapUrl) => {
      const loc = url.loc[0];
      return !loc.includes(`${baseUrl}/blog/`) || loc === `${baseUrl}/blog`;
    });
    
    // Adicionar as URLs dos posts do blog
    posts.forEach((post: PostData) => {
      // Formatar a data para o formato YYYY-MM-DD
      const lastmod = new Date(post.published_at).toISOString().split('T')[0];
      
      filteredUrls.push({
        loc: [`${baseUrl}/blog/${post.slug}`],
        lastmod: [lastmod],
        changefreq: ['monthly'],
        priority: ['0.6']
      });
    });
    
    // Atualizar o objeto do sitemap
    sitemapObj.urlset.url = filteredUrls;
    
    // Converter de volta para XML
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' }
    });
    const updatedXml = builder.buildObject(sitemapObj);
    
    // Salvar o XML atualizado
    fs.writeFileSync(sitemapPath, updatedXml);
    
    console.log(`Sitemap atualizado com ${posts.length} posts do blog`);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar sitemap:', error);
    return false;
  }
}

/**
 * Adiciona manualmente uma URL ao sitemap.xml
 */
export async function addUrlToSitemap(
  url: string,
  lastmod = new Date().toISOString().split('T')[0],
  changefreq = 'monthly',
  priority = '0.6'
): Promise<boolean> {
  try {
    // Caminho para o sitemap.xml
    const sitemapPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(sitemapPath)) {
      console.error('Arquivo sitemap.xml não encontrado em:', sitemapPath);
      return false;
    }

    // Ler o conteúdo do sitemap atual
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    
    // Converter XML para objeto JavaScript
    const sitemapObj = await parseStringPromise(sitemapContent) as SitemapObject;
    
    // Verificar se a URL já existe no sitemap
    const urlExists = sitemapObj.urlset.url.some((u: SitemapUrl) => u.loc[0] === url);
    
    if (urlExists) {
      console.warn(`A URL ${url} já existe no sitemap`);
      return true;
    }
    
    // Adicionar a nova URL
    sitemapObj.urlset.url.push({
      loc: [url],
      lastmod: [lastmod],
      changefreq: [changefreq],
      priority: [priority]
    });
    
    // Converter de volta para XML
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' }
    });
    const updatedXml = builder.buildObject(sitemapObj);
    
    // Salvar o XML atualizado
    fs.writeFileSync(sitemapPath, updatedXml);
    
    console.log(`URL ${url} adicionada ao sitemap`);
    return true;
  } catch (error) {
    console.error('Erro ao adicionar URL ao sitemap:', error);
    return false;
  }
} 