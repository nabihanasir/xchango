import Navbar from '../components/Navbar';
import HeroBanner from '../components/landing/HeroBanner';
import StatsBand from '../components/landing/StatsBand';
import PillarNav from '../components/landing/PillarNav';
import About from '../components/About';
import Equivalency from '../components/landing/Equivalency';
import Partners from '../components/Partners';
import GlobalVision from '../components/landing/GlobalVision';
import Tips from '../components/landing/Tips';
import CTA from '../components/CTA';
import SiteFooter from '../components/landing/SiteFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroBanner />
        <StatsBand />
        <PillarNav />
        <About />
        <Equivalency />
        {/* Student Exchange Programs */}
        <Partners />
        <GlobalVision />
        <Tips />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  );
}
