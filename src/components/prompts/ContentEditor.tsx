import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Maximize2 } from 'lucide-react';
import MDEditor, { commands } from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';
import './ContentEditor.css';

interface ContentEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({
  content,
  onChange
}) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'live'>('live');
  const [isExpanded, setIsExpanded] = useState(false);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoing, setIsUndoing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const tempDiv = document.createElement('div');
  const lastChangeTime = useRef(Date.now());

  // Função para adicionar uma alteração ao histórico
  const addToHistory = useCallback((newContent: string) => {
    if (isUndoing) return; // Não adicionar ao histórico durante a operação de desfazer
    
    // Evitar adicionar a mesma entrada consecutivamente
    if (history.length > 0 && history[historyIndex] === newContent) {
      return;
    }
    
    // Se passaram mais de 500ms desde a última alteração, considerar uma nova entrada
    // Isso evita encher o histórico com muitas pequenas alterações próximas
    const now = Date.now();
    if (now - lastChangeTime.current < 500 && history.length > 0) {
      // Substituir a última entrada em vez de adicionar uma nova
      const newHistory = [...history.slice(0, historyIndex), newContent];
      setHistory(newHistory);
      return;
    }
    
    // Criar um novo histórico a partir do ponto atual 
    // (descartando alterações "desfeitas" se estivermos no meio do histórico)
    const newHistory = [...history.slice(0, historyIndex + 1), newContent];
    
    // Limitar o tamanho do histórico para evitar consumo excessivo de memória
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    lastChangeTime.current = now;
  }, [history, historyIndex, isUndoing]);

  // Função para desfazer a última alteração - memoizada com useCallback
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setIsUndoing(true);
      const previousContent = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onChange(previousContent);
      
      // Resetar a flag de desfazer após a operação ser concluída
      setTimeout(() => {
        setIsUndoing(false);
      }, 0);
    }
  }, [history, historyIndex, onChange]);

  // Função para refazer a última alteração desfeita - memoizada com useCallback
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setIsUndoing(true);
      const nextContent = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onChange(nextContent);
      
      // Resetar a flag de desfazer após a operação ser concluída
      setTimeout(() => {
        setIsUndoing(false);
      }, 0);
    }
  }, [history, historyIndex, onChange]);

  // Tratar atalhos de teclado para desfazer/refazer - memoizado com useCallback
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ctrl+Z ou Command+Z (Mac) para desfazer
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undo();
    }
    
    // Ctrl+Shift+Z ou Command+Shift+Z (Mac) para refazer
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
      event.preventDefault();
      redo();
    }
    
    // Ctrl+Y ou Command+Y (Mac) para refazer (alternativa)
    if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
      event.preventDefault();
      redo();
    }
  }, [undo, redo]);

  // Inicializar o histórico quando o componente montar ou quando o conteúdo mudar externamente
  useEffect(() => {
    if (history.length === 0 && content) {
      setHistory([content]);
      setHistoryIndex(0);
    }
  }, [content, history.length]);
  
  // Função auxiliar para verificar se um elemento está dentro de um elemento já formatado
  const isInsideFormattedElement = (element: Element): boolean => {
    let parent = element.parentElement;
    while (parent && parent !== tempDiv) {
      if (
        parent.tagName === 'B' || 
        parent.tagName === 'STRONG' || 
        parent.tagName === 'I' || 
        parent.tagName === 'EM'
      ) {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  };
  
  // Função auxiliar para verificar se um elemento contém tags de negrito
  const containsBoldTag = (element: Element): boolean => {
    return element.querySelector('b, strong') !== null;
  };
  
  // Função auxiliar para verificar se um elemento contém tags de itálico
  const containsItalicTag = (element: Element): boolean => {
    return element.querySelector('i, em') !== null;
  };

  // Função para processar texto puro (sem HTML) e detectar listas
  const processPureText = (text: string): string => {
    // Lista de marcadores comuns
    const listMarkers = ['-', '•', '✓', '✔', '✅', '*', '+', '➢', '➤', '➥', '➔'];
    
    // Pré-processamento para formatação básica
    // Detectar negrito em texto não-processado
    text = text.replace(/\*\*([^*\n]+)\*\*/g, '**$1**');
    text = text.replace(/__([^_\n]+)__/g, '**$1**');
    
    // Detectar itálico em texto não-processado
    text = text.replace(/(?<!\*)\*(?!\*)([^*\n]+)(?<!\*)\*(?!\*)/g, '*$1*');
    text = text.replace(/(?<!_)_(?!_)([^_\n]+)(?<!_)_(?!_)/g, '*$1*');
    
    // Preservar links no formato [texto](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$1]($2)');
    
    // Proteger títulos que contêm hífen para evitar que sejam processados como listas
    // Padrão para títulos com markdown (### Título - Subtítulo)
    const lines = text.split('\n');
    const processedLines = lines.map((line, index, allLines) => {
      // Verificar se a linha é um título markdown
      const isTitleLine = /^#{1,6}\s+.+/.test(line);
      
      // Se for um título com hífen, protegê-lo
      if (isTitleLine && line.includes(' - ')) {
        return line; // Retornar o título sem processamento
      }
      
      // Verificar se é uma linha horizontal (---, ___, ***)
      if (line.trim() === '---' || line.trim() === '___' || line.trim() === '***') {
        return '---';
      }
      
      // Checar padrão de múltiplos hífens juntos que podem formar uma linha horizontal
      if (line.trim().match(/^-{3,}$/) || line.trim().match(/^_{3,}$/) || line.trim().match(/^\*{3,}$/)) {
        return '---';
      }
      
      // Verificar se a linha parece parte de um título junto com a próxima linha
      // Caso comum: "### Título" seguido por "- Subtítulo" em linha separada
      const isPreviousLineTitle = index > 0 && /^#{1,6}\s+.+/.test(allLines[index - 1]);
      if (isPreviousLineTitle && line.trim().startsWith('-') && !line.trim().startsWith('- ')) {
        // É um subtítulo que começa com hífen, não uma lista
        return line;
      }
      
      // Verifica se a linha parece ser um item de lista
      for (const marker of listMarkers) {
        // Localizar posição do marcador
        const markerIndex = line.indexOf(marker);
        if (markerIndex >= 0) {
          // Verificar se é realmente um item de lista (marcador seguido de espaço)
          const afterMarker = line.charAt(markerIndex + 1);
          if (afterMarker === ' ' || afterMarker === '\t') {
            // Verificar se não é parte de uma linha horizontal (---)
            const isPartOfHorizontalLine = 
              marker === '-' && 
              line.trim().match(/^-+$/) && 
              markerIndex === line.trim().indexOf('-');
              
            if (isPartOfHorizontalLine) {
              return '---';
            }
            
            // Ignorar caso seja parte de um título (como "Título - Subtítulo")
            if (marker === '-' && line.indexOf(' - ') === markerIndex) {
              return line;
            }
            
            // Preservar o que vem antes do marcador (incluindo emojis)
            const prefix = line.substring(0, markerIndex).trim();
            // Pegar o texto após o marcador
            const listText = line.substring(markerIndex + 1).trim();
            
            // Retornar o formato correto para listas Markdown
            if (prefix) {
              return `${prefix}\n- ${listText}`;
            } else {
              return `- ${listText}`;
            }
          }
        }
      }
      
      // Se não for um item de lista, retornar a linha original
      return line;
    });
    
    return processedLines.join('\n');
  };
  
  // Função para pós-processamento e limpeza do texto final
  const processPostProcessing = (text: string): string => {
    // Normalizar quebras de linha
    let processed = text.replace(/\r\n/g, '\n');
    
    // Detectar e proteger títulos com hífen
    const lines = processed.split('\n');
    const cleanedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Verificar se é um título com formatação e hífen
      if (isMarkdownTitle(line) && (line.includes(' - ') || line.includes(' – '))) {
        // Preservar o título intacto
        cleanedLines.push(line);
        continue;
      }
      
      // Verificar se é um título seguido por um subtítulo com hífen
      const isPreviousLineTitle = i > 0 && isMarkdownTitle(lines[i - 1]);
      if (isPreviousLineTitle && line.trim().startsWith('-')) {
        // Se a linha anterior for um título e esta linha começar com hífen
        // Juntar as duas linhas (remover quebra de linha acidental)
        const previousLine = cleanedLines.pop() || '';
        cleanedLines.push(`${previousLine} ${line.trim()}`);
        continue;
      }
      
      // Verificar quebras de linha incorretas em títulos com negrito
      if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        // Verificar se a próxima linha começa com um hífen sem espaço após
        const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
        if (nextLine.trim().startsWith('-') && !nextLine.trim().startsWith('- ')) {
          // Juntar as linhas
          cleanedLines.push(`${line} ${nextLine.trim()}`);
          i++; // Pular a próxima linha, pois já foi processada
          continue;
        }
      }
      
      // Adicionar a linha normalmente
      cleanedLines.push(line);
    }
    
    processed = cleanedLines.join('\n');
    
    // Remover linhas em branco extras
    processed = processed.replace(/\n{3,}/g, '\n\n');
    
    // Formatar adequadamente as linhas horizontais
    processed = processed
      // Garantir que linhas horizontais tenham quebras de linha adequadas
      .replace(/([^\n])---([^\n])/g, '$1\n\n---\n\n$2')
      .replace(/([^\n])---\n/g, '$1\n\n---\n')
      .replace(/\n---([^\n])/g, '\n---\n\n$1')
      .replace(/\n{3,}---\n{3,}/g, '\n\n---\n\n');
    
    // Remover linhas horizontais duplicadas
    const processedLines = processed.split('\n');
    const finalLines = [];
    let lastLineWasHR = false;
    
    for (let i = 0; i < processedLines.length; i++) {
      const currentLine = processedLines[i].trim();
      const isHR = currentLine === '---';
      
      // Se esta linha for um separador horizontal e a anterior também,
      // pule esta linha
      if (isHR && lastLineWasHR) {
        continue;
      }
      
      finalLines.push(processedLines[i]);
      lastLineWasHR = isHR;
    }
    
    return finalLines.join('\n');
  };
  
  // Função para processar texto simples que pode conter marcações Markdown
  const processPlainTextWithMarkdown = (text: string): string => {
    // Primeiro, processar como texto puro para detectar listas e formatações básicas
    text = processPureText(text);
    
    // Melhorar a detecção de formatação Markdown
    
    // Preservar negrito já marcado com ** ou __
    text = text.replace(/\*\*([^*\n]+)\*\*/g, '**$1**');
    text = text.replace(/__([^_\n]+)__/g, '**$1**');
    
    // Preservar itálico já marcado com * ou _
    text = text.replace(/(?<!\*)\*(?!\*)([^*\n]+)(?<!\*)\*(?!\*)/g, '*$1*');
    text = text.replace(/(?<!_)_(?!_)([^_\n]+)(?<!_)_(?!_)/g, '*$1*');
    
    // Preservar links no formato [texto](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$1]($2)');
    
    // Preservar código inline
    text = text.replace(/`([^`]+)`/g, '`$1`');
    
    // Fazer pós-processamento para limpeza final
    return processPostProcessing(text);
  };

  // Função para detectar se uma string é um título markdown
  const isMarkdownTitle = (text: string): boolean => {
    return /^#{1,6}\s+.+/.test(text);
  };
  
  // Função para processar mantendo formatação em títulos
  const processMarkdownTitle = (title: string): string => {
    // Se o título contém formatação, preservá-la
    let processedTitle = title;
    
    // Preservar negrito e itálico dentro de títulos
    processedTitle = processedTitle.replace(/\*\*([^*\n]+)\*\*/g, '**$1**');
    processedTitle = processedTitle.replace(/__([^_\n]+)__/g, '**$1**');
    processedTitle = processedTitle.replace(/(?<!\*)\*(?!\*)([^*\n]+)(?<!\*)\*(?!\*)/g, '*$1*');
    processedTitle = processedTitle.replace(/(?<!_)_(?!_)([^_\n]+)(?<!_)_(?!_)/g, '*$1*');
    
    return processedTitle;
  };
  
  // Função para inserir texto na posição do cursor
  const insertAtCursor = useCallback((processedText: string, originalEvent: ClipboardEvent) => {
    const textareaElement = originalEvent.target as HTMLTextAreaElement;
    const cursorPos = textareaElement.selectionStart;
    const cursorEnd = textareaElement.selectionEnd;
    const hasSelection = cursorPos !== cursorEnd;
    const currentContent = content;
    
    let newContent = '';
    
    if (hasSelection) {
      // Se há seleção, substituir apenas o texto selecionado
      newContent = currentContent.substring(0, cursorPos) + 
                  processedText + 
                  currentContent.substring(cursorEnd);
    } else {
      // Se não há seleção, inserir na posição do cursor
      newContent = currentContent.substring(0, cursorPos) + 
                  processedText + 
                  currentContent.substring(cursorPos);
    }
    
    // Adicionar a nova alteração ao histórico
    addToHistory(newContent);
    
    // Atualizar o conteúdo
    onChange(newContent);
    
    // Agora precisamos definir a nova posição do cursor após a operação
    setTimeout(() => {
      const newTextarea = editorRef.current?.querySelector('textarea');
      if (newTextarea) {
        const newPosition = cursorPos + processedText.length;
        newTextarea.setSelectionRange(newPosition, newPosition);
        newTextarea.focus();
      }
    }, 0);
  }, [content, addToHistory, onChange]);

  // Função para processar texto formatado colado
  const processFormattedPaste = (event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    
    // Capturar os diferentes formatos disponíveis
    const htmlData = event.clipboardData.getData('text/html');
    const plainText = event.clipboardData.getData('text/plain');
    
    // Tratamento especial para textos que parecem ter títulos com hífen
    if (plainText.match(/^#{1,6}\s+.*\s+-\s+.*$/m)) {
      // Texto contém títulos com hífen, processar com cuidado
      const lines = plainText.split('\n');
      const processedLines = lines.map((line, index) => {
        if (isMarkdownTitle(line) && (line.includes(' - ') || line.includes(' – '))) {
          return processMarkdownTitle(line);
        }
        
        // Verificar se a linha atual é continuação de um título
        const prevLine = index > 0 ? lines[index - 1] : '';
        if (isMarkdownTitle(prevLine) && line.trim().startsWith('-')) {
          return line;
        }
        
        return line;
      });
      
      const result = processPlainTextWithMarkdown(processedLines.join('\n'));
      insertAtCursor(result, event);
      event.preventDefault();
      return;
    }
    
    // Se for apenas texto simples ou se o texto contiver marcações Markdown
    if (!htmlData || hasMarkdownFormatting(plainText)) {
      // Processar texto simples que pode conter marcações Markdown já existentes
      const result = processPlainTextWithMarkdown(plainText);
      insertAtCursor(result, event);
      event.preventDefault();
      return;
    }
    
    // Limpar códigos extras do Word antes de processar
    let cleanedHtml = htmlData;
    
    // Remover comentários HTML completos (incluindo CSS do Word)
    cleanedHtml = cleanedHtml.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remover tags <style> e seu conteúdo
    cleanedHtml = cleanedHtml.replace(/<style[\s\S]*?<\/style>/gi, '');
    
    // Remover tags <meta> e <link>
    cleanedHtml = cleanedHtml.replace(/<meta[\s\S]*?(?:>|<\/meta>)/gi, '');
    cleanedHtml = cleanedHtml.replace(/<link[\s\S]*?(?:>|<\/link>)/gi, '');
    
    // Remover tags <xml> e <o:> específicas do Word
    cleanedHtml = cleanedHtml.replace(/<xml[\s\S]*?<\/xml>/gi, '');
    cleanedHtml = cleanedHtml.replace(/<o:[^>]*>[\s\S]*?<\/o:[^>]*>/gi, '');
    cleanedHtml = cleanedHtml.replace(/<o:[^>]*\/>/gi, '');
    
    // Remover atributos específicos do Word
    cleanedHtml = cleanedHtml.replace(/\s*mso-[^=]*="[^"]*"/gi, '');
    cleanedHtml = cleanedHtml.replace(/\s*class="Mso[^"]*"/gi, '');
    
    // Remover spans vazios ou que só contêm estilos do Word
    cleanedHtml = cleanedHtml.replace(/<span[^>]*style="[^"]*"[^>]*>\s*<\/span>/gi, '');
    
    // Remover atributos de estilo complexos que não são essenciais
    cleanedHtml = cleanedHtml.replace(/\s*style="[^"]*font-family:[^"]*"/gi, '');
    cleanedHtml = cleanedHtml.replace(/\s*style="[^"]*mso-[^"]*"/gi, '');
    
    // Converter HTML para Markdown
    tempDiv.innerHTML = cleanedHtml;
    
    // Processar formatação antes de tudo para garantir que seja aplicada corretamente
    processFormatting();
    
    // Processar headings
    const processHeadings = () => {
      const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.substring(1));
        const prefix = '#'.repeat(level);
        heading.outerHTML = `${prefix} ${heading.textContent}\n\n`;
      });
    };
    
    // Processar parágrafos
    const processParagraphs = () => {
      const paragraphs = tempDiv.querySelectorAll('p');
      paragraphs.forEach(p => {
        if (p.textContent?.trim()) {
          p.outerHTML = `${p.textContent}\n\n`;
        }
      });
    };
    
    // Processar listas
    const processLists = () => {
      // Listas não ordenadas
      const ulists = tempDiv.querySelectorAll('ul');
      ulists.forEach(ul => {
        const items = ul.querySelectorAll('li');
        let markdown = '';
        items.forEach(item => {
          // Tratamento especial para preservar o conteúdo exato, incluindo emojis e espaços
          const content = item.innerHTML
            .replace(/<[^>]*>/g, '') // Remove tags HTML internas
            .trim();
          markdown += `- ${content}\n`;
        });
        ul.outerHTML = markdown + '\n';
      });
      
      // Listas ordenadas
      const olists = tempDiv.querySelectorAll('ol');
      olists.forEach(ol => {
        const items = ol.querySelectorAll('li');
        let markdown = '';
        items.forEach((item, index) => {
          // Tratamento especial para preservar o conteúdo exato
          const content = item.innerHTML
            .replace(/<[^>]*>/g, '') // Remove tags HTML internas
            .trim();
          markdown += `${index + 1}. ${content}\n`;
        });
        ol.outerHTML = markdown + '\n';
      });
    };
    
    // Processar links
    const processLinks = () => {
      const links = tempDiv.querySelectorAll('a');
      links.forEach(link => {
        const url = link.getAttribute('href') || '';
        
        // Verificar se o link já está no formato Markdown
        const isAlreadyMarkdown = link.textContent?.startsWith('[') && link.textContent?.includes('](');
        
        if (isAlreadyMarkdown) {
          // Se já estiver no formato Markdown, deixar como está
          link.outerHTML = link.textContent || '';
        } else {
          // Caso contrário, converter para Markdown
          // Garantir que o texto do link não contenha Markdown incorreto
          const linkText = link.textContent?.replace(/[[\]()]/g, '') || '';
          link.outerHTML = `[${linkText}](${url})`;
        }
      });
    };
    
    // Processar imagens
    const processImages = () => {
      const images = tempDiv.querySelectorAll('img');
      images.forEach(img => {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        img.outerHTML = `![${alt}](${src})`;
      });
    };
    
    // Processar texto em negrito e itálico
    function processFormatting() {
      // Converter elementos de formatação especiais do Word/Google Docs
      const convertWordFormatting = () => {
        // Buscar elementos com estilos específicos do Word/Google Docs
        const spanElements = tempDiv.querySelectorAll('span[style]');
        spanElements.forEach(span => {
          const style = (span as HTMLElement).style;
          const fontWeight = style.fontWeight;
          const fontStyle = style.fontStyle;
          
          // Negrito
          if (
            fontWeight === 'bold' || 
            fontWeight === '700' || 
            fontWeight === 'bolder' || 
            parseInt(fontWeight) >= 600
          ) {
            span.outerHTML = `**${span.textContent}**`;
          }
          // Itálico
          else if (fontStyle === 'italic' || fontStyle === 'oblique') {
            span.outerHTML = `*${span.textContent}*`;
          }
          // Se não tem formatação especial, manter apenas o texto
          else {
            span.outerHTML = span.textContent || '';
          }
        });
      };
      
      // Converter elementos HTML para Markdown
      // Negrito
      const bolds = tempDiv.querySelectorAll('b, strong, span.bold, span.font-bold, span.font-weight-bold');
      bolds.forEach(bold => {
        // Verificar se já não está dentro de outro elemento formatado
        if (!isInsideFormattedElement(bold)) {
          bold.outerHTML = `**${bold.textContent}**`;
        }
      });
      
      // Itálico
      const italics = tempDiv.querySelectorAll('i, em, span.italic, span.font-italic');
      italics.forEach(italic => {
        // Verificar se já não está dentro de outro elemento formatado
        if (!isInsideFormattedElement(italic)) {
          italic.outerHTML = `*${italic.textContent}*`;
        }
      });
      
      // Processar elementos com classe ou atributos que indicam formatação
      const fontElements = tempDiv.querySelectorAll('font, span');
      fontElements.forEach(el => {
        if (el.nodeType === Node.ELEMENT_NODE) {
          const htmlEl = el as HTMLElement;
          // Verificar atributos como face, size, color
          if (
            htmlEl.getAttribute('face') || 
            htmlEl.getAttribute('size') || 
            htmlEl.getAttribute('color') ||
            htmlEl.style.fontWeight || 
            htmlEl.style.fontStyle
          ) {
            // Aplicar negrito baseado em estilo
            if (
              htmlEl.style.fontWeight === 'bold' || 
              htmlEl.style.fontWeight === '700' || 
              htmlEl.style.fontWeight === 'bolder' || 
              parseInt(htmlEl.style.fontWeight) >= 600
            ) {
              // Se não estiver dentro de outro elemento formatado e não contiver outros elementos formatados
              if (!isInsideFormattedElement(htmlEl) && !containsBoldTag(htmlEl)) {
                htmlEl.outerHTML = `**${htmlEl.textContent}**`;
              }
            }
            // Aplicar itálico baseado em estilo
            else if (
              htmlEl.style.fontStyle === 'italic' || 
              htmlEl.style.fontStyle === 'oblique'
            ) {
              // Se não estiver dentro de outro elemento formatado e não contiver outros elementos formatados
              if (!isInsideFormattedElement(htmlEl) && !containsItalicTag(htmlEl)) {
                htmlEl.outerHTML = `*${htmlEl.textContent}*`;
              }
            }
            // Se não tem formatação útil, manter apenas o texto
            else {
              htmlEl.outerHTML = htmlEl.textContent || '';
            }
          }
        }
      });
      
      // Processar listagem de definições
      const dts = tempDiv.querySelectorAll('dt');
      dts.forEach(dt => {
        dt.outerHTML = `**${dt.textContent}**\n`;
      });
      
      const dds = tempDiv.querySelectorAll('dd');
      dds.forEach(dd => {
        dd.outerHTML = `${dd.textContent}\n\n`;
      });
      
      // Processar citações/blockquotes
      const quotes = tempDiv.querySelectorAll('blockquote, q');
      quotes.forEach(quote => {
        const lines = quote.textContent?.split('\n') || [];
        const quotedText = lines.map(line => `> ${line}`).join('\n');
        quote.outerHTML = `${quotedText}\n\n`;
      });
      
      convertWordFormatting();
    }
    
    // Processar blocos de código
    const processCodeBlocks = () => {
      const codes = tempDiv.querySelectorAll('pre, code');
      codes.forEach(code => {
        if (code.tagName === 'PRE') {
          code.outerHTML = `\`\`\`\n${code.textContent}\n\`\`\`\n\n`;
        } else {
          code.outerHTML = `\`${code.textContent}\``;
        }
      });
    };
    
    // Processar linhas horizontais
    const processHorizontalRules = () => {
      const hrs = tempDiv.querySelectorAll('hr');
      hrs.forEach(hr => {
        hr.outerHTML = '\n---\n';
      });
      
      // Procurar por outros padrões que podem representar linhas horizontais
      const dividers = tempDiv.querySelectorAll('div[role="separator"], div.divider, div.hr');
      dividers.forEach(divider => {
        divider.outerHTML = '\n---\n';
      });
    };
    
    // Aplicar todos os processadores
    processHeadings();
    processParagraphs();
    processLists();
    processLinks();
    processImages();
    processCodeBlocks();
    processHorizontalRules();
    
    // Obter o resultado em markdown
    let markdown = tempDiv.textContent || '';
    
    // Detectar formatação simples de negrito e itálico no texto resultante
    markdown = markdown
      // Converter padrões de negrito claros
      .replace(/\*\*([^*\n]+)\*\*/g, '**$1**')
      .replace(/__([^_\n]+)__/g, '**$1**')
      
      // Converter padrões de itálico claros
      .replace(/(?<!\*)\*(?!\*)([^*\n]+)(?<!\*)\*(?!\*)/g, '*$1*')
      .replace(/(?<!_)_(?!_)([^_\n]+)(?<!_)_(?!_)/g, '*$1*');
    
    // Processar listas de texto plano que podem estar no HTML
    markdown = processPureText(markdown);
    
    // Realizar pós-processamento para limpeza final
    markdown = processPostProcessing(markdown);
    
    // Limpeza final para remover restos de códigos do Word
    markdown = markdown
      // Remover linhas com apenas espaços ou quebras
      .replace(/^\s*$/gm, '')
      // Remover múltiplas quebras de linha consecutivas
      .replace(/\n{3,}/g, '\n\n')
      // Remover espaços em branco no início e fim
      .trim();
    
    // Inserir o markdown na posição do cursor
    insertAtCursor(markdown, event);
    
    // Prevenir o comportamento padrão de colagem
    event.preventDefault();
  };

  // Verificar marcações de negrito, itálico, etc.
  const hasMarkdownFormatting = (text: string): boolean => {
    return text.includes('**') || 
           text.includes('__') || 
           (text.includes('*') && !text.includes('**')) || 
           (text.includes('_') && !text.includes('__')) ||
           (text.includes('[') && text.includes(']('));
  };

  // Função para detectar e preservar títulos formatados no editor
  const handleContentChange = useCallback((value?: string) => {
    if (value === undefined) return;
    
    // Adicionar ao histórico apenas se não for uma operação de desfazer/refazer
    // e se o valor realmente mudou
    if (!isUndoing && value !== content) {
      addToHistory(value);
    }
    
    // Usar diretamente o valor fornecido sem processamento adicional
    // para preservar a posição do cursor
    onChange(value);
  }, [content, isUndoing, addToHistory, onChange]);

  useEffect(() => {
    // Adicionar event listener para o evento de colar
    const editorElement = editorRef.current;
    
    if (editorElement) {
      const textareaElement = editorElement.querySelector('textarea');
      
      if (textareaElement) {
        textareaElement.addEventListener('paste', processFormattedPaste);
        textareaElement.addEventListener('keydown', handleKeyDown);
        
        // Função de limpeza
        return () => {
          textareaElement.removeEventListener('paste', processFormattedPaste);
          textareaElement.removeEventListener('keydown', handleKeyDown);
        };
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo]);

  useEffect(() => {
    // Function to detect theme changes
    const detectThemeChange = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setColorMode(isDarkMode ? 'dark' : 'light');
    };

    // Observer to detect changes to the 'dark' class on the HTML element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          detectThemeChange();
        }
      });
    });

    // Start observation
    observer.observe(document.documentElement, { attributes: true });

    // Detect initial theme
    detectThemeChange();

    // Clean up observer when component is unmounted
    return () => observer.disconnect();
  }, []);

  // Função para detectar e preservar formatação Markdown no conteúdo
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const detectAndPreserveMarkdown = (mdText: string): string => {
    if (!mdText) return '';
    
    // Processar cada linha para preservar formatação
    const lines = mdText.split('\n');
    const processed = lines.map(line => {
      // Preservar negrito
      line = line.replace(/\*\*([^*\n]+)\*\*/g, '**$1**');
      line = line.replace(/__([^_\n]+)__/g, '**$1**');
      
      // Preservar itálico
      line = line.replace(/(?<!\*)\*(?!\*)([^*\n]+)(?<!\*)\*(?!\*)/g, '*$1*');
      line = line.replace(/(?<!_)_(?!_)([^_\n]+)(?<!_)_(?!_)/g, '*$1*');
      
      // Preservar links
      line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$1]($2)');
      
      return line;
    });
    
    return processed.join('\n');
  };

  return (
    <div className={`flex flex-col ${isExpanded ? 'fixed inset-0 z-50 bg-white dark:bg-gray-800' : ''}`}>
      <div className="flex justify-end mb-2 space-x-2">
        <button
          onClick={() => setPreviewMode('edit')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            previewMode === 'edit'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
          }`}
        >
          {t('prompts:editor.editMode', 'Código')}
        </button>
        <button
          onClick={() => setPreviewMode('live')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            previewMode === 'live'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
          }`}
        >
          {t('prompts:editor.liveMode', 'Visualização ao vivo')}
        </button>
        <button
          onClick={() => setPreviewMode('preview')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            previewMode === 'preview'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
          }`}
        >
          {t('prompts:editor.previewMode', 'Pré-visualização')}
        </button>
      </div>
      <div className={`relative flex flex-col ${isExpanded ? 'h-screen' : 'h-[calc(100vh-450px)]'}`} ref={editorRef}>
        <MDEditor
          value={content}
          onChange={handleContentChange}
          height="100%"
          preview={previewMode}
          className="w-full h-full border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors"
          data-color-mode={colorMode}
          visibleDragbar={false}
          previewOptions={{
            rehypePlugins: [[rehypeSanitize]],
            className: 'md-preview-custom',
          }}
          textareaProps={{
            placeholder: t('prompts:form.contentPlaceholder', 'Digite seu conteúdo aqui...'),
          }}
          hideToolbar={previewMode === 'preview'}
          commandsFilter={(cmd) => {
            // Ocultar alguns comandos para simplificar a interface
            if (previewMode === 'preview') return false;
            if (cmd.name === 'help') return false;
            return cmd;
          }}
          commands={[
            {
              ...commands.bold,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.italic,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.strikethrough,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.hr,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.title,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            commands.divider,
            {
              ...commands.link,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.quote,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.code,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.codeBlock,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.image,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            commands.divider,
            {
              ...commands.unorderedListCommand,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.orderedListCommand,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            {
              ...commands.checkedListCommand,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            },
            commands.divider,
            {
              name: 'preview',
              keyCommand: 'preview',
              buttonProps: { 
                'aria-label': t('prompts:togglePreview', 'Alternar visualização'),
                className: `p-1.5 rounded-md transition-colors ${
                  previewMode !== 'edit'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`
              },
              icon: (
                <Eye className="w-4 h-4" />
              ),
              execute: () => {
                setPreviewMode(prevMode => {
                  if (prevMode === 'edit') return 'live';
                  if (prevMode === 'live') return 'preview';
                  return 'edit';
                });
                return true;
              }
            },
            {
              name: 'expand',
              keyCommand: 'expand',
              buttonProps: { 
                'aria-label': t('prompts:toggleFullscreen', 'Alternar tela cheia'),
                className: `p-1.5 rounded-md transition-colors ${
                  isExpanded
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`
              },
              icon: (
                <Maximize2 className="w-4 h-4" />
              ),
              execute: () => {
                setIsExpanded(!isExpanded);
                return true;
              }
            },
            commands.divider,
            {
              ...commands.help,
              buttonProps: {
                className: 'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400'
              }
            }
          ]}
          extraCommands={[]}
        />
        {previewMode !== 'preview' && (
          <div className="absolute bottom-3 right-3 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-md z-10">
            {content.length} {t('prompts:form.characters', 'caracteres')}
          </div>
        )}
      </div>
      <div className="flex-col space-y-1 mt-1 mb-4 hidden sm:flex">
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          <span className="font-medium">{t('prompts:form.tip', 'Dica')}:</span> {t('prompts:form.markdownTip', 'Você pode usar formatação Markdown como')} <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">**{t('prompts:form.bold', 'negrito')}**</code>, <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">*{t('prompts:form.italic', 'itálico')}*</code>, <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">`{t('prompts:form.code', 'código')}`</code>, {t('prompts:form.andMore', 'listas e muito mais')}.
        </p>
      </div>
    </div>
  );
};

export default ContentEditor; 