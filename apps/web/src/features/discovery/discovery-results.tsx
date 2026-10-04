'use client';

import { useState, useTransition } from 'react';
import type { DiscoveryPage } from '@buy-nothing/contracts';
import { StatusState } from '@/components/ui/status-state';
import { loadMoreListings } from '@/features/listings/listing-actions';
import { ListingCard } from '@/features/listings/listing-card';

/**
 * First page rendered on the server; "Xem thêm" appends further pages with
 * the same filters. A failed page keeps what is already shown and leaves
 * the button available to retry.
 */
export function DiscoveryResults({
  initial,
  search,
}: {
  initial: DiscoveryPage;
  search: string;
}) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <StatusState
        state="empty"
        message="Chưa có món đồ nào phù hợp"
        description="Thử bỏ bớt bộ lọc, hoặc quay lại sau: món đồ mới được đăng mỗi ngày."
      />
    );
  }

  const loadMore = () => {
    if (!cursor) return;
    setFailed(false);
    startTransition(async () => {
      const page = await loadMoreListings(search, cursor);
      if (!page) {
        setFailed(true);
        return;
      }
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    });
  };

  return (
    <>
      <ul className="listing-grid" aria-label="Món đồ đang được tặng">
        {items.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </ul>
      {failed && (
        <p className="auth-status" data-tone="error" role="alert">
          Không tải thêm được. Vui lòng thử lại.
        </p>
      )}
      {cursor && (
        <div className="discovery-more">
          <button
            type="button"
            className="ui-button ui-button-secondary"
            onClick={loadMore}
            disabled={isPending}
          >
            {isPending ? 'Đang tải...' : 'Xem thêm'}
          </button>
        </div>
      )}
    </>
  );
}
