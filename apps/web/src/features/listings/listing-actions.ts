'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  CreateListingSchema,
  DiscoveryPageSchema,
  type DiscoveryPage,
  type ListingResponse,
} from '@buy-nothing/contracts';
import type { ListingActionState } from '@/lib/action-state';
import { apiFetch, getMe, isApiProblemError } from '@/lib/api/server-fetch';

export type ListingFormValues = {
  title: string;
  description: string;
  defects: string;
  category: string;
  condition: string;
  areaCode: string;
};

const GENERIC_ERROR = 'Đã xảy ra lỗi. Vui lòng thử lại.';

const failure = (error: unknown): ListingActionState => ({
  status: 'error',
  message: isApiProblemError(error) ? error.problem.message : GENERIC_ERROR,
});

/**
 * Creates (or, with listingId, edits) a listing and, for intent "publish",
 * submits it for screening. Redirects to the listing on success; returns an
 * error state otherwise. Every redirect() sits outside a try block: it works
 * by throwing, and a catch would swallow it.
 */
export async function saveListing({
  values,
  intent,
  listingId,
}: {
  values: ListingFormValues;
  intent: 'save' | 'publish';
  listingId?: string;
}): Promise<ListingActionState> {
  const parsed = CreateListingSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: 'Vui lòng kiểm tra lại thông tin đã nhập.' };
  }
  // Mirrors the API's LISTING_INCOMPLETE check, before anything is written.
  if (intent === 'publish' && parsed.data.defects === '') {
    return {
      status: 'error',
      message: 'Hãy mô tả khuyết điểm của vật phẩm, hoặc ghi “Không có”.',
    };
  }

  let saved: ListingResponse;
  try {
    saved = await apiFetch<ListingResponse>(
      listingId ? `/listings/${encodeURIComponent(listingId)}` : '/listings',
      {
        method: listingId ? 'PATCH' : 'POST',
        body: JSON.stringify(parsed.data),
      },
    );
  } catch (error) {
    return failure(error);
  }

  if (intent === 'publish') {
    try {
      await apiFetch(`/listings/${encodeURIComponent(saved.id)}/publish`, {
        method: 'POST',
      });
    } catch {
      // The listing is saved. Its page shows it as a draft with a publish
      // button, which beats an error over a form already persisted.
    }
  }

  revalidatePath('/bai-dang-cua-toi');
  return redirect(`/vat-pham/${saved.id}`);
}

const STATUS_ACTIONS = new Set(['publish', 'withdraw']);

/** Owner buttons on a listing page; driven by useActionState. */
export async function changeListingStatus(
  _previous: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const action = String(formData.get('action') ?? '');
  const listingId = String(formData.get('listingId') ?? '');
  if (!STATUS_ACTIONS.has(action) || !listingId) {
    return { status: 'error', message: GENERIC_ERROR };
  }

  try {
    await apiFetch(`/listings/${encodeURIComponent(listingId)}/${action}`, {
      method: 'POST',
    });
  } catch (error) {
    return failure(error);
  }

  revalidatePath(`/vat-pham/${listingId}`);
  revalidatePath('/bai-dang-cua-toi');
  return { status: 'idle' };
}

/**
 * Next page of discovery for the "Xem thêm" button. search is the current
 * filter query string, already sanitised by the page. Returns null on any
 * failure so the button can offer a retry instead of crashing the list.
 */
export async function loadMoreListings(
  search: string,
  cursor: string,
): Promise<DiscoveryPage | null> {
  const query = new URLSearchParams(search);
  query.set('cursor', cursor);
  try {
    const body = await apiFetch<unknown>(`/discovery/listings?${query.toString()}`);
    const page = DiscoveryPageSchema.safeParse(body);
    return page.success ? page.data : null;
  } catch {
    return null;
  }
}

/**
 * Members choose roles at onboarding and had no way to add one later. This
 * lets a recipient or volunteer become a donor from the create page.
 */
export async function addDonorRole(): Promise<ListingActionState> {
  try {
    const me = await getMe();
    if (!me.roles.includes('DONOR')) {
      await apiFetch('/me/roles', {
        method: 'PUT',
        body: JSON.stringify({ roles: [...me.roles, 'DONOR'] }),
      });
    }
  } catch (error) {
    return failure(error);
  }
  revalidatePath('/dang-tang');
  return { status: 'idle' };
}
