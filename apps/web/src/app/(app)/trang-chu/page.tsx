import type { Metadata } from 'next';
import { RoleHome } from '@/features/home/role-home';
import { getMe } from '@/lib/api/server-fetch';

export const metadata: Metadata = {
  title: 'Trang chủ',
};

export default async function TrangChuPage() {
  // (app)/layout.tsx already guards this route (signed in, phone
  // verified, profile complete) before children render, so a plain
  // getMe() here is safe and shares its cached result with the layout.
  const me = await getMe();
  return <RoleHome me={me} />;
}
