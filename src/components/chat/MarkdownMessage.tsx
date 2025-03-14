import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  // Função para processar palavras muito longas
  const processLongWords = (text: string) => {
    // Regex para identificar palavras muito longas (mais de 30 caracteres sem espaços)
    const longWordRegex = /(\S{30,})/g;
    
    return text.replace(longWordRegex, (match) => {
      // Não processar URLs
      if (match.startsWith('http') || match.includes('://')) {
        return match;
      }
      
      // Inserir espaços zero-width para permitir quebra de linha
      let result = '';
      for (let i = 0; i < match.length; i++) {
        result += match[i];
        if (i > 0 && i % 15 === 0 && i < match.length - 1) {
          result += '\u200B'; // Zero-width space
        }
      }
      return result;
    });
  };

  // Processar o conteúdo antes de renderizar
  const processedContent = processLongWords(content);

  return (
    <div className="markdown-message overflow-wrap-anywhere break-words">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => (
            <a 
              {...props} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 dark:text-blue-400 underline hover:opacity-80 break-all"
            />
          ),
          p: (props) => (
            <p {...props} className="whitespace-pre-wrap break-words" />
          ),
          pre: (props) => (
            <pre {...props} className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto my-2" />
          ),
          code: (props) => {
            const { inline, ...rest } = props as { inline?: boolean; [key: string]: any };
            return inline 
              ? <code {...rest} className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" />
              : <code {...rest} className="block overflow-x-auto" />;
          },
          ul: (props) => (
            <ul {...props} className="list-disc pl-5 my-2" />
          ),
          ol: (props) => (
            <ol {...props} className="list-decimal pl-5 my-2" />
          ),
          li: (props) => (
            <li {...props} className="my-1" />
          ),
          blockquote: (props) => (
            <blockquote {...props} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-1 my-2 italic" />
          ),
          hr: (props) => (
            <hr {...props} className="my-4 border-gray-300 dark:border-gray-600" />
          ),
          img: (props) => (
            <img {...props} className="max-w-full h-auto rounded my-2" />
          ),
          table: (props) => (
            <div className="overflow-x-auto my-2">
              <table {...props} className="min-w-full border border-gray-300 dark:border-gray-600" />
            </div>
          ),
          th: (props) => (
            <th {...props} className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-800" />
          ),
          td: (props) => (
            <td {...props} className="border border-gray-300 dark:border-gray-600 px-4 py-2" />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
} 