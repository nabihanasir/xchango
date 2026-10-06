import { useState, type ComponentType } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bus,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Dumbbell,
  ExternalLink,
  FlaskConical,
  HeartPulse,
  Home,
  Info,
  Library,
  Mail,
  MapPin,
  Phone,
  Plane,
  Star,
  Stamp,
  Users,
  Utensils,
  Wallet,
  Wifi,
} from 'lucide-react';
import {
  getUniversityProfile,
  type FacilityIcon,
  type IntakeMilestone,
  type UniversityIntake,
  type UniversityProfile,
} from '../../data/universityProfiles';

const DAY = 24 * 60 * 60 * 1000;

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'programmes', label: 'Programmes' },
  { id: 'intakes', label: 'Intakes & timeline' },
  { id: 'costs', label: 'Costs' },
  { id: 'campus', label: 'Campus & living' },
  { id: 'visa', label: 'Visa' },
  { id: 'faq', label: 'FAQ' },
];

const FACILITY_ICONS: Record<FacilityIcon, ComponentType<{ className?: string }>> = {
  library: Library,
  lab: FlaskConical,
  gym: Dumbbell,
  food: Utensils,
  wifi: Wifi,
  health: HeartPulse,
  transport: Bus,
  community: Users,
};

const OWNER_STYLES: Record<IntakeMilestone['owner'], string> = {
  Student: 'bg-amber-50 text-amber-700 ring-amber-200',
  'Riphah RIO': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'Host university': 'bg-sky-50 text-sky-700 ring-sky-200',
  'Embassy / Immigration': 'bg-rose-50 text-rose-700 ring-rose-200',
};

const parseDate = (isoDate: string) => new Date(`${isoDate}T00:00:00`);

const formatDate = (isoDate: string) =>
  parseDate(isoDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const daysUntil = (isoDate: string, now: number) => Math.ceil((parseDate(isoDate).getTime() - now) / DAY);

type IntakeStatus = 'open' | 'closing' | 'full' | 'closed' | 'completed';

const getIntakeStatus = (intake: UniversityIntake, now: number): IntakeStatus => {
  const lastMilestone = intake.milestones[intake.milestones.length - 1];
  if (parseDate(lastMilestone.date).getTime() < now) return 'completed';
  if (intake.seatsTaken >= intake.seatsTotal) return 'full';
  const daysLeft = daysUntil(intake.applicationDeadline, now);
  if (daysLeft < 0) return 'closed';
  return daysLeft <= 21 ? 'closing' : 'open';
};

const STATUS_LABELS: Record<IntakeStatus, { label: string; className: string }> = {
  open: { label: 'Applications open', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  closing: { label: 'Closing soon', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  full: { label: 'Seats full', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  closed: { label: 'Applications closed', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  completed: { label: 'Completed', className: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent-yellow">{eyebrow}</p>
      <h2 className="mt-2 text-dark-blue">{title}</h2>
      {description ? <p className="mt-2 max-w-2xl text-sm text-body-text">{description}</p> : null}
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm md:p-8 ${className}`}>{children}</div>;
}

function Hero({ university }: { university: UniversityProfile }) {
  return (
    <section className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${university.gradient} px-6 pb-20 pt-8 text-white shadow-xl md:px-10`}>
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-accent-yellow/20 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-10 select-none text-[9rem] leading-none opacity-20 md:text-[12rem]">
        {university.flag}
      </div>

      <div className="relative z-10">
        <Link
          to="/dashboard/programmes"
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/90 backdrop-blur transition hover:bg-white/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All universities
        </Link>

        <div className="mt-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
              <MapPin className="h-3.5 w-3.5" />
              {university.city}, {university.country}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
              <Star className="h-3.5 w-3.5 fill-accent-yellow text-accent-yellow" />
              {university.rating} student rating
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-yellow px-3 py-1.5 text-dark-blue">
              Partner university
            </span>
          </div>
          <h1 className="mt-5 text-white">{university.name}</h1>
          <p className="mt-4 max-w-2xl text-base text-white/80 md:text-lg">{university.tagline}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/dashboard/applications/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-accent-yellow px-6 py-3.5 text-sm font-bold text-dark-blue shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-yellow-default"
            >
              Start application
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => document.getElementById('intakes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              <Calendar className="h-4 w-4" />
              View intake timeline
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Timeline({ intake, now }: { intake: UniversityIntake; now: number }) {
  const nextIndex = intake.milestones.findIndex((milestone) => parseDate(milestone.date).getTime() >= now);

  return (
    <ol className="relative">
      {intake.milestones.map((milestone, index) => {
        const isDone = nextIndex === -1 || index < nextIndex;
        const isCurrent = index === nextIndex;
        const isLast = index === intake.milestones.length - 1;
        const daysLeft = daysUntil(milestone.date, now);

        return (
          <li key={milestone.title} className="relative flex gap-4 pb-8 last:pb-0 md:gap-6">
            {!isLast ? (
              <span
                className={`absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`}
                aria-hidden="true"
              />
            ) : null}

            <span
              className={`relative z-10 mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                isDone
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : isCurrent
                    ? 'border-accent-yellow bg-accent-yellow text-dark-blue shadow-glow'
                    : 'border-slate-300 bg-white text-slate-400'
              }`}
            >
              {isDone ? <Check className="h-4 w-4" /> : index + 1}
            </span>

            <div
              className={`flex-1 rounded-2xl border p-4 md:p-5 ${
                isCurrent ? 'border-accent-yellow/60 bg-amber-50/50' : 'border-slate-200/70 bg-slate-50/60'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-dark-blue">{milestone.title}</h4>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(milestone.date)}
                </span>
              </div>
              <p className="mt-2 text-sm text-body-text">{milestone.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${OWNER_STYLES[milestone.owner]}`}>
                  {milestone.owner}
                </span>
                {isCurrent ? (
                  <span className="rounded-full bg-dark-blue px-2.5 py-1 text-xs font-bold text-white">
                    Next up · {daysLeft === 0 ? 'today' : `in ${daysLeft} days`}
                  </span>
                ) : null}
                {isDone ? <span className="text-xs font-bold text-emerald-600">Done</span> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Intakes({ university, now }: { university: UniversityProfile; now: number }) {
  const defaultIntake =
    university.intakes.find((intake) => ['open', 'closing'].includes(getIntakeStatus(intake, now))) || university.intakes[0];
  const [selectedId, setSelectedId] = useState(defaultIntake.id);
  const intake = university.intakes.find((item) => item.id === selectedId) || defaultIntake;
  const status = getIntakeStatus(intake, now);
  const deadlineDays = daysUntil(intake.applicationDeadline, now);
  const seatsLeft = Math.max(0, intake.seatsTotal - intake.seatsTaken);
  const seatPercent = Math.round((intake.seatsTaken / intake.seatsTotal) * 100);

  return (
    <section id="intakes" className="scroll-mt-20">
      <SectionHeading
        eyebrow="Intakes"
        title="Intake timeline"
        description="Every intake follows the same stages. Dates are relative to the first day of classes."
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {university.intakes.map((item) => {
          const itemStatus = getIntakeStatus(item, now);
          const active = item.id === intake.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`rounded-2xl border p-5 text-left transition ${
                active
                  ? 'border-dark-blue bg-dark-blue text-white shadow-lg'
                  : 'border-slate-200/70 bg-white hover:-translate-y-0.5 hover:border-dark-blue/30 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-bold">{item.label}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${active ? 'bg-white/15 text-white ring-white/20' : STATUS_LABELS[itemStatus].className}`}>
                  {STATUS_LABELS[itemStatus].label}
                </span>
              </div>
              <p className={`mt-2 text-xs ${active ? 'text-white/70' : 'text-slate-500'}`}>
                Classes start {formatDate(item.startDate)}
              </p>
            </button>
          );
        })}
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Application deadline</p>
            <p className="mt-1 font-display text-xl font-bold text-dark-blue">{formatDate(intake.applicationDeadline)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {deadlineDays >= 0 ? `${deadlineDays} days left` : `Closed ${Math.abs(deadlineDays)} days ago`}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Semester dates</p>
            <p className="mt-1 font-display text-xl font-bold text-dark-blue">{formatDate(intake.startDate)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">to {formatDate(intake.milestones[intake.milestones.length - 1].date)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Seats</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${STATUS_LABELS[status].className}`}>
                {STATUS_LABELS[status].label}
              </span>
            </div>
            <p className="mt-1 font-display text-xl font-bold text-dark-blue">
              {seatsLeft} <span className="text-sm font-semibold text-slate-500">of {intake.seatsTotal} left</span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-dark-blue to-accent-yellow" style={{ width: `${seatPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Timeline intake={intake} now={now} />
        </div>
      </Card>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-dark-blue">{question}</span>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <p className="px-5 pb-5 text-sm text-body-text">{answer}</p> : null}
    </div>
  );
}

export default function UniversityDetail() {
  const { slug } = useParams<{ slug: string }>();
  const university = getUniversityProfile(slug);
  const [now] = useState(() => Date.now());
  const [activeSection, setActiveSection] = useState('overview');

  if (!university) {
    return <Navigate to="/dashboard/programmes" replace />;
  }

  const goToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      <Hero university={university} />

      <div className="relative z-10 -mt-14 grid grid-cols-2 gap-3 px-2 md:grid-cols-3 md:px-6 lg:grid-cols-6">
        {university.facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl border border-slate-200/60 bg-white p-4 text-center shadow-lg shadow-slate-200/60">
            <p className="font-display text-lg font-bold text-dark-blue">{fact.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{fact.label}</p>
          </div>
        ))}
      </div>

      <div className="sticky top-0 z-20 -mx-1 rounded-2xl border border-slate-200/70 bg-white/90 p-2 shadow-sm backdrop-blur">
        <nav className="flex gap-1 overflow-x-auto">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => goToSection(section.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeSection === section.id ? 'bg-dark-blue text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>This page shows sample information for demonstration. Dates, costs and figures are placeholders and are not official.</p>
      </div>

      <section id="overview" className="scroll-mt-20">
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <SectionHeading eyebrow="Overview" title={`About ${university.shortName}`} />
            <div className="space-y-4 text-body-text">
              {university.about.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Card>
          <Card className="lg:col-span-2">
            <SectionHeading eyebrow="Why study here" title="Highlights" />
            <ul className="space-y-3">
              {university.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-3 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-yellow text-dark-blue">
                    <Check className="h-3 w-3" />
                  </span>
                  {highlight}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section id="programmes" className="scroll-mt-20">
        <SectionHeading
          eyebrow="Programmes"
          title="Programmes open to exchange students"
          description="Choose courses from these programmes. Your advisor approves the final mapping before you leave."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {university.programmes.map((programme) => (
            <div key={programme.name} className="glass-card rounded-3xl p-6">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-dark-blue">{programme.name}</h4>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{programme.level}</span>
              </div>
              <p className="mt-3 text-sm text-body-text">{programme.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
                  <Clock className="h-3.5 w-3.5" /> {programme.duration}
                </span>
                <span className="rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">{programme.language}</span>
                <span className="rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">{programme.credits}</span>
              </div>
            </div>
          ))}
        </div>

        <Card className="mt-6">
          <SectionHeading eyebrow="Eligibility" title="Entry requirements" />
          <ul className="grid gap-3 md:grid-cols-2">
            {university.requirements.map((requirement) => (
              <li key={requirement} className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                {requirement}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <Intakes key={university.slug} university={university} now={now} />

      <section id="costs" className="scroll-mt-20">
        <SectionHeading
          eyebrow="Costs"
          title="Budget and funding"
          description="Approximate costs for one semester. Tuition stays with Riphah, so you pay no tuition at the host university."
        />
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <div className="mb-4 flex items-center gap-2 text-dark-blue">
              <Wallet className="h-5 w-5 text-accent-yellow" />
              <h4>Estimated expenses</h4>
            </div>
            <div className="divide-y divide-slate-100">
              {university.costs.map((cost) => (
                <div key={cost.label} className="flex items-start justify-between gap-4 py-3.5">
                  <div>
                    <p className="font-semibold text-dark-blue">{cost.label}</p>
                    <p className="text-xs text-slate-500">{cost.note}</p>
                  </div>
                  <p className="whitespace-nowrap font-display font-bold text-dark-blue">{cost.amount}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-2 text-dark-blue">
              <Award className="h-5 w-5 text-accent-yellow" />
              <h4>Scholarships</h4>
            </div>
            <div className="space-y-3">
              {university.scholarships.map((scholarship) => (
                <div key={scholarship.label} className="rounded-2xl bg-gradient-to-br from-amber-50 to-white p-4 ring-1 ring-amber-200/60">
                  <p className="font-semibold text-dark-blue">{scholarship.label}</p>
                  <p className="mt-1 font-display text-lg font-bold text-amber-700">{scholarship.amount}</p>
                  <p className="mt-1 text-xs text-slate-500">{scholarship.note}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section id="campus" className="scroll-mt-20">
        <SectionHeading eyebrow="Campus & living" title="Life on campus" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {university.facilities.map((facility) => {
            const Icon = FACILITY_ICONS[facility.icon];
            return (
              <div key={facility.title} className="glass-card rounded-3xl p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-dark-blue text-accent-yellow">
                  <Icon className="h-5 w-5" />
                </span>
                <h4 className="mt-4 text-dark-blue">{facility.title}</h4>
                <p className="mt-2 text-sm text-body-text">{facility.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center gap-2 text-dark-blue">
              <Home className="h-5 w-5 text-accent-yellow" />
              <h4>Accommodation</h4>
            </div>
            <dl className="divide-y divide-slate-100">
              {university.accommodation.map((item) => (
                <div key={item.label} className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="font-semibold text-slate-500">{item.label}</dt>
                  <dd className="text-right font-medium text-dark-blue">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <div className="mb-4 flex items-center gap-2 text-dark-blue">
              <Plane className="h-5 w-5 text-accent-yellow" />
              <h4>Living tips</h4>
            </div>
            <dl className="divide-y divide-slate-100">
              {university.livingTips.map((item) => (
                <div key={item.label} className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="font-semibold text-slate-500">{item.label}</dt>
                  <dd className="max-w-[65%] text-right font-medium text-dark-blue">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </section>

      <section id="visa" className="scroll-mt-20">
        <SectionHeading eyebrow="Visa" title={university.visa.title} description={university.visa.summary} />
        <Card>
          <div className="mb-5 flex items-center gap-2 text-dark-blue">
            <Stamp className="h-5 w-5 text-accent-yellow" />
            <h4>How it works</h4>
          </div>
          <ol className="grid gap-3 md:grid-cols-2">
            {university.visa.steps.map((step, index) => (
              <li key={step} className="flex gap-4 rounded-2xl bg-slate-50 p-4">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-dark-blue text-sm font-bold text-white">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm text-slate-700">{step}</p>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section id="faq" className="scroll-mt-20">
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
        <div className="space-y-3">
          {university.faqs.map((faq) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </section>

      <section className={`overflow-hidden rounded-[2rem] bg-gradient-to-br ${university.gradient} p-8 text-white shadow-xl md:p-10`}>
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-white">Ready to study in {university.city}?</h2>
            <p className="mt-3 max-w-md text-white/80">
              Start your application today. The International Office will guide you through every stage of the timeline.
            </p>
            <Link
              to="/dashboard/applications/new"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-accent-yellow px-6 py-3.5 text-sm font-bold text-dark-blue shadow-lg transition hover:-translate-y-0.5 hover:bg-yellow-default"
            >
              Start application
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3 rounded-3xl bg-white/10 p-6 text-sm backdrop-blur">
            <p className="flex items-center gap-3">
              <Mail className="h-4 w-4 flex-shrink-0" /> {university.contact.email}
            </p>
            <p className="flex items-center gap-3">
              <Phone className="h-4 w-4 flex-shrink-0" /> {university.contact.phone}
            </p>
            <p className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" /> {university.contact.address}
            </p>
            <p className="flex items-center gap-3">
              <ExternalLink className="h-4 w-4 flex-shrink-0" /> {university.contact.website}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
