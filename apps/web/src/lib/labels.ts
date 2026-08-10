import type { AreaCode, UserRole } from '@buy-nothing/contracts';

/** Short Vietnamese labels for a role, used in switchers and summaries. */
export const ROLE_LABELS: Record<UserRole, string> = {
  DONOR: 'Người tặng',
  RECIPIENT: 'Người nhận',
  VOLUNTEER: 'Tình nguyện viên',
};

/** Longer labels used on the onboarding role picker. */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  DONOR: 'Người tặng — chia sẻ món đồ không dùng nữa',
  RECIPIENT: 'Người nhận — tìm món đồ mình cần',
  VOLUNTEER: 'Tình nguyện viên — hỗ trợ vận chuyển và giao nhận đồ',
};

/** Vietnamese ward/commune names for each seeded Hóc Môn service area. */
export const AREA_LABELS: Record<AreaCode, string> = {
  HOC_MON: 'Hóc Môn',
  BA_DIEM: 'Bà Điểm',
  XUAN_THOI_SON: 'Xuân Thới Sơn',
  DONG_THANH: 'Đông Thạnh',
};
