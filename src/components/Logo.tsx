export function Logo({ className = "h-12 w-auto" }: { className?: string }) {
  // Stylized JSW mark: a green orbit swoosh around a gold solar panel,
  // with the JSW wordmark. Approximates the existing brand logo.
  return (
    <svg
      viewBox="0 0 200 120"
      className={className}
      role="img"
      aria-label="JSW — Jerry's Solar and Wind Solutions"
    >
      <g>
        {/* orbit swoosh */}
        <path
          d="M96 14 C55 12 26 34 26 58 C26 78 44 92 70 95"
          fill="none"
          stroke="#3f6021"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M96 14 C132 16 150 34 150 52"
          fill="none"
          stroke="#3f6021"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* solar panel */}
        <g transform="translate(70 26) rotate(-18)">
          <rect x="0" y="0" width="52" height="46" rx="3" fill="#b9a417" />
          <g stroke="#e8ddc1" strokeWidth="2">
            <line x1="17" y1="0" x2="17" y2="46" />
            <line x1="34" y1="0" x2="34" y2="46" />
            <line x1="0" y1="15" x2="52" y2="15" />
            <line x1="0" y1="31" x2="52" y2="31" />
          </g>
        </g>
      </g>
      {/* wordmark */}
      <text
        x="100"
        y="108"
        textAnchor="middle"
        fontFamily="var(--font-sans)"
        fontWeight="800"
        fontSize="34"
        letterSpacing="6"
        fill="#3f6021"
      >
        JSW
      </text>
    </svg>
  );
}
