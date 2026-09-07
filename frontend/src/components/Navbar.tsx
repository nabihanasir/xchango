import { ArrowRight, Globe2, Mail, Menu, Phone, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const navItems = [
  { label: 'About', href: '#about' },
  { label: 'Equivalency', href: '#equivalency' },
  { label: 'Exchange Programs', href: '#exchange' },
  { label: 'Vision', href: '#vision' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#cta' },
];

/**
 * Fixed header that floats transparently over the hero photo — logo and
 * links in white — then swaps to a solid white bar once the page scrolls
 * past the hero, matching the reference site's overlaid-nav slideshow look.
 */
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const solid = scrolled || menuOpen;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid ? 'border-b border-white/40 bg-white/90 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      {/* Utility strip — contact details and a quick jump to applications */}
      <div
        className={`hidden px-4 transition-colors duration-300 sm:block lg:px-8 ${
          solid ? 'bg-dark-blue-deep text-white' : 'bg-black/10 text-white backdrop-blur-sm'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between py-2 text-xs font-medium">
          <div className="flex items-center gap-6 text-white/80">
            <a href="mailto:rio@riphah.edu.pk" className="flex items-center gap-2 transition hover:text-white">
              <Mail className="h-3.5 w-3.5" />
              rio@riphah.edu.pk
            </a>
            <span className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              +92 51 111 510 510
            </span>
          </div>
          <a href="#exchange" className="flex items-center gap-1.5 font-black uppercase tracking-[0.18em] text-accent-yellow transition hover:text-yellow-default">
            Explore Programmes
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg transition-colors duration-300 ${
              solid ? 'bg-gradient-to-br from-dark-blue to-dark-blue-light text-white shadow-dark-blue/20' : 'bg-white/15 text-white shadow-black/10 backdrop-blur'
            }`}
          >
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <p className={`text-sm font-black uppercase tracking-[0.24em] transition-colors duration-300 ${solid ? 'text-dark-blue' : 'text-white'}`}>
              Riphah
            </p>
            <p className={`text-sm font-medium transition-colors duration-300 ${solid ? 'text-slate-500' : 'text-white/70'}`}>
              International Office
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`text-sm font-semibold transition-colors duration-300 ${
                solid ? 'text-slate-600 hover:text-dark-blue' : 'text-white/85 hover:text-white'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/signup"
            className="rounded-full bg-gradient-to-r from-accent-yellow to-yellow-default px-5 py-2.5 text-sm font-semibold text-dark-blue shadow-lg shadow-accent-yellow/25 transition hover:-translate-y-0.5"
          >
            Sign Up
          </Link>
          <Link
            to="/login"
            className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition duration-300 ${
              solid
                ? 'border-slate-200 text-dark-blue hover:border-dark-blue hover:bg-slate-50'
                : 'border-white/40 text-white hover:bg-white/10'
            }`}
          >
            Login
          </Link>
        </div>

        <button
          type="button"
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors duration-300 md:hidden ${
            solid ? 'border-slate-200 text-dark-blue' : 'border-white/40 text-white'
          }`}
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-dark-blue"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/signup"
              className="rounded-2xl bg-gradient-to-r from-accent-yellow to-yellow-default px-4 py-3 text-center text-sm font-semibold text-dark-blue"
              onClick={() => setMenuOpen(false)}
            >
              Sign Up
            </Link>
            <Link
              to="/login"
              className="rounded-2xl bg-dark-blue px-4 py-3 text-center text-sm font-semibold text-white"
              onClick={() => setMenuOpen(false)}
            >
              Login
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
