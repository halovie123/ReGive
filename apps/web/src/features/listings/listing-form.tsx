'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AREA_CODES,
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  LISTING_DEFECTS_MAX,
  LISTING_DESCRIPTION_MAX,
  LISTING_DESCRIPTION_MIN,
  LISTING_TITLE_MAX,
  LISTING_TITLE_MIN,
  type AreaCode,
} from '@buy-nothing/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { AREA_LABELS, CATEGORY_LABELS, CONDITION_LABELS } from '@/lib/labels';
import { saveListing, type ListingFormValues } from './listing-actions';

const oneOf = (values: readonly string[], message: string) =>
  z.string().refine((value) => values.includes(value), { message });

/**
 * Values stay plain strings (the selects start empty), so the schema checks
 * membership with refine rather than z.enum; the server re-parses with the
 * contract's CreateListingSchema either way.
 */
const ListingFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(LISTING_TITLE_MIN, `Tên cần từ ${LISTING_TITLE_MIN} đến ${LISTING_TITLE_MAX} ký tự.`)
    .max(LISTING_TITLE_MAX, `Tên cần từ ${LISTING_TITLE_MIN} đến ${LISTING_TITLE_MAX} ký tự.`),
  description: z
    .string()
    .trim()
    .min(
      LISTING_DESCRIPTION_MIN,
      `Mô tả cần từ ${LISTING_DESCRIPTION_MIN} đến ${LISTING_DESCRIPTION_MAX} ký tự.`,
    )
    .max(
      LISTING_DESCRIPTION_MAX,
      `Mô tả cần từ ${LISTING_DESCRIPTION_MIN} đến ${LISTING_DESCRIPTION_MAX} ký tự.`,
    ),
  defects: z
    .string()
    .trim()
    .max(LISTING_DEFECTS_MAX, `Khuyết điểm tối đa ${LISTING_DEFECTS_MAX} ký tự.`),
  category: oneOf(ITEM_CATEGORIES, 'Chọn danh mục.'),
  condition: oneOf(ITEM_CONDITIONS, 'Chọn tình trạng.'),
  areaCode: oneOf(AREA_CODES, 'Chọn khu vực.'),
});

type ListingFormProps = {
  /** The member's own areas: listed first and pre-selected. */
  preferredAreas: AreaCode[];
  /** Present when editing. */
  listingId?: string;
  defaultValues?: ListingFormValues;
  /**
   * False for a listing that is already live or held: saving re-screens it,
   * so there is no separate publish step to offer.
   */
  allowPublish?: boolean;
};

export function ListingForm({
  preferredAreas,
  listingId,
  defaultValues,
  allowPublish = true,
}: ListingFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(ListingFormSchema),
    defaultValues: defaultValues ?? {
      title: '',
      description: '',
      defects: '',
      category: '',
      condition: '',
      areaCode: preferredAreas[0] ?? '',
    },
  });

  // Inside a transition: on success the action redirects, and Next rejects
  // the action promise with NEXT_REDIRECT for its RedirectBoundary. Only a
  // transition routes that to React rather than leaving it unhandled.
  const submitWith = (intent: 'save' | 'publish') =>
    handleSubmit((values) => {
      setSubmitError(null);
      startTransition(async () => {
        const result = await saveListing({ values, intent, listingId });
        if (result.status === 'error') setSubmitError(result.message);
      });
    });

  const otherAreas = AREA_CODES.filter((area) => !preferredAreas.includes(area));

  return (
    <form
      className="auth-form listing-form"
      onSubmit={submitWith(allowPublish ? 'publish' : 'save')}
      noValidate
    >
      <Input
        label="Tên món đồ"
        error={errors.title?.message}
        maxLength={LISTING_TITLE_MAX}
        {...register('title')}
      />

      <div className="field">
        <label className="field-label" htmlFor="listing-description">
          Mô tả
        </label>
        <textarea
          id="listing-description"
          className="field-control field-textarea"
          rows={5}
          maxLength={LISTING_DESCRIPTION_MAX}
          aria-invalid={Boolean(errors.description)}
          aria-describedby="listing-description-help"
          {...register('description')}
        />
        <span
          id="listing-description-help"
          className={errors.description ? 'field-error' : 'field-help'}
        >
          {errors.description?.message ??
            'Kích thước, số lượng, cách dùng. Không ghi số điện thoại hay địa chỉ: người nhận sẽ nhắn tin cho bạn trong ReGive.'}
        </span>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="listing-defects">
          Khuyết điểm
        </label>
        <textarea
          id="listing-defects"
          className="field-control field-textarea"
          rows={3}
          maxLength={LISTING_DEFECTS_MAX}
          aria-invalid={Boolean(errors.defects)}
          aria-describedby="listing-defects-help"
          {...register('defects')}
        />
        <span
          id="listing-defects-help"
          className={errors.defects ? 'field-error' : 'field-help'}
        >
          {errors.defects?.message ??
            'Trầy xước, thiếu phụ kiện, hỏng chỗ nào. Nếu không có, hãy ghi “Không có”.'}
        </span>
      </div>

      <div className="listing-form-row">
        <Select label="Danh mục" error={errors.category?.message} {...register('category')}>
          <option value="">Chọn danh mục</option>
          {ITEM_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </Select>

        <Select label="Tình trạng" error={errors.condition?.message} {...register('condition')}>
          <option value="">Chọn tình trạng</option>
          {ITEM_CONDITIONS.map((condition) => (
            <option key={condition} value={condition}>
              {CONDITION_LABELS[condition]}
            </option>
          ))}
        </Select>
      </div>

      <Select
        label="Khu vực trao đồ"
        hint="Chỉ hiển thị quận/huyện, không bao giờ hiển thị địa chỉ."
        error={errors.areaCode?.message}
        {...register('areaCode')}
      >
        {preferredAreas.length > 0 && (
          <optgroup label="Khu vực của bạn">
            {preferredAreas.map((area) => (
              <option key={area} value={area}>
                {AREA_LABELS[area]}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label={preferredAreas.length > 0 ? 'Các quận/huyện khác' : 'Quận/huyện'}>
          {otherAreas.map((area) => (
            <option key={area} value={area}>
              {AREA_LABELS[area]}
            </option>
          ))}
        </optgroup>
      </Select>

      {submitError && (
        <p className="auth-status" data-tone="error" role="alert">
          {submitError}
        </p>
      )}

      <div className="auth-form-actions">
        {allowPublish ? (
          <>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Đang lưu...' : 'Đăng tặng'}
            </Button>
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={submitWith('save')}
            >
              Lưu nháp
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        )}
      </div>
    </form>
  );
}
