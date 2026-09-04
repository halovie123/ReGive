import { render, screen } from '@testing-library/react';
import { BrandLockup } from '@/components/brand/brand-lockup';

describe('BrandLockup', () => {
  it('presents the ReGive name and approved tagline as one brand mark', () => {
    render(<BrandLockup />);

    expect(screen.getByLabelText('ReGive — Giving Sharing Sustaining')).toBeVisible();
    expect(screen.getByText('Giving Sharing Sustaining')).toBeVisible();

    // The wordmark is two-tone per the approved logo ("Re" darker than
    // "Give"), so the name is split across two spans. Assert on the
    // rendered text of the element that holds them, not a single node.
    expect(screen.getByTestId('brand-name')).toHaveTextContent(/^ReGive$/);
  });
});
