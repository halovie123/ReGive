import { stripAccents, toSearchText } from './vietnamese';

describe('stripAccents', () => {
  it('removes tone marks and turns đ into d', () => {
    expect(stripAccents('sách giáo khoa đủ bộ')).toBe('sach giao khoa du bo');
  });

  /**
   * "hoá" (old tone placement) and "hóa" (new) are the same word typed two
   * ways; both must reduce to the same letters.
   */
  it('treats both tone placements alike', () => {
    expect(stripAccents('hoá chất')).toBe(stripAccents('hóa chất'));
  });

  it('handles decomposed input the same as precomposed', () => {
    expect(stripAccents('sa\u0301ch')).toBe('sach');
  });
});

describe('toSearchText', () => {
  it('makes accented and unaccented typing meet', () => {
    expect(toSearchText('Sách Giáo Khoa lớp 5')).toBe(
      toSearchText('sach giao khoa LOP 5'),
    );
  });

  it('turns punctuation into word breaks and collapses spaces', () => {
    expect(toSearchText('  Nồi cơm điện (1,8 lít) — còn tốt!  ')).toBe(
      'noi com dien 1 8 lit con tot',
    );
  });
});
