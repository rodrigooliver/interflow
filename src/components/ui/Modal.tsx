import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Estado para indicar se o componente está montado
  const [isMounted, setIsMounted] = useState(false);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

  // Efeito para montar o componente
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Criar o elemento do portal ao montar o componente
  useEffect(() => {
    if (!isMounted) return;
    
    // Verificar se já existe um portal-root
    let portalRoot = document.getElementById('portal-root');
    
    // Se não existir, criar um
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = 'portal-root';
      document.body.appendChild(portalRoot);
    }
    
    setModalRoot(portalRoot);
    
    return () => {
      // Não removemos o portal-root aqui para que ele persista entre renderizações
    };
  }, [isMounted]);
  
  // Efeito para lidar com o estado do modal
  useEffect(() => {
    if (!isMounted) return;
    
    if (isOpen) {
      // Adicionar estilo ao body para evitar rolagem
      document.body.style.overflow = 'hidden';
    } else {
      // Remover estilo do body quando o modal for fechado
      document.body.style.overflow = '';
    }
    
    // Cleanup
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMounted]);

  // Se o modal não estiver aberto ou não tivermos o modalRoot, não renderiza nada
  if (!isOpen || !modalRoot || !isMounted) {
    return null;
  }

  // Função para fechar o modal ao clicar no backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Elemento a ser renderizado
  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4 modal-backdrop"
      onClick={handleBackdropClick}
      data-testid="modal-backdrop"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-[90%] md:max-w-lg lg:max-w-xl min-w-[300px] w-full shadow-xl dark:shadow-gray-900/50 mx-4 modal-content"
        onClick={e => e.stopPropagation()}
        data-testid="modal-content"
      >
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold dark:text-gray-200">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors text-2xl leading-none"
              data-testid="modal-close-button"
            >
              &times;
            </button>
          </div>
        )}
        <div className="dark:text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );

  // Usar createPortal para renderizar o modal no portal-root
  return createPortal(modalContent, modalRoot);
} 