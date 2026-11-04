import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building, CheckCircle2, GraduationCap, Globe, Loader2, Pencil, Plus, Search, Sparkles, X } from 'lucide-react';
import DataTable from '../../components/admin/DataTable';
import {
  Section,
  RowsEditor,
  TextListEditor,
  fieldClass,
  labelClass,
  type Confidence,
} from '../../components/admin/EditorFields';
import CountryFlag from '../../components/CountryFlag';
import Modal from '../../components/Modal';
import Notice from '../../components/Notice';
import {
  adminApi,
  type AdminUserRecord,
  type ScrapeUniversityResult,
  type UniversityRecord,
  type UniversitySavePayload,
} from '../../lib/adminApi';
import { WORLD_COUNTRIES, flagEmoji, searchWorldCountries, type WorldCountry } from '../../data/worldCountries';
import type {
  UniversityCost,
  UniversityFact,
  UniversityFaq,
  UniversityFacility,
  UniversityProgramme,
} from '../../types/university';

// ---------------------------------------------------------------------------------------------------------------
// Form model
// ---------------------------------------------------------------------------------------------------------------

interface IntakeForm {
  id: string;
  label: string;
  season: 'Spring' | 'Fall';
  startDate: string;
  applicationDeadline: string;
  seatsTotal: string;
  seatsTaken: string;
  milestones: unknown[];
}

interface UniversityForm {
  id: string | null;
  country: { name: string; code: string; flag: string } | null;
  countryImage: string;
  name: string;
  shortName: string;
  website: string;
  seatLimit: string;
  city: string;
  region: string;
  tagline: string;
  image: string;
  about: string[];
  facts: UniversityFact[];
  highlights: string[];
  programmes: UniversityProgramme[];
  intakes: IntakeForm[];
  costs: UniversityCost[];
  scholarships: UniversityCost[];
  facilities: UniversityFacility[];
  accommodation: UniversityFact[];
  livingTips: UniversityFact[];
  requirements: string[];
  visaTitle: string;
  visaSummary: string;
  visaSteps: string[];
  faqs: UniversityFaq[];
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  advisorIds: string[];
}

const emptyForm = (): UniversityForm => ({
  id: null,
  country: null,
  countryImage: '',
  name: '',
  shortName: '',
  website: '',
  seatLimit: '',
  city: '',
  region: '',
  tagline: '',
  image: '',
  about: [''],
  facts: [],
  highlights: [],
  programmes: [],
  intakes: [],
  costs: [],
  scholarships: [],
  facilities: [],
  accommodation: [],
  livingTips: [],
  requirements: [],
  visaTitle: '',
  visaSummary: '',
  visaSteps: [],
  faqs: [],
  contactEmail: '',
  contactPhone: '',
  contactAddress: '',
  advisorIds: [],
});

const blankFact = (): UniversityFact => ({ label: '', value: '' });
const blankCost = (): UniversityCost => ({ label: '', amount: '', note: '' });
const blankProgramme = (): UniversityProgramme => ({ name: '', level: 'Bachelor', duration: '', language: 'English', credits: '', description: '' });
const blankFacility = (): UniversityFacility => ({ title: '', description: '', icon: 'community' });
const blankFaq = (): UniversityFaq => ({ question: '', answer: '' });
const blankIntake = (): IntakeForm => ({
  id: '',
  label: '',
  season: 'Fall',
  startDate: '',
  applicationDeadline: '',
  seatsTotal: '',
  seatsTaken: '0',
  milestones: [],
});

const formFromRecord = (record: UniversityRecord): UniversityForm => ({
  id: record._id,
  country: record.countryId
    ? { name: record.countryId.name, code: record.countryId.code, flag: record.countryId.flag || flagEmoji(record.countryId.code) }
    : null,
  countryImage: record.countryId?.image || '',
  name: record.name,
  shortName: record.shortName || '',
  website: record.website || '',
  seatLimit: String(record.seatLimit ?? ''),
  city: record.city || '',
  region: record.region || '',
  tagline: record.tagline || '',
  image: record.image || '',
  about: record.about?.length ? record.about : [''],
  facts: record.facts ?? [],
  highlights: record.highlights ?? [],
  programmes: record.programmes ?? [],
  intakes: (record.intakes ?? []).map((intake) => ({
    id: intake.id,
    label: intake.label,
    season: intake.season,
    startDate: intake.startDate,
    applicationDeadline: intake.applicationDeadline,
    seatsTotal: String(intake.seatsTotal ?? ''),
    seatsTaken: String(intake.seatsTaken ?? 0),
    milestones: intake.milestones ?? [],
  })),
  costs: record.costs ?? [],
  scholarships: record.scholarships ?? [],
  facilities: record.facilities ?? [],
  accommodation: record.accommodation ?? [],
  livingTips: record.livingTips ?? [],
  requirements: record.requirements ?? [],
  visaTitle: record.visa?.title || '',
  visaSummary: record.visa?.summary || '',
  visaSteps: record.visa?.steps ?? [],
  faqs: record.faqs ?? [],
  contactEmail: record.contact?.email || '',
  contactPhone: record.contact?.phone || '',
  contactAddress: record.contact?.address || '',
  advisorIds: record.advisorIds ?? [],
});

const payloadFromForm = (form: UniversityForm, status: 'draft' | 'published'): UniversitySavePayload => ({
  ...(form.country ? { country: form.country } : {}),
  countryImage: form.countryImage,
  name: form.name,
  shortName: form.shortName,
  website: form.website,
  seatLimit: Number(form.seatLimit) || 0,
  status,
  city: form.city,
  region: form.region,
  tagline: form.tagline,
  image: form.image,
  about: form.about,
  facts: form.facts,
  highlights: form.highlights,
  programmes: form.programmes,
  intakes: form.intakes.map((intake) => ({
    ...intake,
    seatsTotal: Number(intake.seatsTotal) || 0,
    seatsTaken: Number(intake.seatsTaken) || 0,
  })) as UniversitySavePayload['intakes'],
  costs: form.costs,
  scholarships: form.scholarships,
  facilities: form.facilities,
  accommodation: form.accommodation,
  livingTips: form.livingTips,
  requirements: form.requirements,
  visa: { title: form.visaTitle, summary: form.visaSummary, steps: form.visaSteps },
  faqs: form.faqs,
  contact: { email: form.contactEmail, phone: form.contactPhone, address: form.contactAddress, website: form.website },
  advisorIds: form.advisorIds,
});

/** Mirrors the server's publish rules so the admin sees what is missing before pressing Publish. */
const publishIssues = (form: UniversityForm, hostCourseCount: number): string[] => {
  const issues: string[] = [];
  if (!form.country) issues.push('Country');
  if (!form.name.trim()) issues.push('University name');
  if (!form.shortName.trim()) issues.push('Short code (e.g. MMU)');
  if (!form.city.trim()) issues.push('City');
  if (!form.website.trim()) issues.push('Website');
  if (!form.contactEmail.trim()) issues.push('Contact email');
  if (!(Number(form.seatLimit) > 0)) issues.push('Seat limit above zero');
  if (!form.intakes.length) issues.push('At least one intake');
  if (!form.programmes.some((programme) => programme.name.trim())) issues.push('At least one programme');
  if (hostCourseCount < 1) issues.push('At least one host course (add it under Home Courses → Host Courses)');
  if (!form.advisorIds.length) issues.push('At least one advisor for this country');
  return issues;
};

const asList = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const asText = (value: unknown) => (typeof value === 'string' ? value : '');

/** Copies scraped values into the form, but only where the admin has not typed anything yet. */
const applyScrape = (form: UniversityForm, result: ScrapeUniversityResult): UniversityForm => {
  const f = result.fields;
  const contact = (f.contact ?? {}) as Record<string, string>;
  const visa = (f.visa ?? {}) as { title?: string; summary?: string; steps?: string[] };
  const pickText = (current: string, scraped: unknown) => current.trim() || asText(scraped);
  const pickList = <T,>(current: T[], scraped: unknown) => (current.length ? current : asList<T>(scraped));
  const hasAbout = form.about.some((paragraph) => paragraph.trim());
  const scrapedAbout = asList<string>(f.about);

  return {
    ...form,
    name: pickText(form.name, f.name),
    website: pickText(form.website, f.website),
    city: pickText(form.city, f.city),
    region: pickText(form.region, f.region),
    tagline: pickText(form.tagline, f.tagline),
    about: hasAbout || !scrapedAbout.length ? form.about : scrapedAbout,
    facts: pickList(form.facts, f.facts),
    highlights: pickList(form.highlights, f.highlights),
    programmes: pickList(form.programmes, f.programmes),
    costs: pickList(form.costs, f.costs),
    facilities: pickList(form.facilities, f.facilities),
    accommodation: pickList(form.accommodation, f.accommodation),
    livingTips: pickList(form.livingTips, f.livingTips),
    requirements: pickList(form.requirements, f.requirements),
    faqs: pickList(form.faqs, f.faqs),
    visaTitle: pickText(form.visaTitle, visa.title),
    visaSummary: pickText(form.visaSummary, visa.summary),
    visaSteps: pickList(form.visaSteps, visa.steps),
    contactEmail: pickText(form.contactEmail, contact.email),
    contactPhone: pickText(form.contactPhone, contact.phone),
    contactAddress: pickText(form.contactAddress, contact.address),
  };
};

const errorText = (err: unknown) => {
  const error = err as { message?: string; reason?: string; solution?: string };
  const parts = [error?.message, error?.reason, error?.solution].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Something went wrong. Please try again.';
};

// ---------------------------------------------------------------------------------------------------------------
// Country picker (searchable list of every country in the world)
// ---------------------------------------------------------------------------------------------------------------

function CountryPicker({
  value,
  locked,
  onSelect,
}: {
  value: UniversityForm['country'];
  locked: boolean;
  onSelect: (country: WorldCountry) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => searchWorldCountries(query, 8), [query]);

  if (value && (locked || !open)) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-light-color bg-slate-50 px-4 py-2.5">
        <span className="flex items-center gap-3 text-sm font-bold text-maroon">
          <CountryFlag code={value.code} emoji={value.flag} />
          {value.name}
          <span className="text-xs font-semibold text-slate-400">{value.code}</span>
        </span>
        {locked ? (
          <span className="text-xs font-semibold text-slate-400">Fixed once a university exists</span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setOpen(true);
            }}
            className="text-xs font-bold text-maroon hover:underline"
          >
            Change
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          autoFocus={open}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={`Search ${WORLD_COUNTRIES.length} countries by name...`}
          className={`${fieldClass} pl-10`}
          aria-label="Search countries"
        />
      </div>
      {results.length ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-light-color bg-white py-1 shadow-xl">
          {results.map((country) => (
            <li key={country.code}>
              <button
                type="button"
                onClick={() => {
                  onSelect(country);
                  setOpen(false);
                  setQuery('');
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-semibold text-maroon hover:bg-maroon/5"
              >
                <CountryFlag code={country.code} emoji={country.flag} />
                {country.name}
                <span className="ml-auto text-xs text-slate-400">{country.code}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="absolute z-20 mt-1 w-full rounded-xl border border-light-color bg-white px-4 py-3 text-sm text-slate-500 shadow-xl">
          No country matches "{query}".
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------------------------------------------

const SEASONS = [
  { value: 'Fall', label: 'Fall' },
  { value: 'Spring', label: 'Spring' },
];

const LEVELS = ['Bachelor', 'Master', 'PhD', 'Diploma'].map((level) => ({ value: level, label: level }));

const FACILITY_ICON_OPTIONS = ['library', 'lab', 'gym', 'food', 'wifi', 'health', 'transport', 'community'].map((icon) => ({
  value: icon,
  label: icon.charAt(0).toUpperCase() + icon.slice(1),
}));

export default function AdminUniversities() {
  const [data, setData] = useState<UniversityRecord[]>([]);
  const [advisors, setAdvisors] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState<UniversityForm | null>(null);
  const [saving, setSaving] = useState<'draft' | 'published' | null>(null);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeUniversityResult | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [universities, users] = await Promise.all([adminApi.getUniversities(), adminApi.getUsers()]);
      setData(universities);
      setAdvisors(users.filter((user) => user.role === 'advisor' && user.isActive !== false && !user.offboardedAt));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const editing = form?.id ? data.find((university) => university._id === form.id) : undefined;
  const hostCourseCount = editing?.hostCourseCount ?? 0;
  const issues = form ? publishIssues(form, hostCourseCount) : [];
  const confidence = (key: string): Confidence | undefined => scrapeResult?.confidence[key];

  const openCreate = () => {
    setForm(emptyForm());
    setFormError('');
    setScrapeResult(null);
    setScrapeUrl('');
  };

  const openEdit = (record: UniversityRecord) => {
    setForm(formFromRecord(record));
    setFormError('');
    setScrapeResult(null);
    setScrapeUrl(record.website || '');
  };

  const closeForm = () => {
    if (!saving) setForm(null);
  };

  const patch = (changes: Partial<UniversityForm>) => setForm((current) => (current ? { ...current, ...changes } : current));

  const pickCountry = (country: WorldCountry) => {
    // Advisors belong to the country, so show whoever already covers it.
    const existing = data.find((university) => university.countryId?.code === country.code);
    patch({
      country: { name: existing?.countryId.name ?? country.name, code: country.code, flag: country.flag },
      countryImage: existing?.countryId.image || '',
      advisorIds: existing?.advisorIds ?? [],
    });
  };

  const setIntakes = (next: IntakeForm[]) =>
    setForm((current) => {
      if (!current) return current;
      // Stored milestones are dated from the start date, so they are regenerated when that date changes.
      const reset = next.map((intake, index) =>
        current.intakes[index] && current.intakes[index].startDate !== intake.startDate ? { ...intake, milestones: [] } : intake
      );
      return { ...current, intakes: reset };
    });

  const runScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setFormError('');
    try {
      const result = await adminApi.scrapeUniversity(scrapeUrl.trim());
      setScrapeResult(result);
      setForm((current) => (current ? applyScrape(current, result) : current));
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setScraping(false);
    }
  };

  const save = async (status: 'draft' | 'published') => {
    if (!form) return;
    setSaving(status);
    setFormError('');
    try {
      const payload = payloadFromForm(form, status);
      const result = form.id ? await adminApi.updateUniversity(form.id, payload) : await adminApi.createUniversity(payload);
      const assigned = result.assignedApplications;
      setSuccess(
        `${result.university.name} was ${status === 'published' ? 'published' : 'saved as a draft'}.` +
          (assigned ? ` ${assigned} waiting application${assigned === 1 ? ' was' : 's were'} assigned to an advisor.` : '')
      );
      setForm(null);
      await loadData();
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setSaving(null);
    }
  };

  const advisorNames = (ids: string[]) =>
    ids.map((id) => advisors.find((advisor) => advisor._id === id)?.name).filter(Boolean) as string[];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter(
      (university) =>
        !query ||
        university.name.toLowerCase().includes(query) ||
        (university.shortName || '').toLowerCase().includes(query) ||
        (university.countryId?.name || '').toLowerCase().includes(query)
    );
  }, [data, search]);

  const columns = [
    {
      header: 'University',
      accessor: 'name',
      render: (_: unknown, row: UniversityRecord) => (
        <div>
          <p className="font-bold text-maroon">{row.name}</p>
          <p className="text-xs font-semibold text-slate-400">{[row.shortName, row.city].filter(Boolean).join(' · ') || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Country',
      accessor: 'countryId',
      render: (country: UniversityRecord['countryId']) =>
        country ? (
          <span className="flex items-center gap-2 font-semibold">
            <CountryFlag code={country.code} emoji={country.flag} />
            {country.name}
          </span>
        ) : (
          '-'
        ),
    },
    {
      header: 'Status',
      accessor: 'universityStatus',
      render: (_: unknown, row: UniversityRecord) =>
        row.status === 'draft' ? (
          <span title={row.publishIssues.length ? `Missing: ${row.publishIssues.join(', ')}` : 'Ready to publish'}>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
              Draft
            </span>
            {row.publishIssues.length ? (
              <span className="mt-1 block text-xs text-slate-500">{row.publishIssues.length} to finish</span>
            ) : (
              <span className="mt-1 block text-xs text-emerald-600">Ready to publish</span>
            )}
          </span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
            Published
          </span>
        ),
    },
    { header: 'Seats', accessor: 'seatLimit' },
    { header: 'Host courses', accessor: 'hostCourseCount' },
    {
      header: 'Advisors',
      accessor: 'advisorIds',
      render: (ids: string[]) => {
        const names = advisorNames(ids ?? []);
        return names.length ? <span className="text-sm">{names.join(', ')}</span> : <span className="text-sm font-semibold text-amber-600">None</span>;
      },
    },
    {
      header: '',
      accessor: '_id',
      render: (_: unknown, row: UniversityRecord) => (
        <button
          type="button"
          onClick={() => openEdit(row)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-maroon transition hover:bg-maroon/5"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      ),
    },
  ];

  return (
    <div className="relative z-0 space-y-6 animate-fade-in">
      <div className="glass-card flex flex-col gap-4 rounded-[2rem] border-b border-light-color/50 bg-white p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <h2 className="mb-2 text-3xl font-bold text-maroon">Universities Catalog</h2>
          <p className="mt-1 font-medium text-body-text md:text-lg">
            Add partner universities, publish them to students and set which advisors supervise each country.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-maroon-gradient px-5 py-2.5 font-bold text-white shadow-lg shadow-maroon/20 transition-all hover:brightness-110"
        >
          <Plus className="h-5 w-5" /> Add University
        </button>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {success ? (
        <Notice tone="success" resetKey={success} onClose={() => setSuccess('')}>
          {success}
        </Notice>
      ) : null}

      <div className="glass-card rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-body-text opacity-40" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by university, short code or country"
            className="w-full rounded-xl border border-light-color/50 bg-white py-3 pl-11 pr-4 font-medium text-maroon placeholder:text-body-text placeholder:opacity-40 focus:border-maroon/20 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-light-color/30 bg-slate-50" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-light-color bg-slate-50 px-6 py-12 text-center">
            <Building className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="text-xl font-bold text-maroon">No Universities Found</h3>
            <p className="mt-2 text-body-text">Add your first partner university to the system.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-light-color/50">
            <DataTable columns={columns} data={filtered} onRowClick={openEdit} />
          </div>
        )}
      </div>

      {form ? (
        <Modal onClose={closeForm} widthClass="max-w-4xl" locked={saving !== null} labelledBy="university-form-title">
          <header className="flex items-center justify-between border-b border-light-color/60 px-6 py-5 md:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-maroon">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h2 id="university-form-title" className="text-2xl font-bold text-maroon">
                  {form.id ? 'Edit University' : 'New University'}
                </h2>
                <p className="text-sm font-medium text-body-text">
                  Everything here is shown to students and advisors once the university is published.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeForm}
              disabled={saving !== null}
              aria-label="Close"
              className="rounded-xl p-2 text-maroon/40 transition-all hover:bg-slate-100 hover:text-maroon disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/50 px-6 py-6 md:px-8">
            {formError ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            <Section
              title="Fill in from the university website"
              hint="Optional. Reads the public pages with a browser and suggests values for empty fields. Seat limits, intake dates, scholarships and advisors are never taken from a website."
            >
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={scrapeUrl}
                    onChange={(event) => setScrapeUrl(event.target.value)}
                    placeholder="https://www.university.edu"
                    className={`${fieldClass} pl-10`}
                    aria-label="University website to scan"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void runScrape()}
                  disabled={scraping || !scrapeUrl.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-maroon px-5 py-2.5 text-sm font-bold text-white transition hover:bg-maroon-hover disabled:opacity-50"
                >
                  {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {scraping ? 'Reading website...' : 'Auto-fill from website'}
                </button>
              </div>
              {scraping ? <p className="mt-3 text-xs font-medium text-body-text">This can take up to a minute.</p> : null}
              {scrapeResult ? (
                <div className="mt-4 space-y-2 text-xs font-medium text-body-text">
                  <p className="flex items-center gap-2 font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Read {scrapeResult.sources.length} page{scrapeResult.sources.length === 1 ? '' : 's'}. Check every
                    highlighted section before saving.
                  </p>
                  {scrapeResult.warnings.map((warning) => (
                    <p key={warning} className="text-amber-700">
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}
            </Section>

            <Section title="Country and advisors">
              <div className="space-y-4">
                <div>
                  <span className={labelClass}>Country</span>
                  <CountryPicker value={form.country} locked={Boolean(form.id)} onSelect={pickCountry} />
                </div>
                <div>
                  <span className={labelClass}>Country image URL (optional)</span>
                  <input
                    type="url"
                    value={form.countryImage}
                    onChange={(event) => patch({ countryImage: event.target.value })}
                    placeholder="https://..."
                    className={fieldClass}
                    disabled={!form.country}
                  />
                </div>
                <div>
                  <span className={labelClass}>
                    {form.country ? `Advisors for ${form.country.name}` : 'Advisors for this country'}
                  </span>
                  <p className="mb-2 text-xs font-medium text-body-text">
                    Advisors belong to the country, so every university in it shares them. New applications are assigned automatically to the
                    advisor with the fewest open applications, and applications already waiting are assigned when you save.
                  </p>
                  {advisors.length === 0 ? (
                    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                      No advisor accounts exist yet. Create one on the Users page first.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {advisors.map((advisor) => {
                        const checked = form.advisorIds.includes(advisor._id);
                        return (
                          <label
                            key={advisor._id}
                            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                              checked ? 'border-maroon bg-maroon/5 text-maroon' : 'border-light-color bg-slate-50 text-slate-600'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="accent-maroon"
                              checked={checked}
                              onChange={() =>
                                patch({
                                  advisorIds: checked
                                    ? form.advisorIds.filter((id) => id !== advisor._id)
                                    : [...form.advisorIds, advisor._id],
                                })
                              }
                            />
                            <span>
                              {advisor.name}
                              <span className="block text-xs font-medium text-slate-400">{advisor.email}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Basics" confidence={confidence('name')}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                <label className="md:col-span-4">
                  <span className={labelClass}>University name</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => patch({ name: event.target.value })}
                    placeholder="e.g. Multimedia University"
                    className={fieldClass}
                  />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Short code</span>
                  <input
                    type="text"
                    value={form.shortName}
                    onChange={(event) => patch({ shortName: event.target.value.toUpperCase() })}
                    placeholder="e.g. MMU"
                    maxLength={12}
                    className={fieldClass}
                  />
                </label>
                <label className="md:col-span-3">
                  <span className={labelClass}>Website</span>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(event) => patch({ website: event.target.value })}
                    placeholder="https://..."
                    className={fieldClass}
                  />
                </label>
                <label className="md:col-span-3">
                  <span className={labelClass}>Seat limit</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.seatLimit}
                    onChange={(event) => patch({ seatLimit: event.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>City</span>
                  <input type="text" value={form.city} onChange={(event) => patch({ city: event.target.value })} className={fieldClass} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Region / state</span>
                  <input type="text" value={form.region} onChange={(event) => patch({ region: event.target.value })} className={fieldClass} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Card image URL</span>
                  <input
                    type="url"
                    value={form.image}
                    onChange={(event) => patch({ image: event.target.value })}
                    placeholder="https://..."
                    className={fieldClass}
                  />
                </label>
                <label className="md:col-span-6">
                  <span className={labelClass}>Tagline</span>
                  <input type="text" value={form.tagline} onChange={(event) => patch({ tagline: event.target.value })} className={fieldClass} />
                </label>
              </div>
            </Section>

            <Section title="About the university" confidence={confidence('about')}>
              <TextListEditor
                items={form.about}
                onChange={(about) => patch({ about })}
                rows={3}
                placeholder="A short paragraph about the university..."
                addLabel="Add paragraph"
              />
            </Section>

            <Section title="Key facts" hint="Shown as cards under the banner, e.g. Founded 1999, Students 20,000." confidence={confidence('facts')}>
              <RowsEditor
                rows={form.facts}
                onChange={(facts) => patch({ facts })}
                blank={blankFact}
                addLabel="Add fact"
                columns={[
                  { key: 'label', label: 'Label', placeholder: 'Founded', span: 2 },
                  { key: 'value', label: 'Value', placeholder: '1999', span: 4 },
                ]}
              />
            </Section>

            <Section title="Highlights" confidence={confidence('highlights')}>
              <TextListEditor
                items={form.highlights}
                onChange={(highlights) => patch({ highlights })}
                rows={1}
                placeholder="Why students choose this university"
                addLabel="Add highlight"
              />
            </Section>

            <Section title="Programmes" hint="At least one is needed to publish." confidence={confidence('programmes')}>
              <RowsEditor
                rows={form.programmes}
                onChange={(programmes) => patch({ programmes })}
                blank={blankProgramme}
                addLabel="Add programme"
                columns={[
                  { key: 'name', label: 'Programme', placeholder: 'BSc Computer Science', span: 3 },
                  { key: 'level', label: 'Level', type: 'select', options: LEVELS, span: 1 },
                  { key: 'duration', label: 'Duration', placeholder: '4 years', span: 1 },
                  { key: 'language', label: 'Language', placeholder: 'English', span: 1 },
                  { key: 'credits', label: 'Credits', placeholder: '130 credits', span: 2 },
                  { key: 'description', label: 'Description', type: 'textarea', span: 4 },
                ]}
              />
            </Section>

            <Section
              title="Intakes"
              hint="Riphah's own dates, which a website cannot tell us. The timeline (nomination, interviews, visa, travel...) is generated from the start date."
            >
              <RowsEditor
                rows={form.intakes}
                onChange={setIntakes}
                blank={blankIntake}
                addLabel="Add intake"
                columns={[
                  { key: 'season', label: 'Season', type: 'select', options: SEASONS, span: 1 },
                  { key: 'startDate', label: 'Classes start', type: 'date', span: 2 },
                  { key: 'applicationDeadline', label: 'Application deadline', type: 'date', span: 2 },
                  { key: 'seatsTotal', label: 'Seats', type: 'number', span: 1 },
                  { key: 'seatsTaken', label: 'Seats taken', type: 'number', span: 1 },
                ]}
              />
            </Section>

            <Section title="Costs" hint="Approximate costs per semester." confidence={confidence('costs')}>
              <RowsEditor
                rows={form.costs}
                onChange={(costs) => patch({ costs })}
                blank={blankCost}
                addLabel="Add cost"
                columns={[
                  { key: 'label', label: 'Item', placeholder: 'Accommodation', span: 2 },
                  { key: 'amount', label: 'Amount', placeholder: 'USD 300 / month', span: 2 },
                  { key: 'note', label: 'Note', span: 2 },
                ]}
              />
            </Section>

            <Section title="Scholarships" hint="Exchange-specific funding is agreed with the partner, so enter it by hand.">
              <RowsEditor
                rows={form.scholarships}
                onChange={(scholarships) => patch({ scholarships })}
                blank={blankCost}
                addLabel="Add scholarship"
                columns={[
                  { key: 'label', label: 'Name', span: 2 },
                  { key: 'amount', label: 'Amount', span: 2 },
                  { key: 'note', label: 'Conditions', span: 2 },
                ]}
              />
            </Section>

            <Section title="Facilities" confidence={confidence('facilities')}>
              <RowsEditor
                rows={form.facilities}
                onChange={(facilities) => patch({ facilities })}
                blank={blankFacility}
                addLabel="Add facility"
                columns={[
                  { key: 'title', label: 'Facility', placeholder: 'Library', span: 2 },
                  { key: 'icon', label: 'Icon', type: 'select', options: FACILITY_ICON_OPTIONS, span: 1 },
                  { key: 'description', label: 'Description', span: 3 },
                ]}
              />
            </Section>

            <Section title="Accommodation" confidence={confidence('accommodation')}>
              <RowsEditor
                rows={form.accommodation}
                onChange={(accommodation) => patch({ accommodation })}
                blank={blankFact}
                addLabel="Add detail"
                columns={[
                  { key: 'label', label: 'Label', placeholder: 'Dormitory', span: 2 },
                  { key: 'value', label: 'Details', span: 4 },
                ]}
              />
            </Section>

            <Section title="Living tips" confidence={confidence('livingTips')}>
              <RowsEditor
                rows={form.livingTips}
                onChange={(livingTips) => patch({ livingTips })}
                blank={blankFact}
                addLabel="Add tip"
                columns={[
                  { key: 'label', label: 'Topic', placeholder: 'Climate', span: 2 },
                  { key: 'value', label: 'Tip', span: 4 },
                ]}
              />
            </Section>

            <Section title="Entry requirements" confidence={confidence('requirements')}>
              <TextListEditor
                items={form.requirements}
                onChange={(requirements) => patch({ requirements })}
                rows={1}
                placeholder="e.g. CGPA of 3.0 or above"
                addLabel="Add requirement"
              />
            </Section>

            <Section title="Visa" hint="Public, but it changes and depends on nationality, so review it." confidence={confidence('visa')}>
              <div className="space-y-4">
                <label className="block">
                  <span className={labelClass}>Title</span>
                  <input type="text" value={form.visaTitle} onChange={(event) => patch({ visaTitle: event.target.value })} className={fieldClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Summary</span>
                  <textarea
                    rows={3}
                    value={form.visaSummary}
                    onChange={(event) => patch({ visaSummary: event.target.value })}
                    className={`${fieldClass} resize-y`}
                  />
                </label>
                <div>
                  <span className={labelClass}>Steps</span>
                  <TextListEditor
                    items={form.visaSteps}
                    onChange={(visaSteps) => patch({ visaSteps })}
                    rows={1}
                    placeholder="e.g. Receive the acceptance letter"
                    addLabel="Add step"
                  />
                </div>
              </div>
            </Section>

            <Section title="FAQs" confidence={confidence('faqs')}>
              <RowsEditor
                rows={form.faqs}
                onChange={(faqs) => patch({ faqs })}
                blank={blankFaq}
                addLabel="Add question"
                columns={[
                  { key: 'question', label: 'Question', span: 6 },
                  { key: 'answer', label: 'Answer', type: 'textarea', span: 6 },
                ]}
              />
            </Section>

            <Section title="Contact" confidence={confidence('contact')}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClass}>Email</span>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) => patch({ contactEmail: event.target.value })}
                    placeholder="exchange@university.edu"
                    className={fieldClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>Phone</span>
                  <input type="text" value={form.contactPhone} onChange={(event) => patch({ contactPhone: event.target.value })} className={fieldClass} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Address</span>
                  <input
                    type="text"
                    value={form.contactAddress}
                    onChange={(event) => patch({ contactAddress: event.target.value })}
                    className={fieldClass}
                  />
                </label>
              </div>
            </Section>
          </div>

          <footer className="border-t border-light-color/60 bg-white px-6 py-4 md:px-8">
            {issues.length ? (
              <p className="mb-3 max-h-20 overflow-y-auto rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold leading-relaxed text-amber-800">
                <span className="font-bold">Before this can be published, add: </span>
                {issues.join(' · ')}
              </p>
            ) : (
              <p className="mb-3 flex items-center gap-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Ready to publish.
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving !== null}
                className="rounded-xl bg-slate-100 px-6 py-2.5 font-bold text-body-text transition-all hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save('draft')}
                disabled={saving !== null}
                className="rounded-xl border border-maroon/30 px-6 py-2.5 font-bold text-maroon transition-all hover:bg-maroon/5 disabled:opacity-50"
              >
                {saving === 'draft' ? 'Saving...' : 'Save as draft'}
              </button>
              <button
                type="button"
                onClick={() => void save('published')}
                disabled={saving !== null || issues.length > 0}
                title={issues.length ? 'Finish the items listed above first' : undefined}
                className="rounded-xl bg-accent-yellow px-6 py-2.5 font-bold text-maroon shadow-lg shadow-accent-yellow/20 transition-all hover:bg-yellow-default disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving === 'published' ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </footer>
        </Modal>
      ) : null}
    </div>
  );
}
