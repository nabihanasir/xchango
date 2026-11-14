import { toBullets } from './bullets';

describe('toBullets', () => {
  it('splits a comma list into one point per item', () => {
    expect(toBullets('Relational modelling, SQL design, transactions, concurrency, and normalization.')).toEqual([
      'Relational modelling',
      'SQL design',
      'Transactions',
      'Concurrency',
      'Normalization',
    ]);
  });

  it('splits sentences, lines and semicolons', () => {
    expect(toBullets('Covers search. Covers logic; and reasoning.\nEthics in AI.')).toEqual([
      'Covers search',
      'Covers logic',
      'and reasoning',
      'Ethics in AI',
    ]);
  });

  it('returns null for text that does not split into at least two points', () => {
    expect(toBullets('A short single phrase.')).toBeNull();
    expect(toBullets('Databases, and queries.')).toBeNull();
    expect(toBullets('')).toBeNull();
    expect(toBullets(undefined)).toBeNull();
  });
});
