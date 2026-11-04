import {
  createHttpReader,
  fetchHtml,
  htmlToContent,
  markdownLinks,
  openReader,
  readBodyCapped,
} from './universityScraperService';

jest.mock('./aiCourseMatcherService', () => ({ requestLlmJson: jest.fn() }));
jest.mock('../utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const html = (body: string, status = 200, headers: Record<string, string> = { 'content-type': 'text/html; charset=utf-8' }) =>
  new Response(body, { status, headers });
const redirect = (location: string) => new Response(null, { status: 302, headers: { location } });

const longText = 'Our university offers many programmes for exchange students. '.repeat(20);

describe('htmlToContent', () => {
  const page = `
    <html><head><title>T</title><style>.x{color:red}</style><script>var secret = 1;</script></head>
    <body>
      <nav><a href="/about">About us</a> <a href="#top">Top</a> <a href="mailto:a@b.c">Mail</a> <a href="javascript:void(0)">JS</a></nav>
      <h1>Welcome</h1><p>First paragraph.</p><p>Second<br>line</p>
      <div hidden>Hidden widget</div><noscript>Enable JS</noscript>
      <a href="https://other.example/x">Other</a>
    </body></html>`;

  it('keeps visible text, drops scripts, styles and hidden widgets, and separates blocks', () => {
    const { text } = htmlToContent(page, 'https://uni.example/home');
    expect(text).toContain('Welcome');
    expect(text).toContain('First paragraph.');
    expect(text).toMatch(/Second\s*\nline/);
    expect(text).not.toContain('secret');
    expect(text).not.toContain('color:red');
    expect(text).not.toContain('Hidden widget');
    expect(text).not.toContain('Enable JS');
  });

  it('resolves links against the page and skips anchors, mailto and javascript links', () => {
    const { links } = htmlToContent(page, 'https://uni.example/home');
    expect(links.map((link) => link.href)).toEqual(['https://uni.example/about', 'https://other.example/x']);
    expect(links[0].text).toBe('About us');
  });
});

describe('markdownLinks', () => {
  it('extracts http(s) markdown links only', () => {
    expect(markdownLinks('See [Admissions](https://u.example/admissions) and [mail](mailto:x@y.z) or [Fees](http://u.example/fees).')).toEqual([
      { text: 'Admissions', href: 'https://u.example/admissions' },
      { text: 'Fees', href: 'http://u.example/fees' },
    ]);
  });
});

describe('readBodyCapped', () => {
  it('stops reading at the byte limit', async () => {
    const body = await readBodyCapped(new Response('a'.repeat(5000)), 1000);
    expect(body.length).toBeLessThanOrEqual(1000);
    expect(body.length).toBeGreaterThan(0);
  });
});

describe('fetchHtml', () => {
  it('returns the page and the final address after a public redirect', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(redirect('https://8.8.4.4/home')).mockResolvedValueOnce(html('<p>hello</p>'));
    const result = await fetchHtml('https://8.8.8.8/', fetchImpl as never);
    expect(result).toEqual({ url: 'https://8.8.4.4/home', html: '<p>hello</p>' });
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
  });

  it('refuses a redirect that points at an internal address', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(redirect('http://127.0.0.1:5000/admin'));
    await expect(fetchHtml('https://8.8.8.8/', fetchImpl as never)).rejects.toMatchObject({ code: 'SCRAPE_URL_PRIVATE' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refuses a redirect to the cloud metadata address', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(redirect('http://169.254.169.254/latest/meta-data/'));
    await expect(fetchHtml('https://8.8.8.8/', fetchImpl as never)).rejects.toMatchObject({ code: 'SCRAPE_URL_PRIVATE' });
  });

  it('gives up after too many redirects', async () => {
    const fetchImpl = jest.fn().mockImplementation(async () => redirect('https://8.8.4.4/loop'));
    await expect(fetchHtml('https://8.8.8.8/', fetchImpl as never)).rejects.toThrow('redirected too many times');
  });

  it('rejects error statuses and non-page content', async () => {
    await expect(fetchHtml('https://8.8.8.8/', jest.fn().mockResolvedValue(html('no', 404)) as never)).rejects.toThrow('404');
    await expect(
      fetchHtml('https://8.8.8.8/', jest.fn().mockResolvedValue(html('%PDF', 200, { 'content-type': 'application/pdf' })) as never)
    ).rejects.toThrow('not a web page');
  });
});

describe('createHttpReader', () => {
  const jinaCalls = (fetchImpl: jest.Mock) => fetchImpl.mock.calls.filter(([url]) => String(url).startsWith('https://r.jina.ai/'));

  it('uses plain HTTP and never calls the fallback when the page has enough text', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(html(`<body><p>${longText}</p><a href="/programmes">Programmes</a></body>`));
    const reader = createHttpReader(fetchImpl as never);

    const content = await reader.read('https://8.8.8.8/');

    expect(content.text).toContain('exchange students');
    expect(content.links[0].href).toBe('https://8.8.8.8/programmes');
    expect(jinaCalls(fetchImpl)).toHaveLength(0);
    expect(reader.notes).toEqual([]);
  });

  it('falls back to the free reader when the page has almost no text, and says so once', async () => {
    const fetchImpl = jest.fn().mockImplementation(async (url: string) =>
      String(url).startsWith('https://r.jina.ai/')
        ? new Response(`# Rendered\n${longText}\n[Admissions](https://8.8.8.8/admissions)`)
        : html('<body><div id="app"></div><script>render()</script></body>')
    );
    const reader = createHttpReader(fetchImpl as never);

    const first = await reader.read('https://8.8.8.8/');
    await reader.read('https://8.8.8.8/other');

    expect(first.text).toContain('exchange students');
    expect(first.links).toEqual([{ text: 'Admissions', href: 'https://8.8.8.8/admissions' }]);
    expect(reader.notes).toHaveLength(1);
    expect(reader.notes[0]).toMatch(/Jina Reader/);
  });

  it('keeps the thin plain page when the fallback is unavailable', async () => {
    const fetchImpl = jest.fn().mockImplementation(async (url: string) =>
      String(url).startsWith('https://r.jina.ai/') ? new Response('rate limited', { status: 429 }) : html('<body><p>Short but real text.</p></body>')
    );
    const content = await createHttpReader(fetchImpl as never).read('https://8.8.8.8/');
    expect(content.text).toBe('Short but real text.');
  });

  it('uses the fallback when the plain request fails outright', async () => {
    const fetchImpl = jest.fn().mockImplementation(async (url: string) => {
      if (String(url).startsWith('https://r.jina.ai/')) return new Response(longText);
      throw new Error('socket hang up');
    });
    const content = await createHttpReader(fetchImpl as never).read('https://8.8.8.8/');
    expect(content.text).toContain('exchange students');
  });

  it('throws when both routes fail', async () => {
    const fetchImpl = jest.fn().mockImplementation(async (url: string) => {
      if (String(url).startsWith('https://r.jina.ai/')) return new Response('nope', { status: 500 });
      throw new Error('socket hang up');
    });
    await expect(createHttpReader(fetchImpl as never).read('https://8.8.8.8/')).rejects.toThrow('socket hang up');
  });

  it('never sends an internal address to the fallback service', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(redirect('http://10.0.0.5/secret'));
    await expect(createHttpReader(fetchImpl as never).read('https://8.8.8.8/')).rejects.toMatchObject({ code: 'SCRAPE_URL_PRIVATE' });
    expect(jinaCalls(fetchImpl)).toHaveLength(0);
  });
});

describe('openReader', () => {
  const original = process.env.SCRAPE_ENGINE;
  afterEach(() => {
    if (original === undefined) delete process.env.SCRAPE_ENGINE;
    else process.env.SCRAPE_ENGINE = original;
  });

  it('SCRAPE_ENGINE=http skips the browser entirely', async () => {
    process.env.SCRAPE_ENGINE = 'http';
    const reader = await openReader();
    expect(reader.name).toBe('http');
    await reader.close();
  });
});
