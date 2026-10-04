import Link from 'next/link';
import type { ListingResponse, ListingStatus } from '@buy-nothing/contracts';
import {
  AREA_LABELS,
  CATEGORY_LABELS,
  CONDITION_LABELS,
  LISTING_STATUS_HELP,
  LISTING_STATUS_LABELS,
} from '@/lib/labels';
import { OwnerActions } from './owner-actions';

/** Statuses the API lets the owner edit (see listing-state.ts). */
export const EDITABLE_STATUSES: ListingStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
];

export function ListingDetail({ listing }: { listing: ListingResponse }) {
  const editable = EDITABLE_STATUSES.includes(listing.status);

  return (
    <article className="account-card listing-detail" aria-labelledby="listing-title">
      <p className="listing-card-meta">
        {CATEGORY_LABELS[listing.category]} · {CONDITION_LABELS[listing.condition]}
      </p>
      <h1 id="listing-title">{listing.title}</h1>

      {listing.isOwner && (
        <section className="listing-owner-panel" aria-label="Trạng thái bài đăng">
          <span className="listing-status" data-status={listing.status}>
            {LISTING_STATUS_LABELS[listing.status]}
          </span>
          <p className="field-help">{LISTING_STATUS_HELP[listing.status]}</p>
          <div className="auth-form-actions">
            {editable && (
              <Link href={`/vat-pham/${listing.id}/sua`} className="ui-button ui-button-secondary">
                Sửa bài
              </Link>
            )}
            <OwnerActions listingId={listing.id} status={listing.status} />
          </div>
        </section>
      )}

      <dl className="account-grid">
        <div className="account-field">
          <dt>Khu vực trao đồ</dt>
          <dd>{AREA_LABELS[listing.areaCode]}</dd>
        </div>
        <div className="account-field">
          <dt>Tình trạng</dt>
          <dd>{CONDITION_LABELS[listing.condition]}</dd>
        </div>
      </dl>

      <section aria-labelledby="listing-description-title">
        <h2 id="listing-description-title" className="listing-section-title">
          Mô tả
        </h2>
        <p className="listing-text">{listing.description}</p>
      </section>

      <section aria-labelledby="listing-defects-title">
        <h2 id="listing-defects-title" className="listing-section-title">
          Khuyết điểm
        </h2>
        <p className="listing-text">{listing.defects || 'Không có'}</p>
      </section>

      {!listing.isOwner && (
        // Receive requests and chat arrive with Plan 3.
        <p className="role-home-cta-note">
          Tính năng gửi lời quan tâm đến người tặng sắp ra mắt.
        </p>
      )}
    </article>
  );
}
