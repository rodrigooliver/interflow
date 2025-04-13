import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  backLink?: string;
  backText?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  description,
  backLink = '/app/admin',
  backText = 'Voltar'
}) => {
  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb / Voltar */}
          <div className="mb-4">
            <Link
              to={backLink}
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {backText}
            </Link>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-4xl">
              {description}
            </p>
          )}
        </div>
      </header>
      
      {/* Conteúdo */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export { AdminLayout }; 