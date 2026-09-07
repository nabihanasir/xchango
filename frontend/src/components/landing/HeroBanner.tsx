import { ArrowRight, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Full-bleed photographic banner: campus photo, dark brand scrim, uppercase
 * title and a single supporting line — the opening beat of the page.
 */
export default function HeroBanner() {
  return (
    <section className="relative isolate flex min-h-[78vh] items-center overflow-hidden">
      {/* Campus photograph */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[url('/bg.jpg')] bg-cover bg-center"
      />
      {/* Brand scrim — keeps the headline legible over any part of the photo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-dark-blue/90 via-dark-blue/80 to-dark-blue-deep/95"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-white to-transparent"
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-4xl animate-fade-in-up">
          <p className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.34em] text-accent-yellow">
            <span className="h-px w-10 bg-accent-yellow/70" />
            Riphah International Office
          </p>

          <h1 className="mt-7 text-4xl font-black uppercase leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Education at Riphah
          </h1>

          <p className="mt-7 max-w-2xl text-lg font-medium leading-9 text-white/80 sm:text-xl">
            Decades of scholarship, research and global partnership — within your reach.
          </p>

          <p className="mt-5 max-w-2xl text-base leading-8 text-white/60">
            Riphah International Office connects students to partner universities abroad, guiding credit
            recognition, exchange placements and the academic pathways that follow.
          </p>

          <div className="mt-11 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <a
              href="#exchange"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-yellow px-8 py-4 text-sm font-black text-dark-blue shadow-lg shadow-accent-yellow/25 transition hover:-translate-y-0.5 hover:bg-yellow-default"
            >
              Explore Programmes
              <Compass className="h-4 w-4" />
            </a>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-8 py-4 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              Apply Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
