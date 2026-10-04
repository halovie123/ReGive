import type { Metadata } from 'next';
import { BecomeDonor } from '@/features/listings/become-donor';
import { ListingForm } from '@/features/listings/listing-form';
import { getMe } from '@/lib/api/server-fetch';

export const metadata: Metadata = { title: 'Đăng tặng' };

export default async function DangTangPage() {
  const me = await getMe();

  if (!me.roles.includes('DONOR')) {
    return (
      <section className="account-card" aria-labelledby="become-donor-title">
        <h1 id="become-donor-title">Trở thành Người tặng</h1>
        <p className="auth-lead">
          Để đăng món đồ, tài khoản của bạn cần có vai trò Người tặng. Bạn vẫn giữ các
          vai trò hiện có.
        </p>
        <BecomeDonor />
      </section>
    );
  }

  return (
    <section className="account-card" aria-labelledby="create-listing-title">
      <h1 id="create-listing-title">Đăng tặng món đồ</h1>
      <p className="auth-lead">
        Mô tả rõ món đồ và khuyết điểm của nó. Bài đăng thường hiển thị ngay; một số bài
        cần được xem lại trước.
      </p>
      <ListingForm preferredAreas={me.areas} />
    </section>
  );
}
