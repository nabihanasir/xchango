import { ArrowRight, Compass, GraduationCap, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { rioStats } from '../data/rioContent';

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 lg:px-8 lg:pb-28 lg:pt-16">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-10 h-64 w-64 rounded-full bg-accent-yellow/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-dark-blue/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-cyan-200/20 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-yellow/50 bg-white/80 px-4 py-2 text-sm font-semibold text-dark-blue shadow-soft">
            <Sparkles className="h-4 w-4 text-yellow-default" />
            International pathways powered by RIO
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.02] tracking-tight text-head-text sm:text-6xl">
            Riphah International Office
          </h1>
          <p className="mt-4 max-w-2xl text-xl font-semibold text-dark-blue/80">
            Connecting Students to Global Opportunities
          </p>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Discover exchange opportunities, international collaborations, and career-shaping academic pathways through
            Riphah’s global partner network. RIO helps students build exposure beyond borders with guided mobility and
            future-ready learning.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#partners"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-dark-blue to-dark-blue-light px-7 py-4 text-sm font-bold text-white shadow-lg shadow-dark-blue/25 transition hover:-translate-y-0.5"
            >
              Explore Programs
              <Compass className="h-4 w-4" />
            </a>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-4 text-sm font-bold text-dark-blue shadow-soft transition hover:-translate-y-0.5 hover:border-dark-blue"
            >
              Login
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-yellow to-yellow-default px-7 py-4 text-sm font-bold text-dark-blue shadow-lg shadow-accent-yellow/25 transition hover:-translate-y-0.5"
            >
              Sign Up
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {rioStats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-soft backdrop-blur">
                <p className="text-2xl font-black text-dark-blue">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative animate-fade-in-up lg:pl-8">
          <div className="absolute -left-4 top-10 hidden h-24 w-24 rounded-[2rem] bg-accent-yellow/70 blur-2xl sm:block" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_25px_80px_-25px_rgba(9,6,56,0.35)] backdrop-blur-xl">
            <div className="rounded-[1.75rem] bg-gradient-to-br from-dark-blue via-dark-blue-light to-slate-900 p-8 text-white">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/60">Global Student Mobility</p>
                  <p className="mt-1 text-lg font-bold">Explore partner pathways</p>
                </div>
                <GraduationCap className="h-8 w-8 text-accent-yellow" />
              </div>

              <div className="mt-6 space-y-4">
                {[
                  'International collaborations and strategic partnerships',
                  'Student exchange and progression opportunities',
                  'Exposure to emerging courses in AI, robotics, security, and data',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent-yellow" />
                    <p className="text-sm leading-6 text-white/85">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.26em] text-white/60">Countries</p>
                  <p className="mt-2 text-3xl font-black">3</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.26em] text-white/60">Specializations</p>
                  <p className="mt-2 text-3xl font-black">16+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
