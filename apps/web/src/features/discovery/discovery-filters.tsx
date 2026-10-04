import Link from 'next/link';
import {
  AREA_CODES,
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
} from '@buy-nothing/contracts';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { AREA_LABELS, CATEGORY_LABELS, CONDITION_LABELS } from '@/lib/labels';

type FilterValues = {
  q?: string;
  category?: string;
  area?: string;
  condition?: string;
};

/**
 * A plain GET form. Filters live in the URL, so a filtered list can be
 * bookmarked, shared and reloaded, and the form works before any JavaScript
 * has loaded.
 */
export function DiscoveryFilters({ values }: { values: FilterValues }) {
  return (
    <form role="search" action="/kham-pha" method="get" className="discovery-filters">
      <Input
        label="Tìm món đồ"
        name="q"
        type="search"
        defaultValue={values.q ?? ''}
        placeholder="Ví dụ: sách giáo khoa, xe đạp"
        maxLength={100}
      />
      <Select label="Danh mục" name="category" defaultValue={values.category ?? ''}>
        <option value="">Tất cả danh mục</option>
        {ITEM_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {CATEGORY_LABELS[category]}
          </option>
        ))}
      </Select>
      <Select label="Khu vực" name="area" defaultValue={values.area ?? ''}>
        <option value="">Tất cả quận/huyện</option>
        {AREA_CODES.map((area) => (
          <option key={area} value={area}>
            {AREA_LABELS[area]}
          </option>
        ))}
      </Select>
      <Select label="Tình trạng" name="condition" defaultValue={values.condition ?? ''}>
        <option value="">Mọi tình trạng</option>
        {ITEM_CONDITIONS.map((condition) => (
          <option key={condition} value={condition}>
            {CONDITION_LABELS[condition]}
          </option>
        ))}
      </Select>
      <div className="discovery-filter-actions">
        <button type="submit" className="ui-button ui-button-primary">
          Lọc
        </button>
        <Link href="/kham-pha" className="ui-button ui-button-ghost">
          Xoá bộ lọc
        </Link>
      </div>
    </form>
  );
}
