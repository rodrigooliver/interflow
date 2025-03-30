import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  variant?: 'default' | 'compact';
}

// Função para limpar tags HTML
function cleanHtml(content: string): string {
  const cleaned = content
    // Remove tags HTML
    .replace(/<[^>]*>/g, '')
    // Remove espaços múltiplos
    .replace(/\s+/g, ' ')
    // Remove espaços no início e fim
    .trim();
  return cleaned;
}

// Função para processar URLs e convertê-las em links mais limpos
function processUrls(content: string): string {
  // Regex para identificar URLs em formato de link Markdown
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  // Regex para identificar URLs diretas
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Função para limpar URLs (remover %5D e outros caracteres indesejados)
  const cleanUrl = (url: string): string => {
    // Remove %5D (que é o código URL para ']'), colchetes, parênteses e outros caracteres problemáticos
    return url
      .replace(/%5D/gi, '') // Remove %5D (código URL para ']')
      .replace(/\]/g, '')   // Remove colchetes de fechamento literal
      .replace(/\)/g, '')   // Remove parênteses de fechamento
      .replace(/'$/g, '')   // Remove aspas simples no final
      .replace(/"$/g, '');  // Remove aspas duplas no final
  };
  
  // Primeiro limpa links Markdown
  let processedContent = content.replace(markdownLinkRegex, (match, text, url) => {
    // Limpa a URL
    const cleanedUrl = cleanUrl(url);
    
    // Verifica se o texto e a URL são os mesmos ou se o texto é muito longo
    if (text === url || text.length > 50) {
      // Simplifica para mostrar apenas o domínio
      try {
        const domain = new URL(cleanedUrl).hostname;
        return `[${domain}](${cleanedUrl})`;
      } catch {
        return `[${text}](${cleanedUrl})`;
      }
    }
    return `[${text}](${cleanedUrl})`;
  });
  
  // Depois processa URLs diretas
  processedContent = processedContent.replace(urlRegex, (url) => {
    // Ignora URLs que já estão dentro de links Markdown
    if (url.match(/\]\(.*\)$/)) return url;
    
    // Limpa a URL
    const cleanedUrl = cleanUrl(url);
    
    try {
      const domain = new URL(cleanedUrl).hostname;
      return `[${domain}](${cleanedUrl})`;
    } catch {
      return cleanedUrl;
    }
  });
  
  return processedContent;
}

// Função para limpar caracteres repetidos
function cleanRepeatedChars(content: string): string {
  return content.replace(/(.)\1{3,}/g, '$1$1$1');
}

// Função para processar quebras de linha de forma inteligente
function processLineBreaks(content: string): string {
  // Preserva quebras de linha em casos específicos
  return content
    // Remove quebras de linha extras (mais de 2)
    .replace(/\n{3,}/g, '\n\n')
    // Remove espaços extras no início e fim de cada linha
    .split('\n')
    .map(line => line.trim())
    .join('\n');
}

export function MarkdownRenderer({ content, className = '', variant = 'default' }: MarkdownRendererProps) {
  const baseClasses = variant === 'compact' 
    ? 'text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis' 
    : 'whitespace-pre-wrap break-words overflow-hidden overflow-wrap-anywhere prose dark:prose-invert max-w-none leading-tight';

  // Processa o conteúdo para preservar quebras de linha e formatar URLs
  const processedContent = variant === 'compact' 
    ? cleanRepeatedChars(cleanHtml(content).replace(/\n/g, ' '))
    : cleanRepeatedChars(processUrls(processLineBreaks(content)));

  return (
    <div className={`${baseClasses} ${className}`}>
      <ReactMarkdown
        components={{
          a: (props) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className={`${variant === 'compact' ? 'text-blue-500 dark:text-blue-400 inline' : 'text-blue-500 dark:text-blue-400 underline hover:opacity-80 break-all'}`}
            />
          ),
          p: (props) => (
            <p {...props} className={variant === 'compact' ? 'm-0 inline' : 'm-0 mb-3 leading-tight'} />
          ),
          ul: (props) => (
            <ul {...props} className={variant === 'compact' ? 'm-0 list-none inline' : 'list-disc list-inside m-0 leading-none space-y-0 min-h-0 p-0 h-auto'} />
          ),
          ol: (props) => (
            <ol {...props} className={variant === 'compact' ? 'm-0 list-none inline' : 'list-decimal list-inside m-0 leading-none space-y-0 min-h-0 p-0 h-auto'} />
          ),
          li: (props) => (
            <li {...props} className={variant === 'compact' ? 'm-0 inline' : 'm-0 leading-none py-0 min-h-0 h-auto'} />
          ),
          code: (props) => (
            <code {...props} className={variant === 'compact' ? 'bg-gray-100 dark:bg-gray-800 rounded px-1 inline' : 'bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5'} />
          ),
          pre: (props) => (
            <pre {...props} className={variant === 'compact' ? 'm-0 bg-transparent inline' : 'bg-gray-200 dark:bg-gray-700 rounded p-2 m-0 overflow-x-auto whitespace-pre-wrap leading-tight'} />
          ),
          blockquote: (props) => (
            <blockquote {...props} className={variant === 'compact' ? 'm-0 border-l-2 pl-2 inline' : 'border-l-4 border-gray-300 dark:border-gray-600 pl-4 m-0 italic leading-tight'} />
          ),
          h1: (props) => (
            <h1 {...props} className={variant === 'compact' ? 'text-sm font-bold m-0 inline' : 'text-sm font-bold m-0 leading-tight'} />
          ),
          h2: (props) => (
            <h2 {...props} className={variant === 'compact' ? 'text-sm font-bold m-0 inline' : 'text-sm font-bold m-0 leading-tight'} />
          ),
          h3: (props) => (
            <h3 {...props} className={variant === 'compact' ? 'text-sm font-bold m-0 inline' : 'text-sm font-bold m-0 leading-tight'} />
          ),
          h4: (props) => (
            <h4 {...props} className={variant === 'compact' ? 'text-sm font-bold m-0 inline' : 'text-sm font-bold m-0 leading-tight'} />
          ),
          h5: (props) => (
            <h5 {...props} className={variant === 'compact' ? 'text-sm font-bold m-0 inline' : 'text-sm font-bold m-0 leading-tight'} />
          ),
          h6: (props) => (
            <h6 {...props} className={variant === 'compact' ? 'text-sm font-bold m-0 inline' : 'text-sm font-bold m-0 leading-tight'} />
          ),
          table: (props) => (
            <table {...props} className={variant === 'compact' ? 'm-0 inline' : 'border-collapse border border-gray-300 dark:border-gray-600 m-0 w-full leading-tight'} />
          ),
          th: (props) => (
            <th {...props} className={variant === 'compact' ? 'm-0 inline' : 'border border-gray-300 dark:border-gray-600 px-2 py-1 bg-gray-100 dark:bg-gray-700 leading-tight'} />
          ),
          td: (props) => (
            <td {...props} className={variant === 'compact' ? 'm-0 inline' : 'border border-gray-300 dark:border-gray-600 px-2 py-1 leading-tight'} />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
} 