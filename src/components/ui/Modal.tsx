import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-[90%] md:max-w-lg lg:max-w-xl min-w-[300px] w-full shadow-xl dark:shadow-gray-900/50 mx-4">
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold dark:text-gray-200">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              ×
            </button>
          </div>
        )}
        <div className="dark:text-gray-300">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
} 