import { useId } from 'react';

export const TOKEN_NAMES = [
  'เหมียวนำโชค',
  'ชิบะจอมลุย',
  'แพนด้าเจ้าสัว',
  'ต่ายน้อยร้อยล้าน',
  'หนุ่มน้อยนักลงทุน',
  'สาวน้อยไฮโซ',
  'เพนกวินทักซิโด้',
  'จิ้งจอกจอมดีล',
  'ลูกเจี๊ยบเศรษฐี',
  'ช้างน้อยคู่บารมี',
  'บาริสต้าหนุ่มชิค',
  'คุณหนูนักช้อป',
] as const;

export interface PlayerTokenProps {
  tokenId: number;
  color: string;
  size?: number;
  className?: string;
}

export interface PieceProps {
  size?: number;
  className?: string;
}

export interface BankerAvatarProps {
  size?: number;
  className?: string;
}

export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface Dice3DProps {
  value: DiceValue;
  rolling?: boolean;
  size?: number;
  className?: string;
}

export function PlayerToken({ tokenId, color, size = 36, className = '' }: PlayerTokenProps) {
  const uid = useId().replace(/:/g, '');
  const count = TOKEN_NAMES.length;
  const idx = ((Math.trunc(tokenId) % count) + count) % count;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 76"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`piece-3d-shadow ${className}`}
      role="img"
      aria-label={TOKEN_NAMES[idx]}
    >
      <defs>
        <linearGradient id={`${uid}-sheen`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.62" />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id={`${uid}-stem`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.48" />
        </linearGradient>
        <linearGradient id={`${uid}-metal`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="45%" stopColor="#e5ba45" />
          <stop offset="100%" stopColor="#8d6210" />
        </linearGradient>
        <radialGradient id={`${uid}-shadow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#120c06" stopOpacity="0.62" />
          <stop offset="70%" stopColor="#120c06" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#120c06" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Grounded elliptical shadow disc */}
      <ellipse cx="32" cy="70" rx="23" ry="5.5" fill={`url(#${uid}-shadow)`} />

      {/* Solid 3D pedestal base + stem/collar in player color */}
      <g>
        {/* Lower pedestal cylinder wall */}
        <path
          d="M14 62 C14 67 50 67 50 62 L50 66.5 C50 71.5 14 71.5 14 66.5 Z"
          fill={color}
          stroke="#18120c"
          strokeWidth="1.6"
        />
        <path
          d="M14 62 C14 67 50 67 50 62 L50 66.5 C50 71.5 14 71.5 14 66.5 Z"
          fill="#000000"
          opacity="0.32"
        />
        {/* Pedestal upper beveled disc */}
        <ellipse cx="32" cy="61.5" rx="18" ry="5.8" fill={color} stroke="#18120c" strokeWidth="1.6" />
        <ellipse cx="32" cy="61.5" rx="16.5" ry="4.8" fill={`url(#${uid}-sheen)`} />
        {/* Sculpted pawn stem / collar */}
        <path
          d="M24 49 L40 49 L43 60.5 C43 62.8 21 62.8 21 60.5 Z"
          fill={color}
          stroke="#18120c"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M24 49 L40 49 L43 60.5 C43 62.8 21 62.8 21 60.5 Z"
          fill={`url(#${uid}-stem)`}
        />
        {/* Metallic collar trim ring */}
        <ellipse cx="32" cy="50" rx="10" ry="3.2" fill={`url(#${uid}-metal)`} stroke="#18120c" strokeWidth="1.2" />
      </g>

      {/* Upright Figurine Mounted on Pedestal Collar */}
      <g transform="translate(2.5, -1.5) scale(0.92)">
        {idx === 0 && (
          /* 0: เหมียวนำโชค (Cute Lucky Cat) */
          <g>
            {/* Pointy ears */}
            <path d="M18 28 L19 14 L28 21 Z" fill="#fff6e8" stroke="#1b1510" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M20.5 25 L21 17.5 L26 22 Z" fill="#f58fa8" />
            <path d="M46 28 L45 14 L36 21 Z" fill="#fff6e8" stroke="#1b1510" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M43.5 25 L43 17.5 L38 22 Z" fill="#f58fa8" />
            {/* Chubby body & head */}
            <rect x="20" y="36" width="24" height="15" rx="7" fill="#fff6e8" stroke="#1b1510" strokeWidth="1.8" />
            <rect x="16" y="19" width="32" height="23" rx="11" fill="#fff6e8" stroke="#1b1510" strokeWidth="1.9" />
            {/* Collar & golden bell */}
            <rect x="21" y="39" width="22" height="3.6" rx="1.8" fill={color} stroke="#1b1510" strokeWidth="1.2" />
            <circle cx="32" cy="42.5" r="3" fill={`url(#${uid}-metal)`} stroke="#1b1510" strokeWidth="1.1" />
            {/* Eyes, pink cheeks, whiskers */}
            <circle cx="25" cy="30" r="2.3" fill="#1b1510" />
            <circle cx="25.7" cy="29.2" r="0.8" fill="#ffffff" />
            <circle cx="39" cy="30" r="2.3" fill="#1b1510" />
            <circle cx="39.7" cy="29.2" r="0.8" fill="#ffffff" />
            <ellipse cx="21" cy="33.5" rx="2.6" ry="1.5" fill="#f79bb4" opacity="0.75" />
            <ellipse cx="43" cy="33.5" rx="2.6" ry="1.5" fill="#f79bb4" opacity="0.75" />
            <path d="M30 33 L32 35 L34 33" stroke="#1b1510" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>
        )}

        {idx === 1 && (
          /* 1: ชิบะจอมลุย (Cute Shiba Inu) */
          <g>
            {/* Ears */}
            <path d="M18 26 L17 13 L27 20 Z" fill="#e6923a" stroke="#1b1510" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M46 26 L47 13 L37 20 Z" fill="#e6923a" stroke="#1b1510" strokeWidth="1.8" strokeLinejoin="round" />
            {/* Body & head */}
            <rect x="20" y="36" width="24" height="15" rx="7" fill="#e6923a" stroke="#1b1510" strokeWidth="1.8" />
            <rect x="16" y="18" width="32" height="24" rx="11" fill="#e6923a" stroke="#1b1510" strokeWidth="1.9" />
            {/* Cream snout & eyebrows */}
            <ellipse cx="32" cy="35" rx="10" ry="6.2" fill="#fff7e8" />
            <circle cx="26.5" cy="25" r="1.7" fill="#fff7e8" />
            <circle cx="37.5" cy="25" r="1.7" fill="#fff7e8" />
            {/* Bandana in player color */}
            <path d="M21 40 L43 40 L32 48 Z" fill={color} stroke="#1b1510" strokeWidth="1.4" strokeLinejoin="round" />
            {/* Eyes & nose */}
            <circle cx="25.5" cy="29.5" r="2.2" fill="#1b1510" />
            <circle cx="38.5" cy="29.5" r="2.2" fill="#1b1510" />
            <ellipse cx="32" cy="33" rx="2.3" ry="1.6" fill="#1b1510" />
          </g>
        )}

        {idx === 2 && (
          /* 2: แพนด้าเจ้าสัว (Cute Tycoon Panda) */
          <g>
            {/* Round black ears */}
            <circle cx="20" cy="18" r="5.5" fill="#231f20" stroke="#1b1510" strokeWidth="1.6" />
            <circle cx="44" cy="18" r="5.5" fill="#231f20" stroke="#1b1510" strokeWidth="1.6" />
            {/* Body & head */}
            <rect x="19" y="35" width="26" height="16" rx="8" fill="#231f20" stroke="#1b1510" strokeWidth="1.8" />
            <ellipse cx="32" cy="44" rx="8" ry="6" fill="#ffffff" />
            <rect x="15" y="18" width="34" height="24" rx="12" fill="#ffffff" stroke="#1b1510" strokeWidth="1.9" />
            {/* Eye patches */}
            <ellipse cx="25" cy="29.5" rx="4.2" ry="3.4" transform="rotate(-15 25 29.5)" fill="#231f20" />
            <ellipse cx="39" cy="29.5" rx="4.2" ry="3.4" transform="rotate(15 39 29.5)" fill="#231f20" />
            <circle cx="25.5" cy="29" r="1.4" fill="#ffffff" />
            <circle cx="38.5" cy="29" r="1.4" fill="#ffffff" />
            <ellipse cx="32" cy="34" rx="2.2" ry="1.5" fill="#231f20" />
            {/* Mini bow tie in player color */}
            <path d="M26 40 L32 42.5 L26 45 Z M38 40 L32 42.5 L38 45 Z" fill={color} stroke="#1b1510" strokeWidth="1.1" />
          </g>
        )}

        {idx === 3 && (
          /* 3: ต่ายน้อยร้อยล้าน (Cute Millionaire Bunny) */
          <g>
            {/* Long bunny ears */}
            <rect x="21" y="7" width="7.5" height="17" rx="3.75" fill="#fff8fa" stroke="#1b1510" strokeWidth="1.7" />
            <rect x="23" y="10" width="3.5" height="11" rx="1.75" fill="#f7a8b8" />
            <rect x="35.5" y="7" width="7.5" height="17" rx="3.75" fill="#fff8fa" stroke="#1b1510" strokeWidth="1.7" />
            <rect x="37.5" y="10" width="3.5" height="11" rx="1.75" fill="#f7a8b8" />
            {/* Body & head */}
            <rect x="20" y="36" width="24" height="15" rx="7" fill={color} stroke="#1b1510" strokeWidth="1.8" />
            <rect x="16" y="20" width="32" height="22" rx="11" fill="#fff8fa" stroke="#1b1510" strokeWidth="1.9" />
            {/* Eyes & rosy cheeks */}
            <circle cx="25.5" cy="30.5" r="2.2" fill="#1b1510" />
            <circle cx="38.5" cy="30.5" r="2.2" fill="#1b1510" />
            <ellipse cx="21" cy="33.5" rx="2.5" ry="1.4" fill="#f79bb4" opacity="0.8" />
            <ellipse cx="43" cy="33.5" rx="2.5" ry="1.4" fill="#f79bb4" opacity="0.8" />
            <circle cx="32" cy="33" r="1.6" fill="#f07892" />
          </g>
        )}

        {idx === 4 && (
          /* 4: หนุ่มน้อยนักลงทุน (Cute Mini Boy Investor) */
          <g>
            {/* Suit body */}
            <rect x="20" y="34" width="24" height="17" rx="6" fill={color} stroke="#1b1510" strokeWidth="1.8" />
            <path d="M29 34 L32 42 L35 34 Z" fill="#ffffff" />
            <path d="M31 35 L32 44 L33 35 Z" fill="#e53935" />
            {/* Chibi head */}
            <rect x="17" y="15" width="30" height="22" rx="10" fill="#ffe0bd" stroke="#1b1510" strokeWidth="1.9" />
            {/* Stylish hair */}
            <path d="M16 24 C16 14 25 11 35 12 C44 13 48 18 47 24 C43 19 36 18 28 20 C22 21 19 23 16 24 Z" fill="#3b2618" stroke="#1b1510" strokeWidth="1.6" />
            {/* Eyes & smile */}
            <circle cx="26" cy="27" r="2.1" fill="#1b1510" />
            <circle cx="38" cy="27" r="2.1" fill="#1b1510" />
            <path d="M29 32 Q32 34.5 35 32" stroke="#1b1510" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </g>
        )}

        {idx === 5 && (
          /* 5: สาวน้อยไฮโซ (Cute Mini Girl Socialite) */
          <g>
            {/* Back hair */}
            <rect x="14" y="16" width="36" height="26" rx="12" fill="#5c3317" stroke="#1b1510" strokeWidth="1.7" />
            {/* Dress body */}
            <path d="M19 50 L22 34 L42 34 L45 50 Z" fill={color} stroke="#1b1510" strokeWidth="1.8" strokeLinejoin="round" />
            {/* Chibi head */}
            <rect x="18" y="16" width="28" height="21" rx="10" fill="#ffe3c4" stroke="#1b1510" strokeWidth="1.8" />
            {/* Cute bangs & ribbon */}
            <path d="M17 24 C18 15 26 13 32 14 C38 13 46 15 47 24 C42 20 36 19 32 21 C28 19 22 20 17 24 Z" fill="#5c3317" stroke="#1b1510" strokeWidth="1.5" />
            <circle cx="32" cy="14" r="3" fill={`url(#${uid}-metal)`} stroke="#1b1510" strokeWidth="1.1" />
            {/* Eyes & blush */}
            <circle cx="26" cy="27.5" r="2.1" fill="#1b1510" />
            <circle cx="38" cy="27.5" r="2.1" fill="#1b1510" />
            <ellipse cx="22.5" cy="30.5" rx="2.2" ry="1.2" fill="#f79bb4" />
            <ellipse cx="41.5" cy="30.5" rx="2.2" ry="1.2" fill="#f79bb4" />
            <path d="M29.5 32 Q32 34 34.5 32" stroke="#1b1510" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>
        )}

        {idx === 6 && (
          /* 6: เพนกวินทักซิโด้ (Cute Tuxedo Penguin) */
          <g>
            <rect x="17" y="16" width="30" height="34" rx="14" fill="#222a38" stroke="#1b1510" strokeWidth="1.9" />
            <ellipse cx="32" cy="36" rx="10" ry="11" fill="#ffffff" />
            <circle cx="26" cy="26" r="2.1" fill="#ffffff" />
            <circle cx="26" cy="26" r="1.2" fill="#1b1510" />
            <circle cx="38" cy="26" r="2.1" fill="#ffffff" />
            <circle cx="38" cy="26" r="1.2" fill="#1b1510" />
            {/* Golden beak & bow tie */}
            <path d="M28 29 L36 29 L32 34 Z" fill="#ffb300" stroke="#1b1510" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M26 36 L32 38.5 L26 41 Z M38 36 L32 38.5 L38 41 Z" fill={color} stroke="#1b1510" strokeWidth="1.1" />
          </g>
        )}

        {idx === 7 && (
          /* 7: จิ้งจอกจอมดีล (Cute Clever Fox) */
          <g>
            <path d="M16 26 L16 12 L27 20 Z" fill="#e86a2c" stroke="#1b1510" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M48 26 L48 12 L37 20 Z" fill="#e86a2c" stroke="#1b1510" strokeWidth="1.8" strokeLinejoin="round" />
            <rect x="20" y="36" width="24" height="15" rx="7" fill={color} stroke="#1b1510" strokeWidth="1.8" />
            <rect x="16" y="19" width="32" height="22" rx="10" fill="#e86a2c" stroke="#1b1510" strokeWidth="1.9" />
            <path d="M17 32 C22 32 27 38 32 38 C37 38 42 32 47 32 C46 38 40 41 32 41 C24 41 18 38 17 32 Z" fill="#fff6e8" />
            <circle cx="25.5" cy="29" r="2.1" fill="#1b1510" />
            <circle cx="38.5" cy="29" r="2.1" fill="#1b1510" />
            <circle cx="32" cy="34" r="2" fill="#1b1510" />
          </g>
        )}

        {idx === 8 && (
          /* 8: ลูกเจี๊ยบเศรษฐี (Cute Golden Chick) */
          <g>
            <path d="M29 14 C29 10 35 10 34 15" stroke="#ffca28" strokeWidth="3" strokeLinecap="round" fill="none" />
            <rect x="16" y="17" width="32" height="32" rx="15" fill="#ffd54f" stroke="#1b1510" strokeWidth="1.9" />
            <rect x="20" y="39" width="24" height="11" rx="5.5" fill={color} stroke="#1b1510" strokeWidth="1.5" />
            <circle cx="25.5" cy="28" r="2.2" fill="#1b1510" />
            <circle cx="38.5" cy="28" r="2.2" fill="#1b1510" />
            <ellipse cx="21" cy="31" rx="2.4" ry="1.3" fill="#ff8a65" />
            <ellipse cx="43" cy="31" rx="2.4" ry="1.3" fill="#ff8a65" />
            <path d="M29 30 L35 30 L32 34.5 Z" fill="#ff7043" stroke="#1b1510" strokeWidth="1.2" strokeLinejoin="round" />
          </g>
        )}

        {idx === 9 && (
          /* 9: ช้างน้อยคู่บารมี (Cute Chibi Baby Elephant) */
          <g>
            {/* Big floppy ears */}
            <rect x="9" y="20" width="11" height="17" rx="5.5" fill="#90a4ae" stroke="#1b1510" strokeWidth="1.8" />
            <rect x="44" y="20" width="11" height="17" rx="5.5" fill="#90a4ae" stroke="#1b1510" strokeWidth="1.8" />
            <rect x="20" y="36" width="24" height="15" rx="7" fill={color} stroke="#1b1510" strokeWidth="1.8" />
            <rect x="17" y="18" width="30" height="23" rx="11" fill="#b0bec5" stroke="#1b1510" strokeWidth="1.9" />
            {/* Cute trunk & royal crown */}
            <path d="M30 31 L30 37 C30 39.5 35 39.5 35 37" stroke="#90a4ae" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M30 31 L30 37 C30 39.5 35 39.5 35 37" stroke="#1b1510" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M26 18 L28 12 L32 15 L36 12 L38 18 Z" fill={`url(#${uid}-metal)`} stroke="#1b1510" strokeWidth="1.3" strokeLinejoin="round" />
            <circle cx="24.5" cy="28" r="2" fill="#1b1510" />
            <circle cx="39.5" cy="28" r="2" fill="#1b1510" />
          </g>
        )}

        {idx === 10 && (
          /* 10: บาริสต้าหนุ่มชิค (Cute Hipster Boy Character) */
          <g>
            <rect x="20" y="34" width="24" height="17" rx="6" fill={color} stroke="#1b1510" strokeWidth="1.8" />
            <rect x="17" y="16" width="30" height="21" rx="10" fill="#ffe0bd" stroke="#1b1510" strokeWidth="1.9" />
            {/* Cute beanie cap */}
            <path d="M16 23 C16 13 48 13 48 23 Z" fill={color} stroke="#1b1510" strokeWidth="1.8" />
            <rect x="15" y="20" width="34" height="4.5" rx="2.2" fill="#2d241e" stroke="#1b1510" strokeWidth="1.3" />
            {/* Round glasses */}
            <circle cx="26" cy="28" r="3.6" fill="#ffffff" fillOpacity="0.4" stroke="#1b1510" strokeWidth="1.6" />
            <circle cx="38" cy="28" r="3.6" fill="#ffffff" fillOpacity="0.4" stroke="#1b1510" strokeWidth="1.6" />
            <line x1="29.6" y1="28" x2="34.4" y2="28" stroke="#1b1510" strokeWidth="1.5" />
            <circle cx="26" cy="28" r="1.4" fill="#1b1510" />
            <circle cx="38" cy="28" r="1.4" fill="#1b1510" />
          </g>
        )}

        {idx === 11 && (
          /* 11: คุณหนูนักช้อป (Cute Shopper Girl Character) */
          <g>
            {/* Twin tails */}
            <circle cx="15" cy="25" r="5" fill="#d97b29" stroke="#1b1510" strokeWidth="1.6" />
            <circle cx="49" cy="25" r="5" fill="#d97b29" stroke="#1b1510" strokeWidth="1.6" />
            <path d="M19 50 L22 34 L42 34 L45 50 Z" fill={color} stroke="#1b1510" strokeWidth="1.8" strokeLinejoin="round" />
            <rect x="18" y="16" width="28" height="21" rx="10" fill="#ffe3c4" stroke="#1b1510" strokeWidth="1.8" />
            <path d="M17 24 C18 14 46 14 47 24 C41 19 23 19 17 24 Z" fill="#d97b29" stroke="#1b1510" strokeWidth="1.6" />
            <circle cx="26" cy="27.5" r="2.1" fill="#1b1510" />
            <circle cx="38" cy="27.5" r="2.1" fill="#1b1510" />
            <ellipse cx="22.5" cy="30.5" rx="2.2" ry="1.2" fill="#f79bb4" />
            <ellipse cx="41.5" cy="30.5" rx="2.2" ry="1.2" fill="#f79bb4" />
            <path d="M29.5 32 Q32 34.5 34.5 32" stroke="#1b1510" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>
        )}
      </g>
    </svg>
  );
}

export function HousePiece({ size = 24, className = '' }: PieceProps) {
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`piece-3d-shadow ${className}`}
      role="img"
      aria-label="บ้านสีชมพู"
    >
      <defs>
        <linearGradient id={`${uid}-roof`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffaad4" />
          <stop offset="50%" stopColor="#ef5da8" />
          <stop offset="100%" stopColor="#b8236c" />
        </linearGradient>
        <linearGradient id={`${uid}-front`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff88c3" />
          <stop offset="100%" stopColor="#d93884" />
        </linearGradient>
        <linearGradient id={`${uid}-side`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c42b73" />
          <stop offset="100%" stopColor="#87144b" />
        </linearGradient>
      </defs>

      {/* Grounded tabletop shadow */}
      <polygon points="5,35 25,41 41,32 21,27" fill="#180710" opacity="0.46" />
      {/* Extruded base plinth */}
      <polygon points="7,33 24,37.5 37,31 37,33.5 24,40 7,35.5" fill="#630d36" />

      {/* Side gable wall (with triangular peak) */}
      <polygon
        points="24,20 31,10 37,17 37,31 24,37.5"
        fill={`url(#${uid}-side)`}
        stroke="#520b2d"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Front wall */}
      <polygon
        points="7,17 24,20 24,37.5 7,33"
        fill={`url(#${uid}-front)`}
        stroke="#520b2d"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Chimney */}
      <polygon points="27,9 30,8 30,13 27,14" fill="#d93884" stroke="#520b2d" strokeWidth="0.9" />
      {/* Steep pitched roof with overhang eaves */}
      <polygon
        points="15,6 31,10 24,20 4,17"
        fill={`url(#${uid}-roof)`}
        stroke="#520b2d"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <polygon points="15,6 24,20 4,17" fill="#ffc2e0" opacity="0.48" />
      <polygon points="31,10 39,17.5 37,18.5 31,11.5" fill="#991a56" />

      {/* Front arched door & porch step */}
      <path d="M13 34.5 L13 26 C13 24 18 24.8 18 27 L18 35.8 Z" fill="#6b103b" stroke="#ffd6ea" strokeWidth="0.6" />
      <polygon points="12,34.5 19,36.2 17,37.5 10,35.6" fill="#ffd6ea" opacity="0.7" />
      {/* Lit warm windows on front & side gable */}
      <rect x="8.5" y="21.5" width="3.3" height="4.2" rx="0.4" fill="#fff3b0" stroke="#751341" strokeWidth="0.7" />
      <rect x="19.5" y="23.2" width="3.2" height="4.2" rx="0.4" fill="#fff3b0" stroke="#751341" strokeWidth="0.7" />
      <polygon points="27,22 30.5,20.5 30.5,25.5 27,27" fill="#ffe896" stroke="#751341" strokeWidth="0.7" />
      <polygon points="32,19.8 35,18.5 35,23.5 32,24.8" fill="#ffe896" stroke="#751341" strokeWidth="0.7" />
    </svg>
  );
}

export function HotelPiece({ size = 28, className = '' }: PieceProps) {
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`piece-3d-shadow ${className}`}
      role="img"
      aria-label="โรงแรมสีส้ม"
    >
      <defs>
        <linearGradient id={`${uid}-roof`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffc080" />
          <stop offset="50%" stopColor="#ff6b1a" />
          <stop offset="100%" stopColor="#bf3b00" />
        </linearGradient>
        <linearGradient id={`${uid}-front`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff8c47" />
          <stop offset="100%" stopColor="#d94e06" />
        </linearGradient>
        <linearGradient id={`${uid}-side`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c44200" />
          <stop offset="100%" stopColor="#822700" />
        </linearGradient>
      </defs>

      {/* Grounded tabletop shadow */}
      <polygon points="4,39 28,45.5 45,35 21,29" fill="#1b0c04" opacity="0.5" />
      {/* Extruded base plinth */}
      <polygon points="6,36 28,41 42,33.5 42,36 28,43.5 6,38.5" fill="#631e00" />

      {/* Side gable/wing wall */}
      <polygon
        points="28,18 35,9 42,15 42,33.5 28,41"
        fill={`url(#${uid}-side)`}
        stroke="#571900"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Grand 2-story front facade */}
      <polygon
        points="6,15 28,18 28,41 6,36"
        fill={`url(#${uid}-front)`}
        stroke="#571900"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Stepped pitched roof */}
      <polygon
        points="16,5 35,9 28,18 4,15"
        fill={`url(#${uid}-roof)`}
        stroke="#571900"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <polygon points="16,5 28,18 4,15" fill="#ffd2a6" opacity="0.52" />
      {/* Twin chimneys */}
      <rect x="13" y="4" width="3.6" height="4.2" rx="0.6" fill="#ff7d33" stroke="#571900" strokeWidth="1" />
      <rect x="28" y="4.5" width="3.6" height="4.2" rx="0.6" fill="#d94e06" stroke="#571900" strokeWidth="1" />

      {/* 2-story warm lit hotel windows on front & side */}
      {[19.5, 26].map((y, row) => (
        <g key={row}>
          <rect x="8.5" y={y} width="3.5" height="4" rx="0.4" fill="#fff3b0" stroke="#752300" strokeWidth="0.6" />
          <rect x="15" y={y + 0.7} width="3.5" height="4" rx="0.4" fill="#fff3b0" stroke="#752300" strokeWidth="0.6" />
          <rect x="21.5" y={y + 1.4} width="3.5" height="4" rx="0.4" fill="#fff3b0" stroke="#752300" strokeWidth="0.6" />
          <polygon
            points={`30.5,${y + 2} 34,${y + 0.4} 34,${y + 4.8} 30.5,${y + 6.4}`}
            fill="#ffe896"
            stroke="#752300"
            strokeWidth="0.6"
          />
          <polygon
            points={`36,${y - 0.5} 39.5,${y - 2} 39.5,${y + 2.4} 36,${y + 3.9}`}
            fill="#ffe896"
            stroke="#752300"
            strokeWidth="0.6"
          />
        </g>
      ))}

      {/* Grand arched lobby entrance & awning */}
      <path d="M13.5 37.5 L13.5 31.5 C13.5 29.3 20 30.2 20 32.5 L20 39.2 Z" fill="#631e00" stroke="#ffd2a6" strokeWidth="0.7" />
      <polygon points="12,30 22,31.5 23,33.5 11,32" fill="#ffe18c" stroke="#571900" strokeWidth="0.8" />
    </svg>
  );
}

export function BankerAvatar({ size = 48, className = '' }: BankerAvatarProps) {
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="นายธนาคาร ซุปเปอร์เศรษฐี"
    >
      <defs>
        <radialGradient id={`${uid}-bg`} cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fae7a5" />
          <stop offset="65%" stopColor="#e3be3b" />
          <stop offset="100%" stopColor="#b88d1a" />
        </radialGradient>
        <linearGradient id={`${uid}-suit`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2f3b4c" />
          <stop offset="100%" stopColor="#141a24" />
        </linearGradient>
        <linearGradient id={`${uid}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff4bd" />
          <stop offset="50%" stopColor="#e3b739" />
          <stop offset="100%" stopColor="#8c630f" />
        </linearGradient>
      </defs>

      {/* Outer medallion ring */}
      <circle cx="40" cy="40" r="38" fill={`url(#${uid}-bg)`} stroke={`url(#${uid}-gold)`} strokeWidth="3.5" />
      <circle cx="40" cy="40" r="34.5" stroke="#5c4209" strokeWidth="1" opacity="0.45" />

      {/* Clip inside circle */}
      <clipPath id={`${uid}-clip`}>
        <circle cx="40" cy="40" r="34" />
      </clipPath>

      <g clipPath={`url(#${uid}-clip)`}>
        {/* Shoulders & tailored suit */}
        <path
          d="M10 80 C12 61 23 55 40 55 C57 55 68 61 70 80 Z"
          fill={`url(#${uid}-suit)`}
          stroke="#0c1017"
          strokeWidth="1.5"
        />
        {/* Crisp white shirt V */}
        <polygon points="31,55 49,55 40,76" fill="#fcfaf2" />
        {/* Suit lapels */}
        <polygon points="31,55 24,62 35,73" fill="#1d2633" stroke="#0f141c" strokeWidth="1" />
        <polygon points="49,55 56,62 45,73" fill="#1d2633" stroke="#0f141c" strokeWidth="1" />
        {/* Gold Baht lapel pin */}
        <circle cx="51" cy="66" r="2.6" fill={`url(#${uid}-gold)`} stroke="#5c4209" strokeWidth="0.7" />
        {/* Neck */}
        <rect x="34.5" y="47" width="11" height="10" rx="4" fill="#efc39d" />
        {/* Crimson Bow-Tie */}
        <polygon points="40,57 30,52.5 30,61.5" fill="#c8232c" stroke="#751016" strokeWidth="1" />
        <polygon points="40,57 50,52.5 50,61.5" fill="#c8232c" stroke="#751016" strokeWidth="1" />
        <rect x="37.5" y="54.5" width="5" height="5" rx="1.5" fill="#e0343d" stroke="#751016" strokeWidth="0.9" />

        {/* Friendly Robot/Banker Ear Dials */}
        <rect x="20" y="30" width="5" height="11" rx="2.5" fill={`url(#${uid}-gold)`} stroke="#3c2b08" strokeWidth="1.1" />
        <rect x="55" y="30" width="5" height="11" rx="2.5" fill={`url(#${uid}-gold)`} stroke="#3c2b08" strokeWidth="1.1" />

        {/* Head */}
        <rect x="24" y="19" width="32" height="31" rx="14" fill="#f7d3b3" stroke="#362417" strokeWidth="1.6" />
        {/* Neat parted hair */}
        <path
          d="M23 29 C23 17 31 13 41 13 C50 13 57 18 57 29 C53 23 47 22 42 24 C36 21 29 22 23 29 Z"
          fill="#26211e"
          stroke="#120f0d"
          strokeWidth="1.2"
        />
        {/* Antenna/tophat crest accent */}
        <circle cx="40" cy="11.5" r="2.2" fill={`url(#${uid}-gold)`} stroke="#3c2b08" strokeWidth="0.9" />

        {/* Warm eyebrows */}
        <path d="M29 29 Q33 27 36 29" stroke="#26211e" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M44 29 Q47 27 51 29" stroke="#26211e" strokeWidth="1.6" strokeLinecap="round" />

        {/* Spectacles & friendly eyes */}
        <circle cx="33" cy="34.5" r="5" fill="#ffffff" fillOpacity="0.4" stroke={`url(#${uid}-gold)`} strokeWidth="1.6" />
        <circle cx="47" cy="34.5" r="5" fill="#ffffff" fillOpacity="0.4" stroke={`url(#${uid}-gold)`} strokeWidth="1.6" />
        <line x1="38" y1="34.5" x2="42" y2="34.5" stroke="#8c630f" strokeWidth="1.4" />
        <circle cx="33" cy="34.5" r="2.1" fill="#1e1b18" />
        <circle cx="47" cy="34.5" r="2.1" fill="#1e1b18" />
        <circle cx="33.7" cy="33.8" r="0.7" fill="#ffffff" />
        <circle cx="47.7" cy="33.8" r="0.7" fill="#ffffff" />

        {/* Dapper smile & cheeks */}
        <circle cx="28" cy="39.5" r="2.2" fill="#e88a78" opacity="0.45" />
        <circle cx="52" cy="39.5" r="2.2" fill="#e88a78" opacity="0.45" />
        <path d="M34.5 42.5 Q40 46.5 45.5 42.5" stroke="#422618" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

const DICE_PIP_COORDS: Record<DiceValue, ReadonlyArray<readonly [number, number]>> = {
  1: [[28, 26]],
  2: [
    [18, 16],
    [38, 36],
  ],
  3: [
    [18, 16],
    [28, 26],
    [38, 36],
  ],
  4: [
    [18, 16],
    [38, 16],
    [18, 36],
    [38, 36],
  ],
  5: [
    [18, 16],
    [38, 16],
    [28, 26],
    [18, 36],
    [38, 36],
  ],
  6: [
    [18, 15],
    [38, 15],
    [18, 26],
    [38, 26],
    [18, 37],
    [38, 37],
  ],
};

export function Dice3D({ value, rolling = false, size = 44, className = '' }: Dice3DProps) {
  const uid = useId().replace(/:/g, '');
  const pips = DICE_PIP_COORDS[value] ?? DICE_PIP_COORDS[1];
  const isOne = value === 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`piece-3d-shadow select-none ${rolling ? 'animate-dice-tumble' : ''} ${className}`}
      role="img"
      aria-label={`ลูกเต๋า ${value} แต้ม`}
    >
      <defs>
        <linearGradient id={`${uid}-face`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffdf7" />
          <stop offset="55%" stopColor="#f7eed9" />
          <stop offset="100%" stopColor="#dfd0b0" />
        </linearGradient>
        <linearGradient id={`${uid}-side`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d1be99" />
          <stop offset="100%" stopColor="#a38b62" />
        </linearGradient>
        <linearGradient id={`${uid}-bottom`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c4af87" />
          <stop offset="100%" stopColor="#8c744c" />
        </linearGradient>
      </defs>

      {/* Tabletop cast shadow */}
      <ellipse cx="33" cy="57" rx="23" ry="5" fill="#120c06" opacity="0.38" />

      {/* 3D extruded right & bottom cube bevels */}
      <path
        d="M50 8 L57 14 C58.5 15.5 59 17 59 20 L59 47 C59 52 55 56 50 56 L17 56 C14 56 12 55 10 53 L7 48 Z"
        fill={`url(#${uid}-side)`}
        stroke="#47361e"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M11 49 L49 49 L55 55 C53 56 51 56 49 56 L17 56 C14 56 12 55 10 53 Z"
        fill={`url(#${uid}-bottom)`}
      />

      {/* Top main beveled ivory die face */}
      <rect
        x="6"
        y="5"
        width="44"
        height="43"
        rx="9"
        fill={`url(#${uid}-face)`}
        stroke="#47361e"
        strokeWidth="1.5"
      />
      {/* Inner beveled highlight rim */}
      <rect
        x="8.5"
        y="7.5"
        width="39"
        height="38"
        rx="7"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        opacity="0.72"
      />

      {/* Recessed glossy pips */}
      {pips.map(([cx, cy], idx) => (
        <g key={idx}>
          <circle
            cx={cx}
            cy={cy}
            r={isOne ? 6.2 : 3.9}
            fill={isOne ? '#c8232c' : '#211c17'}
          />
          <circle
            cx={cx - (isOne ? 1.6 : 1)}
            cy={cy - (isOne ? 1.6 : 1)}
            r={isOne ? 1.7 : 1}
            fill="#ffffff"
            opacity="0.32"
          />
        </g>
      ))}
    </svg>
  );
}
