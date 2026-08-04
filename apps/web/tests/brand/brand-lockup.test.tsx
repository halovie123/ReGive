import { render, screen } from '@testing-library/react';
import { BrandLockup } from '@/components/brand/brand-lockup';

describe('BrandLockup', () => {
  it('presents the ReGive name and approved tagline as one brand mark', () => {
    render(<BrandLockup />);

    expect(screen.getByLabelText('ReGive — Giving Sharing Sustaining')).toBeVisible();
    expect(screen.getByText('ReGive')).toBeVisible();
    expect(screen.getByText('Giving Sharing Sustaining')).toBeVisible();
  });
});
