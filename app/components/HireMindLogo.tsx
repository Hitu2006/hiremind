"use client";

interface LogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export default function HireMindLogo({
  size = 128,
  animated = false,
  className = "",
}: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Gradient definition */}
      <defs>
        <linearGradient id="hmGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <radialGradient id="hmGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft glow behind the mark */}
      <circle cx="50" cy="50" r="48" fill="url(#hmGlow)" opacity="0.5" />

      {/* OUTER RING — the "target" */}
      <circle
        cx="50"
        cy="50"
        r="42"
        stroke="url(#hmGradient)"
        strokeWidth="2"
        opacity="0.4"
      />

      {/* INNER RING — the "precision" */}
      <circle
        cx="50"
        cy="50"
        r="28"
        stroke="url(#hmGradient)"
        strokeWidth="4"
      />

      {/* CENTER DOT — the "listening / active" pulse */}
      <circle cx="50" cy="50" r="12" fill="url(#hmGradient)" />

      {/* PULSE RING — the animated signature */}
      {animated && (
        <>
          <circle
            cx="50"
            cy="50"
            r="28"
            stroke="#22d3ee"
            strokeWidth="2"
            opacity="0.7"
          >
            <animate
              attributeName="r"
              from="28"
              to="48"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              from="0.7"
              to="0"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Second pulse — offset by 1s */}
          <circle
            cx="50"
            cy="50"
            r="28"
            stroke="#22d3ee"
            strokeWidth="2"
            opacity="0"
          >
            <animate
              attributeName="r"
              from="28"
              to="48"
              dur="2s"
              begin="1s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              from="0.7"
              to="0"
              dur="2s"
              begin="1s"
              repeatCount="indefinite"
            />
          </circle>
        </>
      )}

      {/* Subtle highlight on the center dot */}
      <circle cx="46" cy="46" r="3" fill="white" opacity="0.4" />
    </svg>
  );
}