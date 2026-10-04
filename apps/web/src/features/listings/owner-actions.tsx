'use client';

import { useActionState, useState } from 'react';
import type { ListingStatus } from '@buy-nothing/contracts';
import type { ListingActionState } from '@/lib/action-state';
import { changeListingStatus } from './listing-actions';

const WITHDRAWABLE: ListingStatus[] = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED'];

/**
 * Publish and withdraw buttons for the owner. Withdrawal is final (the
 * listing has no way back), so it takes a second, explicit confirmation.
 */
export function OwnerActions({
  listingId,
  status,
}: {
  listingId: string;
  status: ListingStatus;
}) {
  const [state, formAction, isPending] = useActionState<ListingActionState, FormData>(
    changeListingStatus,
    { status: 'idle' },
  );
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);

  return (
    <>
      {status === 'DRAFT' && (
        <form action={formAction}>
          <input type="hidden" name="listingId" value={listingId} />
          <input type="hidden" name="action" value="publish" />
          <button type="submit" className="ui-button ui-button-primary" disabled={isPending}>
            Đăng tặng
          </button>
        </form>
      )}

      {WITHDRAWABLE.includes(status) &&
        (confirmingWithdraw ? (
          <form action={formAction} className="listing-confirm">
            <p className="field-help">
              Rút bài thì không ai thấy bài này nữa và không thể khôi phục.
            </p>
            <input type="hidden" name="listingId" value={listingId} />
            <input type="hidden" name="action" value="withdraw" />
            <button type="submit" className="ui-button ui-button-primary" disabled={isPending}>
              Xác nhận rút bài
            </button>
            <button
              type="button"
              className="ui-button ui-button-ghost"
              onClick={() => setConfirmingWithdraw(false)}
            >
              Huỷ
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="ui-button ui-button-ghost"
            onClick={() => setConfirmingWithdraw(true)}
          >
            Rút bài
          </button>
        ))}

      {state.status === 'error' && (
        <p className="auth-status" data-tone="error" role="alert">
          {state.message}
        </p>
      )}
    </>
  );
}
