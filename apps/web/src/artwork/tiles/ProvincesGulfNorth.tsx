import type { ReactNode } from 'react';

export function renderProvinceGulfNorth(tileIndex: number, uid: string): ReactNode {
  switch (tileIndex) {
    case 16:
      /* 16: ภูเก็ต — Phromthep Cape dramatic sunset */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky16`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6b244e" />
              <stop offset="48%" stopColor="#e35b39" />
              <stop offset="100%" stopColor="#ffd166" />
            </linearGradient>
            <linearGradient id={`${uid}-sea16`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d95f38" />
              <stop offset="50%" stopColor="#264b73" />
              <stop offset="100%" stopColor="#122740" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky16)`} />
          {/* Glowing Setting Sun on Andaman Horizon */}
          <circle cx="52" cy="54" r="16" fill="#fff099" />
          <circle cx="52" cy="54" r="22" fill="#ffd166" opacity="0.28" />
          {/* Sea & Sun Reflection */}
          <rect x="0" y="55" width="120" height="41" fill={`url(#${uid}-sea16)`} />
          <path d="M40 60 L64 60 M44 65 L60 65 M46 71 L58 71 M48 77 L56 77" stroke="#ffe587" strokeWidth="2" strokeLinecap="round" />

          {/* Phromthep Cape Headland Silhouette & Sugar Palms */}
          <path d="M62 96 L68 72 L86 58 L106 54 L120 50 L120 96 Z" fill="#1e171c" />
          <path d="M0 96 L0 78 L22 83 L34 96 Z" fill="#291f24" />
          {/* Iconic Cape Wind-Swept Palms */}
          <g fill="#161114" stroke="#161114">
            <line x1="94" y1="56" x2="90" y2="28" strokeWidth="2.4" />
            <path d="M90 28 Q80 23 74 30 Q84 30 90 28 Z" />
            <path d="M90 28 Q98 20 106 26 Q97 29 90 28 Z" />
            <path d="M90 28 Q85 18 80 20 Q87 24 90 28 Z" />
            <line x1="108" y1="53" x2="106" y2="33" strokeWidth="2" />
            <path d="M106 33 Q97 29 93 34 Q101 35 106 33 Z" />
            <path d="M106 33 Q115 28 119 34 Q112 35 106 33 Z" />
          </g>
          {/* Longtail boat silhouette */}
          <path d="M16 68 Q26 72 36 67 L32 71 L20 71 Z" fill="#171417" />
        </g>
      );

    case 18:
      /* 18: สุราษฎร์ธานี — Koh Samui tropical beach & granite boulders */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky18`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2687d4" />
              <stop offset="100%" stopColor="#bce8fc" />
            </linearGradient>
            <linearGradient id={`${uid}-sea18`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0e6eb8" />
              <stop offset="100%" stopColor="#2cc9c9" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky18)`} />
          <path d="M14 19 Q22 12 32 16 Q40 12 46 19 Z" fill="#ffffff" opacity="0.85" />
          {/* Turquoise Gulf of Thailand Sea */}
          <rect x="0" y="45" width="120" height="27" fill={`url(#${uid}-sea18)`} />
          <path d="M0 70 Q42 62 85 70 Q105 74 120 69 L120 76 L0 76 Z" fill="#e8fbff" />
          {/* White Coral Sand Beach */}
          <path d="M0 72 Q45 65 88 73 Q108 76 120 72 L120 96 L0 96 Z" fill="#fcf0d2" />

          {/* Iconic Samui Granite Boulders */}
          <ellipse cx="98" cy="76" rx="14" ry="9" fill="#9c8a78" stroke="#4f4338" strokeWidth="1.2" />
          <ellipse cx="109" cy="68" rx="9" ry="7" fill="#b3a18f" stroke="#4f4338" strokeWidth="1.1" />

          {/* Leaning Coconut Palm */}
          <path d="M16 90 Q16 56 32 30" stroke="#784b24" strokeWidth="4.6" strokeLinecap="round" fill="none" />
          <path d="M32 30 Q14 22 6 31 Q20 30 32 30 Z" fill="#1e8a45" />
          <path d="M32 30 Q26 14 18 16 Q26 23 32 30 Z" fill="#2ea859" />
          <path d="M32 30 Q44 16 54 22 Q43 26 32 30 Z" fill="#2ea859" />
          <path d="M32 30 Q50 28 56 38 Q44 34 32 30 Z" fill="#187338" />

          {/* Colorful Thai Longtail Boat */}
          <g transform="translate(54, 57)">
            <path d="M0 7 Q16 14 34 4 L29 10 L5 10 Z" fill="#8f4519" stroke="#2e1304" strokeWidth="1" />
            <path d="M26 6 L34 0" stroke="#e63946" strokeWidth="2" strokeLinecap="round" />
            <path d="M30 2 L35 2" stroke="#ffd43b" strokeWidth="1.5" />
          </g>
        </g>
      );

    case 19:
      /* 19: สงขลา — Iconic Golden Mermaid at Samila Beach */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky19`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3289cf" />
              <stop offset="100%" stopColor="#d9f1fc" />
            </linearGradient>
            <linearGradient id={`${uid}-gold19`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff3a8" />
              <stop offset="50%" stopColor="#e8b32c" />
              <stop offset="100%" stopColor="#8a5b08" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky19)`} />
          {/* Ko Nu & Ko Maeo Island silhouettes */}
          <path d="M12 46 Q24 35 38 46 Z" fill="#5e90a8" opacity="0.7" />
          <path d="M78 46 Q88 39 98 46 Z" fill="#5e90a8" opacity="0.7" />
          {/* Samila Sea & Beach */}
          <rect x="0" y="46" width="120" height="28" fill="#1b82bd" />
          <path d="M0 70 Q35 66 75 72 Q100 76 120 70 L120 96 L0 96 Z" fill="#f7e5b7" />

          {/* Coastal Boulder Base */}
          <path d="M30 88 C32 68 48 63 64 64 C78 65 88 73 92 88 Z" fill="#857a70" stroke="#3b342e" strokeWidth="1.3" />

          {/* Golden Mermaid Sculpture (นางเงือกทอง) */}
          <g transform="translate(56, 48)">
            {/* Graceful tail curled over rock */}
            <path
              d="M-2 15 C6 17 16 17 22 12 C25 10 28 12 31 15 C27 17 24 20 20 21 C11 22 0 21 -6 17 Z"
              fill={`url(#${uid}-gold19)`}
              stroke="#5c3b04"
              strokeWidth="1.1"
            />
            {/* Tail fin */}
            <path d="M23 13 L33 7 L30 16 L34 21 L23 17 Z" fill={`url(#${uid}-gold19)`} stroke="#5c3b04" strokeWidth="1" />
            {/* Torso leaning gently */}
            <path d="M-8 16 C-8 4 -6 -4 -2 -9 L4 -8 C3 0 2 8 2 15 Z" fill={`url(#${uid}-gold19)`} stroke="#5c3b04" strokeWidth="1.1" />
            {/* Head & long flowing bronze-gold hair */}
            <circle cx="-1" cy="-14" r="4.8" fill={`url(#${uid}-gold19)`} stroke="#5c3b04" strokeWidth="1.1" />
            <path d="M-5 -16 C-12 -14 -14 -4 -11 6 C-7 3 -5 -4 -4 -11 Z" fill="#b88416" stroke="#5c3b04" strokeWidth="0.9" />
            {/* Raised arm combing hair */}
            <path d="M3 -8 C7 -14 4 -20 -1 -19" stroke="#e8b32c" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </g>
        </g>
      );

    case 21:
      /* 21: เพชรบุรี — Two red trays of Khanom Mo Kaeng (ขนมหม้อแกง) */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-bg21`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fdf1d6" />
              <stop offset="100%" stopColor="#ebc386" />
            </linearGradient>
            <linearGradient id={`${uid}-custard21`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e89a25" />
              <stop offset="50%" stopColor="#f7c85c" />
              <stop offset="100%" stopColor="#c47214" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-bg21)`} />
          {/* Woven Thai table mat */}
          <rect x="0" y="64" width="120" height="32" fill="#c99e63" />
          <line x1="0" y1="64" x2="120" y2="64" stroke="#7d592c" strokeWidth="1.3" />

          {/* Rear Red Lacquer Tray of Khanom Mo Kaeng */}
          <g transform="translate(45, 36)">
            <ellipse cx="0" cy="18" rx="34" ry="12" fill="#a3151e" stroke="#4d080c" strokeWidth="1.4" />
            <ellipse cx="0" cy="15" rx="32" ry="10.5" fill="#d92632" stroke="#ffd24d" strokeWidth="1.3" />
            {/* Baked square custard tray inside */}
            <polygon points="-22,12 22,12 18,20 -18,20" fill="#a8560d" stroke="#592904" strokeWidth="1" />
            <polygon points="-22,12 -16,5 16,5 22,12" fill={`url(#${uid}-custard21)`} stroke="#6e3606" strokeWidth="1" />
            {/* Grid cut lines & fried shallot garnish */}
            <line x1="0" y1="5" x2="0" y2="12" stroke="#7a3b08" strokeWidth="0.9" />
            <line x1="-10" y1="5" x2="-11" y2="12" stroke="#7a3b08" strokeWidth="0.9" />
            <line x1="10" y1="5" x2="11" y2="12" stroke="#7a3b08" strokeWidth="0.9" />
            <circle cx="-5" cy="8.5" r="1.3" fill="#6b2e07" />
            <circle cx="5" cy="8.5" r="1.3" fill="#6b2e07" />
            <circle cx="0" cy="7.5" r="1.1" fill="#6b2e07" />
          </g>

          {/* Foreground Red Lacquer Tray of Khanom Mo Kaeng */}
          <g transform="translate(74, 62)">
            <ellipse cx="0" cy="14" rx="36" ry="12.5" fill="#8c1119" stroke="#400509" strokeWidth="1.4" />
            <ellipse cx="0" cy="10.5" rx="34" ry="11" fill="#d92632" stroke="#ffd24d" strokeWidth="1.4" />
            <polygon points="-24,8 24,8 20,17 -20,17" fill="#a8560d" stroke="#592904" strokeWidth="1" />
            <polygon points="-24,8 -17,0 17,0 24,8" fill={`url(#${uid}-custard21)`} stroke="#6e3606" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#7a3b08" strokeWidth="1" />
            <line x1="-11" y1="0" x2="-12" y2="8" stroke="#7a3b08" strokeWidth="1" />
            <line x1="11" y1="0" x2="12" y2="8" stroke="#7a3b08" strokeWidth="1" />
            <line x1="-20" y1="4" x2="20" y2="4" stroke="#7a3b08" strokeWidth="0.9" />
            {[-14, -6, 5, 13].map((x) => (
              <circle key={x} cx={x} cy="3.5" r="1.3" fill="#5e2605" />
            ))}
          </g>
        </g>
      );

    case 23:
      /* 23: เชียงใหม่ — Lanna fingernail dancers (ฟ้อนเล็บ) & Doi Suthep silhouette */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky23`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f3b6e" />
              <stop offset="65%" stopColor="#5b4f8c" />
              <stop offset="100%" stopColor="#f2a26b" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky23)`} />
          {/* Doi Suthep Mountain & Golden Chedi Silhouette */}
          <path d="M0 72 Q35 42 74 58 Q98 48 120 62 L120 78 L0 78 Z" fill="#2c2442" />
          <polygon points="88,52 91,36 94,52" fill="#ffd447" />
          <rect x="0" y="74" width="120" height="22" fill="#3b261f" />

          {/* Two Graceful Lanna Nail Dancers */}
          {[38, 78].map((cx, i) => (
            <g key={i} transform={`translate(${cx}, 46)`}>
              {/* Hair chignon + white jasmine garland */}
              <circle cx="3" cy="-21" r="3.5" fill="#171412" />
              <circle cx="3" cy="-21" r="4.3" fill="none" stroke="#fff6d6" strokeWidth="1.2" strokeDasharray="1.8 1.2" />
              {/* Face */}
              <circle cx="0" cy="-16" r="5" fill="#f5cca8" stroke="#3d2212" strokeWidth="0.9" />
              {/* Lanna Sabai & Pasin */}
              <polygon points="-6,-10 6,-10 7,6 -7,6" fill={i === 0 ? '#c8232c' : '#1b7a43'} stroke="#ffd447" strokeWidth="0.9" />
              <polygon points="-7,6 7,6 10,36 -10,36" fill={i === 0 ? '#1b4d8c' : '#73267a'} stroke="#ffd447" strokeWidth="1" />
              <rect x="-8" y="26" width="16" height="5" fill="#ffd447" opacity="0.85" />
              {/* Arched Dancing Arms + Long Golden Brass Fingernails (เล็บฟ้อน) */}
              <path d="M-6 -9 C-14 -12 -18 -5 -13 1" stroke="#f5cca8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M6 -9 C14 -15 19 -10 15 -3" stroke="#f5cca8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              {/* Long curved brass fingernails */}
              <path d="M-13 1 L-17 6 M-12 2 L-14 8" stroke="#ffe169" strokeWidth="1.1" strokeLinecap="round" />
              <path d="M15 -3 L19 -8 M14 -2 L17 -10" stroke="#ffe169" strokeWidth="1.1" strokeLinecap="round" />
            </g>
          ))}
        </g>
      );

    case 24:
      /* 24: เชียงราย — Phu Chi Fa sunrise cliff over sea of morning mist */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky24`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#353978" />
              <stop offset="45%" stopColor="#d95b5b" />
              <stop offset="100%" stopColor="#ffe17d" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky24)`} />
          {/* Radiant Sunrise Orb */}
          <circle cx="76" cy="48" r="14" fill="#fff6b8" />
          <circle cx="76" cy="48" r="22" fill="#ffd269" opacity="0.32" />
          {/* Distant Laos mountain ridges */}
          <path d="M40 58 Q62 44 84 54 Q104 42 120 53 L120 66 L40 66 Z" fill="#5e4b70" opacity="0.7" />
          {/* Sea of White Morning Mist (ทะเลหมอก) */}
          <path d="M0 64 Q18 55 36 62 Q58 54 80 62 Q100 55 120 63 L120 96 L0 96 Z" fill="#f7f4f0" opacity="0.92" />
          <path d="M0 75 Q28 66 56 74 Q86 67 120 75 L120 96 L0 96 Z" fill="#e6ecf5" />
          {/* Iconic Sharp Phu Chi Fa Cliff Silhouette pointing into mist */}
          <polygon points="0,96 0,46 18,36 44,24 52,25 32,48 26,74 36,96" fill="#233629" stroke="#121c15" strokeWidth="1.2" />
          <path d="M12 42 L44 25 L36 33 L18 46 Z" fill="#3a5e42" />
          {/* Tiny silhouettes of sunrise watchers */}
          <circle cx="38" cy="24" r="1.6" fill="#121c15" />
          <rect x="37" y="25.5" width="2" height="3.5" fill="#c8232c" />
        </g>
      );

    case 26:
      /* 26: แม่ฮ่องสอน — Karen (Kayan) long-neck woman portrait with misty mountains */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky26`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4f8fc9" />
              <stop offset="100%" stopColor="#e8f3db" />
            </linearGradient>
            <linearGradient id={`${uid}-brass26`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b87e14" />
              <stop offset="45%" stopColor="#ffe169" />
              <stop offset="100%" stopColor="#8c5b08" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky26)`} />
          {/* Misty Mae Hong Son hills */}
          <path d="M0 64 Q30 42 62 56 Q94 38 120 55 L120 96 L0 96 Z" fill="#3e7552" />
          <path d="M0 72 Q42 58 84 68 Q106 62 120 70 L120 96 L0 96 Z" fill="#2b593d" />

          {/* Portrait of Kayan Long-Neck Woman */}
          <g transform="translate(60, 52)">
            {/* Traditional woven crimson & white tunic */}
            <path d="M-24 44 C-22 26 -14 20 0 20 C14 20 22 26 24 44 Z" fill="#c8232c" stroke="#590d12" strokeWidth="1.2" />
            <path d="M-14 23 L-14 44 M14 23 L14 44" stroke="#fff7e2" strokeWidth="1.5" strokeDasharray="2 2" />
            {/* Stacked Gleaming Brass Neck Rings */}
            {[16, 12.5, 9, 5.5, 2, -1.5, -5].map((y, idx) => (
              <rect
                key={idx}
                x="-8.5"
                y={y}
                width="17"
                height="3.4"
                rx="1.6"
                fill={`url(#${uid}-brass26)`}
                stroke="#593804"
                strokeWidth="0.7"
              />
            ))}
            {/* Gentle smiling face */}
            <ellipse cx="0" cy="-16" rx="10.5" ry="12" fill="#ecc096" stroke="#3d2210" strokeWidth="1.1" />
            {/* Traditional colorful headwrap */}
            <path d="M-11 -18 C-11 -30 11 -30 11 -18 C6 -22 -6 -22 -11 -18 Z" fill="#1c4e8a" stroke="#ffd24d" strokeWidth="1" />
            <path d="M-11 -20 Q0 -25 11 -20" stroke="#e63946" strokeWidth="2.2" fill="none" />
            <circle cx="-4" cy="-15.5" r="1.2" fill="#231812" />
            <circle cx="4" cy="-15.5" r="1.2" fill="#231812" />
            <path d="M-3 -10 Q0 -8 3 -10" stroke="#753422" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          </g>
        </g>
      );

    case 27:
      /* 27: ลำปาง — Lampang horse-drawn carriage (รถม้าลำปาง) & Wat Phra That Lampang Luang */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky27`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4da1d9" />
              <stop offset="100%" stopColor="#fcedc7" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky27)`} />
          {/* Wat Phra That Lampang Luang background */}
          <path d="M68 62 L73 36 L77 16 L81 36 L86 62 Z" fill="#e6a92e" stroke="#593a06" strokeWidth="1" />
          <polygon points="88,62 88,46 104,35 118,46 118,62" fill="#8f2920" stroke="#ffd24d" strokeWidth="1" />
          <rect x="0" y="62" width="120" height="34" fill="#d4be98" />

          {/* Colorful Lampang Horse Carriage (รถม้าลำปาง) */}
          <g transform="translate(14, 42)">
            {/* White Pony */}
            <path d="M12 22 C12 14 26 14 32 18 L36 7 L43 9 L40 20 L38 35 L33 35 L33 25 L19 25 L19 35 L14 35 Z" fill="#f7f4ed" stroke="#362c22" strokeWidth="1.2" />
            <path d="M36 7 L31 11 L35 13" fill="#6b4423" />
            <path d="M12 20 Q6 24 8 31" stroke="#6b4423" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            {/* Floral Plume on horse head */}
            <circle cx="40" cy="6" r="2.6" fill="#e63946" />
            {/* Carriage shafts */}
            <line x1="28" y1="22" x2="52" y2="24" stroke="#6e3d18" strokeWidth="1.6" />
            {/* Ornate Carriage Cabin & Canopy */}
            <path d="M48 10 L78 10 L82 15 L44 15 Z" fill="#c8232c" stroke="#ffd24d" strokeWidth="1.1" />
            <line x1="50" y1="15" x2="50" y2="26" stroke="#ffd24d" strokeWidth="1.5" />
            <line x1="76" y1="15" x2="76" y2="26" stroke="#ffd24d" strokeWidth="1.5" />
            <path d="M46 25 L80 25 L77 33 L49 33 Z" fill="#1c4e8a" stroke="#ffd24d" strokeWidth="1.2" />
            {/* Coachman */}
            <circle cx="52" cy="19" r="3" fill="#edc098" />
            <rect x="49" y="21" width="6" height="5" fill="#256eb5" />
            {/* Spoked Carriage Wheels */}
            <circle cx="54" cy="34" r="7" fill="none" stroke="#8f3617" strokeWidth="2.2" />
            <circle cx="54" cy="34" r="1.5" fill="#ffd24d" />
            <circle cx="75" cy="34" r="7" fill="none" stroke="#8f3617" strokeWidth="2.2" />
            <circle cx="75" cy="34" r="1.5" fill="#ffd24d" />
          </g>
        </g>
      );

    default:
      return null;
  }
}
