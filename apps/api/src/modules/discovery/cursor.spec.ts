import { decodeCursor, encodeCursor } from './cursor';

describe('discovery cursor', () => {
  const position = {
    publishedAt: new Date('2026-10-04T08:00:00.123Z'),
    id: '00000000-0000-4000-8000-000000000001',
  };

  it('round-trips a position, keeping milliseconds', () => {
    expect(decodeCursor(encodeCursor(position))).toEqual(position);
  });

  it('is URL-safe', () => {
    expect(encodeCursor(position)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  /**
   * The cursor comes straight from the query string, so anything a client
   * can type must decode to null rather than reach the SQL.
   */
  it.each([
    ['garbage', 'not-a-cursor'],
    [
      'valid base64 that is not JSON',
      Buffer.from('hello').toString('base64url'),
    ],
    [
      'JSON missing the id',
      Buffer.from(JSON.stringify({ p: '2026-10-04T08:00:00.000Z' })).toString(
        'base64url',
      ),
    ],
    [
      'an id that is not a uuid',
      Buffer.from(
        JSON.stringify({ p: '2026-10-04T08:00:00.000Z', i: "1' OR '1'='1" }),
      ).toString('base64url'),
    ],
    [
      'an impossible date',
      Buffer.from(
        JSON.stringify({
          p: 'yesterday',
          i: '00000000-0000-4000-8000-000000000001',
        }),
      ).toString('base64url'),
    ],
  ])('rejects %s', (_label, cursor) => {
    expect(decodeCursor(cursor)).toBeNull();
  });
});
