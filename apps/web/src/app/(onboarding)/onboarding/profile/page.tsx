import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { StatusState } from '@/components/ui/status-state';
import { OnboardingForm } from '@/features/onboarding/onboarding-form';
import { safeGetMe } from '@/lib/api/server-fetch';
import { nextOnboardingStep } from '@/lib/onboarding-step';
import { createClient } from '@/lib/supabase/server';
import '@/styles/regive-app.css';

export const metadata: Metadata = {
  title: 'Hoàn tất hồ sơ — ReGive',
};

export default async function OnboardingProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const me = await safeGetMe();
  if (me) {
    const destination = nextOnboardingStep(me);
    if (destination !== '/onboarding/profile') redirect(destination);
  }

  return (
    <main className="onboarding-page">
      <p className="onboarding-progress">
        <span>1. Số điện thoại</span>
        <span data-active="true">2. Hồ sơ</span>
      </p>

      <div className="auth-card">
        <div>
          <h1>Hoàn tất hồ sơ của bạn</h1>
          <p className="auth-lead">
            Cho cộng đồng ReGive biết bạn là ai và bạn muốn tham gia như thế nào.
          </p>
        </div>

        {!me ? (
          <StatusState
            state="error"
            message="Không thể tải thông tin tài khoản"
            description="Vui lòng tải lại trang. Nếu vẫn lỗi, hãy thử đăng nhập lại."
          />
        ) : (
          <OnboardingForm />
        )}
      </div>
    </main>
  );
}
