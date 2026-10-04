import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusState } from '@/components/ui/status-state';
import { getMyListings } from '@/features/listings/listing-queries';
import { AREA_LABELS, CATEGORY_LABELS, LISTING_STATUS_LABELS } from '@/lib/labels';

export const metadata: Metadata = { title: 'Bài đăng của tôi' };

export default async function BaiDangCuaToiPage() {
  const listings = await getMyListings();

  return (
    <section className="account-card" aria-labelledby="my-listings-title">
      <div className="listing-page-header">
        <h1 id="my-listings-title">Bài đăng của tôi</h1>
        <Link href="/dang-tang" className="ui-button ui-button-primary">
          Đăng món đồ mới
        </Link>
      </div>

      {listings.length === 0 ? (
        <StatusState
          state="empty"
          message="Bạn chưa đăng món đồ nào"
          description="Món đồ bạn không dùng nữa có thể giúp ích cho người khác."
        />
      ) : (
        <ul className="my-listings">
          {listings.map((listing) => (
            <li key={listing.id}>
              <Link href={`/vat-pham/${listing.id}`} className="my-listing-link">
                <strong>{listing.title}</strong>
                <span className="listing-card-meta">
                  {CATEGORY_LABELS[listing.category]} · {AREA_LABELS[listing.areaCode]}
                </span>
                <span className="listing-status" data-status={listing.status}>
                  {LISTING_STATUS_LABELS[listing.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
