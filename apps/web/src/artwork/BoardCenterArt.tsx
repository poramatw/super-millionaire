import { useId } from 'react';

export interface BoardCenterArtProps {
  className?: string;
}

export function BoardCenterArt({ className = '' }: BoardCenterArtProps) {
  const uid = useId().replace(/:/g, '');

  return (
    <div
      className={`board-gold-grain relative flex h-full w-full items-center justify-center overflow-hidden select-none ${className}`}
      role="img"
      aria-label="ศูนย์กลางกระดาน ซุปเปอร์เศรษฐี No. 9028"
    >
      <svg
        viewBox="0 0 600 600"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#f5de7a" stopOpacity="0.65" />
            <stop offset="62%" stopColor="#e3be3b" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#a67c14" stopOpacity="0.32" />
          </radialGradient>
          <pattern id={`${uid}-grain`} width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="3" r="0.6" fill="#4f3708" opacity="0.08" />
            <circle cx="7" cy="8" r="0.5" fill="#fff7cc" opacity="0.14" />
            <circle cx="8" cy="2" r="0.45" fill="#4f3708" opacity="0.06" />
          </pattern>
          <linearGradient id={`${uid}-redbanner`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e3363f" />
            <stop offset="55%" stopColor="#c8232c" />
            <stop offset="100%" stopColor="#8d1219" />
          </linearGradient>
          <linearGradient id={`${uid}-greenbar`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#125930" />
            <stop offset="50%" stopColor="#1d8549" />
            <stop offset="100%" stopColor="#125930" />
          </linearGradient>
          <linearGradient id={`${uid}-goldrim`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff5bd" />
            <stop offset="50%" stopColor="#e4b738" />
            <stop offset="100%" stopColor="#8f630d" />
          </linearGradient>
          <filter id={`${uid}-cardshadow`} x="-10%" y="-10%" width="125%" height="125%">
            <feDropShadow dx="3" dy="4" stdDeviation="3" floodColor="#2b1e07" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Classic #9028 Gold Cardstock Base + Grain */}
        <rect x="0" y="0" width="600" height="600" fill="#e3be3b" />
        <rect x="0" y="0" width="600" height="600" fill={`url(#${uid}-glow)`} />
        <rect x="0" y="0" width="600" height="600" fill={`url(#${uid}-grain)`} />

        {/* Inner vintage border frame */}
        <rect
          x="16"
          y="16"
          width="568"
          height="568"
          fill="none"
          stroke="#47320a"
          strokeWidth="2.2"
          strokeOpacity="0.48"
        />
        <rect
          x="22"
          y="22"
          width="556"
          height="556"
          fill="none"
          stroke="#8a5f10"
          strokeWidth="1"
          strokeDasharray="6 3"
          strokeOpacity="0.42"
        />

        {/* Subtle corner Thai Kanok flourishes */}
        {[
          'translate(22, 22)',
          'translate(578, 22) scale(-1, 1)',
          'translate(22, 578) scale(1, -1)',
          'translate(578, 578) scale(-1, -1)',
        ].map((transform, idx) => (
          <g key={idx} transform={transform} opacity="0.45">
            <path
              d="M4 4 L44 4 C28 10 18 18 14 34 C12 22 9 14 4 44 Z"
              fill="#6e4b09"
            />
            <path
              d="M12 12 C22 10 30 14 34 22 C24 20 18 24 14 32"
              fill="none"
              stroke="#fff4c2"
              strokeWidth="1.5"
            />
          </g>
        ))}

        {/* Top-Left Deck Space: หีบสมบัติ (Treasure Chest) */}
        <g transform="translate(132, 134) rotate(-45)" filter={`url(#${uid}-cardshadow)`}>
          {/* Stacked cardstock edge simulation */}
          <rect x="-74" y="-48" width="148" height="96" rx="7" fill="#c79e28" stroke="#3c2a09" strokeWidth="1.5" />
          <rect x="-77" y="-51" width="148" height="96" rx="7" fill="#f7eed3" stroke="#3c2a09" strokeWidth="1.8" />
          <rect
            x="-70"
            y="-44"
            width="134"
            height="82"
            rx="4"
            fill="#efe1b8"
            stroke="#9a6e14"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          {/* Mini Treasure Chest icon */}
          <g transform="translate(0, -8)">
            <ellipse cx="0" cy="14" rx="26" ry="6" fill="#5e400a" opacity="0.2" />
            <path d="M-22 -4 L22 -4 L19 14 L-19 14 Z" fill="#8f4f1d" stroke="#2e1907" strokeWidth="1.5" />
            <path d="M-23 -4 C-20 -17 20 -17 23 -4 Z" fill="#b86b2a" stroke="#2e1907" strokeWidth="1.5" />
            <circle cx="-9" cy="-4" r="4" fill="#fff7e2" />
            <circle cx="0" cy="-6" r="4.5" fill="#ffd23f" />
            <circle cx="9" cy="-4" r="4" fill="#d92b3a" />
            <circle cx="-4" cy="-3" r="3" fill="#21a366" />
            <rect x="-4" y="-3" width="8" height="6" rx="1" fill="#f2c438" stroke="#2e1907" strokeWidth="1" />
          </g>
          <text
            x="-3"
            y="28"
            textAnchor="middle"
            fontSize="16"
            fontWeight="800"
            fill="#5e3a06"
            fontFamily="var(--font-display)"
          >
            หีบสมบัติ
          </text>
        </g>

        {/* Bottom-Right Deck Space: ประตูดวง (Fortune Gate) */}
        <g transform="translate(468, 466) rotate(-45)" filter={`url(#${uid}-cardshadow)`}>
          {/* Stacked cardstock edge simulation */}
          <rect x="-74" y="-48" width="148" height="96" rx="7" fill="#b52d36" stroke="#2b1214" strokeWidth="1.5" />
          <rect x="-77" y="-51" width="148" height="96" rx="7" fill="#fdf6e2" stroke="#1c355c" strokeWidth="1.8" />
          <rect
            x="-70"
            y="-44"
            width="134"
            height="82"
            rx="4"
            fill="#f7ecd2"
            stroke="#c8232c"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          {/* Mini Ornate Thai Gate & ดวง medallion */}
          <g transform="translate(0, -8)">
            <path d="M-22 14 L-22 -8 C-22 -17 22 -17 22 -8 L22 14" fill="#1c4e8a" stroke="#18120c" strokeWidth="1.5" />
            <path d="M-15 14 L-15 -5 C-15 -11 15 -11 15 -5 L15 14" fill="#c8232c" stroke="#f2c438" strokeWidth="1.5" />
            <path d="M-26 -8 L0 -22 L26 -8 Z" fill="#c8232c" stroke="#f2c438" strokeWidth="1.5" />
            <circle cx="0" cy="1" r="10" fill="#f6ca45" stroke="#5c3e06" strokeWidth="1.3" />
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="800"
              fill="#5e1116"
              fontFamily="var(--font-display)"
            >
              ดวง
            </text>
          </g>
          <text
            x="-3"
            y="28"
            textAnchor="middle"
            fontSize="16"
            fontWeight="800"
            fill="#9e1921"
            fontFamily="var(--font-display)"
          >
            ประตูดวง
          </text>
        </g>

        {/* Center Iconic #9028 3D Red-Black-Green "ซุปเปอร์เศรษฐี" Emblem */}
        <g transform="translate(300, 300) rotate(-45)">
          {/* Outer emblem plaque */}
          <rect
            x="-210"
            y="-64"
            width="420"
            height="128"
            rx="16"
            fill="#14110e"
            transform="translate(5, 7)"
            opacity="0.38"
          />
          <rect
            x="-210"
            y="-64"
            width="420"
            height="128"
            rx="16"
            fill={`url(#${uid}-greenbar)`}
            stroke="#14110e"
            strokeWidth="4"
          />
          <rect
            x="-201"
            y="-55"
            width="402"
            height="110"
            rx="11"
            fill="none"
            stroke={`url(#${uid}-goldrim)`}
            strokeWidth="2.5"
          />

          {/* Red inner banner band */}
          <rect
            x="-192"
            y="-44"
            width="384"
            height="72"
            rx="8"
            fill={`url(#${uid}-redbanner)`}
            stroke="#14110e"
            strokeWidth="2.5"
          />

          {/* 3D extruded black shadow behind Thai Title */}
          <text
            x="4"
            y="10"
            textAnchor="middle"
            fontSize="50"
            fontWeight="800"
            fill="#14110e"
            fontFamily="var(--font-display)"
          >
            ซุปเปอร์เศรษฐี
          </text>
          <text
            x="2"
            y="8"
            textAnchor="middle"
            fontSize="50"
            fontWeight="800"
            fill="#14110e"
            fontFamily="var(--font-display)"
          >
            ซุปเปอร์เศรษฐี
          </text>
          {/* Crisp cream-gold highlight face & crimson outline */}
          <text
            x="0"
            y="6"
            textAnchor="middle"
            fontSize="50"
            fontWeight="800"
            fill="#fff7d4"
            stroke="#14110e"
            strokeWidth="1.5"
            fontFamily="var(--font-display)"
          >
            ซุปเปอร์เศรษฐี
          </text>

          {/* Bottom Green Ribbon Sub-plate */}
          <rect x="-132" y="29" width="264" height="22" rx="11" fill="#14110e" />
          <rect x="-130" y="30" width="260" height="20" rx="10" fill="#1b7a43" stroke="#f2cf5b" strokeWidth="1.3" />
          <text
            x="0"
            y="44"
            textAnchor="middle"
            fontSize="11.5"
            fontWeight="700"
            letterSpacing="1.6"
            fill="#fff7d4"
            fontFamily="var(--font-mono)"
          >
            No. 9028 • SUPER MILLIONAIRE
          </text>
        </g>

        {/* Subtle decorative compass/dice motif near corners of center */}
        <g transform="translate(108, 488)" opacity="0.58">
          <circle cx="0" cy="0" r="24" fill="#f5de87" stroke="#5e4009" strokeWidth="1.5" />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#5e4009"
            fontFamily="var(--font-thai)"
          >
            ๒๙ โฉนด
          </text>
        </g>
        <g transform="translate(492, 112)" opacity="0.58">
          <circle cx="0" cy="0" r="24" fill="#f5de87" stroke="#5e4009" strokeWidth="1.5" />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#5e4009"
            fontFamily="var(--font-thai)"
          >
            ๔๐ ช่อง
          </text>
        </g>
      </svg>
    </div>
  );
}
