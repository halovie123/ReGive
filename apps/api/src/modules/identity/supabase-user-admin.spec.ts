import { ConfigService } from '@nestjs/config';
import { AdminFetch, SupabaseUserAdmin } from './supabase-user-admin';

const configValues = {
  SUPABASE_URL: 'https://trusted-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
};
const config = {
  getOrThrow: (key: keyof typeof configValues) => configValues[key],
} as unknown as ConfigService;

describe('SupabaseUserAdmin', () => {
  it('fetches the verified subject through the Admin user endpoint', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const adminFetch: AdminFetch = (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'subject-1',
            phone: '+84912345678',
            phone_confirmed_at: '2026-08-04T10:00:00.000Z',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
    };
    const adapter = new SupabaseUserAdmin(config, adminFetch);

    await expect(adapter.getUser('subject-1')).resolves.toEqual({
      subject: 'subject-1',
      phone: '+84912345678',
      phoneConfirmedAt: new Date('2026-08-04T10:00:00.000Z'),
    });
    expect(capturedUrl).toBe(
      'https://trusted-project.supabase.co/auth/v1/admin/users/subject-1',
    );
    expect(capturedInit).toMatchObject({
      method: 'GET',
      headers: {
        apikey: 'test-service-role-key',
        authorization: 'Bearer test-service-role-key',
      },
    });
    expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
    expect(capturedInit?.signal?.aborted).toBe(false);
  });

  it('maps Admin abort failures without leaking details', async () => {
    let suppliedSignal: AbortSignal | null | undefined;
    const adapter = new SupabaseUserAdmin(config, (_url, init) => {
      suppliedSignal = init.signal;
      return Promise.reject(
        new DOMException('raw timeout detail must-not-leak', 'AbortError'),
      );
    });

    await expect(adapter.getUser('subject-1')).rejects.toThrow(
      'Identity provider is unavailable',
    );
    expect(suppliedSignal).toBeInstanceOf(AbortSignal);
    await expect(adapter.getUser('subject-1')).rejects.not.toThrow(
      'must-not-leak',
    );
  });

  it('aborts a pending Admin request through the bounded timeout policy', async () => {
    const timeoutController = new AbortController();
    let requestedTimeout: number | undefined;
    const adminFetch: AdminFetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener(
          'abort',
          () =>
            reject(
              new DOMException(
                'raw timeout detail must-not-leak',
                'AbortError',
              ),
            ),
          { once: true },
        );
      });
    const adapter = Reflect.construct(SupabaseUserAdmin, [
      config,
      adminFetch,
      (timeoutMs: number) => {
        requestedTimeout = timeoutMs;
        return timeoutController.signal;
      },
    ]);

    const outcome = adapter.getUser('subject-1').then(
      () => 'unexpected-success',
      (error: Error) => error.message,
    );
    timeoutController.abort(
      new DOMException('raw timeout detail must-not-leak', 'TimeoutError'),
    );

    await expect(
      Promise.race([
        outcome,
        new Promise<string>((resolve) =>
          setImmediate(() => resolve('request-still-pending')),
        ),
      ]),
    ).resolves.toBe('Identity provider is unavailable');
    expect(requestedTimeout).toBe(5_000);
  });

  it.each([
    new Response('raw upstream body must-not-leak', { status: 503 }),
    new Response(JSON.stringify({ id: 'different-subject' }), { status: 200 }),
  ])(
    'maps upstream and subject mismatch failures to a safe error',
    async (response) => {
      const adapter = new SupabaseUserAdmin(config, () =>
        Promise.resolve(response),
      );

      await expect(adapter.getUser('subject-1')).rejects.toThrow(
        'Identity provider is unavailable',
      );
      await expect(adapter.getUser('subject-1')).rejects.not.toThrow(
        'must-not-leak',
      );
    },
  );
});
