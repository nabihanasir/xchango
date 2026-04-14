import About from '../components/About';
import CTA from '../components/CTA';
import Features from '../components/Features';
import Hero from '../components/Hero';
import Navbar from '../components/Navbar';
import Partners from '../components/Partners';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,210,19,0.12),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_45%,_#f8fafc_100%)]">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Partners />
        <Features />
        <CTA />
      </main>
    </div>
  );
}
