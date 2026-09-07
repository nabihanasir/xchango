import { Facebook, Globe2, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FooterLink {
  label: string;
  /** In-page anchor. */
  href?: string;
  /** Router destination. */
  to?: string;
}

const columns: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'Explore',
    links: [
      { label: 'About RIO', href: '#about' },
      { label: 'Equivalency and Recognition', href: '#equivalency' },
      { label: 'Student Exchange Programs', href: '#exchange' },
      { label: 'Global Education Vision', href: '#vision' },
      { label: 'Frequently Asked Questions', href: '#faq' },
    ],
  },
  {
    heading: 'Students',
    links: [
      { label: 'Apply Now', to: '/signup' },
      { label: 'Student Login', to: '/login' },
      { label: 'Reset Password', to: '/forgot-password' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-dark-blue-deep px-4 pb-10 pt-20 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-yellow text-dark-blue">
                <Globe2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.24em]">Riphah</p>
                <p className="text-sm text-white/50">International Office</p>
              </div>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-7 text-white/50">
              Connecting Riphah students to partner universities abroad — from first enquiry through credit
              recognition.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <h3 className="text-xs font-black uppercase tracking-[0.24em] text-accent-yellow">
                {column.heading}
              </h3>
              <ul className="mt-6 space-y-3.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to} className="text-sm text-white/60 transition hover:text-white">
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} className="text-sm text-white/60 transition hover:text-white">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.24em] text-accent-yellow">Contact</h3>
            <ul className="mt-6 space-y-4 text-sm text-white/60">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
                Riphah International University, Islamabad, Pakistan
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
                <a href="mailto:rio@riphah.edu.pk" className="transition hover:text-white">
                  rio@riphah.edu.pk
                </a>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
                +92 51 111 510 510
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/35">
            © {new Date().getFullYear()} Riphah International Office. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-white/35">
            <Facebook className="h-4 w-4" aria-hidden="true" />
            <Instagram className="h-4 w-4" aria-hidden="true" />
            <Linkedin className="h-4 w-4" aria-hidden="true" />
            <Youtube className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="text-xs text-white/35">Xchango — student mobility platform</p>
        </div>
      </div>
    </footer>
  );
}
