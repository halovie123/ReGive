'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AREA_CODES,
  MAX_AREAS,
  USER_ROLES,
  UpdateAreasSchema,
  UpdateProfileSchema,
  UpdateRolesSchema,
} from '@buy-nothing/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AREA_LABELS, ROLE_DESCRIPTIONS } from '@/lib/labels';
import { submitOnboardingProfile } from './onboarding-actions';

// Plain (non-default()) bio field so the schema's input and output shapes
// match exactly (bio is always a concrete, possibly-empty string coming
// from a controlled text input) — this keeps useForm's single generic
// simple instead of fighting zodResolver's input/output generic wiring.
const OnboardingSchema = z.object({
  displayName: UpdateProfileSchema.shape.displayName,
  bio: z.string().trim().max(300),
  roles: UpdateRolesSchema.shape.roles,
  areas: UpdateAreasSchema.shape.areas,
});

type OnboardingValues = z.infer<typeof OnboardingSchema>;


/**
 * Collects the profile, roles and areas needed to finish onboarding, then
 * calls submitOnboardingProfile (which redirects to /trang-chu on
 * success). Validation reuses the shared @buy-nothing/contracts schemas so
 * client-side rules can never drift from what the API accepts.
 */
export function OnboardingForm() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: { displayName: '', bio: '', roles: [], areas: [] },
  });

  const selectedAreas = watch('areas') ?? [];

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const result = await submitOnboardingProfile(values);
    if (result.status === 'error') {
      setSubmitError(result.message);
    }
    // On success, submitOnboardingProfile redirects server-side and this
    // component unmounts before we get here.
  });

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <Input
        label="Tên hiển thị"
        autoComplete="name"
        error={errors.displayName?.message}
        {...register('displayName')}
      />
      <Input
        label="Giới thiệu ngắn (không bắt buộc)"
        error={errors.bio?.message}
        {...register('bio')}
      />

      <fieldset className="field-group">
        <legend>Bạn muốn tham gia với vai trò nào?</legend>
        <div className="checkbox-options">
          {USER_ROLES.map((role) => (
            <label key={role} className="checkbox-option">
              <input type="checkbox" value={role} {...register('roles')} />
              {ROLE_DESCRIPTIONS[role]}
            </label>
          ))}
        </div>
        {errors.roles && <span className="field-error">Chọn ít nhất một vai trò.</span>}
      </fieldset>

      <fieldset className="field-group">
        <legend>Khu vực hoạt động (tối đa {MAX_AREAS})</legend>
        {/* With 22 districts the limit is no longer self-evident the way it
            was with four, so show the count live and stop accepting a fifth
            box rather than letting the user tick freely and only learn the
            rule from a validation error after submitting. */}
        <p className="field-help" aria-live="polite">
          Đã chọn {selectedAreas.length}/{MAX_AREAS}
          {selectedAreas.length >= MAX_AREAS && ' — bỏ chọn một khu vực để đổi sang khu vực khác.'}
        </p>
        <div className="checkbox-options">
          {AREA_CODES.map((area) => (
            <label key={area} className="checkbox-option">
              <input
                type="checkbox"
                value={area}
                disabled={selectedAreas.length >= MAX_AREAS && !selectedAreas.includes(area)}
                {...register('areas')}
              />
              {AREA_LABELS[area]}
            </label>
          ))}
        </div>
        {errors.areas && (
          <span className="field-error">Chọn ít nhất một khu vực (tối đa {MAX_AREAS}).</span>
        )}
      </fieldset>

      {submitError && (
        <p className="auth-status" data-tone="error">
          {submitError}
        </p>
      )}

      <div className="auth-form-actions">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Hoàn tất đăng ký'}
        </Button>
      </div>
    </form>
  );
}
