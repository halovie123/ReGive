type BrandLockupProps = {
  className?: string;
  compact?: boolean;
};

export function BrandLockup({ className = '', compact = false }: BrandLockupProps) {
  return (
    <span
      className={`brand-lockup ${className}`.trim()}
      data-compact={compact}
      aria-label="ReGive — Giving Sharing Sustaining"
    >
      <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M31 56C20 48 8 39 8 24 8 14 16 8 25 8c4 0 8 2 11 5-5 1-9 5-11 10-3-2-7-2-10 0 1 10 7 17 16 23Z" fill="#A8D67A" />
        <path d="M33 56c11-8 23-17 23-32 0-10-8-16-17-16-4 0-8 2-11 5 5 1 9 5 11 10 3-2 7-2 10 0-1 10-7 17-16 23Z" fill="#9FD3C7" />
        <path d="M17 17c3-6 8-9 15-10l-3-4 11 3-7 9v-5c-5 1-9 3-12 8Z" fill="#6FAF68" />
      </svg>
      <span className="brand-copy">
        <span className="brand-name">ReGive</span>
        <span className="brand-tagline">Giving Sharing Sustaining</span>
      </span>
    </span>
  );
}
