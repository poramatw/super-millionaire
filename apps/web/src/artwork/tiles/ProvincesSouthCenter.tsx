import type { ReactNode } from 'react';

export function renderProvinceSouthCenter(tileIndex: number, uid: string): ReactNode {
  switch (tileIndex) {
    case 1:
      /* 1: กรุงเทพฯ — Wat Phra Kaew at night */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky1`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#09132e" />
              <stop offset="70%" stopColor="#162d61" />
              <stop offset="100%" stopColor="#2e4582" />
            </linearGradient>
            <linearGradient id={`${uid}-gold1`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff3a8" />
              <stop offset="50%" stopColor="#f0bd2e" />
              <stop offset="100%" stopColor="#9e6d08" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky1)`} />
          {/* Night stars & crescent moon */}
          <circle cx="18" cy="18" r="1" fill="#fff9d6" />
          <circle cx="33" cy="11" r="0.8" fill="#fff9d6" />
          <circle cx="96" cy="15" r="1.1" fill="#fff9d6" />
          <circle cx="106" cy="28" r="0.8" fill="#fff9d6" />
          <path d="M97 22 A7 7 0 1 0 105 30 A5.5 5.5 0 1 1 97 22 Z" fill="#ffe680" />
          {/* Warm golden floodlight halo */}
          <ellipse cx="60" cy="64" rx="46" ry="20" fill="#ffd154" opacity="0.18" />

          {/* Golden Phra Sri Rattana Chedi (left) */}
          <path d="M23 70 C24 55 29 50 32 45 L33 25 L35 45 C38 50 43 55 44 70 Z" fill={`url(#${uid}-gold1)`} stroke="#422a04" strokeWidth="1" />
          <rect x="20" y="70" width="27" height="6" fill="#e6be4c" stroke="#422a04" strokeWidth="0.9" />

          {/* Phra Mondop & Prasat Phra Thep Bidon (center-right) */}
          <polygon points="48,70 48,50 61,32 74,50 74,70" fill="#c9362b" stroke="#ffd866" strokeWidth="1.2" />
          <polygon points="56,34 61,15 66,34" fill={`url(#${uid}-gold1)`} stroke="#422a04" strokeWidth="0.9" />
          {/* Multi-tiered Thai roof with chofah */}
          <polygon points="72,72 72,53 91,39 109,53 109,72" fill="#184d37" stroke="#ffd866" strokeWidth="1.2" />
          <polygon points="76,55 91,42 106,55" fill="#d9422b" stroke="#ffd866" strokeWidth="1" />
          <path d="M72 53 L68 45 M109 53 L113 45 M91 39 L91 28" stroke="#ffd866" strokeWidth="1.4" strokeLinecap="round" />

          {/* White Grand Palace Battlement Wall */}
          <rect x="0" y="74" width="120" height="8" fill="#f5efe2" stroke="#362e23" strokeWidth="1" />
          {[4, 14, 24, 34, 44, 54, 64, 74, 84, 94, 104, 114].map((x) => (
            <rect key={x} x={x} y="71" width="5" height="3" fill="#f5efe2" stroke="#362e23" strokeWidth="0.6" />
          ))}

          {/* Chao Phraya River Golden Reflections */}
          <rect x="0" y="82" width="120" height="14" fill="#0d2247" />
          <path d="M22 86 L42 86 M52 89 L74 89 M82 86 L104 86 M30 92 L62 92" stroke="#ffd866" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        </g>
      );

    case 3:
      /* 3: นครปฐม — Golden Phra Pathom Chedi */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky3`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3580c9" />
              <stop offset="65%" stopColor="#94ccf2" />
              <stop offset="100%" stopColor="#fce4b8" />
            </linearGradient>
            <linearGradient id={`${uid}-chedi3`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f5a524" />
              <stop offset="45%" stopColor="#ffd452" />
              <stop offset="100%" stopColor="#b8640b" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky3)`} />
          {/* Soft morning clouds */}
          <path d="M12 22 Q20 15 30 19 Q38 14 46 21 L12 24 Z" fill="#ffffff" opacity="0.78" />
          <path d="M78 26 Q86 19 96 22 Q104 18 110 25 L78 27 Z" fill="#ffffff" opacity="0.75" />

          {/* Bell-shaped Iconic Phra Pathom Chedi */}
          <polygon points="57,18 60,4 63,18" fill="#ffe169" stroke="#6b3b06" strokeWidth="1" />
          <rect x="52" y="18" width="16" height="14" fill="#d97b14" stroke="#6b3b06" strokeWidth="1" />
          <line x1="51" y1="22" x2="69" y2="22" stroke="#ffe169" strokeWidth="1.4" />
          <line x1="50" y1="26" x2="70" y2="26" stroke="#ffe169" strokeWidth="1.4" />
          <line x1="49" y1="30" x2="71" y2="30" stroke="#ffe169" strokeWidth="1.4" />
          {/* Massive Golden Bell Dome */}
          <path
            d="M32 66 C34 45 43 35 50 32 L70 32 C77 35 86 45 88 66 Z"
            fill={`url(#${uid}-chedi3)`}
            stroke="#593105"
            strokeWidth="1.4"
          />
          {/* Encircling Vihara Gallery & Central Shrine */}
          <rect x="16" y="66" width="88" height="12" fill="#f7eed7" stroke="#4f3e24" strokeWidth="1.2" />
          <polygon points="14,66 24,59 96,59 106,66" fill="#c83628" stroke="#4f2014" strokeWidth="1.1" />
          <polygon points="48,78 48,57 60,48 72,57 72,78" fill="#f7eed7" stroke="#593105" strokeWidth="1.2" />
          <polygon points="45,58 60,46 75,58" fill="#c83628" stroke="#ffd452" strokeWidth="1" />
          <rect x="56" y="63" width="8" height="15" fill="#4f3116" />

          {/* Courtyard stairs & green palms */}
          <rect x="0" y="78" width="120" height="18" fill="#4b9454" />
          <polygon points="44,78 76,78 82,96 38,96" fill="#e6d6b5" stroke="#6b5636" strokeWidth="1" />
          <circle cx="14" cy="74" r="8" fill="#236e38" />
          <circle cx="106" cy="74" r="8" fill="#236e38" />
        </g>
      );

    case 6:
      /* 6: ตลาดโบ๊เบ๊ — Bo Bae wholesale garment market arcade */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky6`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f2c46d" />
              <stop offset="100%" stopColor="#fdf3dc" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky6)`} />
          {/* Vintage Shophouses */}
          <rect x="6" y="14" width="38" height="72" fill="#f2dfc2" stroke="#4a3826" strokeWidth="1.3" />
          <rect x="44" y="10" width="36" height="76" fill="#e6cfa8" stroke="#4a3826" strokeWidth="1.3" />
          <rect x="80" y="16" width="34" height="70" fill="#edd6b4" stroke="#4a3826" strokeWidth="1.3" />
          {/* Louvered upper windows */}
          {[14, 28, 52, 66, 86, 100].map((x) => (
            <rect key={x} x={x} y="22" width="8" height="12" fill="#266345" stroke="#3b2b1c" strokeWidth="0.9" />
          ))}
          {/* Bo Bae Market Signboard */}
          <rect x="26" y="6" width="68" height="12" rx="2" fill="#c8232c" stroke="#ffd24d" strokeWidth="1.3" />
          <text x="60" y="14.5" textAnchor="middle" fontSize="7.2" fontWeight="800" fill="#fff7cc" fontFamily="var(--font-display)">ตลาดโบ๊เบ๊</text>

          {/* Striped Wholesale Market Awnings */}
          <polygon points="4,40 116,40 112,53 8,53" fill="#e63946" stroke="#3b1818" strokeWidth="1.2" />
          {[12, 28, 44, 60, 76, 92].map((x) => (
            <rect key={x} x={x} y="40" width="8" height="13" fill="#fff7e6" />
          ))}

          {/* Hanging Garment Racks & Colorful Textile Bundles */}
          <line x1="12" y1="60" x2="54" y2="60" stroke="#2d3138" strokeWidth="1.6" />
          <rect x="14" y="60" width="7" height="15" rx="1" fill="#2576b8" stroke="#182a3b" strokeWidth="0.8" />
          <rect x="22" y="60" width="7" height="15" rx="1" fill="#f2b729" stroke="#593f07" strokeWidth="0.8" />
          <rect x="30" y="60" width="7" height="15" rx="1" fill="#e6456d" stroke="#591124" strokeWidth="0.8" />
          <rect x="38" y="60" width="7" height="15" rx="1" fill="#289e64" stroke="#0c4227" strokeWidth="0.8" />
          <rect x="46" y="60" width="7" height="15" rx="1" fill="#f7f4eb" stroke="#544b3c" strokeWidth="0.8" />

          {/* Stacked Wholesale Fabric Bundles */}
          <rect x="64" y="62" width="22" height="8" rx="2" fill="#3a86c9" stroke="#18334d" strokeWidth="1" />
          <rect x="66" y="54" width="20" height="8" rx="2" fill="#e86a3a" stroke="#59220e" strokeWidth="1" />
          <rect x="88" y="66" width="22" height="8" rx="2" fill="#2ca36b" stroke="#0d4028" strokeWidth="1" />
          <rect x="90" y="58" width="20" height="8" rx="2" fill="#f2c438" stroke="#5c4207" strokeWidth="1" />

          {/* Street pavement */}
          <rect x="0" y="82" width="120" height="14" fill="#6b645c" />
        </g>
      );

    case 8:
      /* 8: เยาวราช — Yaowarat neon gold shop signs & Chinatown shophouses */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky8`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#12142b" />
              <stop offset="65%" stopColor="#3b1d3d" />
              <stop offset="100%" stopColor="#852b3b" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky8)`} />
          {/* Shophouse rows left & right */}
          <rect x="2" y="20" width="38" height="62" fill="#3a2c38" stroke="#171217" strokeWidth="1.2" />
          <rect x="80" y="18" width="38" height="64" fill="#422e36" stroke="#171217" strokeWidth="1.2" />
          <rect x="40" y="28" width="40" height="54" fill="#2d242e" />

          {/* Glowing Neon Gold Shop Signs (ห้างทอง) */}
          <rect x="8" y="12" width="22" height="36" rx="2" fill="#c81d25" stroke="#ffe169" strokeWidth="1.8" />
          <text x="19" y="25" textAnchor="middle" fontSize="8" fontWeight="800" fill="#ffe169" fontFamily="var(--font-display)">ทอง</text>
          <text x="19" y="38" textAnchor="middle" fontSize="8" fontWeight="800" fill="#ffe169" fontFamily="var(--font-display)">คำ</text>

          <rect x="88" y="10" width="24" height="34" rx="2" fill="#0d6e4e" stroke="#ffd24d" strokeWidth="1.8" />
          <text x="100" y="24" textAnchor="middle" fontSize="7.2" fontWeight="800" fill="#fff2a6" fontFamily="var(--font-display)">เยาว</text>
          <text x="100" y="36" textAnchor="middle" fontSize="7.2" fontWeight="800" fill="#fff2a6" fontFamily="var(--font-display)">ราช</text>

          <rect x="34" y="24" width="52" height="14" rx="2" fill="#e62b38" stroke="#ffe680" strokeWidth="1.6" />
          <text x="60" y="34" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff7cc" fontFamily="var(--font-display)">ห้างทอง</text>

          {/* Red Chinese Lanterns strung across */}
          <path d="M28 46 Q60 54 92 46" stroke="#ffd24d" strokeWidth="1" fill="none" />
          {[36, 52, 68, 84].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="52" rx="4.5" ry="5.5" fill="#e62936" stroke="#ffd24d" strokeWidth="0.9" />
              <line x1={x} y1="57.5" x2={x} y2="61" stroke="#ffd24d" strokeWidth="1.1" />
            </g>
          ))}

          {/* Wet golden-lit Yaowarat road */}
          <rect x="0" y="78" width="120" height="18" fill="#1e1824" />
          <path d="M18 85 L44 85 M62 88 L98 88 M35 92 L78 92" stroke="#ffbf47" strokeWidth="1.8" strokeLinecap="round" opacity="0.65" />
          <path d="M24 89 L40 89 M82 84 L106 84" stroke="#ff4d5a" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        </g>
      );

    case 9:
      /* 9: จันทบุรี — Golden Monthong durian with peeled creamy flesh */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-bg9`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e8f5c8" />
              <stop offset="100%" stopColor="#9ed16b" />
            </linearGradient>
            <radialGradient id={`${uid}-flesh9`} cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fff3a8" />
              <stop offset="65%" stopColor="#ffd13b" />
              <stop offset="100%" stopColor="#d99316" />
            </radialGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-bg9)`} />
          {/* Tropical banana leaf platter */}
          <ellipse cx="60" cy="77" rx="48" ry="13" fill="#237a3e" stroke="#114220" strokeWidth="1.3" />
          <path d="M18 77 Q60 71 102 77" stroke="#52b86d" strokeWidth="1.2" fill="none" />

          {/* Whole Spiky Golden-Olive Durian (left) */}
          <g transform="translate(38, 48)">
            <path d="M-2 -31 L2 -38" stroke="#5c3a14" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="0" cy="0" rx="22" ry="27" fill="#7d8f28" stroke="#36400c" strokeWidth="1.4" />
            {/* Spikes */}
            {[
              [-20, -10], [-22, 0], [-19, 12], [-10, -24], [0, -27], [11, -23],
              [20, -11], [22, 2], [18, 14], [0, 26], [-11, 22], [11, 22],
            ].map(([sx, sy], i) => (
              <polygon
                key={i}
                points={`${sx - 3},${sy} ${sx},${sy + (sy < 0 ? -5 : 5)} ${sx + 3},${sy}`}
                fill="#9bad34"
                stroke="#36400c"
                strokeWidth="0.7"
              />
            ))}
            {/* Inner thorn texture */}
            {[-9, 0, 9].map((x) =>
              [-11, 0, 11].map((y) => (
                <polygon
                  key={`${x}-${y}`}
                  points={`${x - 3},${y + 2} ${x},${y - 3} ${x + 3},${y + 2}`}
                  fill="#b3bf43"
                  stroke="#475410"
                  strokeWidth="0.6"
                />
              ))
            )}
          </g>

          {/* Split Open Durian Husk & Plump Creamy Golden Lobes (right) */}
          <g transform="translate(80, 56)">
            <path d="M-16 -20 C-18 -2 18 -2 22 14 C12 24 -16 24 -22 8 Z" fill="#8b9932" stroke="#36400c" strokeWidth="1.4" />
            <path d="M-13 -14 C-14 0 12 0 17 12 C9 19 -12 19 -17 7 Z" fill="#faf0c8" />
            {/* Creamy golden Monthong lobes */}
            <ellipse cx="-2" cy="-2" rx="10" ry="7.5" transform="rotate(-14 -2 -2)" fill={`url(#${uid}-flesh9)`} stroke="#a6690a" strokeWidth="1" />
            <ellipse cx="4" cy="9" rx="10" ry="7" transform="rotate(8 4 9)" fill={`url(#${uid}-flesh9)`} stroke="#a6690a" strokeWidth="1" />
            <path d="M-6 -4 Q-1 -7 4 -3" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.65" />
          </g>
        </g>
      );

    case 11:
      /* 11: กาญจนบุรี — Bridge on the River Kwai with celebratory fireworks */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky11`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#121c42" />
              <stop offset="65%" stopColor="#263f78" />
              <stop offset="100%" stopColor="#6c5280" />
            </linearGradient>
            <linearGradient id={`${uid}-river11`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#144a75" />
              <stop offset="100%" stopColor="#0b2842" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky11)`} />
          {/* Distant limestone hills */}
          <path d="M0 58 Q25 40 52 54 Q82 36 120 55 L120 64 L0 64 Z" fill="#1b304f" />

          {/* Celebratory Starburst Fireworks */}
          {[
            { cx: 28, cy: 22, color: '#ffd43b', r: 13 },
            { cx: 64, cy: 17, color: '#ff5268', r: 15 },
            { cx: 96, cy: 25, color: '#5ce6a0', r: 12 },
          ].map((fw, idx) => (
            <g key={idx} stroke={fw.color} strokeWidth="1.3" strokeLinecap="round">
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                return (
                  <line
                    key={deg}
                    x1={fw.cx + Math.cos(rad) * 3}
                    y1={fw.cy + Math.sin(rad) * 3}
                    x2={fw.cx + Math.cos(rad) * fw.r}
                    y2={fw.cy + Math.sin(rad) * fw.r}
                  />
                );
              })}
              <circle cx={fw.cx} cy={fw.cy} r="2.2" fill="#ffffff" stroke="none" />
            </g>
          ))}

          {/* River Kwai */}
          <rect x="0" y="63" width="120" height="33" fill={`url(#${uid}-river11)`} />
          {/* Fireworks reflections */}
          <path d="M22 76 L34 76 M58 82 L70 82 M90 78 L102 78" stroke="#ffd43b" strokeWidth="1.2" opacity="0.55" />

          {/* Iconic Curved Steel-Truss Bridge */}
          <g stroke="#1b1f26" strokeWidth="1.6" fill="none">
            {/* Concrete piers */}
            <rect x="26" y="60" width="7" height="22" fill="#8f897e" stroke="#222" strokeWidth="1" />
            <rect x="60" y="60" width="7" height="22" fill="#8f897e" stroke="#222" strokeWidth="1" />
            <rect x="94" y="60" width="7" height="22" fill="#8f897e" stroke="#222" strokeWidth="1" />
            {/* Deck */}
            <rect x="0" y="58" width="120" height="4" fill="#2e333b" stroke="#111" strokeWidth="1" />
            {/* Curved steel arches */}
            <path d="M4 58 C10 42 22 42 29 58" stroke="#232830" strokeWidth="2.2" />
            <path d="M31 58 C38 40 54 40 62 58" stroke="#232830" strokeWidth="2.2" />
            <path d="M65 58 C72 40 88 40 96 58" stroke="#232830" strokeWidth="2.2" />
            <path d="M98 58 C105 42 114 42 118 58" stroke="#232830" strokeWidth="2.2" />
            {/* Vertical truss struts */}
            {[16, 40, 47, 54, 74, 81, 88, 108].map((x) => (
              <line key={x} x1={x} y1="45" x2={x} y2="58" stroke="#232830" strokeWidth="1.1" />
            ))}
          </g>
        </g>
      );

    case 13:
      /* 13: ระนอง — Steaming natural mineral hot springs */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky13`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#68b89b" />
              <stop offset="100%" stopColor="#e8f5df" />
            </linearGradient>
            <radialGradient id={`${uid}-pool13`} cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#72ede3" />
              <stop offset="65%" stopColor="#26a69a" />
              <stop offset="100%" stopColor="#14635c" />
            </radialGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky13)`} />
          {/* Misty Southern Jungle Hills */}
          <path d="M0 44 Q28 22 58 38 Q92 18 120 40 L120 60 L0 60 Z" fill="#2c6e49" />
          <path d="M0 52 Q36 36 74 48 Q100 38 120 48 L120 65 L0 65 Z" fill="#3a8559" />

          {/* Bamboo Pavilion on left */}
          <g>
            <line x1="18" y1="36" x2="18" y2="62" stroke="#7d5324" strokeWidth="2.2" />
            <line x1="42" y1="36" x2="42" y2="62" stroke="#7d5324" strokeWidth="2.2" />
            <polygon points="10,38 30,24 50,38" fill="#b87e35" stroke="#4f320d" strokeWidth="1.2" />
          </g>

          {/* Mossy rocky riverbank & steaming hot spring pool */}
          <rect x="0" y="58" width="120" height="38" fill="#4f8249" />
          <ellipse cx="64" cy="76" rx="44" ry="15" fill={`url(#${uid}-pool13)`} stroke="#787166" strokeWidth="3.5" />
          {/* Boulders around pool */}
          <ellipse cx="22" cy="73" rx="9" ry="6" fill="#7a746c" stroke="#3b3732" strokeWidth="1" />
          <ellipse cx="104" cy="72" rx="10" ry="7" fill="#6b655e" stroke="#3b3732" strokeWidth="1" />
          <ellipse cx="92" cy="84" rx="7" ry="4.5" fill="#8a8278" stroke="#3b3732" strokeWidth="0.9" />
          {/* Water ripples */}
          <ellipse cx="64" cy="76" rx="26" ry="7" fill="none" stroke="#c4fff9" strokeWidth="1" opacity="0.65" />

          {/* Rising wisps of thermal steam */}
          <path d="M44 72 Q39 60 46 50 Q51 42 45 34" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
          <path d="M64 70 Q70 57 62 46 Q57 38 64 29" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.75" />
          <path d="M84 72 Q89 61 81 51 Q77 44 83 36" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.65" />
        </g>
      );

    case 14:
      /* 14: สุโขทัย — Ancient Sukhothai ruins & classical dancer */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky14`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c94b2b" />
              <stop offset="60%" stopColor="#f2994a" />
              <stop offset="100%" stopColor="#ffe18c" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky14)`} />
          {/* Sunset glow disc */}
          <circle cx="44" cy="54" r="22" fill="#fff3b8" opacity="0.55" />

          {/* Ancient Laterite Columns & Lotus-Bud Chedi (Wat Mahathat) */}
          <rect x="12" y="42" width="4" height="32" fill="#5e3222" />
          <rect x="24" y="45" width="4" height="29" fill="#5e3222" />
          <path d="M36 74 L39 46 C39 39 44 35 46 28 L47 21 L48 28 C50 35 55 39 55 46 L58 74 Z" fill="#6e3a26" stroke="#36190e" strokeWidth="1" />
          {/* Seated Buddha silhouette */}
          <path d="M27 74 C29 66 35 64 38 58 C38 54 41 51 43 51 C45 51 48 54 48 58 C51 64 57 66 59 74 Z" fill="#472315" />

          {/* Terrace & lotus pond */}
          <rect x="0" y="74" width="120" height="22" fill="#3b5e4c" />
          <rect x="0" y="72" width="120" height="4" fill="#6e3a26" />

          {/* Classical Sukhothai Thai Dancer (right foreground) */}
          <g transform="translate(86, 48)">
            {/* Golden Chada Crown */}
            <polygon points="-4,-23 0,-34 4,-23" fill="#ffd447" stroke="#593a06" strokeWidth="0.9" />
            <circle cx="0" cy="-19" r="5" fill="#efc199" stroke="#3b2011" strokeWidth="1" />
            {/* Graceful arched dancing arms & silk sabai */}
            <path d="M-12 -14 C-18 -14 -20 -8 -15 -4" stroke="#efc199" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            <path d="M12 -14 C18 -18 22 -12 18 -7" stroke="#efc199" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            <polygon points="-6,-13 6,-13 8,4 -8,4" fill="#c8232c" stroke="#ffd447" strokeWidth="1" />
            {/* Pleated gold-trimmed pasin skirt */}
            <polygon points="-7,4 7,4 11,34 -11,34" fill="#1c4e8a" stroke="#ffd447" strokeWidth="1.2" />
            <line x1="0" y1="4" x2="0" y2="34" stroke="#ffd447" strokeWidth="1.4" />
          </g>
        </g>
      );

    default:
      return null;
  }
}
