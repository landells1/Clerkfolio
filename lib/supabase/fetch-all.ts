import type { PostgrestError } from '@supabase/supabase-js'

// PostgREST caps an unpaginated response at `db.max_rows` (default 1000), so a
// bare `.select()` on a heavy account silently returns a truncated set. This
// helper walks `.range()` windows until a short page proves the end has been
// reached, concatenating every row. It is a drop-in for a single PostgREST
// query: it returns the same `{ data, error }` shape, so call sites keep their
// existing error-handling posture. It NEVER returns a partial set as a success
// - any page error, or hitting the safety bound, surfaces as `{ data: null,
// error }` instead of a quietly-truncated array.

export interface FetchAllResult<Row> {
  data: Row[] | null
  error: PostgrestError | null
}

// A single ranged page of a PostgREST query. The factory MUST build a fresh
// builder each call - PostgREST builders are single-use (awaiting one twice
// throws) - so pagination cannot reuse one instance across pages.
type PageFactory<Row> = (
  from: number,
  to: number,
) => PromiseLike<{ data: Row[] | null; error: PostgrestError | null }>

export interface FetchAllOptions {
  // PostgREST's default `db.max_rows` is 1000; a page size at or below it keeps
  // every window a full response so the short-page terminator stays reliable.
  pageSize?: number
  // Upper bound on pages so a pathological/looping query cannot run forever.
  // Hitting it is treated as an error, never as a clean end-of-data.
  maxPages?: number
}

const DEFAULT_PAGE_SIZE = 1000
const DEFAULT_MAX_PAGES = 1000

/**
 * Fetch every row of a filtered PostgREST query by paging through `.range()`
 * windows until a short (or empty) page is returned.
 *
 * @param page  Builds and awaits ONE page: given a zero-based `[from, to]`
 *   inclusive range, return `builder…​.range(from, to)`. Build a fresh builder
 *   on every call (single-use). Apply any `.order()` inside the factory so
 *   pages are deterministic - without a stable order, rows can shift between
 *   requests and pages will overlap or skip. If the source query has no natural
 *   order, order by the primary key (e.g. `.order('id')`).
 *
 * @returns `{ data, error }`. `data` holds all rows on success; on ANY page
 *   error (or on exhausting `maxPages`) `data` is `null` and `error` is set -
 *   partial results are never returned as success.
 */
export async function fetchAllRows<Row>(
  page: PageFactory<Row>,
  options: FetchAllOptions = {},
): Promise<FetchAllResult<Row>> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES

  const all: Row[] = []

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const from = pageIndex * pageSize
    const to = from + pageSize - 1

    const { data, error } = await page(from, to)
    if (error) return { data: null, error }

    const rows = data ?? []
    all.push(...rows)

    // A page shorter than the window means there are no more rows to fetch.
    if (rows.length < pageSize) {
      return { data: all, error: null }
    }
  }

  // Ran the full page budget without ever seeing a short page. Surfacing this
  // as an error (rather than returning `all`) is deliberate: a silently
  // truncated export is exactly the completeness defect this helper exists to
  // prevent.
  return {
    data: null,
    error: {
      name: 'FetchAllRowsMaxPagesError',
      message: `fetchAllRows exceeded its safety bound of ${maxPages} pages (pageSize ${pageSize}); refusing to return a possibly-truncated result`,
      details: '',
      hint: '',
      code: 'FETCH_ALL_MAX_PAGES',
    } as PostgrestError,
  }
}
