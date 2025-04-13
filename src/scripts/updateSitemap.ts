#!/usr/bin/env node
// Este script deve ser usado após a compilação do projeto, em ambiente Node.js
// Pode ser invocado com: node build/src/scripts/updateSitemap.js 
import { updateSitemapWithBlogPosts } from '../utils/sitemapUpdater';
import process from 'process';

async function main() {
  console.log('Iniciando atualização do sitemap...');
  
  try {
    //process.env.SITE_URL ||
    const baseUrl =  'https://interflow.chat';
    const success = await updateSitemapWithBlogPosts(baseUrl);
    
    if (success) {
      console.log('Sitemap atualizado com sucesso! 🎉');
    } else {
      console.error('Falha ao atualizar o sitemap');
      process.exit(1);
    }
  } catch (error) {
    console.error('Erro ao executar a atualização do sitemap:', error);
    process.exit(1);
  }
}

main(); 