import type { Metadata } from 'next';
import { StatusState } from '@/components/ui/status-state';
import { DiscoveryFilters } from '@/features/discovery/discovery-filters';
import { DiscoveryResults } from '@/features/discovery/discovery-results';
import { discoverySearch, filterValues } from '@/features/discovery/discovery-search';
import { getDiscoveryPage } from '@/features/listings/listing-queries';
import type { DiscoveryPage } from '@buy-nothing/contracts';

export const metadata: Metadata = { title: 'Khám phá' };

export default async function KhamPhaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = discoverySearch(params);

  let page: DiscoveryPage | null = null;
  try {
    page = await getDiscoveryPage(search);
  } catch {
    page = null;
  }

  return (
    <>
      <section className="role-home-hero" aria-labelledby="discovery-title">
        <p className="eyebrow">Khám phá</p>
        <h1 id="discovery-title">Món đồ đang được tặng</h1>
        <DiscoveryFilters values={filterValues(params)} />
      </section>

      {page ? (
        // key resets the appended pages whenever the filters change.
        <DiscoveryResults key={search} initial={page} search={search} />
      ) : (
        <StatusState
          state="error"
          message="Không tải được danh sách"
          description="Máy chủ có thể đang khởi động lại sau thời gian không hoạt động. Vui lòng tải lại trang sau ít phút."
        />
      )}
    </>
  );
}
