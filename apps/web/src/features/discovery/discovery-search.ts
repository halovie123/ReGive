import {
  AreaCodeSchema,
  ItemCategorySchema,
  ItemConditionSchema,
} from '@buy-nothing/contracts';

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const FILTERS = [
  ['category', ItemCategorySchema],
  ['area', AreaCodeSchema],
  ['condition', ItemConditionSchema],
] as const;

/**
 * Turns the page's (user-editable) search params into the query string sent
 * to the discovery API. Known filters with valid values pass; anything else,
 * including a cursor, is dropped, so a mangled URL shows an unfiltered list
 * instead of failing the whole page with a 422.
 */
export function discoverySearch(params: SearchParams): string {
  const query = new URLSearchParams();
  const q = first(params.q)?.trim();
  if (q) query.set('q', q.slice(0, 100));
  for (const [key, schema] of FILTERS) {
    const value = schema.safeParse(first(params[key]));
    if (value.success) query.set(key, value.data);
  }
  return query.toString();
}

/** The same params as plain values, for pre-filling the filter form. */
export function filterValues(params: SearchParams) {
  const search = new URLSearchParams(discoverySearch(params));
  return {
    q: search.get('q') ?? undefined,
    category: search.get('category') ?? undefined,
    area: search.get('area') ?? undefined,
    condition: search.get('condition') ?? undefined,
  };
}
