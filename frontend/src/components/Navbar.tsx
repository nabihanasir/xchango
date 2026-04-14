import { Globe2, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const navItems = [
  { label: 'About', href: '#about' },
  { label: 'Partners', href: '#partners' },
  { label: 'Features', href: '#features' },
  { label: 'Contact', href: '#cta' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-dark-blue to-dark-blue-light text-white shadow-lg shadow-dark-blue/20">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-dark-blue">Riphah</p>
            <p className="text-sm font-medium text-slate-500">International Office</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-semibold text-slate-600 transition hover:text-dark-blue">
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
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-dark-blue transition hover:border-dark-blue hover:bg-slate-50"
          >
            Login
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-dark-blue md:hidden"
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
