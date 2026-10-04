import nextConfig from '../../next.config';

/**
 * The app shipped with no response headers configured at all, so every
 * signed-in page could be framed by any origin — enough to clickjack the
 * role switcher or the sign-out button. These assert the headers exist and
 * cover every route, because a header that applies to only some paths is
 * the failure mode nobody notices.
 */
const catchAllHeaders = async (): Promise<Map<string, string>> => {
  const rules = (await nextConfig.headers?.()) ?? [];
  const matching = rules.filter((rule) =>
    // The config uses a single catch-all source; assert that rather than
    // reimplementing Next's path matcher.
    ['/:path*', '/(.*)'].includes(rule.source),
  );
  expect(matching.length).toBeGreaterThan(0);

  return new Map(
    matching.flatMap((rule) =>
      rule.headers.map(({ key, value }) => [key.toLowerCase(), value] as const),
    ),
  );
};

describe('security headers', () => {
  it('refuses to be framed by any origin', async () => {
    const headers = await catchAllHeaders();

    expect(headers.get('x-frame-options')).toBe('DENY');
    // frame-ancestors is what modern browsers actually enforce;
    // X-Frame-Options is the fallback for older ones.
    expect(headers.get('content-security-policy')).toContain(
      "frame-ancestors 'none'",
    );
  });

  it('stops content-type sniffing', async () => {
    const headers = await catchAllHeaders();

    expect(headers.get('x-content-type-options')).toBe('nosniff');
  });

  /**
   * Without this, the full URL of a signed-in page — which can carry an id
   * in the path — is sent to any third-party the page links out to.
   */
  it('trims the referrer sent to other origins', async () => {
    const headers = await catchAllHeaders();

    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });

  it('pins the browser to https for a year', async () => {
    const headers = await catchAllHeaders();

    const hsts = headers.get('strict-transport-security') ?? '';
    expect(hsts).toContain('max-age=');
    const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1] ?? 0);
    expect(maxAge).toBeGreaterThanOrEqual(31_536_000);
  });

  /**
   * The product deliberately never asks for a precise location (the spec
   * stores an area, never an address), so the browser should not even offer
   * these to a compromised script.
   */
  it('denies device capabilities the product never uses', async () => {
    const headers = await catchAllHeaders();

    const policy = headers.get('permissions-policy') ?? '';
    expect(policy).toContain('geolocation=()');
    expect(policy).toContain('camera=()');
    expect(policy).toContain('microphone=()');
  });
});
