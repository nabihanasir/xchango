import {
  assertPublicUrl,
  isAllowedByRobots,
  isPrivateAddress,
  parseRobots,
  pickLinks,
  sanitizeExtraction,
} from './universityScraperService';

jest.mock('./aiCourseMatcherService', () => ({ requestLlmJson: jest.fn() }));
jest.mock('../utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

describe('isPrivateAddress', () => {
  it.each(['127.0.0.1', '10.1.2.3', '192.168.0.5', '172.16.9.9', '169.254.169.254', '::1', 'fd00::1', '::ffff:10.0.0.1'])(
    'blocks %s',
    (address) => expect(isPrivateAddress(address)).toBe(true)
  );

  it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111'])('allows %s', (address) =>
    expect(isPrivateAddress(address)).toBe(false)
  );
});

describe('assertPublicUrl', () => {
  it('rejects non-http protocols', async () => {
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow('not allowed');
  });

  it('rejects text that is not an address', async () => {
    await expect(assertPublicUrl('not a url')).rejects.toThrow('invalid');
  });

  it('rejects embedded credentials', async () => {
    await expect(assertPublicUrl('https://user:pw@8.8.8.8/')).rejects.toThrow('not allowed');
  });

  it('rejects private IP literals and localhost', async () => {
    await expect(assertPublicUrl('http://127.0.0.1:5000/admin')).rejects.toThrow('not allowed');
    await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow('not allowed');
    await expect(assertPublicUrl('http://localhost:3000')).rejects.toThrow('not allowed');
  });

  it('accepts a public IP literal', async () => {
    const url = await assertPublicUrl('https://8.8.8.8/about');
    expect(url.hostname).toBe('8.8.8.8');
  });
});

describe('robots.txt handling', () => {
  const robots = [
    'User-agent: Googlebot',
    'Disallow: /google-only',
    '',
    'User-agent: *',
    'Disallow: /private',
    'Disallow: /tmp/*.html # comment',
    'Allow: /private/open',
  ].join('\n');

  it('reads only the rules for every crawler', () => {
    expect(parseRobots(robots)).toEqual(['/private', '/tmp/*.html']);
  });

  it('blocks disallowed paths and allows the rest', () => {
    const rules = parseRobots(robots);
    expect(isAllowedByRobots(rules, '/private/area')).toBe(false);
    expect(isAllowedByRobots(rules, '/tmp/x.html')).toBe(false);
    expect(isAllowedByRobots(rules, '/about')).toBe(true);
    expect(isAllowedByRobots([], '/anything')).toBe(true);
  });
});

describe('pickLinks', () => {
  const origin = 'https://uni.example';

  it('keeps same-site pages that look like profile pages, best first', () => {
    const picked = pickLinks(origin, [
      { href: '/about-us', text: 'About' },
      { href: '/admission/international', text: 'International admissions' },
      { href: 'https://other.example/contact', text: 'Contact' },
      { href: '/news/today', text: 'News' },
      { href: '/brochure.pdf', text: 'Programme brochure' },
      { href: '/about-us#team', text: 'About again' },
    ]);
    expect(picked).toEqual(['https://uni.example/admission/international', 'https://uni.example/about-us']);
  });

  it('respects the limit', () => {
    const links = Array.from({ length: 10 }, (_, i) => ({ href: `/programs/${i}`, text: 'Programs' }));
    expect(pickLinks(origin, links, 3)).toHaveLength(3);
  });
});

describe('sanitizeExtraction', () => {
  it('drops unknown keys, never takes Riphah-specific data, and grades confidence', () => {
    const { fields, confidence } = sanitizeExtraction(
      {
        name: 'Example University',
        city: 'Springfield',
        intakes: [{ startDate: '2027-02-01' }],
        scholarships: [{ label: 'Invented', amount: '1', note: '' }],
        seatLimit: 500,
        rating: 4.9,
        programmes: [{ name: 'BSc CS', level: 'Bachelor', duration: '4 years', language: 'English', credits: '', description: '' }],
        facilities: [{ title: 'Library', description: 'Big', icon: 'not-an-icon' }],
        contact: { email: 'Info@Example.edu', phone: '' },
      },
      'Welcome to Example University in Springfield. Write to info@example.edu'
    );

    expect(fields).not.toHaveProperty('intakes');
    expect(fields).not.toHaveProperty('scholarships');
    expect(fields).not.toHaveProperty('seatLimit');
    expect(fields).not.toHaveProperty('rating');
    expect((fields.facilities as any[])[0].icon).toBe('community');
    expect((fields.contact as any).email).toBe('info@example.edu');
    expect(confidence.name).toBe('found');
    expect(confidence.city).toBe('found');
    expect(confidence.contact).toBe('found');
    expect(confidence.programmes).toBe('review');
    expect(confidence.requirements).toBe('empty');
  });

  it('copes with a missing answer', () => {
    const { fields, confidence } = sanitizeExtraction(null, '');
    expect(fields.name).toBe('');
    expect(confidence.name).toBe('empty');
  });
});
