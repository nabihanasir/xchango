import { WORLD_COUNTRIES, flagEmoji, searchWorldCountries } from './worldCountries';

describe('worldCountries', () => {
  it('lists every ISO country once, sorted by name', () => {
    expect(WORLD_COUNTRIES.length).toBeGreaterThanOrEqual(240);
    expect(new Set(WORLD_COUNTRIES.map((country) => country.code)).size).toBe(WORLD_COUNTRIES.length);
    const names = WORLD_COUNTRIES.map((country) => country.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('builds a flag from the ISO code', () => {
    expect(flagEmoji('pk')).toBe('🇵🇰');
    expect(WORLD_COUNTRIES.find((country) => country.code === 'JP')?.flag).toBe('🇯🇵');
  });

  it('finds countries by name, case-insensitively', () => {
    expect(searchWorldCountries('malay').map((country) => country.code)).toContain('MY');
    expect(searchWorldCountries('SOUTH KOREA').map((country) => country.code)).toContain('KR');
  });

  it('finds countries by ISO code and ranks prefix matches first', () => {
    expect(searchWorldCountries('tr')[0].code).toBe('TR');
    const results = searchWorldCountries('land', 50).map((country) => country.name);
    expect(results.length).toBeGreaterThan(3);
  });

  it('ignores accents', () => {
    expect(searchWorldCountries('aland').map((country) => country.code)).toContain('AX');
  });

  it('returns nothing for gibberish and honours the limit', () => {
    expect(searchWorldCountries('zzzzzz')).toEqual([]);
    expect(searchWorldCountries('', 5)).toHaveLength(5);
  });
});
