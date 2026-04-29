import { calculateSimilarity } from './similarity';

describe('calculateSimilarity', () => {
  it('returns 1 for identical text regardless of case and punctuation', () => {
    expect(calculateSimilarity('Data Structures!', 'data structures')).toBe(1);
  });

  it('returns a partial score when only some tokens overlap', () => {
    expect(calculateSimilarity('advanced database systems', 'database systems')).toBeCloseTo(2 / 3, 5);
  });

  it('returns 0 when strings share no common tokens', () => {
    expect(calculateSimilarity('linear algebra', 'organic chemistry')).toBe(0);
  });
});
