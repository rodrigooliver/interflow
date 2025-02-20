import { Navbar } from '../components/landing/Navbar';
import { ReactNode } from 'react';

interface PublicLayoutProps {
  children: ReactNode;
}

export const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-20">
        {children}
      </div>
    </div>
  );
}; 