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

/** Vietnamese district names for each seeded Ho Chi Minh City service area. */
export const AREA_LABELS: Record<AreaCode, string> = {
  QUAN_1: 'Quận 1',
  QUAN_3: 'Quận 3',
  QUAN_4: 'Quận 4',
  QUAN_5: 'Quận 5',
  QUAN_6: 'Quận 6',
  QUAN_7: 'Quận 7',
  QUAN_8: 'Quận 8',
  QUAN_10: 'Quận 10',
  QUAN_11: 'Quận 11',
  QUAN_12: 'Quận 12',
  THU_DUC: 'TP. Thủ Đức',
  BINH_THANH: 'Bình Thạnh',
  GO_VAP: 'Gò Vấp',
  PHU_NHUAN: 'Phú Nhuận',
  TAN_BINH: 'Tân Bình',
  TAN_PHU: 'Tân Phú',
  BINH_TAN: 'Bình Tân',
  HOC_MON: 'Hóc Môn',
  CU_CHI: 'Củ Chi',
  BINH_CHANH: 'Bình Chánh',
  NHA_BE: 'Nhà Bè',
  CAN_GIO: 'Cần Giờ',
};
