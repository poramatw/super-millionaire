import type { ReactNode } from 'react';

export function renderProvinceIsanBangkok(tileIndex: number, uid: string): ReactNode {
  switch (tileIndex) {
    case 29:
      /* 29: โคราช — Monument of Thao Suranari (อนุสาวรีย์ท้าวสุรนารี / ย่าโม) */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky29`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2663a8" />
              <stop offset="68%" stopColor="#85c1eb" />
              <stop offset="100%" stopColor="#fde6b8" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky29)`} />
          {/* Chumphon Gate city wall backdrop */}
          <rect x="6" y="54" width="108" height="22" fill="#e8dec8" stroke="#5e4f38" strokeWidth="1" />
          <polygon points="36,54 60,40 84,54" fill="#c2362b" stroke="#ffd24d" strokeWidth="1" />
          <rect x="0" y="76" width="120" height="20" fill="#4f8f4d" />

          {/* Terraced White Marble Pedestal */}
          <rect x="34" y="70" width="52" height="9" fill="#f7f2e6" stroke="#473c2e" strokeWidth="1.1" />
          <rect x="42" y="61" width="36" height="9" fill="#fcfaf2" stroke="#473c2e" strokeWidth="1.1" />
          <rect x="48" y="45" width="24" height="16" fill="#f7f2e6" stroke="#473c2e" strokeWidth="1.1" />
          {/* Fresh Marigold Garlands on Pedestal */}
          <path d="M47 64 Q60 69 73 64" stroke="#ff9f1c" strokeWidth="3" strokeDasharray="3 1" fill="none" />

          {/* Heroic Bronze Statue of Ya Mo */}
          <g transform="translate(60, 26)">
            <circle cx="0" cy="-12" r="4" fill="#2b2623" />
            {/* Bronze chong kraben & standing heroic pose */}
            <path d="M-5 -7 L5 -7 L7 8 L-7 8 Z" fill="#332e29" />
            <path d="M-5 8 L-2 19 L-6 19 Z M5 8 L6 19 L2 19 Z" fill="#2b2623" />
            {/* Sword held at side */}
            <line x1="7" y1="-2" x2="10" y2="16" stroke="#1b1815" strokeWidth="1.6" />
            {/* Marigold wreath around statue */}
            <ellipse cx="0" cy="-5" rx="4.5" ry="2.2" fill="none" stroke="#ffae19" strokeWidth="2" />
          </g>
        </g>
      );

    case 31:
      /* 31: ศรีสะเกษ — Ancient Khmer Sandstone Sanctuary (ปราสาทหิน) */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky31`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#35588a" />
              <stop offset="65%" stopColor="#d98952" />
              <stop offset="100%" stopColor="#ffe19c" />
            </linearGradient>
            <linearGradient id={`${uid}-stone31`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b89872" />
              <stop offset="55%" stopColor="#947450" />
              <stop offset="100%" stopColor="#664b30" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky31)`} />
          <rect x="0" y="72" width="120" height="24" fill="#4c6b3c" />

          {/* Side sandstone wings */}
          <rect x="18" y="48" width="20" height="26" fill={`url(#${uid}-stone31)`} stroke="#362414" strokeWidth="1.1" />
          <rect x="82" y="48" width="20" height="26" fill={`url(#${uid}-stone31)`} stroke="#362414" strokeWidth="1.1" />

          {/* Central Stepped Khmer Cornice Prang Tower */}
          <polygon points="56,11 60,4 64,11" fill="#8c6c4a" stroke="#362414" strokeWidth="1" />
          <rect x="49" y="11" width="22" height="9" fill={`url(#${uid}-stone31)`} stroke="#362414" strokeWidth="1" />
          <rect x="44" y="20" width="32" height="10" fill={`url(#${uid}-stone31)`} stroke="#362414" strokeWidth="1" />
          <rect x="40" y="30" width="40" height="12" fill={`url(#${uid}-stone31)`} stroke="#362414" strokeWidth="1.1" />
          <rect x="36" y="42" width="48" height="32" fill={`url(#${uid}-stone31)`} stroke="#362414" strokeWidth="1.3" />
          {/* Carved sandstone lintel & dark sanctuary doorway */}
          <polygon points="44,44 60,34 76,44" fill="#a6845e" stroke="#362414" strokeWidth="1.1" />
          <rect x="52" y="49" width="16" height="25" fill="#241911" stroke="#594028" strokeWidth="1.3" />
          {/* Laterite entrance stairs */}
          <polygon points="42,74 78,74 86,90 34,90" fill="#82563c" stroke="#362013" strokeWidth="1.1" />
          <line x1="40" y1="79" x2="80" y2="79" stroke="#362013" strokeWidth="1" />
          <line x1="37" y1="84" x2="83" y2="84" stroke="#362013" strokeWidth="1" />
        </g>
      );

    case 32:
      /* 32: สุรินทร์ — Surin Elephant Festival (งานช้างสุรินทร์) */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky32`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3283cc" />
              <stop offset="100%" stopColor="#f9e6b8" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky32)`} />
          {/* Festival flags banner */}
          <path d="M0 14 Q60 22 120 14" stroke="#5c4218" strokeWidth="1" fill="none" />
          {[14, 30, 46, 62, 78, 94, 108].map((x, i) => (
            <polygon
              key={x}
              points={`${x - 4},16 ${x + 4},16 ${x},23`}
              fill={i % 3 === 0 ? '#e63946' : i % 3 === 1 ? '#ffd43b' : '#1b7a43'}
            />
          ))}
          <rect x="0" y="70" width="120" height="26" fill="#5e964b" />

          {/* Ceremonial Caparisoned Thai Elephant */}
          <g transform="translate(56, 52)">
            {/* Body & legs */}
            <path
              d="M-28 2 C-29 -14 -14 -22 6 -20 C19 -19 28 -13 30 -3 C34 -2 39 -9 38 -17 C42 -18 44 -14 44 -8 C43 2 35 7 28 5 L25 13 L25 29 L15 29 L15 16 L-8 16 L-8 29 L-18 29 L-20 14 L-28 12 Z"
              fill="#6e737b"
              stroke="#24272b"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            {/* Royal Red & Gold Silk Forehead & Saddle Cloths */}
            <path d="M-18 -17 C-10 -22 4 -22 12 -16 L10 3 L-20 3 Z" fill="#c8232c" stroke="#ffd447" strokeWidth="1.6" />
            <polygon points="15,-19 26,-16 24,-3 13,-7" fill="#1c4e8a" stroke="#ffd447" strokeWidth="1.3" />
            {/* Gold tassels */}
            <line x1="-14" y1="3" x2="-14" y2="8" stroke="#ffd447" strokeWidth="1.5" />
            <line x1="-4" y1="3" x2="-4" y2="8" stroke="#ffd447" strokeWidth="1.5" />
            <line x1="6" y1="3" x2="6" y2="8" stroke="#ffd447" strokeWidth="1.5" />
            {/* Ivory Tusks */}
            <path d="M26 0 C33 3 39 1 42 -4 C37 -1 33 -1 28 -3 Z" fill="#fff9e8" stroke="#3b3123" strokeWidth="1" />
            {/* Mahout seated on neck */}
            <circle cx="8" cy="-26" r="4" fill="#eab890" />
            <path d="M3 -22 L13 -22 L14 -14 L2 -14 Z" fill="#23487a" />
            <circle cx="24" cy="-11" r="1.4" fill="#181a1c" />
          </g>
        </g>
      );

    case 34:
      /* 34: อุบลราชธานี — Illuminated Wax Candle Float (แห่เทียนพรรษา) */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky34`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1c1638" />
              <stop offset="68%" stopColor="#4c235c" />
              <stop offset="100%" stopColor="#bf5639" />
            </linearGradient>
            <linearGradient id={`${uid}-wax34`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e8a320" />
              <stop offset="50%" stopColor="#ffe169" />
              <stop offset="100%" stopColor="#b87209" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky34)`} />
          {/* Radiant candle aura */}
          <circle cx="60" cy="40" r="34" fill="#ffd447" opacity="0.22" />
          <rect x="0" y="77" width="120" height="19" fill="#2c1d2e" />

          {/* Procession Chariot Base */}
          <rect x="16" y="65" width="88" height="13" rx="2" fill="#9e1922" stroke="#ffd447" strokeWidth="1.5" />
          <circle cx="30" cy="80" r="6.5" fill="#262226" stroke="#ffd447" strokeWidth="1.2" />
          <circle cx="90" cy="80" r="6.5" fill="#262226" stroke="#ffd447" strokeWidth="1.2" />

          {/* Carved Naga & Kanok Proscenium in Golden Beeswax */}
          <path d="M22 65 C18 52 28 44 36 52 L44 65 Z" fill={`url(#${uid}-wax34)`} stroke="#633a03" strokeWidth="1.1" />
          <path d="M98 65 C102 52 92 44 84 52 L76 65 Z" fill={`url(#${uid}-wax34)`} stroke="#633a03" strokeWidth="1.1" />
          <path d="M36 65 C42 50 78 50 84 65 Z" fill="#f5be35" stroke="#633a03" strokeWidth="1.1" />

          {/* Towering Carved Beeswax Candle Pillar */}
          <rect x="51" y="24" width="18" height="36" rx="2" fill={`url(#${uid}-wax34)`} stroke="#633a03" strokeWidth="1.3" />
          <path d="M53 32 Q60 28 67 32 M53 41 Q60 37 67 41 M53 50 Q60 46 67 50" stroke="#945804" strokeWidth="1.1" fill="none" />
          {/* Glowing Candle Flame */}
          <path d="M60 7 C66 15 65 23 60 24 C55 23 54 15 60 7 Z" fill="#fff5b8" stroke="#ff9900" strokeWidth="1.2" />
          <path d="M60 12 C63 17 62 22 60 22 C58 22 57 17 60 12 Z" fill="#ffffff" />
        </g>
      );

    case 37:
      /* 37: ดอนเมือง — Thai Airways jetliner with purple orchid tail over Don Mueang */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky37`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1b67b3" />
              <stop offset="68%" stopColor="#72bfe8" />
              <stop offset="100%" stopColor="#fbe6c2" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky37)`} />
          {/* Runway & Don Mueang control tower */}
          <rect x="0" y="70" width="120" height="26" fill="#467a4c" />
          <polygon points="0,78 120,73 120,89 0,94" fill="#4f545c" />
          <line x1="8" y1="86" x2="112" y2="81" stroke="#ffffff" strokeWidth="1.4" strokeDasharray="8 6" />
          {/* Control Tower */}
          <rect x="92" y="42" width="10" height="30" fill="#e6e1d8" stroke="#2f3338" strokeWidth="1" />
          <polygon points="86,42 108,42 105,35 89,35" fill="#2b5f8f" stroke="#182b3d" strokeWidth="1" />

          {/* Thai Airways Jetliner climbing smoothly */}
          <g transform="translate(56, 38) rotate(-12)">
            {/* Purple Orchid Vertical Tail Fin */}
            <polygon points="-36,-2 -24,-22 -14,-22 -18,-2" fill="#5e247a" stroke="#2c0e3b" strokeWidth="1.1" />
            {/* Gold & Magenta Thai Orchid Emblem on Tail */}
            <circle cx="-24" cy="-12" r="4.5" fill="#d94590" stroke="#ffd24d" strokeWidth="1" />
            <circle cx="-24" cy="-12" r="1.8" fill="#ffd24d" />
            {/* Sleek White Fuselage */}
            <path d="M-38 0 C-22 -6 22 -7 42 -1 C47 1 47 4 40 6 C20 8 -20 7 -38 2 Z" fill="#ffffff" stroke="#232c38" strokeWidth="1.3" />
            {/* Classic Purple-Magenta-Gold Cheatline */}
            <line x1="-34" y1="1.5" x2="34" y2="1.5" stroke="#5e247a" strokeWidth="1.8" />
            <line x1="-34" y1="3.3" x2="32" y2="3.3" stroke="#d94590" strokeWidth="1.2" />
            {/* Cockpit windshield */}
            <polygon points="34,-2 41,0 35,1.5" fill="#1b3a5c" />
            {/* Swept Wing & Jet Engine */}
            <polygon points="-4,2 14,2 -14,16 -22,15" fill="#dfe6ee" stroke="#232c38" strokeWidth="1.1" />
            <rect x="-8" y="6" width="10" height="5" rx="2" fill="#5e247a" stroke="#232c38" strokeWidth="0.9" />
          </g>
        </g>
      );

    case 39:
      /* 39: เสาชิงช้า — Iconic red Giant Swing in front of Wat Suthat */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky39`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2664a8" />
              <stop offset="65%" stopColor="#7fc2eb" />
              <stop offset="100%" stopColor="#fde1a6" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky39)`} />
          {/* Wat Suthat Vihara in background */}
          <g>
            <rect x="64" y="54" width="44" height="24" fill="#faf4e6" stroke="#473c2e" strokeWidth="1" />
            <polygon points="58,54 86,31 114,54" fill="#c83628" stroke="#ffd24d" strokeWidth="1.1" />
            <polygon points="65,48 86,25 107,48" fill="#1b6b45" stroke="#ffd24d" strokeWidth="1" />
            <path d="M86 25 L86 16" stroke="#ffd24d" strokeWidth="1.6" strokeLinecap="round" />
          </g>
          {/* Plaza foreground */}
          <rect x="0" y="76" width="120" height="20" fill="#d9cbb0" />
          <line x1="0" y1="76" x2="120" y2="76" stroke="#8c7a5c" strokeWidth="1.2" />

          {/* Iconic Towering Vermilion-Red Giant Swing (เสาชิงช้า) */}
          <g transform="translate(48, 0)">
            {/* Stone plinths */}
            <rect x="-24" y="73" width="12" height="7" fill="#efe6d5" stroke="#453a2c" strokeWidth="1" />
            <rect x="12" y="73" width="12" height="7" fill="#efe6d5" stroke="#453a2c" strokeWidth="1" />
            {/* Massive teakwood vermilion pillars */}
            <line x1="-18" y1="74" x2="-10" y2="14" stroke="#b81d25" strokeWidth="4.4" strokeLinecap="round" />
            <line x1="18" y1="74" x2="10" y2="14" stroke="#b81d25" strokeWidth="4.4" strokeLinecap="round" />
            {/* Subtle highlight along pillars */}
            <line x1="-18.8" y1="73" x2="-10.8" y2="15" stroke="#ef5b62" strokeWidth="1" />
            <line x1="17.2" y1="73" x2="9.2" y2="15" stroke="#ef5b62" strokeWidth="1" />
            {/* Carved Ornate Crossbeams & Kanok Crest */}
            <rect x="-21" y="13" width="42" height="5" rx="1" fill="#c8232c" stroke="#4f0a0e" strokeWidth="1" />
            <rect x="-15" y="21" width="30" height="4" rx="1" fill="#b81d25" stroke="#4f0a0e" strokeWidth="1" />
            <path d="M-12 13 L0 4 L12 13 Z" fill="#ffd24d" stroke="#5c3d06" strokeWidth="0.9" />
            <path d="M-21 15 C-27 14 -28 8 -23 6 C-22 10 -19 12 -16 13" fill="#ffd24d" />
            <path d="M21 15 C27 14 28 8 23 6 C22 10 19 12 16 13" fill="#ffd24d" />
          </g>
        </g>
      );

    default:
      return null;
  }
}
