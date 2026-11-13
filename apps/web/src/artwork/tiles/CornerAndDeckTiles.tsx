import type { ReactNode } from 'react';

export function renderCornerTile(tileIndex: number, uid: string): ReactNode {
  switch (tileIndex) {
    case 0:
      /* 0: จุดเริ่มต้น — Two hands counting Thai banknotes + bold red arrow */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-bg0`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fdf6df" />
              <stop offset="100%" stopColor="#eed89b" />
            </linearGradient>
            <linearGradient id={`${uid}-skin0`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8cfb0" />
              <stop offset="100%" stopColor="#d99a70" />
            </linearGradient>
            <linearGradient id={`${uid}-arrow0`} x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#e5343d" />
              <stop offset="100%" stopColor="#9e1118" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#${uid}-bg0)`} />
          {/* Warm radial sunburst */}
          <circle cx="60" cy="52" r="44" fill="#fff6cc" opacity="0.7" />
          {/* Fanned Thai banknotes in center */}
          <g transform="translate(60, 48)">
            <g transform="rotate(-24)">
              <rect x="-24" y="-12" width="48" height="24" rx="2" fill="#e6f5ec" stroke="#1e7544" strokeWidth="1.3" />
              <circle cx="0" cy="0" r="6" fill="#c7e8d5" stroke="#1e7544" strokeWidth="0.9" />
              <text x="-15" y="-3" fontSize="6" fontWeight="700" fill="#114527" fontFamily="var(--font-mono)">100</text>
            </g>
            <g transform="rotate(-7)">
              <rect x="-25" y="-13" width="50" height="25" rx="2" fill="#fdebec" stroke="#c22932" strokeWidth="1.3" />
              <circle cx="0" cy="0" r="6.5" fill="#f6cdd0" stroke="#c22932" strokeWidth="0.9" />
              <text x="-17" y="-3" fontSize="6.2" fontWeight="700" fill="#6d1016" fontFamily="var(--font-mono)">500</text>
            </g>
            <g transform="rotate(11)">
              <rect x="-25" y="-13" width="50" height="25" rx="2" fill="#fcf2d4" stroke="#c88719" strokeWidth="1.4" />
              <ellipse cx="0" cy="0" rx="10" ry="7" fill="#f3df9f" stroke="#c88719" strokeWidth="0.9" />
              <text x="0" y="2.5" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#6e4305" fontFamily="var(--font-mono)">1000</text>
            </g>
          </g>
          {/* Left hand holding fan of bills */}
          <path
            d="M12 64 C20 55 31 53 38 56 C41 58 43 62 39 66 L26 74 C21 76 14 73 12 64 Z"
            fill={`url(#${uid}-skin0)`}
            stroke="#59331d"
            strokeWidth="1.4"
          />
          <path d="M35 55 C41 54 45 57 43 61 M36 60 C42 60 45 63 42 66" stroke="#59331d" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          {/* Right hand counting / thumbing bill */}
          <path
            d="M108 60 C99 51 87 49 78 54 C74 56 72 60 76 63 L91 71 C97 73 105 69 108 60 Z"
            fill={`url(#${uid}-skin0)`}
            stroke="#59331d"
            strokeWidth="1.4"
          />
          <path d="M78 54 C73 51 69 54 71 58 C73 61 77 61 81 59" fill={`url(#${uid}-skin0)`} stroke="#59331d" strokeWidth="1.2" />
          {/* Sparkles */}
          <path d="M28 24 L30 28 L34 30 L30 32 L28 36 L26 32 L22 30 L26 28 Z" fill="#e6a817" />
          <path d="M92 22 L93.5 25 L96.5 26.5 L93.5 28 L92 31 L90.5 28 L87.5 26.5 L90.5 25 Z" fill="#e6a817" />
          {/* Classic 3D Red Arrow pointing forward (left) */}
          <path
            d="M102 91 L46 91 L46 82 L18 96 L46 110 L46 101 L102 101 Z"
            fill="#1f110d"
            transform="translate(2, 2)"
            opacity="0.35"
          />
          <path
            d="M102 91 L46 91 L46 82 L18 96 L46 110 L46 101 L102 101 Z"
            fill={`url(#${uid}-arrow0)`}
            stroke="#2b0c0d"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M98 94 L46 94 L46 87 L26 96" stroke="#ff9aa0" strokeWidth="1.1" fill="none" opacity="0.65" />
        </g>
      );

    case 10:
      /* 10: เข้าคุก — Prisoner in red cell with iron ball & chain */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-cell10`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d94238" />
              <stop offset="65%" stopColor="#b0221c" />
              <stop offset="100%" stopColor="#6e110d" />
            </linearGradient>
            <linearGradient id={`${uid}-floor10`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#706962" />
              <stop offset="100%" stopColor="#3d3833" />
            </linearGradient>
          </defs>
          {/* Red-orange cell interior */}
          <rect width="120" height="120" fill={`url(#${uid}-cell10)`} />
          {/* Brick texture lines */}
          <g stroke="#590d0a" strokeWidth="0.9" opacity="0.45">
            <line x1="0" y1="22" x2="120" y2="22" />
            <line x1="0" y1="44" x2="120" y2="44" />
            <line x1="0" y1="66" x2="120" y2="66" />
            <line x1="25" y1="0" x2="25" y2="22" />
            <line x1="75" y1="0" x2="75" y2="22" />
            <line x1="50" y1="22" x2="50" y2="44" />
            <line x1="95" y1="22" x2="95" y2="44" />
            <line x1="30" y1="44" x2="30" y2="66" />
            <line x1="80" y1="44" x2="80" y2="66" />
          </g>
          {/* Stone floor */}
          <polygon points="0,84 120,84 120,120 0,120" fill={`url(#${uid}-floor10)`} stroke="#231f1c" strokeWidth="1.2" />
          {/* Small barred high window */}
          <rect x="74" y="14" width="24" height="18" rx="1.5" fill="#1e2a3a" stroke="#3b110f" strokeWidth="1.5" />
          <line x1="82" y1="14" x2="82" y2="32" stroke="#5c5652" strokeWidth="1.4" />
          <line x1="90" y1="14" x2="90" y2="32" stroke="#5c5652" strokeWidth="1.4" />

          {/* Prisoner in striped uniform behind bars */}
          <g>
            {/* Head */}
            <circle cx="52" cy="39" r="11" fill="#edc29b" stroke="#2a1b12" strokeWidth="1.3" />
            <path d="M41 36 C42 29 48 27 53 27 C58 27 62 30 63 36 C58 33 46 33 41 36 Z" fill="#292320" />
            {/* Worried eyes & frown */}
            <circle cx="48" cy="39" r="1.4" fill="#1c1612" />
            <circle cx="56" cy="39" r="1.4" fill="#1c1612" />
            <path d="M46 36 L50 37.5 M58 36 L54 37.5" stroke="#2a1b12" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M48 45 Q52 42.5 56 45" stroke="#4a2819" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            {/* Striped torso */}
            <path d="M38 51 C38 48 66 48 66 51 L68 78 L36 78 Z" fill="#f5f2eb" stroke="#1f1c18" strokeWidth="1.3" />
            <path d="M37 56 L67 56 M37 62 L67 62 M36 68 L68 68 M36 74 L68 74" stroke="#232220" strokeWidth="2.8" />
            {/* Trousers & shoes */}
            <rect x="38" y="78" width="11" height="17" fill="#f5f2eb" stroke="#1f1c18" strokeWidth="1.2" />
            <rect x="55" y="78" width="11" height="17" fill="#f5f2eb" stroke="#1f1c18" strokeWidth="1.2" />
            <path d="M38 83 L49 83 M38 89 L49 89 M55 83 L66 83 M55 89 L66 89" stroke="#232220" strokeWidth="2.4" />
            <ellipse cx="43" cy="96" rx="6.5" ry="3.2" fill="#211e1c" />
            <ellipse cx="61" cy="96" rx="6.5" ry="3.2" fill="#211e1c" />
          </g>

          {/* Heavy Iron Cell Bars in foreground */}
          <g>
            {[16, 36, 56, 76, 96].map((x) => (
              <g key={x}>
                <rect x={x - 2.2} y="6" width="4.4" height="96" fill="#2c2e33" stroke="#111214" strokeWidth="1" />
                <line x1={x - 0.7} y1="7" x2={x - 0.7} y2="101" stroke="#6c727d" strokeWidth="1" />
              </g>
            ))}
            <rect x="4" y="6" width="112" height="6" rx="1.5" fill="#212326" stroke="#0d0e10" strokeWidth="1.2" />
            <rect x="4" y="98" width="112" height="6" rx="1.5" fill="#212326" stroke="#0d0e10" strokeWidth="1.2" />
          </g>

          {/* Prisoner hands gripping bars */}
          <circle cx="36" cy="59" r="3.8" fill="#edc29b" stroke="#2a1b12" strokeWidth="1.2" />
          <circle cx="76" cy="59" r="3.8" fill="#edc29b" stroke="#2a1b12" strokeWidth="1.2" />

          {/* Heavy Iron Ball & Chain */}
          <g>
            <path d="M64 93 C70 97 76 101 84 102" stroke="#363940" strokeWidth="2.4" strokeDasharray="3 1.5" fill="none" />
            <circle cx="93" cy="102" r="10.5" fill="#25282e" stroke="#0e0f12" strokeWidth="1.4" />
            <circle cx="90" cy="98.5" r="3" fill="#6b7280" opacity="0.55" />
          </g>
        </g>
      );

    case 20:
      /* 20: แวะพักผ่อนคนจน — Tropical beach, coconut palms, blue sea, wooden rowboat */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky20`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4da9e8" />
              <stop offset="65%" stopColor="#9cd8f7" />
              <stop offset="100%" stopColor="#fef2cf" />
            </linearGradient>
            <linearGradient id={`${uid}-sea20`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1670b8" />
              <stop offset="60%" stopColor="#1c96c9" />
              <stop offset="100%" stopColor="#5ed0d6" />
            </linearGradient>
            <linearGradient id={`${uid}-sand20`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fae2a8" />
              <stop offset="100%" stopColor="#dfae5a" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#${uid}-sky20)`} />
          {/* Warm sun & soft clouds */}
          <circle cx="88" cy="24" r="11" fill="#fff099" opacity="0.95" />
          <path d="M16 23 Q23 16 32 19 Q39 14 48 20 Q53 23 49 27 L17 27 Z" fill="#ffffff" opacity="0.82" />
          {/* Distant tropical island */}
          <path d="M62 56 Q78 44 96 52 Q108 54 118 56 Z" fill="#3a7d78" opacity="0.6" />
          {/* Blue sea */}
          <rect x="0" y="55" width="120" height="32" fill={`url(#${uid}-sea20)`} />
          {/* Shimmering wave highlights */}
          <path d="M12 63 Q24 61 36 63 M55 68 Q70 66 84 68 M78 60 Q92 58 106 60" stroke="#c8f7ff" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.7" />
          {/* White foam curve */}
          <path d="M0 84 Q34 75 72 80 Q98 84 120 77 L120 84 L0 88 Z" fill="#f0fcff" opacity="0.85" />
          {/* Golden beach */}
          <path d="M0 83 Q38 77 75 82 Q102 85 120 80 L120 120 L0 120 Z" fill={`url(#${uid}-sand20)`} />
          {/* Coconut palms */}
          <g>
            {/* Trunk 1 */}
            <path d="M18 96 Q14 66 26 40" stroke="#7d4f28" strokeWidth="5.2" strokeLinecap="round" fill="none" />
            <path d="M18 96 Q14 66 26 40" stroke="#a66c3b" strokeWidth="2" strokeDasharray="3 4" fill="none" />
            {/* Trunk 2 */}
            <path d="M27 98 Q30 74 42 52" stroke="#6e421e" strokeWidth="4" strokeLinecap="round" fill="none" />
            {/* Coconuts */}
            <circle cx="25" cy="43" r="2.6" fill="#4f2f12" />
            <circle cx="29" cy="44" r="2.6" fill="#4f2f12" />
            {/* Fronds */}
            <path d="M26 40 Q10 30 2 39 Q15 39 26 40 Z" fill="#1e8242" />
            <path d="M26 40 Q16 20 8 23 Q19 29 26 40 Z" fill="#2ea355" />
            <path d="M26 40 Q34 22 48 25 Q37 32 26 40 Z" fill="#2ea355" />
            <path d="M26 40 Q44 33 52 45 Q38 41 26 40 Z" fill="#1b753b" />
            <path d="M42 52 Q30 43 22 49 Q34 50 42 52 Z" fill="#248f4b" />
            <path d="M42 52 Q52 40 64 46 Q52 50 42 52 Z" fill="#2ea355" />
            <path d="M42 52 Q58 51 64 60 Q52 56 42 52 Z" fill="#1b753b" />
          </g>
          {/* Wooden rowboat on beach */}
          <g transform="translate(66, 84) rotate(-6)">
            <ellipse cx="18" cy="18" rx="22" ry="5" fill="#9c732e" opacity="0.4" />
            <path d="M0 10 C8 19 28 19 38 9 L33 4 C24 8 12 8 3 4 Z" fill="#8f4f20" stroke="#3b1d07" strokeWidth="1.3" />
            <path d="M3 5 C12 10 24 10 34 5" stroke="#d48c46" strokeWidth="1.6" fill="none" />
            <line x1="14" y1="7" x2="14" y2="14" stroke="#522b0e" strokeWidth="2" />
            <line x1="24" y1="7" x2="24" y2="14" stroke="#522b0e" strokeWidth="2" />
            {/* Wooden oar */}
            <line x1="8" y1="15" x2="36" y2="2" stroke="#c98542" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="37" cy="1.5" rx="4" ry="1.8" transform="rotate(-24 37 1.5)" fill="#b06b2a" stroke="#3b1d07" strokeWidth="0.8" />
          </g>
        </g>
      );

    case 30:
      /* 30: ไปติดคุก — Thai khaki-uniformed policeman arresting suspect with white directional arrow */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-bg30`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1b467a" />
              <stop offset="100%" stopColor="#0f2847" />
            </linearGradient>
            <linearGradient id={`${uid}-khaki30`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#b08b57" />
              <stop offset="100%" stopColor="#7d5d33" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#${uid}-bg30)`} />
          {/* Action starburst */}
          <polygon
            points="60,8 69,24 88,16 83,34 104,35 90,50 107,62 88,68 96,86 76,80 65,98 55,80 35,88 41,69 21,66 34,51 18,38 38,34 32,16 51,24"
            fill="#285fa1"
            opacity="0.45"
          />

          {/* Thai Khaki Policeman on left */}
          <g transform="translate(8, 10)">
            {/* Peaked Royal Thai Police cap */}
            <path d="M18 16 C22 10 40 10 44 16 L41 24 L21 24 Z" fill="#6b4f2b" stroke="#1f160c" strokeWidth="1.2" />
            <path d="M19 22 L44 22 L46 25 L19 25 Z" fill="#1b1815" />
            <circle cx="31" cy="17" r="2.5" fill="#f5c942" stroke="#5e4006" strokeWidth="0.7" />
            {/* Face */}
            <circle cx="31" cy="31" r="8.5" fill="#efc199" stroke="#2e1d12" strokeWidth="1.2" />
            <circle cx="34" cy="30" r="1.2" fill="#1f1812" />
            {/* Whistle in mouth */}
            <rect x="37" y="32" width="6" height="3" rx="1.2" fill="#d9dfe6" stroke="#222" strokeWidth="0.7" />
            {/* Khaki tunic */}
            <path d="M18 41 L43 41 L46 69 L16 69 Z" fill={`url(#${uid}-khaki30)`} stroke="#2e1f0e" strokeWidth="1.3" />
            {/* Sam Browne leather cross-belt */}
            <line x1="20" y1="41" x2="43" y2="63" stroke="#362011" strokeWidth="3.2" />
            <rect x="17" y="61" width="28" height="4" fill="#362011" />
            <rect x="29" y="60.5" width="4.5" height="5" fill="#f2c438" />
            {/* Extended arm grabbing suspect */}
            <path d="M42 44 L61 42 L61 48 L42 50 Z" fill={`url(#${uid}-khaki30)`} stroke="#2e1f0e" strokeWidth="1.2" />
            <circle cx="63" cy="45" r="3.5" fill="#efc199" stroke="#2e1d12" strokeWidth="1.1" />
            {/* Trousers */}
            <rect x="19" y="69" width="10" height="19" fill="#6b4f2b" stroke="#24190c" strokeWidth="1.2" />
            <rect x="32" y="69" width="10" height="19" fill="#6b4f2b" stroke="#24190c" strokeWidth="1.2" />
            <ellipse cx="24" cy="89" rx="6" ry="3" fill="#171412" />
            <ellipse cx="38" cy="89" rx="6" ry="3" fill="#171412" />
          </g>

          {/* Fleeing Striped Suspect on right */}
          <g transform="translate(64, 22)">
            <circle cx="22" cy="18" r="8" fill="#efc199" stroke="#2e1d12" strokeWidth="1.2" />
            <path d="M14 15 C16 9 28 9 30 15 Z" fill="#231f1c" />
            <circle cx="19" cy="18" r="1.2" fill="#1b1612" />
            <ellipse cx="20" cy="22" rx="2" ry="1.3" fill="#5e211a" />
            {/* Striped shirt */}
            <path d="M12 27 L32 27 L34 51 L10 51 Z" fill="#f4efe6" stroke="#1e1b18" strokeWidth="1.2" />
            <path d="M12 32 L32 32 M11 38 L33 38 M11 44 L33 44" stroke="#222" strokeWidth="2.4" />
            {/* Legs running */}
            <path d="M14 51 L8 69 L15 71 L21 53 Z" fill="#2e3540" stroke="#14171c" strokeWidth="1.1" />
            <path d="M25 51 L34 68 L27 71 L20 53 Z" fill="#2e3540" stroke="#14171c" strokeWidth="1.1" />
          </g>

          {/* Bold White Directional Arrow */}
          <path
            d="M18 98 L74 98 L74 89 L102 103 L74 117 L74 108 L18 108 Z"
            fill="#0a1626"
            transform="translate(2, 2)"
            opacity="0.45"
          />
          <path
            d="M18 98 L74 98 L74 89 L102 103 L74 117 L74 108 L18 108 Z"
            fill="#ffffff"
            stroke="#102542"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
      );

    default:
      return null;
  }
}

export function renderSpecialDeckTile(tileIndex: number, uid: string): ReactNode {
  if (tileIndex === 2 || tileIndex === 17 || tileIndex === 33) {
    /* 2, 17, 33: หีบสมบัติ — Open wooden chest overflowing with pearls, gems & gold necklaces */
    return (
      <g>
        <defs>
          <radialGradient id={`${uid}-burst`} cx="50%" cy="48%" r="55%">
            <stop offset="0%" stopColor="#fff4b8" />
            <stop offset="55%" stopColor="#f2c449" />
            <stop offset="100%" stopColor="#c47e14" />
          </radialGradient>
          <linearGradient id={`${uid}-wood`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a65a24" />
            <stop offset="100%" stopColor="#5e2d0c" />
          </linearGradient>
          <linearGradient id={`${uid}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff7cc" />
            <stop offset="50%" stopColor="#ebc03f" />
            <stop offset="100%" stopColor="#99680c" />
          </linearGradient>
        </defs>
        <rect width="120" height="96" fill={`url(#${uid}-burst)`} />
        {/* Rays */}
        <g fill="#fff8d6" opacity="0.35">
          <polygon points="60,44 20,0 38,0" />
          <polygon points="60,44 82,0 100,0" />
          <polygon points="60,44 120,24 120,42" />
          <polygon points="60,44 0,24 0,42" />
        </g>
        {/* Ground shadow */}
        <ellipse cx="60" cy="83" rx="40" ry="7" fill="#4f2c06" opacity="0.35" />

        {/* Open chest lid */}
        <path
          d="M24 38 C24 16 96 16 96 38 L89 44 L31 44 Z"
          fill={`url(#${uid}-wood)`}
          stroke="#2b1404"
          strokeWidth="1.8"
        />
        <path d="M29 36 C32 21 88 21 91 36" fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="2.8" />
        <rect x="40" y="21" width="5" height="19" fill={`url(#${uid}-gold)`} stroke="#2b1404" strokeWidth="0.9" />
        <rect x="75" y="21" width="5" height="19" fill={`url(#${uid}-gold)`} stroke="#2b1404" strokeWidth="0.9" />

        {/* Overflowing pearls, gems, gold coins & necklaces */}
        <g>
          {/* Gold pile */}
          <ellipse cx="60" cy="45" rx="30" ry="11" fill="#ffd13b" stroke="#8c5b08" strokeWidth="1.1" />
          {/* Gems */}
          <polygon points="43,39 48,34 53,39 48,44" fill="#d92136" stroke="#590913" strokeWidth="0.9" />
          <polygon points="66,38 72,33 77,38 72,44" fill="#1c9e5b" stroke="#084223" strokeWidth="0.9" />
          <polygon points="55,34 60,29 65,34 60,39" fill="#2176d9" stroke="#092d59" strokeWidth="0.9" />
          {/* Luminous pearl strand draping over front */}
          {[33, 38, 43, 49, 55, 62, 68, 74, 80, 86].map((px, i) => (
            <circle
              key={i}
              cx={px}
              cy={44 + Math.sin(i * 0.7) * 5}
              r="3.2"
              fill="#fffaf0"
              stroke="#b89f78"
              strokeWidth="0.7"
            />
          ))}
          {/* Gold necklace draping down front */}
          <path d="M68 46 Q78 65 88 47" stroke="#ffe169" strokeWidth="2.4" fill="none" />
          <circle cx="78" cy="57" r="3" fill="#e62b3d" stroke="#ffd13b" strokeWidth="1" />
        </g>

        {/* Chest base */}
        <polygon points="24,46 96,46 90,80 30,80" fill={`url(#${uid}-wood)`} stroke="#2b1404" strokeWidth="1.8" />
        <line x1="27" y1="58" x2="93" y2="58" stroke="#3b1b06" strokeWidth="1.3" />
        <line x1="29" y1="69" x2="91" y2="69" stroke="#3b1b06" strokeWidth="1.3" />
        {/* Brass vertical straps & clasp */}
        <polygon points="36,46 42,46 43,80 37,80" fill={`url(#${uid}-gold)`} stroke="#2b1404" strokeWidth="1" />
        <polygon points="78,46 84,46 83,80 77,80" fill={`url(#${uid}-gold)`} stroke="#2b1404" strokeWidth="1" />
        <rect x="54" y="45" width="12" height="12" rx="2" fill={`url(#${uid}-gold)`} stroke="#2b1404" strokeWidth="1.2" />
        <circle cx="60" cy="51" r="2" fill="#2b1404" />

        {/* Sparkle stars */}
        <path d="M22 22 L24 26 L28 28 L24 30 L22 34 L20 30 L16 28 L20 26 Z" fill="#ffffff" />
        <path d="M98 18 L99.5 21 L102.5 22.5 L99.5 24 L98 27 L96.5 24 L93.5 22.5 L96.5 21 Z" fill="#ffffff" />
      </g>
    );
  }

  if (tileIndex === 7 || tileIndex === 22 || tileIndex === 36) {
    /* 7, 22, 36: ประตูดวง — Ornate red-blue-gold Thai kanok gate with golden "ดวง" medallion */
    return (
      <g>
        <defs>
          <linearGradient id={`${uid}-sky7`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1b437a" />
            <stop offset="60%" stopColor="#3572b8" />
            <stop offset="100%" stopColor="#f5d57a" />
          </linearGradient>
          <linearGradient id={`${uid}-gold7`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff7c2" />
            <stop offset="50%" stopColor="#f0bd35" />
            <stop offset="100%" stopColor="#9c6b08" />
          </linearGradient>
        </defs>
        <rect width="120" height="96" fill={`url(#${uid}-sky7)`} />
        {/* Halo behind gate */}
        <circle cx="60" cy="52" r="38" fill="#ffe794" opacity="0.35" />
        {/* Step plinth */}
        <rect x="14" y="84" width="92" height="8" rx="1" fill="#d9cbb0" stroke="#453821" strokeWidth="1.2" />
        <rect x="20" y="79" width="80" height="6" rx="1" fill="#ede2ca" stroke="#453821" strokeWidth="1.1" />

        {/* Outer royal-blue Thai archway pillars */}
        <rect x="24" y="34" width="13" height="46" fill="#174482" stroke={`url(#${uid}-gold7)`} strokeWidth="1.8" />
        <rect x="83" y="34" width="13" height="46" fill="#174482" stroke={`url(#${uid}-gold7)`} strokeWidth="1.8" />
        {/* Inner crimson portal arch */}
        <path
          d="M37 79 L37 42 C37 28 83 28 83 42 L83 79 Z"
          fill="#b81d25"
          stroke={`url(#${uid}-gold7)`}
          strokeWidth="2.2"
        />
        <path
          d="M44 79 L44 46 C44 36 76 36 76 46 L76 79 Z"
          fill="#261116"
          stroke="#f0bd35"
          strokeWidth="1.1"
        />

        {/* Tiered Thai Kanok roof & chofah spire */}
        <path
          d="M15 36 L60 15 L105 36 L92 38 L60 22 L28 38 Z"
          fill="#c8232c"
          stroke={`url(#${uid}-gold7)`}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M28 28 L60 9 L92 28 L80 30 L60 18 L40 30 Z"
          fill="#1b4d91"
          stroke={`url(#${uid}-gold7)`}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Central spire */}
        <polygon points="56,12 60,2 64,12" fill={`url(#${uid}-gold7)`} stroke="#593c06" strokeWidth="0.9" />
        {/* Side kanok flame wings */}
        <path d="M18 35 C12 31 11 23 18 20 C16 25 19 29 24 31" fill={`url(#${uid}-gold7)`} stroke="#593c06" strokeWidth="0.9" />
        <path d="M102 35 C108 31 109 23 102 20 C104 25 101 29 96 31" fill={`url(#${uid}-gold7)`} stroke="#593c06" strokeWidth="0.9" />

        {/* Radiant Golden "ดวง" Medallion */}
        <circle cx="60" cy="56" r="16" fill={`url(#${uid}-gold7)`} stroke="#4a2e04" strokeWidth="1.6" />
        <circle cx="60" cy="56" r="13" fill="none" stroke="#fff7c2" strokeWidth="1" strokeDasharray="2 1.5" />
        <text
          x="60"
          y="61.5"
          textAnchor="middle"
          fontSize="14.5"
          fontWeight="800"
          fill="#5c0d12"
          fontFamily="var(--font-display)"
        >
          ดวง
        </text>
      </g>
    );
  }

  return null;
}
