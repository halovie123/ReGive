import { render, screen } from '@testing-library/react';
import { BrandLockup } from '@/components/brand/brand-lockup';

describe('BrandLockup', () => {
  it('presents the ReGive name and approved tagline as one brand mark', () => {
    render(<BrandLockup />);

    expect(screen.getByLabelText('ReGive — Giving Sharing Sustaining')).toBeVisible();
    expect(screen.getByText('Giving Sharing Sustaining')).toBeVisible();

    // The mark shipped once as an unrecognisable blob with every test still
    // green — only a screenshot caught it. These are a cheap floor, not a
    // substitute for looking at it: they lock the drawing's overall shape so
    // a path collapsing to a sliver, or the two-tone hands losing a colour,
    // turns the suite red instead of reaching production silently.
    const svg = document.querySelector('svg.brand-mark');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 116');

    const paths = [...svg!.querySelectorAll('path')];
    // two heart strokes + two thumbs + the recycling arrow
    expect(paths).toHaveLength(5);

    // Every path must describe a real figure: several curve/line commands
    // spread over a meaningful area, not a degenerate sliver.
    for (const path of paths) {
      const d = path.getAttribute('d') ?? '';
      expect(d.length).toBeGreaterThan(40);

      // Spans a real area rather than collapsing to a line or a dot.
      const coords = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
      expect(Math.max(...coords) - Math.min(...coords)).toBeGreaterThan(20);
    }

    // Both hands keep their distinct brand colours (sage left, mint right).
    const colours = new Set(
      paths.flatMap((p) => [p.getAttribute('fill'), p.getAttribute('stroke')]).filter(Boolean),
    );
    expect(colours).toContain('#9CC96F');
    expect(colours).toContain('#8FCBC4');

    // The wordmark is two-tone per the approved logo ("Re" darker than
    // "Give"), so the name is split across two spans. Assert on the
    // rendered text of the element that holds them, not a single node.
    expect(screen.getByTestId('brand-name')).toHaveTextContent(/^ReGive$/);
  });
});
