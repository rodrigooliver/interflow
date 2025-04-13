#!/usr/bin/env node
// Este script deve ser usado após a compilação do projeto, em ambiente Node.js
// Pode ser invocado com: node build/src/scripts/updateSitemap.js 
import { updateSitemapWithBlogPosts } from '../utils/sitemapUpdater';
import process from 'process';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Iniciando atualização do sitemap...');
  
  try {
    // Verificar se o arquivo sitemap.xml existe
    const sitemapPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
    if (!fs.existsSync(sitemapPath)) {
      console.warn('Arquivo sitemap.xml não encontrado em:', sitemapPath);
      console.log('Build continuará sem atualizar o sitemap.');
      process.exit(0); // Sair com sucesso para não quebrar o build
    }

    //process.env.SITE_URL ||
    const baseUrl =  'https://interflow.chat';
    const success = await updateSitemapWithBlogPosts(baseUrl);
    
    if (success) {
      console.log('Sitemap atualizado com sucesso! 🎉');
    } else {
      console.error('Falha ao atualizar o sitemap, mas continuando build...');
      process.exit(0); // Sair com sucesso para não quebrar o build
    }
  } catch (error) {
    console.error('Erro ao executar a atualização do sitemap:', error);
    console.log('Continuando build sem atualizar sitemap...');
    process.exit(0); // Sair com sucesso para não quebrar o build
  }
}

main(); 