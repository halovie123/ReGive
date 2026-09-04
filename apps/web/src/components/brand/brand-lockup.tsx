type BrandLockupProps = {
  className?: string;
  compact?: boolean;
};

/**
 * The approved ReGive logo, redrawn as inline SVG so it stays crisp at any
 * size, inherits the page background (the source logo.jpg has a paper
 * texture baked in), and keeps the wordmark as selectable, accessible text.
 *
 * Matches the source artwork: two hands curving into a heart — sage green
 * on the left, mint on the right — with a recycling arrow sweeping over the
 * top, and a two-tone wordmark ("Re" in the darker green, "Give" lighter).
 */
export function BrandLockup({ className = '', compact = false }: BrandLockupProps) {
  return (
    <span
      className={`brand-lockup ${className}`.trim()}
      data-compact={compact}
      aria-label="ReGive — Giving Sharing Sustaining"
    >
      <svg className="brand-mark" viewBox="0 0 120 112" aria-hidden="true">
        {/* right hand — mint, sweeping up and cradling the right lobe */}
        <path
          fill="#8FCBC4"
          d="M62 104c17-13 33-25 41-41 7-14 5-30-6-38-7-5-16-5-22 1-4 4-6 9-6 15 0 5 2 9 5 13 2 3 3 6 2 9-1 4-5 6-9 5 3 6 3 13-1 19-1 2-3 4-4 6v11Z"
        />
        {/* right hand — palm/fingers detail */}
        <path
          fill="#8FCBC4"
          d="M78 24c-8 3-13 10-14 19-1 6 1 12 5 17 2 3 2 7-1 9-2 2-6 2-8-1-6-8-8-18-5-27 3-11 12-19 23-17Z"
          opacity=".55"
        />
        {/* left hand — sage green, mirrored */}
        <path
          fill="#9CC96F"
          d="M58 104C41 91 25 79 17 63 10 49 12 33 23 25c7-5 16-5 22 1 4 4 6 9 6 15 0 5-2 9-5 13-2 3-3 6-2 9 1 4 5 6 9 5-3 6-3 13 1 19 1 2 3 4 4 6v11Z"
        />
        {/* recycling arrow sweeping over the top of the heart */}
        <path
          fill="#8CC152"
          d="M34 30c5-9 14-15 25-16l-4-6 20 5-13 16-1-8c-11 1-20 6-25 15-1 2-3 2-3 0Z"
        />
      </svg>
      <span className="brand-copy">
        <span className="brand-name" data-testid="brand-name">
          <span className="brand-name-re">Re</span>
          <span className="brand-name-give">Give</span>
        </span>
        <span className="brand-tagline">Giving Sharing Sustaining</span>
      </span>
    </span>
  );
}
