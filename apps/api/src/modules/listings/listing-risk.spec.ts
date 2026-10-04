import { assessListing } from './listing-risk';

const safeBook = {
  title: 'Bộ sách giáo khoa lớp 5',
  description: 'Đủ 10 cuốn, còn sạch, có bọc bìa. Phù hợp cho năm học mới.',
  defects: 'Hai cuốn bị quăn góc',
};

const assess = (text: Partial<typeof safeBook>) =>
  assessListing({ ...safeBook, ...text });

describe('assessListing', () => {
  it('passes an ordinary listing as LOW with no reasons', () => {
    expect(assessListing(safeBook)).toEqual({ level: 'LOW', reasons: [] });
  });

  describe('forbidden items → HIGH', () => {
    it.each([
      [
        'medicine',
        {
          title: 'Tặng thuốc',
          description: 'Còn hạn sử dụng tới cuối năm sau.',
        },
        'BLOCKED_MEDICINE',
      ],
      [
        'medicine typed without accents',
        {
          title: 'Tang thuoc cam cum',
          description: 'Con han dung, ai can lien he nhe.',
        },
        'BLOCKED_MEDICINE',
      ],
      [
        'cash',
        { description: 'Tặng tiền mặt cho gia đình khó khăn trong khu vực.' },
        'BLOCKED_MONEY',
      ],
      [
        'perishable food',
        {
          title: 'Thực phẩm còn hạn',
          description: 'Mì gói, đồ hộp và sữa tươi dùng không hết.',
        },
        'BLOCKED_FOOD',
      ],
      [
        'weapons',
        {
          title: 'Súng hơi cũ',
          description: 'Không dùng nữa, muốn tặng lại cho ai cần.',
        },
        'BLOCKED_DANGEROUS',
      ],
      [
        'fuel',
        { description: 'Bình xăng dự phòng 5 lít, còn khoảng một nửa.' },
        'BLOCKED_DANGEROUS',
      ],
      [
        'drugs',
        { description: 'Tặng cần sa trồng trong nhà, còn khá nhiều.' },
        'BLOCKED_ILLEGAL',
      ],
    ])('flags %s', (_label, text, reason) => {
      const result = assess(text);

      expect(result.level).toBe('HIGH');
      expect(result.reasons).toContain(reason);
    });
  });

  describe('things a moderator should look at → MEDIUM', () => {
    it.each([
      [
        'a phone number',
        { description: 'Tủ gỗ còn tốt. Liên hệ 0909123456 để nhận.' },
        'CONTACT_PHONE',
      ],
      [
        'a phone number broken up with spaces',
        { description: 'Gọi mình số 090 912 3456 nhé, nhận trong tuần.' },
        'CONTACT_PHONE',
      ],
      [
        'an international phone number',
        { description: 'Tủ gỗ còn tốt, cần nhận gấp thì gọi +84 909 123 456.' },
        'CONTACT_PHONE',
      ],
      [
        'an email address',
        {
          description:
            'Tủ gỗ còn tốt. Ai cần thì gửi mail lan.nguyen@example.com nhé.',
        },
        'CONTACT_EMAIL',
      ],
      [
        'a link',
        {
          description:
            'Xem thêm ảnh tủ gỗ tại https://example.com/tu-go nhé mọi người.',
        },
        'CONTACT_LINK',
      ],
      [
        'a Zalo link',
        { description: 'Tủ gỗ còn tốt, nhắn mình qua zalo.me/0909123456 nhé.' },
        'CONTACT_LINK',
      ],
      [
        'a price',
        { description: 'Tủ gỗ còn tốt, để lại giá 200k cho ai cần gấp.' },
        'SALE_TERMS',
      ],
      [
        'a clearance sale',
        {
          title: 'Thanh lý tủ gỗ',
          description: 'Tủ gỗ còn tốt, chuyển nhà nên cần đi gấp.',
        },
        'SALE_TERMS',
      ],
    ])('flags %s', (_label, text, reason) => {
      const result = assess(text);

      expect(result.level).toBe('MEDIUM');
      expect(result.reasons).toContain(reason);
    });
  });

  /**
   * Vietnamese is where a naive filter goes wrong: stripping accents makes
   * "thuộc" (belongs to) read as "thuốc" (medicine), and "tiền" appears in
   * the very sentence a donor uses to say the item is free. Each of these
   * would otherwise hide a legitimate listing.
   */
  describe('ordinary Vietnamese that must not trip the filter', () => {
    it.each([
      [
        '"thuộc" (belongs to)',
        { description: 'Bộ sách này thuộc chương trình mới, đủ cả bài tập.' },
      ],
      [
        '"không lấy tiền"',
        { description: 'Tặng miễn phí, không lấy tiền, ai cần cứ nhắn mình.' },
      ],
      [
        '"tiền ship" arranged between people',
        { description: 'Tiền ship hai bên tự thỏa thuận, mình ở gần chợ.' },
      ],
      [
        'a medicine cabinet',
        {
          title: 'Tủ thuốc gia đình bằng nhựa',
          description: 'Tủ treo tường nhỏ, còn đủ hai ngăn và cửa kính.',
        },
      ],
      [
        'a watch ("đồng hồ")',
        {
          title: 'Đồng hồ treo tường',
          description: 'Chạy đúng giờ, chỉ cần thay pin là dùng tiếp.',
        },
      ],
      [
        'a kitchen knife set',
        {
          title: 'Bộ dao làm bếp',
          description: 'Gồm ba con dao và thớt gỗ, còn sắc, đã rửa sạch.',
        },
      ],
      [
        'a year and a size',
        { description: 'Áo khoác mua năm 2023, size 42, mặc vài lần còn mới.' },
      ],
      [
        'a model number',
        {
          title: 'Nồi cơm điện SHARP KS-1800',
          description: 'Dung tích 1,8 lít, nấu chín đều, đủ dây điện.',
        },
      ],
    ])('passes %s', (_label, text) => {
      expect(assess(text)).toEqual({ level: 'LOW', reasons: [] });
    });
  });

  it('reports HIGH when a listing has both forbidden and medium signals', () => {
    const result = assess({
      title: 'Tặng thuốc',
      description: 'Còn hạn, liên hệ 0909123456 để nhận trong tuần này.',
    });

    expect(result.level).toBe('HIGH');
    expect(result.reasons).toEqual(
      expect.arrayContaining(['BLOCKED_MEDICINE', 'CONTACT_PHONE']),
    );
  });

  it('checks the defects field too', () => {
    expect(assess({ defects: 'Gọi 0909123456 để hỏi thêm' }).reasons).toContain(
      'CONTACT_PHONE',
    );
  });

  /**
   * Guards against a stateful global regex: RegExp#test with the g flag
   * resumes from lastIndex, so a second listing could skip the email the
   * first one matched.
   */
  it('gives the same answer for the same listing every time', () => {
    const withEmail = {
      description: 'Ai cần thì gửi mail cho mình: a@example.com nhé mọi người.',
    };

    const results = [1, 2, 3].map(() => assess(withEmail).reasons);

    expect(results).toEqual([
      ['CONTACT_EMAIL'],
      ['CONTACT_EMAIL'],
      ['CONTACT_EMAIL'],
    ]);
  });

  it('lists each reason once and in a stable order', () => {
    const result = assess({
      title: 'Tặng thuốc',
      description: 'Thuốc còn hạn. Thuốc bổ. Gọi 0909123456 hoặc 0912345678.',
    });

    expect(result.reasons).toEqual(['BLOCKED_MEDICINE', 'CONTACT_PHONE']);
  });
});
