import { ReactNode } from 'react';
import { Navbar } from '../components/landing/Navbar';
import { Footer } from '../components/common/Footer';
import { FloatingWhatsApp } from '../components/common/FloatingWhatsApp';
interface PublicLayoutProps {
  children: ReactNode;
}

export const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen mobile-container">
      <Navbar />
      {children}
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}; 