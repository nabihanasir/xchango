import { MAX_PAGE_LIMIT, parsePagination, paginateArray, paginateQuery } from './pagination';

describe('parsePagination', () => {
  it('returns null when no paging params are given so callers keep the full list', () => {
    expect(parsePagination({})).toBeNull();
    expect(parsePagination(undefined)).toBeNull();
    expect(parsePagination({ status: 'x' })).toBeNull();
  });

  it('parses page and limit and computes skip', () => {
    expect(parsePagination({ page: '3', limit: '25' })).toEqual({ page: 3, limit: 25, skip: 50 });
  });

  it('falls back to defaults for junk values', () => {
    expect(parsePagination({ page: '-2', limit: 'abc' })).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(parsePagination({ page: '0' })).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('caps the limit', () => {
    expect(parsePagination({ limit: '100000' })?.limit).toBe(MAX_PAGE_LIMIT);
  });
});

describe('paginateArray', () => {
  const rows = Array.from({ length: 45 }, (_, index) => index + 1);

  it('returns the array untouched without a page request', () => {
    expect(paginateArray(rows, null)).toBe(rows);
  });

  it('slices the requested page and reports totals', () => {
    const result = paginateArray(rows, { page: 3, limit: 20, skip: 40 });
    expect(result).toEqual({ items: [41, 42, 43, 44, 45], total: 45, page: 3, limit: 20, totalPages: 3 });
  });

  it('returns an empty page past the end', () => {
    const result = paginateArray(rows, { page: 9, limit: 20, skip: 160 }) as { items: number[]; total: number };
    expect(result.items).toEqual([]);
    expect(result.total).toBe(45);
  });
});

describe('paginateQuery', () => {
  const makeQuery = (rows: number[]) => {
    const state = { skip: 0, limit: rows.length };
    const query: any = {
      skip: (count: number) => ((state.skip = count), query),
      limit: (count: number) => ((state.limit = count), query),
      clone: () => query,
      then: (resolve: (value: number[]) => unknown) => resolve(rows.slice(state.skip, state.skip + state.limit)),
    };
    return query;
  };

  it('applies skip/limit and counts with the supplied function', async () => {
    const rows = Array.from({ length: 30 }, (_, index) => index);
    const result = await paginateQuery(makeQuery(rows), async () => rows.length, { page: 2, limit: 10, skip: 10 });
    expect(result).toEqual({ items: rows.slice(10, 20), total: 30, page: 2, limit: 10, totalPages: 3 });
  });

  it('resolves to the plain array without a page request', async () => {
    const rows = [1, 2, 3];
    expect(await paginateQuery(makeQuery(rows), async () => 3, null)).toEqual(rows);
  });
});
