import type {
  AreaCode,
  ItemCategory,
  ItemCondition,
  ListingStatus,
  UserRole,
} from '@buy-nothing/contracts';

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

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  HOUSEHOLD: 'Đồ gia dụng',
  CLOTHING: 'Quần áo',
  BOOKS: 'Sách vở',
  CHILDREN: 'Đồ trẻ em',
  DEVICES: 'Thiết bị',
};

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  NEW: 'Mới',
  LIKE_NEW: 'Như mới',
  GOOD: 'Còn tốt',
  FAIR: 'Đã qua sử dụng nhiều',
};

/** Status badge for the owner; other members only ever see PUBLISHED. */
export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: 'Bản nháp',
  PENDING_REVIEW: 'Đang chờ duyệt',
  PUBLISHED: 'Đang hiển thị',
  RESERVED: 'Đã có người nhận',
  COMPLETED: 'Đã trao',
  WITHDRAWN: 'Đã rút',
  EXPIRED: 'Đã hết hạn',
  MODERATION_HIDDEN: 'Tạm ẩn',
};

/**
 * What each status means for the owner, in plain words. Deliberately
 * silent on which screening rule fired: telling someone exactly what the
 * filter matched is how it gets evaded.
 */
export const LISTING_STATUS_HELP: Record<ListingStatus, string> = {
  DRAFT: 'Chỉ bạn thấy bài này. Bấm “Đăng tặng” khi đã sẵn sàng.',
  PENDING_REVIEW:
    'Bài cần được xem lại trước khi hiển thị, thường vì có số điện thoại, đường link hoặc giá tiền. Bạn có thể sửa bài để bỏ những thông tin đó.',
  PUBLISHED: 'Mọi thành viên đều thấy bài này trong mục Khám phá.',
  RESERVED: 'Bạn đã chọn người nhận cho món đồ này.',
  COMPLETED: 'Món đồ đã được trao thành công.',
  WITHDRAWN: 'Bạn đã rút bài, không ai thấy bài này nữa.',
  EXPIRED: 'Bài đã hiển thị đủ 30 ngày và không còn trong mục Khám phá.',
  MODERATION_HIDDEN:
    'Bài tạm ẩn vì có thể chứa vật phẩm ReGive không nhận (tiền, thuốc, thực phẩm, hàng nguy hiểm). Đội vận hành sẽ xem lại.',
};
