import type { MeResponse, UserRole } from '@buy-nothing/contracts';
import { StatusState } from '@/components/ui/status-state';

type RoleContent = {
  eyebrow: string;
  title: string;
  cta: string;
  href: string;
};

const ROLE_CONTENT: Record<UserRole, RoleContent> = {
  DONOR: {
    eyebrow: 'Người tặng',
    title: 'Sẵn sàng chia sẻ món đồ tiếp theo?',
    cta: 'Đăng món đồ mới',
    href: '/kham-pha',
  },
  RECIPIENT: {
    eyebrow: 'Người nhận',
    title: 'Tìm món đồ bạn đang cần',
    cta: 'Tìm món đồ',
    href: '/kham-pha',
  },
  VOLUNTEER: {
    eyebrow: 'Tình nguyện viên',
    title: 'Hỗ trợ vận chuyển trong khu vực của bạn',
    cta: 'Xem đơn cần vận chuyển',
    href: '/kham-pha',
  },
};

type RoleHomeProps = { me: MeResponse };

/**
 * A single home experience that branches its primary call-to-action by the
 * member's active role, rather than three separate donor/recipient/
 * volunteer apps. Used by app/(app)/trang-chu/page.tsx.
 */
export function RoleHome({ me }: RoleHomeProps) {
  const role = me.activeRole ?? me.roles[0] ?? 'DONOR';
  const content = ROLE_CONTENT[role];
  const name = me.profile?.displayName ?? 'bạn';

  return (
    <>
      <section className="role-home-hero" aria-labelledby="role-home-title">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 id="role-home-title">{content.title}</h1>
        <p>
          Xin chào, {name}. Đây là không gian dành riêng cho vai trò hiện tại của bạn.
        </p>
        <div className="role-home-actions">
          <a className="button button-primary" href={content.href}>
            {content.cta}
          </a>
        </div>
      </section>

      <StatusState
        state="empty"
        message="Chưa có hoạt động nào"
        description="Hoạt động gần đây của bạn sẽ xuất hiện ở đây."
      />
    </>
  );
}
