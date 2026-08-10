import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { StatusState } from '@/components/ui/status-state';
import { PhoneForm } from '@/features/onboarding/phone-form';
import { safeGetMe } from '@/lib/api/server-fetch';
import { nextOnboardingStep } from '@/lib/onboarding-step';
import { createClient } from '@/lib/supabase/server';
import '@/styles/regive-app.css';

export const metadata: Metadata = {
  title: 'Xác nhận số điện thoại — ReGive',
};

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function OnboardingPhonePage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const me = await safeGetMe();
  if (me) {
    const destination = nextOnboardingStep(me);
    if (destination !== '/onboarding/phone') redirect(destination);
  }

  return (
    <main className="onboarding-page">
      <p className="onboarding-progress">
        <span data-active="true">1. Số điện thoại</span>
        <span>2. Hồ sơ</span>
      </p>

      <div className="auth-card">
        <div>
          <h1>Xác nhận số điện thoại</h1>
          <p className="auth-lead">
            ReGive dùng số điện thoại để các thành viên trong khu vực có thể liên hệ
            an toàn khi trao và nhận đồ.
          </p>
        </div>

        {!me && (
          <StatusState
            state="error"
            message="Không thể tải thông tin tài khoản"
            description="Vui lòng tải lại trang. Nếu vẫn lỗi, hãy thử đăng nhập lại."
          />
        )}

        {error && (
          <p className="auth-status" data-tone="error">
            Không thể xác nhận số điện thoại. Vui lòng thử lại.
          </p>
        )}

        <PhoneForm />
      </div>
    </main>
  );
}
