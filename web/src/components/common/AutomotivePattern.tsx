// Subtle, original abstract pattern for auth-page side panels — large
// concentric arcs (evoking a wheel/gauge) over a fine diagonal grid, drawn
// entirely in CSS/SVG. No icons, photos, or third-party assets involved.
export function AutomotivePattern() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full text-primary-foreground/10"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M0 32 L32 0" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      {[120, 200, 280, 360].map((r) => (
        <circle
          key={r}
          cx="85%"
          cy="20%"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}
