import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingDetail } from '@/features/listings/listing-detail';
import { getListing } from '@/features/listings/listing-queries';

export const metadata: Metadata = { title: 'Món đồ' };

export default async function VatPhamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  return <ListingDetail listing={listing} />;
}
