/**
 * Position in the discovery feed, which is ordered by (publishedAt, id)
 * descending. id breaks ties, so listings published in the same millisecond
 * are neither repeated nor skipped across pages.
 */
export type CursorPosition = { publishedAt: Date; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor({ publishedAt, id }: CursorPosition): string {
  return Buffer.from(
    JSON.stringify({ p: publishedAt.toISOString(), i: id }),
  ).toString('base64url');
}

/**
 * Returns null for anything that is not a cursor this API issued. The value
 * comes straight from the query string, so it is validated field by field
 * before it can reach a query.
 */
export function decodeCursor(cursor: string): CursorPosition | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { p, i } = parsed as { p?: unknown; i?: unknown };
  if (typeof p !== 'string' || typeof i !== 'string' || !UUID.test(i)) {
    return null;
  }
  const publishedAt = new Date(p);
  if (Number.isNaN(publishedAt.getTime())) return null;
  return { publishedAt, id: i };
}
