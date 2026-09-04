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
      <svg className="brand-mark" viewBox="0 0 120 116" aria-hidden="true">
        {/* Heart drawn as two thick cupped-hand strokes meeting at the point,
            mirroring the source artwork rather than a solid heart. */}
        <g fill="none" strokeLinecap="round" strokeWidth="14">
          <path
            stroke="#9CC96F"
            d="M60 100C36 82 18 64 18 44c0-14 11-23 23-21 9 2 16 10 19 21"
          />
          <path
            stroke="#8FCBC4"
            d="M60 100c24-18 42-36 42-56 0-14-11-23-23-21-9 2-16 10-19 21"
          />
        </g>
        {/* thumbs curling into the centre of the heart */}
        <path
          fill="#9CC96F"
          d="M40 40c7-1 13 3 16 10-5 2-9 1-12-2-2-2-3-5-4-8Z"
        />
        <path
          fill="#8FCBC4"
          d="M80 40c-7-1-13 3-16 10 5 2 9 1 12-2 2-2 3-5 4-8Z"
        />
        {/* recycling arrow sweeping over the top of the heart */}
        <path
          fill="#8CC152"
          d="M35 30c6-11 17-18 30-19l-2-8 19 13-18 11 1-8c-10 1-19 6-25 14-2 2-6 0-5-3Z"
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
