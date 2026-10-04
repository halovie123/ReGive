import Link from 'next/link';
import type { DiscoveryListing } from '@buy-nothing/contracts';
import { AREA_LABELS, CATEGORY_LABELS, CONDITION_LABELS } from '@/lib/labels';

/**
 * Fixed to Vietnam's time zone so the server render and the browser agree
 * on the date, wherever either runs.
 */
const DATE = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});

/**
 * A discovery card. Names the district and nothing finer: the spec forbids
 * showing a precise location or an exact distance.
 */
export function ListingCard({ listing }: { listing: DiscoveryListing }) {
  return (
    <li className="listing-card">
      <Link href={`/vat-pham/${listing.id}`} className="listing-card-link">
        <span className="listing-card-meta">
          {CATEGORY_LABELS[listing.category]} · {CONDITION_LABELS[listing.condition]}
        </span>
        <strong className="listing-card-title">{listing.title}</strong>
        <span className="listing-card-area">{AREA_LABELS[listing.areaCode]}</span>
        <span className="listing-card-footer">
          <span>Tặng bởi {listing.owner.displayName}</span>
          <time dateTime={listing.publishedAt}>
            {DATE.format(new Date(listing.publishedAt))}
          </time>
        </span>
      </Link>
    </li>
  );
}
