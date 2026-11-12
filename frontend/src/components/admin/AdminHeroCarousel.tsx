import { useEffect, useMemo, useState } from 'react';
import { useCatalog } from '../../hooks/useCatalog';
import type { AdminStatCard } from '../../lib/adminApi';

interface Slide {
  image: string;
  label: string;
}

/** Shown until (or unless) admins have added country photos in the catalog. */
const fallbackSlides: Slide[] = [
  { image: '/bg.jpg', label: 'Riphah International Office' },
  { image: 'https://images.unsplash.com/photo-1546874177-9e664107314e?q=80&w=1600&auto=format&fit=crop', label: 'South Korea' },
  { image: 'https://cdn.britannica.com/49/102749-050-B4874C95/Kuala-Lumpur-Malaysia.jpg?w=1600', label: 'Malaysia' },
  { image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1600&auto=format&fit=crop', label: 'Türkiye' },
];

const AUTOPLAY_MS = 2000;

const statValue = (stats: AdminStatCard[], title: string) =>
  stats.find((stat) => stat.title.toLowerCase() === title.toLowerCase())?.value;

/**
 * Welcome banner for the admin dashboard: cross-fading photos of partner countries,
 * a dark overlay, and a scrolling ticker of what we offer plus live admission stats.
 */
export default function AdminHeroCarousel({ stats }: { stats: AdminStatCard[] }) {
  const { countries, universities } = useCatalog();
  const [index, setIndex] = useState(0);

  const slides = useMemo<Slide[]>(() => {
    const fromCatalog = countries
      .filter((country) => country.isActive !== false && country.image)
      .map((country) => ({ image: country.image as string, label: country.name }));
    return fromCatalog.length > 0 ? fromCatalog : fallbackSlides;
  }, [countries]);

  const facts = useMemo(() => {
    const items: string[] = [];
    const activeCountries = countries.filter((country) => country.isActive !== false).length;
    if (activeCountries) items.push(`${activeCountries} partner countries`);
    if (universities.length) items.push(`${universities.length} partner universities`);
    const total = statValue(stats, 'Total Applications');
    const approved = statValue(stats, 'Approved');
    const pending = statValue(stats, 'Pending');
    if (total) items.push(`${total} applications received`);
    if (approved) items.push(`${approved} admissions approved`);
    if (pending) items.push(`${pending} awaiting review`);
    items.push(
      'Credit transfer and course equivalency',
      'Exam verification by country advisors',
      'Visa guidance from application to arrival',
      'Exchange placements at partner universities abroad',
    );
    return items;
  }, [countries, universities, stats]);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % slides.length), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  const active = slides[index % slides.length];

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] shadow-2xl shadow-black/20">
      {slides.map((slide, slideIndex) => (
        <div
          key={`${slide.label}-${slideIndex}`}
          aria-hidden={slideIndex !== index}
          style={{ backgroundImage: `url('${slide.image}')` }}
          className={`absolute inset-0 -z-20 scale-105 bg-cover bg-center transition-opacity duration-1000 ${
            slideIndex === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-admin-deep/60" />

      <div className="flex min-h-[260px] flex-col justify-between p-8 lg:p-10">
        <div key={index} className="animate-fade-in-up">
          <h2 className="mb-2 text-[2.5rem] font-bold leading-none tracking-tight text-white">Welcome Back, Admin!</h2>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-accent-yellow">{active.label}</p>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex gap-2">
            {slides.map((slide, slideIndex) => (
              <button
                key={`${slide.label}-dot-${slideIndex}`}
                type="button"
                onClick={() => setIndex(slideIndex)}
                aria-label={`Show ${slide.label}`}
                className={`h-1.5 rounded-full transition-all ${
                  slideIndex === index ? 'w-7 bg-accent-yellow' : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>

          <div className="overflow-hidden rounded-full border border-white/15 bg-black/30 py-2.5 backdrop-blur-sm">
            <div className="flex w-max animate-marquee whitespace-nowrap hover:[animation-play-state:paused]">
              {[0, 1].map((copy) => (
                <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
                  {facts.map((fact) => (
                    <span key={`${copy}-${fact}`} className="flex items-center text-sm font-semibold text-white">
                      <span className="mx-5 h-1.5 w-1.5 rounded-full bg-accent-yellow" />
                      {fact}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
