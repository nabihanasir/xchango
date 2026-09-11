import Navbar from '../components/Navbar';
import HeroBanner from '../components/landing/HeroBanner';
import PillarNav from '../components/landing/PillarNav';
import StatsBand from '../components/landing/StatsBand';
import About from '../components/About';
import Equivalency from '../components/landing/Equivalency';
import Partners from '../components/Partners';
import GlobalVision from '../components/landing/GlobalVision';
import Tips from '../components/landing/Tips';
import Faq from '../components/landing/Faq';
import CTA from '../components/CTA';
import SiteFooter from '../components/landing/SiteFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroBanner />
        {/* Highlight cards overlap the hero, then the page settles into the stats band */}
        <PillarNav />
        <StatsBand />
        <About />
        <Equivalency />
        {/* Student Exchange Programs — search is surfaced high, mirroring a program-finder */}
        <Partners />
        <GlobalVision />
        <Tips />
        <Faq />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  );
}
