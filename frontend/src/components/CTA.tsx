import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CTA() {
  return (
    <section id="cta" className="px-4 pb-20 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-dark-blue via-dark-blue-light to-slate-900 px-6 py-12 text-white shadow-[0_25px_90px_-35px_rgba(9,6,56,0.7)] sm:px-10 lg:px-14">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.32em] text-accent-yellow">Start Now</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Start Your International Journey Today
              </h2>
              <p className="mt-4 text-base leading-8 text-white/75">
                Sign in to explore your next step, compare partner options, and move forward with confidence through the
                Riphah International Office experience.
              </p>
            </div>

            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-white px-7 py-4 text-sm font-black text-dark-blue transition hover:-translate-y-0.5"
            >
              Login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
