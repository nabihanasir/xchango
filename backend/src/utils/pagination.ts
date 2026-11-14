export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export interface PageRequest {
  page: number;
  limit: number;
  skip: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const toPositiveInt = (value: unknown): number | null => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Reads `?page=&limit=` from a query object. Returns null when neither is supplied so
 * existing callers keep receiving the full list; the limit is capped at MAX_PAGE_LIMIT.
 */
export const parsePagination = (query: Record<string, unknown> | undefined): PageRequest | null => {
  if (!query || (query.page === undefined && query.limit === undefined)) {
    return null;
  }
  const page = toPositiveInt(query.page) ?? 1;
  const limit = Math.min(toPositiveInt(query.limit) ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
};

export const buildPage = <T>(items: T[], total: number, request: PageRequest): Paginated<T> => ({
  items,
  total,
  page: request.page,
  limit: request.limit,
  totalPages: Math.max(1, Math.ceil(total / request.limit)),
});

/** Minimal shape shared by Mongoose queries so one helper serves every model. */
interface PageableQuery<T> extends PromiseLike<T[]> {
  skip(count: number): this;
  limit(count: number): this;
  clone(): this;
}

/**
 * Applies paging to a Mongoose query when requested. `countDocuments` should use the same filter
 * as the query. Without a page request the query resolves to the plain array, unchanged.
 */
export const paginateQuery = async <T>(
  query: PageableQuery<T>,
  countDocuments: () => Promise<number>,
  request: PageRequest | null,
): Promise<T[] | Paginated<T>> => {
  if (!request) {
    return query;
  }
  const [items, total] = await Promise.all([
    query.clone().skip(request.skip).limit(request.limit),
    countDocuments(),
  ]);
  return buildPage(items, total, request);
};

/** Same idea for lists already built in memory (e.g. when merging two collections). */
export const paginateArray = <T>(items: T[], request: PageRequest | null): T[] | Paginated<T> =>
  request ? buildPage(items.slice(request.skip, request.skip + request.limit), items.length, request) : items;
