import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EDITABLE_STATUSES } from '@/features/listings/listing-detail';
import { ListingForm } from '@/features/listings/listing-form';
import { getListing } from '@/features/listings/listing-queries';
import { getMe } from '@/lib/api/server-fetch';

export const metadata: Metadata = { title: 'Sửa bài đăng' };

export default async function SuaVatPhamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, me] = await Promise.all([getListing(id), getMe()]);
  // Someone else's listing gets the same 404 as a missing one.
  if (!listing || !listing.isOwner) notFound();

  if (!EDITABLE_STATUSES.includes(listing.status)) {
    return (
      <section className="account-card" aria-labelledby="edit-closed-title">
        <h1 id="edit-closed-title">Không thể sửa bài này</h1>
        <p className="auth-lead">
          Chỉ sửa được bài nháp, bài đang chờ duyệt hoặc đang hiển thị.
        </p>
        <Link href={`/vat-pham/${listing.id}`} className="ui-button ui-button-secondary">
          Quay lại bài đăng
        </Link>
      </section>
    );
  }

  return (
    <section className="account-card" aria-labelledby="edit-listing-title">
      <h1 id="edit-listing-title">Sửa bài đăng</h1>
      {listing.status !== 'DRAFT' && (
        <p className="auth-lead">
          Sau khi lưu, bài sẽ được kiểm tra lại trước khi hiển thị tiếp.
        </p>
      )}
      <ListingForm
        listingId={listing.id}
        preferredAreas={me.areas}
        allowPublish={listing.status === 'DRAFT'}
        defaultValues={{
          title: listing.title,
          description: listing.description,
          defects: listing.defects,
          category: listing.category,
          condition: listing.condition,
          areaCode: listing.areaCode,
        }}
      />
    </section>
  );
}
