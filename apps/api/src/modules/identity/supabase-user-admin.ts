import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const ADMIN_FETCH = Symbol('ADMIN_FETCH');
export type AdminFetch = (url: string, init: RequestInit) => Promise<Response>;

export type AdminIdentityUser = {
  subject: string;
  phone: string | null;
  phoneConfirmedAt: Date | null;
};

type SupabaseAdminUserResponse = {
  id?: unknown;
  phone?: unknown;
  phone_confirmed_at?: unknown;
};

@Injectable()
export class SupabaseUserAdmin {
  private readonly baseUrl: string;
  private readonly serviceRoleKey: string;

  constructor(
    config: ConfigService,
    @Inject(ADMIN_FETCH) private readonly adminFetch: AdminFetch,
  ) {
    this.baseUrl = config.getOrThrow<string>('SUPABASE_URL').replace(/\/$/, '');
    this.serviceRoleKey = config.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  async getUser(subject: string): Promise<AdminIdentityUser> {
    try {
      const response = await this.adminFetch(
        `${this.baseUrl}/auth/v1/admin/users/${encodeURIComponent(subject)}`,
        {
          method: 'GET',
          headers: {
            apikey: this.serviceRoleKey,
            authorization: `Bearer ${this.serviceRoleKey}`,
          },
        },
      );
      if (!response.ok) throw new Error('Admin endpoint rejected request');

      const body = (await response.json()) as SupabaseAdminUserResponse;
      if (body.id !== subject) throw new Error('Admin subject mismatch');
      const phone =
        body.phone === null || typeof body.phone === 'string'
          ? body.phone
          : null;
      let phoneConfirmedAt: Date | null = null;
      if (typeof body.phone_confirmed_at === 'string') {
        const parsed = new Date(body.phone_confirmed_at);
        if (Number.isNaN(parsed.getTime())) {
          throw new Error('Invalid confirmation timestamp');
        }
        phoneConfirmedAt = parsed;
      }

      return { subject, phone, phoneConfirmedAt };
    } catch {
      throw new Error('Identity provider is unavailable');
    }
  }
}
