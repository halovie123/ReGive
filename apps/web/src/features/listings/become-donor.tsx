'use client';

import { useState, useTransition } from 'react';
import { addDonorRole } from './listing-actions';

/**
 * Members pick roles at onboarding and had no way to add one afterwards.
 * The action revalidates /dang-tang, which then renders the form.
 */
export function BecomeDonor() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="auth-form-actions">
      <button
        type="button"
        className="ui-button ui-button-primary"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await addDonorRole();
            setError(result.status === 'error' ? result.message : null);
          })
        }
      >
        {isPending ? 'Đang thêm...' : 'Thêm vai trò Người tặng'}
      </button>
      {error && (
        <p className="auth-status" data-tone="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
