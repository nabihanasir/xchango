import * as cheerio from 'cheerio';
import dns from 'dns/promises';
import net from 'net';
import { ValidationError } from '../errors/AppError';
import { logger } from '../utils/logger';
import { requestLlmJson } from './aiCourseMatcherService';

/**
 * Pre-fills the "add university" form from a public website: Playwright reads a handful of pages, an LLM turns
 * the text into the form's fields. Anything that is not public (seat limits, Riphah's intake dates, scholarships)
 * is deliberately left empty, and every extracted value is a suggestion for the admin to review.
 */

const USER_AGENT = 'XchangoProfileBot/1.0 (university profile import; admin initiated)';
const MAX_PAGES = 6;
const PAGE_TIMEOUT_MS = 20_000;
const TOTAL_TIMEOUT_MS = 75_000;
const MAX_PAGE_CHARS = 9_000;
const MAX_TOTAL_CHARS = 36_000;

const PAGE_KEYWORDS = [
  'about',
  'contact',
  'program',
  'course',
  'admission',
  'international',
  'fee',
  'tuition',
  'accommodation',
  'housing',
  'dorm',
  'facilit',
  'campus',
  'visa',
  'scholarship',
];

export interface ScrapedField {
  confidence: 'found' | 'review' | 'empty';
}

export interface ScrapeResult {
  fields: Record<string, unknown>;
  confidence: Record<string, ScrapedField['confidence']>;
  sources: string[];
  warnings: string[];
}

const fail = (message: string, reason: string, solution: string, code: string): never => {
  throw new ValidationError(message, reason, solution, code);
};

export const isPrivateAddress = (address: string): boolean => {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }

  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }

  return true;
};

/** Only public http(s) addresses are fetched; this stops the scraper being aimed at the server's own network. */
export const assertPublicUrl = async (rawUrl: string): Promise<URL> => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return fail('Website address is invalid.', 'The text is not a web address.', 'Paste a full address such as https://www.example.edu.', 'SCRAPE_URL_INVALID');
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    fail('Website address is not allowed.', 'Only plain http or https addresses can be scanned.', 'Use the university\'s public website address.', 'SCRAPE_URL_NOT_ALLOWED');
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host)
    ? [host]
    : (await dns.lookup(host, { all: true }).catch(() => [])).map((entry) => entry.address);
  if (!addresses.length) {
    fail('Website could not be found.', 'The address does not resolve.', 'Check the address and try again.', 'SCRAPE_URL_UNRESOLVED');
  }
  if (addresses.some(isPrivateAddress)) {
    fail('Website address is not allowed.', 'It points to a private or internal network.', 'Use the university\'s public website address.', 'SCRAPE_URL_PRIVATE');
  }
  return parsed;
};

/** Disallow rules that apply to every crawler (the "*" group). */
export const parseRobots = (robotsText: string): string[] => {
  const disallowed: string[] = [];
  let applies = false;
  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim();
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === 'user-agent') {
      applies = value === '*';
    } else if (applies && key === 'disallow' && value) {
      disallowed.push(value);
    }
  }
  return disallowed;
};

export const isAllowedByRobots = (disallowed: string[], pathname: string) =>
  !disallowed.some((rule) => pathname.startsWith(rule.replace(/\*.*$/, '')));

/** Picks same-site links whose text or address looks like a page that holds profile information. */
export const pickLinks = (origin: string, links: Array<{ href: string; text: string }>, limit = MAX_PAGES - 1) => {
  const seen = new Set<string>();
  const scored: Array<{ url: string; score: number }> = [];
  for (const link of links) {
    let url: URL;
    try {
      url = new URL(link.href, origin);
    } catch {
      continue;
    }
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) continue;
    url.hash = '';
    if (/\.(pdf|docx?|xlsx?|zip|jpe?g|png|gif|mp4)$/i.test(url.pathname)) continue;
    const key = url.toString();
    if (seen.has(key) || url.pathname === '/' || url.pathname === '') continue;
    seen.add(key);

    const haystack = `${url.pathname} ${link.text}`.toLowerCase();
    const score = PAGE_KEYWORDS.reduce((sum, keyword) => sum + (haystack.includes(keyword) ? 1 : 0), 0);
    if (score > 0) scored.push({ url: key, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((entry) => entry.url);
};

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const strList = (value: unknown) => (Array.isArray(value) ? value.map(str).filter(Boolean) : []);
const rows = <K extends string>(value: unknown, keys: readonly K[]) =>
  Array.isArray(value)
    ? value
        .map((row) => Object.fromEntries(keys.map((key) => [key, str((row as Record<string, unknown>)?.[key])])))
        .filter((row) => Object.values(row).some(Boolean))
    : [];

const FACILITY_ICONS = ['library', 'lab', 'gym', 'food', 'wifi', 'health', 'transport', 'community'];

/**
 * Keeps only the fields the form understands and only for data that is public. Intakes, scholarships, seat limits
 * and milestones are never taken from a website because they are Riphah-specific.
 */
export const sanitizeExtraction = (raw: Record<string, unknown> | null, pageText: string) => {
  const data = raw ?? {};
  const contact = (data.contact ?? {}) as Record<string, unknown>;
  const visa = (data.visa ?? {}) as Record<string, unknown>;

  const fields: Record<string, unknown> = {
    name: str(data.name),
    city: str(data.city),
    region: str(data.region),
    tagline: str(data.tagline),
    about: strList(data.about).slice(0, 4),
    facts: rows(data.facts, ['label', 'value'] as const).slice(0, 8),
    highlights: strList(data.highlights).slice(0, 8),
    programmes: rows(data.programmes, ['name', 'level', 'duration', 'language', 'credits', 'description'] as const).slice(0, 12),
    costs: rows(data.costs, ['label', 'amount', 'note'] as const).slice(0, 8),
    facilities: rows(data.facilities, ['title', 'description', 'icon'] as const)
      .slice(0, 8)
      .map((facility) => ({ ...facility, icon: FACILITY_ICONS.includes(facility.icon) ? facility.icon : 'community' })),
    accommodation: rows(data.accommodation, ['label', 'value'] as const).slice(0, 6),
    requirements: strList(data.requirements).slice(0, 10),
    visa: { title: str(visa.title), summary: str(visa.summary), steps: strList(visa.steps).slice(0, 8) },
    livingTips: rows(data.livingTips, ['label', 'value'] as const).slice(0, 6),
    faqs: rows(data.faqs, ['question', 'answer'] as const).slice(0, 6),
    contact: { email: str(contact.email).toLowerCase(), phone: str(contact.phone), address: str(contact.address), website: '' },
  };

  const lowerText = pageText.toLowerCase();
  const confidence: Record<string, ScrapedField['confidence']> = {};
  for (const [key, value] of Object.entries(fields)) {
    const empty =
      value === '' ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value as object).every((v) => !v || (Array.isArray(v) && !v.length)));
    if (empty) {
      confidence[key] = 'empty';
    } else if (typeof value === 'string' && lowerText.includes(value.toLowerCase())) {
      confidence[key] = 'found';
    } else if (key === 'contact') {
      const email = str(contact.email).toLowerCase();
      confidence[key] = email && lowerText.includes(email) ? 'found' : 'review';
    } else {
      confidence[key] = 'review';
    }
  }
  return { fields, confidence };
};

const buildPrompt = (pages: Array<{ url: string; text: string }>) => `You extract a university profile for a student-exchange portal from the website text below.

Rules:
- Use ONLY facts stated in the text. If something is not stated, use "" or [].
- Do NOT invent tuition, dates, ratings, seat numbers or scholarships.
- Write in plain English, concise (one or two sentences per item).
- "level" is e.g. Bachelor, Master, PhD. "icon" is one of: ${FACILITY_ICONS.join(', ')}.

Return a single JSON object with exactly these keys:
{
  "name": string, "city": string, "region": string, "tagline": string,
  "about": string[]  (1-3 short paragraphs),
  "facts": [{"label": string, "value": string}]  (e.g. Founded, Students, Type),
  "highlights": string[],
  "programmes": [{"name","level","duration","language","credits","description"}],
  "costs": [{"label","amount","note"}],
  "facilities": [{"title","description","icon"}],
  "accommodation": [{"label","value"}],
  "requirements": string[],
  "visa": {"title": string, "summary": string, "steps": string[]},
  "livingTips": [{"label","value"}],
  "faqs": [{"question","answer"}],
  "contact": {"email": string, "phone": string, "address": string}
}

WEBSITE TEXT:
${pages.map((page) => `--- ${page.url} ---\n${page.text}`).join('\n\n')}`;

let scraping = false;

const fetchRobots = async (origin: string) => {
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok ? parseRobots(await response.text()) : [];
  } catch {
    return [];
  }
};

// ---------------------------------------------------------------------------------------------------------------
// Page readers. A reader turns one URL into text and links. Three engines, all free:
//   1. a real browser (Playwright) when Chromium is installed, which renders JavaScript;
//   2. plain HTTP plus an HTML parser, which needs nothing installed and works for server-rendered sites;
//   3. the free Jina Reader service, used only when a page's plain HTML has almost no text (JavaScript-built page).
// ---------------------------------------------------------------------------------------------------------------

export interface PageLink {
  href: string;
  text: string;
}

export interface PageContent {
  url: string;
  text: string;
  links: PageLink[];
}

export interface PageReader {
  name: 'browser' | 'http';
  /** Reads one page; throws when it cannot be read. */
  read: (url: string) => Promise<PageContent>;
  /** Notes worth showing the admin (for example that a fallback service was used). */
  notes: string[];
  close: () => Promise<void>;
}

const MAX_HTML_BYTES = 1_500_000;
const MAX_REDIRECTS = 5;
/** Below this much text a plain-HTTP page is assumed to be built by JavaScript. */
const THIN_TEXT_CHARS = 400;
const JINA_BASE = 'https://r.jina.ai/';

type FetchLike = typeof fetch;

const cleanText = (value: string) =>
  value
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** Visible text and links from raw HTML, with scripts, styles and hidden widgets removed. */
export const htmlToContent = (html: string, baseUrl: string): { text: string; links: PageLink[] } => {
  const $ = cheerio.load(html);
  const links: PageLink[] = [];
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') ?? '';
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return;
    try {
      links.push({ href: new URL(href, baseUrl).toString(), text: $(element).text().replace(/\s+/g, ' ').trim() });
    } catch {
      // ignore malformed links
    }
  });

  $('script, style, noscript, svg, iframe, template, [hidden], [aria-hidden="true"]').remove();
  $('br').replaceWith('\n');
  $('p, div, li, ul, ol, h1, h2, h3, h4, h5, h6, tr, section, article, header, footer, nav, table').each((_, element) => {
    $(element).append('\n');
  });
  return { text: cleanText($('body').text() || $.root().text()).slice(0, MAX_PAGE_CHARS), links };
};

/** Links written as markdown ([text](url)), which is how Jina Reader returns them. */
export const markdownLinks = (markdown: string): PageLink[] =>
  [...markdown.matchAll(/\[([^\]\n]{0,200})\]\((https?:\/\/[^)\s]+)\)/g)].map((match) => ({ text: match[1].trim(), href: match[2] }));

/** Reads a response body but stops at maxBytes, so a huge page cannot exhaust memory. */
export const readBodyCapped = async (response: Response, maxBytes = MAX_HTML_BYTES): Promise<string> => {
  const reader = response.body?.getReader();
  if (!reader) {
    return (await response.text()).slice(0, maxBytes);
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (received < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    received += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  return new TextDecoder('utf-8').decode(Buffer.concat(chunks)).slice(0, maxBytes);
};

/**
 * Fetches HTML over plain HTTP, following redirects by hand so that every hop is checked to be a public address.
 * (Automatic redirects would let a public site bounce the server to an internal one.)
 */
export const fetchHtml = async (startUrl: string, fetchImpl: FetchLike = fetch): Promise<{ url: string; html: string }> => {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicUrl(current);
    const response = await fetchImpl(current, {
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel().catch(() => undefined);
      if (!location) throw new Error('The site redirected without saying where.');
      current = new URL(location, current).toString();
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`The site answered ${response.status}.`);
    }

    const type = response.headers.get('content-type') ?? '';
    if (type && !/html|xml|text\/plain/i.test(type)) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error('That address is not a web page.');
    }
    return { url: current, html: await readBodyCapped(response) };
  }
  throw new Error('The site redirected too many times.');
};

/** Free hosted reader that renders JavaScript pages and returns markdown. Only used for pages that need it. */
const fetchViaJina = async (url: string, fetchImpl: FetchLike = fetch): Promise<PageContent> => {
  const response = await fetchImpl(`${JINA_BASE}${url}`, {
    headers: { Accept: 'text/plain', 'User-Agent': USER_AGENT, 'X-Return-Format': 'markdown' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`The fallback reader answered ${response.status}.`);
  }
  const markdown = await readBodyCapped(response, MAX_HTML_BYTES);
  return { url, text: cleanText(markdown).slice(0, MAX_PAGE_CHARS), links: markdownLinks(markdown) };
};

const isUrlBlock = (error: unknown) => typeof (error as { code?: string })?.code === 'string' && (error as { code: string }).code.startsWith('SCRAPE_URL');

/** Plain HTTP first; if the page has almost no text, ask the free fallback reader. */
export const createHttpReader = (fetchImpl: FetchLike = fetch): PageReader => {
  const notes: string[] = [];
  let usedFallback = false;

  return {
    name: 'http',
    notes,
    close: async () => undefined,
    read: async (url) => {
      let plain: PageContent | null = null;
      let plainError: unknown = null;
      try {
        const { url: finalUrl, html } = await fetchHtml(url, fetchImpl);
        const { text, links } = htmlToContent(html, finalUrl);
        plain = { url: finalUrl, text, links };
      } catch (error) {
        if (isUrlBlock(error)) throw error;
        plainError = error;
      }

      if (plain && plain.text.length >= THIN_TEXT_CHARS) return plain;

      try {
        const viaJina = await fetchViaJina(url, fetchImpl);
        if (viaJina.text.length > (plain?.text.length ?? 0)) {
          if (!usedFallback) {
            usedFallback = true;
            notes.push('Some pages need JavaScript, so they were read through the free Jina Reader service (the page address was sent to it).');
          }
          return viaJina;
        }
      } catch (error) {
        logger.warn('University scrape: fallback reader failed', { cause: error instanceof Error ? error.message : String(error) });
      }

      if (plain?.text) return plain;
      throw plainError instanceof Error ? plainError : new Error('No readable text on this page.');
    },
  };
};

let browserUnavailable = false;

/** A real headless browser, or null when Playwright or Chromium is not installed (for example on Render). */
const createBrowserReader = async (disallowedNote: string[]): Promise<PageReader | null> => {
  if (browserUnavailable) return null;

  let playwright: typeof import('playwright');
  try {
    playwright = await import('playwright');
  } catch {
    browserUnavailable = true;
    return null;
  }

  let browser: import('playwright').Browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
  } catch (error) {
    browserUnavailable = true;
    logger.info('University scrape: no browser available, using plain HTTP', {
      cause: error instanceof Error ? error.message.split('\n')[0] : String(error),
    });
    return null;
  }

  const context = await browser.newContext({ userAgent: USER_AGENT });
  const hostChecks = new Map<string, boolean>();
  // Every request the pages make (including redirects) must also go to a public address.
  await context.route('**/*', async (route) => {
    try {
      const host = new URL(route.request().url()).hostname;
      if (!hostChecks.has(host)) {
        await assertPublicUrl(route.request().url());
        hostChecks.set(host, true);
      }
      await route.continue();
    } catch {
      await route.abort();
    }
  });
  const page = await context.newPage();

  return {
    name: 'browser',
    notes: disallowedNote,
    close: async () => {
      await browser.close().catch(() => undefined);
    },
    read: async (url) => {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
      await page.waitForLoadState('networkidle', { timeout: 4_000 }).catch(() => undefined);
      const content = await page.evaluate(() => ({
        text: document.body?.innerText ?? '',
        links: Array.from(document.querySelectorAll('a[href]')).map((anchor) => ({
          href: (anchor as HTMLAnchorElement).href,
          text: (anchor.textContent ?? '').trim(),
        })),
      }));
      return { url: page.url(), text: cleanText(content.text).slice(0, MAX_PAGE_CHARS), links: content.links };
    },
  };
};

/**
 * SCRAPE_ENGINE=auto (default): a real browser when one is installed, otherwise plain HTTP with the free fallback.
 * SCRAPE_ENGINE=http forces the browser-free path; SCRAPE_ENGINE=browser requires Chromium.
 */
export const openReader = async (): Promise<PageReader> => {
  const engine = (process.env.SCRAPE_ENGINE || 'auto').toLowerCase();
  if (engine !== 'http') {
    const browserReader = await createBrowserReader([]);
    if (browserReader) return browserReader;
    if (engine === 'browser') {
      return fail(
        'Website scanning is not available on this server.',
        'The browser engine (Playwright/Chromium) is not installed here.',
        'Install it with "npx playwright install chromium", or leave SCRAPE_ENGINE unset to scan without a browser.',
        'SCRAPE_UNAVAILABLE'
      );
    }
  }
  return createHttpReader();
};

export const scrapeUniversityWebsite = async (rawUrl: unknown): Promise<ScrapeResult> => {
  const startUrl = await assertPublicUrl(typeof rawUrl === 'string' ? rawUrl.trim() : '');
  if (scraping) {
    fail(
      'Another website is being scanned.',
      'Only one scan runs at a time to protect the server.',
      'Wait a minute and try again.',
      'SCRAPE_BUSY'
    );
  }

  scraping = true;
  const warnings: string[] = [];
  const pages: Array<{ url: string; text: string }> = [];
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;

  try {
    const disallowed = await fetchRobots(startUrl.origin);
    const reader = await openReader();

    try {
      const visit = async (url: string) => {
        if (Date.now() > deadline) return null;
        const target = new URL(url);
        if (!isAllowedByRobots(disallowed, target.pathname)) {
          warnings.push(`Skipped ${target.pathname} because the site's robots.txt asks crawlers not to read it.`);
          return null;
        }
        try {
          const content = await reader.read(url);
          if (content.text) pages.push({ url: content.url, text: content.text });
          return content.links;
        } catch (error) {
          warnings.push(`Could not read ${url}: ${error instanceof Error ? error.message.split('\n')[0] : 'unknown error'}`);
          return null;
        }
      };

      const homeLinks = await visit(startUrl.toString());
      for (const link of pickLinks(startUrl.origin, homeLinks ?? [])) {
        await visit(link);
      }
      warnings.push(...reader.notes);
    } finally {
      await reader.close();
    }
  } finally {
    scraping = false;
  }

  if (!pages.length) {
    fail(
      'Nothing could be read from that website.',
      warnings[0] ?? 'The site returned no readable text (it may block automated visits).',
      'Fill the form by hand.',
      'SCRAPE_EMPTY'
    );
  }

  let combined = '';
  const included = pages.filter((entry) => {
    if (combined.length >= MAX_TOTAL_CHARS) return false;
    combined += entry.text;
    return true;
  });
  const allText = included.map((entry) => entry.text).join('\n');

  let extracted: Record<string, unknown> | null = null;
  try {
    extracted = await requestLlmJson<Record<string, unknown>>(buildPrompt(included), 'general');
    if (!extracted) {
      warnings.push('No LLM is configured (LLM Models page), so only the contact details were detected.');
    }
  } catch (error) {
    logger.warn('University scrape: LLM extraction failed', { cause: error instanceof Error ? error.message : String(error) });
    warnings.push('The LLM could not read the pages, so only the contact details were detected.');
  }

  if (!extracted) {
    extracted = {
      contact: {
        email: allText.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0] ?? '',
        phone: allText.match(/\+\d[\d\s().-]{7,}\d/)?.[0] ?? '',
      },
    };
  }

  const { fields, confidence } = sanitizeExtraction(extracted, allText);
  (fields.contact as Record<string, string>).website = startUrl.origin;
  fields.website = startUrl.origin;
  confidence.website = 'found';

  return { fields, confidence, sources: included.map((entry) => entry.url), warnings };
};
