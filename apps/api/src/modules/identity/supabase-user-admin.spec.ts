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

  it('bounds Admin requests and maps abort failures without leaking details', async () => {
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
