import { Hero } from '../../components/landing/Hero';
import { Features } from '../../components/landing/Features';
import { Pricing } from '../../components/landing/Pricing';
import { PublicLayout } from '../../layouts/PublicLayout';
import { SocialProof } from '../../components/landing/SocialProof';
import { Demonstration } from '../../components/landing/Demonstration';
import { FAQ } from '../../components/landing/FAQ';
import { FinalCTA } from '../../components/landing/FinalCTA';

export default function Home() {
  return (
    <PublicLayout>
      <main className="relative">
        <Hero />
        <SocialProof />
        <Features />
        <Demonstration />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
    </PublicLayout>
  );
} 