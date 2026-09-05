import type { Metadata } from 'next';
import { RoleHome } from '@/features/home/role-home';
import { getMe } from '@/lib/api/server-fetch';

export const metadata: Metadata = {
  title: 'Trang chủ',
};

export default async function TrangChuPage() {
  // (app)/layout.tsx guards this route (signed in, profile complete) and
  // getMe() shares its cached result within the same request.
  //
  // Note the layout only re-runs on a HARD navigation — Next skips
  // unchanged layout segments on client-side navigation — so this getMe()
  // can throw here even though the layout rendered fine earlier. That is
  // handled by (app)/error.tsx, which renders inside this layout and keeps
  // the shell intact.
  const me = await getMe();
  return <RoleHome me={me} />;
}
