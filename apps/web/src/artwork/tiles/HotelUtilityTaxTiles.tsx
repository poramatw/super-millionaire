import type { ReactNode } from 'react';

export function renderHotelUtilityTaxTile(tileIndex: number, uid: string): ReactNode {
  switch (tileIndex) {
    case 4:
      /* 4: โรงแรมเซ็นทรัล — Grand 1980s Bangkok luxury high-rise hotel with terraced facade & canopy */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky4`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#26548a" />
              <stop offset="65%" stopColor="#639cd9" />
              <stop offset="100%" stopColor="#fbe3b5" />
            </linearGradient>
            <linearGradient id={`${uid}-bldg4`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f5ede0" />
              <stop offset="70%" stopColor="#ded1bd" />
              <stop offset="100%" stopColor="#b5a38c" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky4)`} />
          {/* Background skyline silhouette */}
          <rect x="6" y="42" width="16" height="40" fill="#436994" opacity="0.55" />
          <rect x="96" y="36" width="18" height="46" fill="#436994" opacity="0.55" />
          {/* Plaza & driveway */}
          <rect x="0" y="76" width="120" height="20" fill="#5b5752" />
          <rect x="0" y="76" width="120" height="3" fill="#b8a890" />

          {/* Main Central Hotel stepped twin-tower volume */}
          <rect x="33" y="12" width="54" height="65" fill={`url(#${uid}-bldg4)`} stroke="#362c22" strokeWidth="1.4" />
          <rect x="20" y="34" width="14" height="43" fill="#cfc1ab" stroke="#362c22" strokeWidth="1.2" />
          <rect x="86" y="34" width="14" height="43" fill="#c2b299" stroke="#362c22" strokeWidth="1.2" />

          {/* Red iconic marquee crown */}
          <rect x="38" y="8" width="44" height="7" rx="1" fill="#c8232c" stroke="#362c22" strokeWidth="1.1" />
          <text x="60" y="13.5" textAnchor="middle" fontSize="5.2" fontWeight="800" fill="#fff7d6" fontFamily="var(--font-display)">CENTRAL</text>

          {/* Horizontal concrete balcony bands & lit amber windows */}
          {[20, 29, 38, 47, 56].map((y) => (
            <g key={y}>
              <rect x="36" y={y} width="48" height="5" fill="#473c33" />
              <rect x="38" y={y + 1} width="9" height="3.2" fill="#ffe18c" />
              <rect x="50" y={y + 1} width="9" height="3.2" fill="#ffe18c" />
              <rect x="62" y={y + 1} width="9" height="3.2" fill="#82b4d9" />
              <rect x="74" y={y + 1} width="8" height="3.2" fill="#ffe18c" />
              <line x1="33" y1={y + 5.5} x2="87" y2={y + 5.5} stroke="#f7f0e4" strokeWidth="1" />
            </g>
          ))}

          {/* Grand red-gold porte-cochère entrance */}
          <polygon points="39,67 81,67 85,73 35,73" fill="#c8232c" stroke="#2e1812" strokeWidth="1.1" />
          <rect x="44" y="73" width="32" height="7" fill="#ffd97d" stroke="#2e1812" strokeWidth="1" />
          {/* Palms flanking entrance */}
          <circle cx="24" cy="72" r="5.5" fill="#237a42" stroke="#124222" strokeWidth="0.9" />
          <circle cx="96" cy="72" r="5.5" fill="#237a42" stroke="#124222" strokeWidth="0.9" />
        </g>
      );

    case 5:
      /* 5: โรงแรมการ์เด้น — Lush resort Garden Hotel with pitched Thai-modern roof & courtyard pool */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky5`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#65b8e8" />
              <stop offset="100%" stopColor="#f9efc7" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky5)`} />
          {/* Lush green garden backdrop */}
          <ellipse cx="20" cy="64" rx="22" ry="18" fill="#287a41" />
          <ellipse cx="100" cy="64" rx="22" ry="18" fill="#216b38" />
          {/* Courtyard lawn & reflecting pool */}
          <rect x="0" y="71" width="120" height="25" fill="#4da656" />
          <polygon points="36,75 84,75 94,92 26,92" fill="#2994c9" stroke="#e8e0cf" strokeWidth="2" />
          <path d="M44 82 L76 82 M40 87 L72 87" stroke="#b5f0ff" strokeWidth="1.1" opacity="0.7" />

          {/* Garden Hotel wings with terracotta pitched roofs */}
          <rect x="18" y="42" width="84" height="30" fill="#faf2e1" stroke="#453624" strokeWidth="1.3" />
          <polygon points="12,42 36,24 84,24 108,42" fill="#c24e2b" stroke="#452014" strokeWidth="1.4" />
          <polygon points="44,42 60,18 76,42" fill="#d95f36" stroke="#452014" strokeWidth="1.3" />

          {/* Arched tropical balconies */}
          {[24, 38, 54, 70, 84].map((x) => (
            <g key={x}>
              <path d={`M${x} 67 L${x} 51 C${x} 46 ${x + 10} 46 ${x + 10} 51 L${x + 10} 67 Z`} fill="#4a392b" />
              <path d={`M${x + 1.5} 66 L${x + 1.5} 52 C${x + 1.5} 48 ${x + 8.5} 48 ${x + 8.5} 52 L${x + 8.5} 66 Z`} fill="#ffd578" opacity="0.85" />
            </g>
          ))}
          {/* Pink bougainvillea clusters */}
          <circle cx="17" cy="69" r="4.5" fill="#e6458a" />
          <circle cx="103" cy="69" r="4.5" fill="#e6458a" />
          <circle cx="23" cy="72" r="3" fill="#ff7ab3" />
          <circle cx="97" cy="72" r="3" fill="#ff7ab3" />
        </g>
      );

    case 15:
      /* 15: โรงแรมอินทรา — Classic Indra Regent tower with fluted vertical ribs & illuminated crown */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky15`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f2c52" />
              <stop offset="65%" stopColor="#4f568a" />
              <stop offset="100%" stopColor="#f2a679" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky15)`} />
          {/* Street & podium */}
          <rect x="0" y="79" width="120" height="17" fill="#3b363d" />
          <rect x="16" y="61" width="88" height="18" fill="#d9cdb8" stroke="#29221d" strokeWidth="1.3" />
          {/* Vertical fluted main tower */}
          <rect x="34" y="13" width="52" height="49" fill="#efe6d5" stroke="#29221d" strokeWidth="1.4" />
          {/* Fluted columns & lit windows */}
          {[39, 46, 53, 60, 67, 74, 81].map((x) => (
            <line key={x} x1={x} y1="15" x2={x} y2="61" stroke="#b5a68e" strokeWidth="1.2" />
          ))}
          {[19, 27, 35, 43, 51].map((y) => (
            <g key={y}>
              {[36, 43, 50, 57, 64, 71, 78].map((x) => (
                <rect key={x} x={x} y={y} width="4" height="5" fill={(x + y) % 3 === 0 ? '#9dc2e0' : '#ffde7d'} />
              ))}
            </g>
          ))}
          {/* Rooftop Indra crown */}
          <rect x="42" y="6" width="36" height="7" fill="#214678" stroke="#f0c446" strokeWidth="1.1" />
          <text x="60" y="11.5" textAnchor="middle" fontSize="5" fontWeight="800" fill="#ffd966" fontFamily="var(--font-display)">INDRA</text>
          {/* Glowing entrance canopy */}
          <rect x="42" y="65" width="36" height="5" fill="#c8232c" stroke="#29221d" strokeWidth="1" />
          <rect x="47" y="70" width="26" height="9" fill="#ffe18c" stroke="#29221d" strokeWidth="1" />
        </g>
      );

    case 25:
      /* 25: โรงแรมแกรนด์คอนติเนนตัล — Prestigious Grand Continental neoclassical hotel with mansard roof & flags */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky25`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3c73ad" />
              <stop offset="100%" stopColor="#fce4bd" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky25)`} />
          <rect x="0" y="79" width="120" height="17" fill="#635a50" />
          {/* Stepped Mansard Slate Roof */}
          <polygon points="18,32 30,17 90,17 102,32" fill="#2d4159" stroke="#182330" strokeWidth="1.3" />
          <polygon points="44,17 60,7 76,17" fill="#3a5370" stroke="#182330" strokeWidth="1.2" />
          {/* Fluttering flags */}
          <line x1="36" y1="17" x2="36" y2="7" stroke="#f5efe0" strokeWidth="1.2" />
          <polygon points="36,7 44,9.5 36,12" fill="#c8232c" />
          <line x1="84" y1="17" x2="84" y2="7" stroke="#f5efe0" strokeWidth="1.2" />
          <polygon points="84,7 92,9.5 84,12" fill="#1b7a43" />

          {/* Grand Cream Neoclassical Facade */}
          <rect x="16" y="32" width="88" height="47" fill="#f7eed9" stroke="#3d3022" strokeWidth="1.4" />
          {/* Classical Pilasters */}
          {[22, 40, 58, 76, 94].map((x) => (
            <rect key={x} x={x} y="34" width="4" height="45" fill="#e2d1b1" />
          ))}
          {/* Arched Grand Windows */}
          {[28, 46, 64, 82].map((x) => (
            <g key={x}>
              <path d={`M${x} 52 L${x} 42 C${x} 38 ${x + 9} 38 ${x + 9} 42 L${x + 9} 52 Z`} fill="#4d79a3" stroke="#7d6442" strokeWidth="0.9" />
              <rect x={x} y="56" width="9" height="10" fill="#ffe296" stroke="#7d6442" strokeWidth="0.9" />
            </g>
          ))}
          {/* Red Carpet & Portico */}
          <rect x="46" y="65" width="28" height="14" fill="#d9c6a3" stroke="#3d3022" strokeWidth="1.1" />
          <polygon points="52,79 68,79 74,95 46,95" fill="#c8232c" stroke="#660d12" strokeWidth="0.9" />
          <rect x="54" y="69" width="12" height="10" fill="#3a2818" />
        </g>
      );

    case 35:
      /* 35: โรงแรมโนโวเทล — Contemporary twin-wing Novotel hotel with glass atrium & pool terrace */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky35`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1966ab" />
              <stop offset="100%" stopColor="#a7def7" />
            </linearGradient>
            <linearGradient id={`${uid}-glass35`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8ce3ff" />
              <stop offset="50%" stopColor="#2679b8" />
              <stop offset="100%" stopColor="#14436e" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky35)`} />
          {/* Pool terrace foreground */}
          <rect x="0" y="75" width="120" height="21" fill="#e3d7c3" />
          <ellipse cx="60" cy="86" rx="34" ry="7" fill="#1db5d6" stroke="#ffffff" strokeWidth="1.6" />
          {/* Twin White Modernist Wings */}
          <rect x="14" y="24" width="32" height="51" fill="#f7f9fc" stroke="#253b54" strokeWidth="1.3" />
          <rect x="74" y="24" width="32" height="51" fill="#e6edf5" stroke="#253b54" strokeWidth="1.3" />
          {/* Central Glass Atrium */}
          <polygon points="46,16 74,16 74,75 46,75" fill={`url(#${uid}-glass35)`} stroke="#142d47" strokeWidth="1.4" />
          <path d="M48 20 L62 72 M56 18 L72 68" stroke="#ffffff" strokeWidth="1.5" opacity="0.35" />
          {/* Blue Novotel Banner */}
          <rect x="44" y="10" width="32" height="7" rx="1" fill="#134e8a" stroke="#ffffff" strokeWidth="0.9" />
          <text x="60" y="15.3" textAnchor="middle" fontSize="5" fontWeight="700" fill="#ffffff" fontFamily="var(--font-display)">NOVOTEL</text>
          {/* Modern horizontal window bands */}
          {[31, 41, 51, 61].map((y) => (
            <g key={y}>
              <rect x="18" y={y} width="24" height="5" fill="#2d6ea3" />
              <rect x="78" y={y} width="24" height="5" fill="#255d8c" />
            </g>
          ))}
        </g>
      );

    case 12:
      /* 12: การไฟฟ้า — Substation & high-voltage electrical transmission pylons */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky12`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1d4473" />
              <stop offset="65%" stopColor="#e88d43" />
              <stop offset="100%" stopColor="#ffe187" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky12)`} />
          {/* Horizon & substation pad */}
          <rect x="0" y="76" width="120" height="20" fill="#4f575e" />
          <rect x="0" y="74" width="120" height="3" fill="#2b6e3f" />

          {/* Distant second pylon */}
          <g transform="translate(86, 28) scale(0.58)" stroke="#232830" strokeWidth="1.8" fill="none">
            <polygon points="10,75 20,10 28,10 38,75" />
            <line x1="4" y1="26" x2="44" y2="26" />
            <line x1="0" y1="42" x2="48" y2="42" />
          </g>

          {/* Main Steel Lattice Pylon */}
          <g stroke="#1b2026" strokeWidth="1.6" fill="none">
            <polygon points="33,82 47,12 53,12 67,82" />
            <line x1="47" y1="12" x2="50" y2="5" />
            <line x1="53" y1="12" x2="50" y2="5" />
            {/* Cross arms */}
            <polygon points="24,27 76,27 72,32 28,32" fill="#2d343d" />
            <polygon points="18,43 82,43 77,49 23,49" fill="#2d343d" />
            {/* Lattice X-braces */}
            <line x1="45" y1="27" x2="58" y2="43" />
            <line x1="55" y1="27" x2="42" y2="43" />
            <line x1="41" y1="49" x2="62" y2="67" />
            <line x1="59" y1="49" x2="38" y2="67" />
            <line x1="37" y1="67" x2="66" y2="82" />
            <line x1="63" y1="67" x2="34" y2="82" />
          </g>
          {/* Power cables sweeping across */}
          <path d="M0 24 Q14 35 25 32 M75 32 Q84 39 92 42 M0 38 Q12 52 19 49 M81 49 Q94 56 120 48" stroke="#1b2026" strokeWidth="1.1" fill="none" />
          {/* Substation Transformer Box & Electric Bolt Emblem */}
          <rect x="74" y="59" width="26" height="20" rx="1.5" fill="#cfd6de" stroke="#222830" strokeWidth="1.3" />
          <line x1="79" y1="63" x2="79" y2="75" stroke="#5f6b78" strokeWidth="1.5" />
          <line x1="84" y1="63" x2="84" y2="75" stroke="#5f6b78" strokeWidth="1.5" />
          <circle cx="24" cy="20" r="9.5" fill="#ffd43b" stroke="#222" strokeWidth="1.3" />
          <polygon points="25,13 19,21 24,21 22,27 29,19 24,19" fill="#c8232c" />
        </g>
      );

    case 28:
      /* 28: การประปา — Municipal water tower, filtration basins & waterworks headquarters */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky28`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2e7fc9" />
              <stop offset="100%" stopColor="#cdeeff" />
            </linearGradient>
            <linearGradient id={`${uid}-tank28`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#cbe0f5" />
              <stop offset="100%" stopColor="#7ba4cc" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky28)`} />
          <rect x="0" y="75" width="120" height="21" fill="#469156" />
          {/* Waterworks HQ Building */}
          <rect x="52" y="49" width="56" height="27" fill="#f2efe6" stroke="#253b54" strokeWidth="1.3" />
          <rect x="50" y="45" width="60" height="5" fill="#1c5ca3" stroke="#133a69" strokeWidth="1.1" />
          {[58, 69, 80, 91].map((x) => (
            <rect key={x} x={x} y="54" width="7" height="9" fill="#5ba3d9" stroke="#253b54" strokeWidth="0.8" />
          ))}
          <rect x="74" y="66" width="12" height="10" fill="#253b54" />
          {/* Settling Water Pool */}
          <ellipse cx="82" cy="85" rx="28" ry="6" fill="#249ee0" stroke="#e6eef5" strokeWidth="1.5" />
          <path d="M68 85 Q82 82 96 85" stroke="#c2f0ff" strokeWidth="1.1" fill="none" />

          {/* Elevated Spherical-Cylindrical Water Tower */}
          <g stroke="#1b334d" strokeWidth="1.3">
            <line x1="25" y1="44" x2="19" y2="79" strokeWidth="2.4" />
            <line x1="41" y1="44" x2="47" y2="79" strokeWidth="2.4" />
            <line x1="33" y1="45" x2="33" y2="79" strokeWidth="2.2" />
            <line x1="22" y1="60" x2="44" y2="60" strokeWidth="1.4" />
            <line x1="20" y1="70" x2="46" y2="70" strokeWidth="1.4" />
            {/* Tank */}
            <path d="M18 22 C18 11 48 11 48 22 L46 41 C46 46 20 46 20 41 Z" fill={`url(#${uid}-tank28)`} />
            <rect x="19" y="27" width="28" height="5" fill="#1c64b0" stroke="none" />
            {/* Pipe */}
            <line x1="36" y1="45" x2="54" y2="68" stroke="#476685" strokeWidth="2.5" />
          </g>
        </g>
      );

    case 38:
      /* 38: จ่ายภาษี — Imposing skyscraper financial tax tower with Baht emblem */
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-sky38`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1b263b" />
              <stop offset="65%" stopColor="#415a77" />
              <stop offset="100%" stopColor="#d99f66" />
            </linearGradient>
            <linearGradient id={`${uid}-tower38`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dce3eb" />
              <stop offset="65%" stopColor="#9fb0c4" />
              <stop offset="100%" stopColor="#5a6c82" />
            </linearGradient>
          </defs>
          <rect width="120" height="96" fill={`url(#${uid}-sky38)`} />
          {/* Side financial towers */}
          <rect x="10" y="45" width="22" height="51" fill="#324459" stroke="#18222e" strokeWidth="1.1" />
          <rect x="88" y="39" width="22" height="57" fill="#29384a" stroke="#18222e" strokeWidth="1.1" />

          {/* Grand Central Art-Deco Skyscraper */}
          <polygon points="58,4 62,4 65,15 55,15" fill="#f5c942" stroke="#2b1e06" strokeWidth="1" />
          <rect x="46" y="15" width="28" height="12" fill="#c7d3e0" stroke="#1c2633" strokeWidth="1.2" />
          <rect x="37" y="27" width="46" height="69" fill={`url(#${uid}-tower38)`} stroke="#1c2633" strokeWidth="1.4" />
          {/* Vertical Art-Deco ribs & golden windows */}
          {[43, 51, 59, 67, 75].map((x) => (
            <line key={x} x1={x} y1="29" x2={x} y2="94" stroke="#47596e" strokeWidth="1.1" />
          ))}
          {[33, 41, 49, 57, 65, 73].map((y) => (
            <g key={y}>
              <rect x="45" y={y} width="4" height="5" fill="#ffe282" />
              <rect x="53" y={y} width="4" height="5" fill="#a2ccf0" />
              <rect x="61" y={y} width="4" height="5" fill="#ffe282" />
              <rect x="69" y={y} width="4" height="5" fill="#ffe282" />
            </g>
          ))}
          {/* Golden Tax / Baht Seal */}
          <circle cx="60" cy="79" r="12" fill="#f2bd35" stroke="#472d05" strokeWidth="1.5" />
          <text x="60" y="84" textAnchor="middle" fontSize="14" fontWeight="800" fill="#472d05" fontFamily="var(--font-display)">฿</text>
        </g>
      );

    default:
      return null;
  }
}
