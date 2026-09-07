import { ArrowRight, ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Slide {
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
}

/** One slide per flagship partner destination, reusing the same photos shown in the exchange dashboard. */
const slides: Slide[] = [
  {
    image: '/bg.jpg',
    eyebrow: 'Riphah International Office',
    title: 'Education at Riphah',
    subtitle: 'Decades of scholarship, research and global partnership — within your reach.',
    description:
      'Riphah International Office connects students to partner universities abroad, guiding credit recognition, exchange placements and the academic pathways that follow.',
  },
  {
    image: 'https://images.unsplash.com/photo-1546874177-9e664107314e?q=80&w=1600&auto=format&fit=crop',
    eyebrow: '#StudyInSouthKorea',
    title: 'Smart Computing at Kyungdong',
    subtitle: 'A modern computing pathway built for future-facing technology careers.',
    description:
      'Kyungdong University Global pairs Riphah students with AI, robotics and cybersecurity coursework recognised back home through a standing credit agreement.',
  },
  {
    image: 'https://cdn.britannica.com/49/102749-050-B4874C95/Kuala-Lumpur-Malaysia.jpg?w=1600',
    eyebrow: '#StudyInMalaysia',
    title: 'Digital Futures at Multimedia University',
    subtitle: 'Broad computing and IT pathways for high-demand careers, in Cyberjaya.',
    description:
      'From ethical hacking to blockchain, Multimedia University offers specialisation areas that map directly onto Riphah’s computing degrees.',
  },
  {
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1600&auto=format&fit=crop',
    eyebrow: '#StudyInTurkiye',
    title: 'Engineering Systems at Istanbul Aydin',
    subtitle: 'Applied systems thinking, taught across a global academic bridge.',
    description:
      'A partnership built around computer engineering and MIS — algorithms, computer vision and data mining, all weighed against the Riphah catalogue.',
  },
];

const AUTOPLAY_MS = 3000;

/**
 * Full-bleed photographic hero carousel — one slide per flagship destination,
 * with arrow controls and dot indicators. Bottom padding leaves clearance for
 * the PillarNav card strip that overlaps it.
 */
export default function HeroBanner() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((next: number) => {
    setIndex((next + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <section
      className="relative isolate flex min-h-[70vh] items-center overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide photographs, cross-fading by opacity */}
      {slides.map((slide, slideIndex) => (
        <div
          key={slide.title}
          aria-hidden={slideIndex !== index}
          style={{ backgroundImage: `url('${slide.image}')` }}
          className={`absolute inset-0 -z-20 bg-cover bg-center transition-opacity duration-1000 ${
            slideIndex === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      {/* Light blue wash — brightens the photo instead of blacking it out */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-dark-blue/20" />
      {/* Left-side gradient — just enough contrast to keep the headline readable */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-dark-blue/75 via-dark-blue/35 to-transparent"
      />
      {/* Top gradient — keeps the floating nav legible against any part of the photo */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-dark-blue-deep/60 to-transparent"
      />

      <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-32 sm:px-6 sm:pb-32 sm:pt-40 lg:px-8">
        <div key={index} className="max-w-4xl animate-fade-in-up">
          <p className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.34em] text-accent-yellow">
            <span className="h-px w-10 bg-accent-yellow/70" />
            {slides[index].eyebrow}
          </p>

          <h1 className="mt-7 text-4xl font-black uppercase leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {slides[index].title}
          </h1>

          <p className="mt-7 max-w-2xl text-lg font-medium leading-9 text-white/80 sm:text-xl">
            {slides[index].subtitle}
          </p>

          <p className="mt-5 max-w-2xl text-base leading-8 text-white/60">
            {slides[index].description}
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

      {/* Arrow controls */}
      <button
        type="button"
        onClick={() => goTo(index - 1)}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:flex lg:left-8"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={() => goTo(index + 1)}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:flex lg:right-8"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2.5">
        {slides.map((slide, slideIndex) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => goTo(slideIndex)}
            aria-label={`Go to slide ${slideIndex + 1}`}
            aria-current={slideIndex === index}
            className={`h-2.5 rounded-full transition-all ${
              slideIndex === index ? 'w-7 bg-accent-yellow' : 'w-2.5 bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
