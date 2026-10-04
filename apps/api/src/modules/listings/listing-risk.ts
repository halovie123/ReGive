import { stripAccents } from '../../common/text/vietnamese';

/**
 * Deterministic first-pass screening of a listing's text. It decides only
 * where a listing lands -- LOW publishes, MEDIUM waits for a moderator, HIGH
 * is hidden -- never whether it is deleted, so a false positive costs a
 * delay, not a lost listing. Even so, every term below was chosen against
 * ordinary Vietnamese listings (see listing-risk.spec.ts).
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type RiskReason =
  | 'BLOCKED_MEDICINE'
  | 'BLOCKED_MONEY'
  | 'BLOCKED_FOOD'
  | 'BLOCKED_DANGEROUS'
  | 'BLOCKED_ILLEGAL'
  | 'CONTACT_PHONE'
  | 'CONTACT_EMAIL'
  | 'CONTACT_LINK'
  | 'SALE_TERMS';

export type RiskAssessment = { level: RiskLevel; reasons: RiskReason[] };

type TermRule = {
  reason: RiskReason;
  /** Matched against lower-cased text with accents kept. */
  accented: string[];
  /**
   * Matched against the same text with accents stripped, for people who
   * type without them. Phrases only: single words collide once accents go
   * ("thuộc", belongs to, becomes "thuoc", medicine).
   */
  plain: string[];
};

const BLOCKED_RULES: TermRule[] = [
  {
    reason: 'BLOCKED_MEDICINE',
    accented: ['thuốc'],
    plain: [
      'tang thuoc',
      'thuoc tay',
      'thuoc bo',
      'thuoc cam',
      'thuoc ho',
      'thuoc dau',
      'thuoc ngu',
      'thuoc khang sinh',
      'thuoc giam dau',
    ],
  },
  {
    // Not "tiền" alone: donors write "không lấy tiền" (free) and "tiền
    // ship" (delivery cost), both legitimate.
    reason: 'BLOCKED_MONEY',
    accented: ['tiền mặt', 'tặng tiền', 'cho tiền', 'lì xì'],
    plain: ['tien mat', 'tang tien', 'li xi'],
  },
  {
    reason: 'BLOCKED_FOOD',
    accented: [
      'thực phẩm',
      'đồ ăn',
      'thức ăn',
      'sữa tươi',
      'thịt',
      'hải sản',
      'rau củ',
      'trái cây',
      'hoa quả',
    ],
    // No "do an": accent-stripped it is also "đồ án" (a school project).
    plain: [
      'thuc pham',
      'thuc an',
      'sua tuoi',
      'hai san',
      'rau cu',
      'trai cay',
    ],
  },
  {
    // No bare "dao" (kitchen knives are household items) and no "kiếm"
    // (also "tìm kiếm", to search).
    reason: 'BLOCKED_DANGEROUS',
    accented: [
      'súng',
      'đạn',
      'vũ khí',
      'thuốc nổ',
      'pháo',
      'xăng',
      'bình gas',
      'bình ga',
      'dao găm',
    ],
    plain: ['vu khi', 'thuoc no', 'binh gas', 'sung hoi', 'hoa chat'],
  },
  {
    reason: 'BLOCKED_ILLEGAL',
    accented: ['ma túy', 'ma tuý', 'cần sa', 'thuốc lắc', 'hàng lậu'],
    plain: ['ma tuy', 'can sa', 'thuoc lac', 'hang lau'],
  },
];

/**
 * Ordinary items whose names contain a blocked word. Removed before
 * matching; "xăng đan" is sandals, not fuel.
 */
const SAFE_PHRASES = ['tủ thuốc', 'xăng đan', 'xăng-đan', 'giày xăng'];

const SALE_PHRASES = {
  // No plain "ban lai": accent-stripped it is also "bàn lại" (discuss again).
  accented: ['thanh lý', 'giá bán', 'bán lại', 'cần bán', 'pass lại'],
  plain: ['thanh ly', 'gia ban'],
};

/** A number followed by a currency unit: "200k", "50.000đ", "1 triệu". */
const PRICE =
  /\d[\d.,]*\s?(?:k|nghìn|ngàn|triệu|tr|đ|vnđ|vnd|đồng)(?![\p{L}\p{N}])/iu;

/**
 * A Vietnamese phone number, digits optionally split by spaces, dots or
 * dashes: 0 or +84 followed by 8–10 more digits.
 */
const PHONE = /(?<![\d+])(?:\+?84|0)(?:[\s.-]?\d){8,10}(?!\d)/u;

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/iu;
/** Same pattern, global, for replace() only: test() with g is stateful. */
const ALL_EMAILS = new RegExp(EMAIL.source, 'giu');

const LINK =
  /(?:https?:\/\/|www\.)\S+|(?<![\p{L}\p{N}@.])[a-z0-9-]+\.(?:com|vn|net|org|me|io|info|link|ly)(?:\.vn)?(?:\/\S*)?(?![\p{L}\p{N}])/iu;

const REASON_ORDER: RiskReason[] = [
  'BLOCKED_MEDICINE',
  'BLOCKED_MONEY',
  'BLOCKED_FOOD',
  'BLOCKED_DANGEROUS',
  'BLOCKED_ILLEGAL',
  'CONTACT_PHONE',
  'CONTACT_EMAIL',
  'CONTACT_LINK',
  'SALE_TERMS',
];

export function assessListing(listing: {
  title: string;
  description: string;
  defects: string;
}): RiskAssessment {
  const raw = [listing.title, listing.description, listing.defects].join('\n');
  const accented = withoutSafePhrases(
    raw.normalize('NFC').toLowerCase().replace(/\s+/g, ' '),
  );
  const plain = stripAccents(accented);
  const found = new Set<RiskReason>();

  for (const rule of BLOCKED_RULES) {
    if (
      rule.accented.some((term) => containsWord(accented, term)) ||
      rule.plain.some((term) => containsWord(plain, term))
    ) {
      found.add(rule.reason);
    }
  }

  if (PHONE.test(raw)) found.add('CONTACT_PHONE');
  if (EMAIL.test(raw)) found.add('CONTACT_EMAIL');
  // Emails contain a domain; remove them so one address is not also a link.
  if (LINK.test(raw.replace(ALL_EMAILS, ' '))) found.add('CONTACT_LINK');
  if (
    PRICE.test(accented) ||
    SALE_PHRASES.accented.some((term) => containsWord(accented, term)) ||
    SALE_PHRASES.plain.some((term) => containsWord(plain, term))
  ) {
    found.add('SALE_TERMS');
  }

  const reasons = REASON_ORDER.filter((reason) => found.has(reason));
  return { level: levelFor(reasons), reasons };
}

function levelFor(reasons: RiskReason[]): RiskLevel {
  if (reasons.some((reason) => reason.startsWith('BLOCKED_'))) return 'HIGH';
  return reasons.length > 0 ? 'MEDIUM' : 'LOW';
}

function withoutSafePhrases(text: string): string {
  return SAFE_PHRASES.reduce(
    (current, phrase) => current.split(phrase).join(' '),
    text,
  );
}

/**
 * \b treats every Vietnamese accented letter as a boundary, so word edges
 * are defined as "not a letter or digit" instead.
 */
function containsWord(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    'u',
  ).test(text);
}
