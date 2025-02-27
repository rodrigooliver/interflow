import { useTranslation } from 'react-i18next';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { Features } from '../components/landing/Features';
import { Pricing } from '../components/landing/Pricing';
import { PublicLayout } from '../layouts/PublicLayout';
import { SocialProof } from '../components/landing/SocialProof';
import { Demonstration } from '../components/landing/Demonstration';
import { FAQ } from '../components/landing/FAQ';
import { FinalCTA } from '../components/landing/FinalCTA';
import { FloatingWhatsApp } from '../components/common/FloatingWhatsApp';

export default function Home() {
  const { t } = useTranslation('landing');

  return (
    <PublicLayout>
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Navbar />
        <main className="relative">
          <Hero />
          <SocialProof />
          <Features />
          <Demonstration />
          <Pricing />
          <FAQ />
          <FinalCTA />
        </main>
        <footer className="bg-gray-50 dark:bg-gray-800 py-12">
          <div className="container mx-auto px-4">
            <p className="text-center text-gray-600 dark:text-gray-400">
              {t('footer.copyright')}
            </p>
          </div>
        </footer>
      </div>
      <FloatingWhatsApp />
    </PublicLayout>
  );
} 