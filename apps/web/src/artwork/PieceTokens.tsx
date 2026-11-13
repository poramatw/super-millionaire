import { useId } from 'react';

export const TOKEN_NAMES = [
  'รถคลาสสิก',
  'เรือสำเภา',
  'ช้างศึก',
  'ตุ๊กตุ๊ก',
  'หมวกเศรษฐี',
  'ถุงทอง',
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
  const idx = ((Math.trunc(tokenId) % 6) + 6) % 6;

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
        /* 0: รถคลาสสิก (Classic Vintage Roadster) */
        <g>
          {/* Rear & front chassis body */}
          <path
            d="M8 38 C8 32 13 28 19 27 L24 20 C26 18 39 18 43 22 L49 28 C55 29 58 33 58 38 L57 44 C57 46 54 47 51 47 L13 47 C10 47 8 45 8 43 Z"
            fill={color}
            stroke="#1b1510"
            strokeWidth="2"
          />
          <path
            d="M8 38 C8 32 13 28 19 27 L24 20 C26 18 39 18 43 22 L49 28 C55 29 58 33 58 38 L57 44 C57 46 54 47 51 47 L13 47 C10 47 8 45 8 43 Z"
            fill={`url(#${uid}-sheen)`}
          />
          {/* Windshield & interior */}
          <path
            d="M23 28 L27 21 L41 21 L45 28 Z"
            fill="#d9f0fa"
            stroke="#1b1510"
            strokeWidth="1.6"
          />
          <path d="M27 22 L31 22 L28 27 L25 27 Z" fill="#ffffff" opacity="0.65" />
          {/* Hood louver & chrome trim strip */}
          <path d="M12 37 L53 37" stroke="#fff7d6" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="51" y="32" width="5" height="9" rx="2" fill={`url(#${uid}-metal)`} stroke="#1b1510" strokeWidth="1.2" />
          {/* Headlight & bumper */}
          <circle cx="55" cy="34" r="3" fill="#fff8c8" stroke="#1b1510" strokeWidth="1.2" />
          <rect x="6" y="42" width="52" height="3.5" rx="1.75" fill="#e5e0d5" stroke="#1b1510" strokeWidth="1.2" />
          {/* Wheels */}
          <g>
            <circle cx="19" cy="46" r="7.2" fill="#231f1c" stroke="#120e0a" strokeWidth="1.5" />
            <circle cx="19" cy="46" r="4.3" fill="#f5efe0" />
            <circle cx="19" cy="46" r="2.2" fill={`url(#${uid}-metal)`} />
            <circle cx="45" cy="46" r="7.2" fill="#231f1c" stroke="#120e0a" strokeWidth="1.5" />
            <circle cx="45" cy="46" r="4.3" fill="#f5efe0" />
            <circle cx="45" cy="46" r="2.2" fill={`url(#${uid}-metal)`} />
          </g>
        </g>
      )}

      {idx === 1 && (
        /* 1: เรือสำเภา (Royal Thai-Chinese Junk / Galleon) */
        <g>
          {/* Main & fore masts */}
          <line x1="33" y1="9" x2="33" y2="43" stroke="#3b2613" strokeWidth="2.6" strokeLinecap="round" />
          <line x1="20" y1="16" x2="20" y2="43" stroke="#3b2613" strokeWidth="2.1" strokeLinecap="round" />
          {/* Rear sail */}
          <path
            d="M21 17 C27 16 31 18 32 22 C31 28 30 33 29 36 L16 35 C17 29 19 22 21 17 Z"
            fill="#faf1d6"
            stroke="#1b1510"
            strokeWidth="1.5"
          />
          {/* Main billowing junk sail */}
          <path
            d="M34 11 C44 12 51 17 52 25 C50 32 48 36 45 38 L31 37 C32 28 33 19 34 11 Z"
            fill={color}
            stroke="#1b1510"
            strokeWidth="1.8"
          />
          <path
            d="M34 11 C44 12 51 17 52 25 C50 32 48 36 45 38 L31 37 C32 28 33 19 34 11 Z"
            fill={`url(#${uid}-sheen)`}
          />
          {/* Sail battens */}
          <path d="M33 18 L49 19 M32 25 L51 26 M32 32 L48 33" stroke="#3b2613" strokeWidth="1.2" opacity="0.7" />
          {/* Pennant flag */}
          <path d="M33 9 L42 11 L33 13 Z" fill={`url(#${uid}-metal)`} stroke="#1b1510" strokeWidth="1" />
          {/* Hull */}
          <path
            d="M9 37 C17 40 43 40 55 34 L50 49 C45 52 20 52 14 48 Z"
            fill={color}
            stroke="#1b1510"
            strokeWidth="2"
          />
          <path
            d="M9 37 C17 40 43 40 55 34 L50 49 C45 52 20 52 14 48 Z"
            fill={`url(#${uid}-sheen)`}
          />
          <path d="M12 42 C24 44 42 43 52 39" stroke={`url(#${uid}-metal)`} strokeWidth="2.2" fill="none" />
          {/* Portholes */}
          <circle cx="23" cy="46" r="1.7" fill="#fff7d6" stroke="#1b1510" strokeWidth="0.9" />
          <circle cx="32" cy="46" r="1.7" fill="#fff7d6" stroke="#1b1510" strokeWidth="0.9" />
          <circle cx="41" cy="45.5" r="1.7" fill="#fff7d6" stroke="#1b1510" strokeWidth="0.9" />
        </g>
      )}

      {idx === 2 && (
        /* 2: ช้างศึก (Royal War Elephant) */
        <g>
          {/* Tail */}
          <path d="M14 33 C10 35 10 41 12 44" stroke="#1b1510" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          {/* Elephant body + legs + raised trunk */}
          <path
            d="M15 35 C14 25 22 19 34 20 C43 20 49 24 50 31 C53 31 56 26 55 21 C57 20 59 22 59 26 C59 33 54 37 49 36 L47 41 L47 52 L40 52 L40 43 L27 43 L27 52 L20 52 L19 42 L15 41 Z"
            fill={color}
            stroke="#1b1510"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M15 35 C14 25 22 19 34 20 C43 20 49 24 50 31 C53 31 56 26 55 21 C57 20 59 22 59 26 C59 33 54 37 49 36 L47 41 L47 52 L40 52 L40 43 L27 43 L27 52 L20 52 L19 42 L15 41 Z"
            fill={`url(#${uid}-sheen)`}
          />
          {/* Ear */}
          <path
            d="M38 23 C33 23 32 32 37 35 C41 36 44 31 43 26 Z"
            fill={color}
            stroke="#1b1510"
            strokeWidth="1.5"
          />
          <path
            d="M38 23 C33 23 32 32 37 35 C41 36 44 31 43 26 Z"
            fill="#000000"
            opacity="0.16"
          />
          {/* Royal golden saddle cloth */}
          <path
            d="M21 23 C25 20 32 20 35 23 L34 34 L20 34 Z"
            fill="#c8232c"
            stroke={`url(#${uid}-metal)`}
            strokeWidth="2"
          />
          <circle cx="27.5" cy="27.5" r="2.3" fill={`url(#${uid}-metal)`} />
          {/* Ivory tusk */}
          <path
            d="M47 33 C51 35 55 34 57 30 C54 32 51 32 48 31 Z"
            fill="#fff9ea"
            stroke="#1b1510"
            strokeWidth="1.2"
          />
          {/* Eye */}
          <circle cx="46.5" cy="26" r="1.5" fill="#1b1510" />
          <circle cx="46.9" cy="25.6" r="0.5" fill="#ffffff" />
        </g>
      )}

      {idx === 3 && (
        /* 3: ตุ๊กตุ๊ก (Bangkok Tuk-Tuk) */
        <g>
          {/* Rear canopy support & passenger cabin */}
          <path
            d="M13 21 C18 16 36 16 42 20 L40 31 L14 31 Z"
            fill="#fff6dc"
            stroke="#1b1510"
            strokeWidth="1.8"
          />
          {/* Red-blue-white Thai roof stripes */}
          <path d="M16 19 C22 17 34 17 39 19" stroke="#c8232c" strokeWidth="2.4" fill="none" />
          <path d="M15 22 L40 22" stroke="#1c4e8a" strokeWidth="2" />
          {/* Cabin lower body */}
          <path
            d="M12 31 L42 31 L47 26 L53 33 L52 46 L11 46 Z"
            fill={color}
            stroke="#1b1510"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M12 31 L42 31 L47 26 L53 33 L52 46 L11 46 Z"
            fill={`url(#${uid}-sheen)`}
          />
          {/* Front windshield & grille */}
          <path d="M40 21 L47 26 L41 31 L39 21 Z" fill="#d9f0fa" stroke="#1b1510" strokeWidth="1.4" />
          <circle cx="51.5" cy="36.5" r="2.8" fill="#fff7b8" stroke="#1b1510" strokeWidth="1.3" />
          <rect x="47" y="40" width="4.5" height="4" rx="1" fill={`url(#${uid}-metal)`} stroke="#1b1510" strokeWidth="1" />
          {/* Bench seat & trim */}
          <rect x="17" y="33" width="15" height="6" rx="1.5" fill="#3a281d" stroke="#1b1510" strokeWidth="1.1" />
          {/* Wheels */}
          <circle cx="19" cy="47" r="6.8" fill="#231f1c" stroke="#120e0a" strokeWidth="1.5" />
          <circle cx="19" cy="47" r="3.2" fill="#e8e2d5" />
          <circle cx="46" cy="47" r="6.8" fill="#231f1c" stroke="#120e0a" strokeWidth="1.5" />
          <circle cx="46" cy="47" r="3.2" fill="#e8e2d5" />
        </g>
      )}

      {idx === 4 && (
        /* 4: หมวกเศรษฐี (Millionaire Top Hat) */
        <g>
          {/* Crown */}
          <path
            d="M19 16 C23 13 41 13 45 16 L47 41 L17 41 Z"
            fill={color}
            stroke="#1b1510"
            strokeWidth="2"
          />
          <path
            d="M19 16 C23 13 41 13 45 16 L47 41 L17 41 Z"
            fill={`url(#${uid}-sheen)`}
          />
          {/* Top ellipse */}
          <ellipse cx="32" cy="15.5" rx="13" ry="3.6" fill={color} stroke="#1b1510" strokeWidth="1.8" />
          <ellipse cx="32" cy="15.5" rx="12" ry="2.8" fill="#ffffff" opacity="0.22" />
          {/* Satin ribbon band + gold buckle */}
          <path d="M17.5 34 C25 36.5 39 36.5 46.5 34 L47 40.5 C39 43 25 43 17 40.5 Z" fill="#1b1510" />
          <rect x="28.5" y="35" width="7" height="5.5" rx="1.2" fill={`url(#${uid}-metal)`} stroke="#1b1510" strokeWidth="1" />
          {/* Curled brim */}
          <path
            d="M9 41 C13 46 51 46 55 41 C56 44 50 51 32 51 C14 51 8 44 9 41 Z"
            fill={color}
            stroke="#1b1510"
            strokeWidth="2"
          />
          <path
            d="M10 42 C18 46.5 46 46.5 54 42"
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeOpacity="0.45"
            fill="none"
          />
        </g>
      )}

      {idx === 5 && (
        /* 5: ถุงทอง (Plump Tied Gold Money Bag) */
        <g>
          {/* Ruffled bag top */}
          <path
            d="M23 12 L28 15 L32 10 L36 15 L41 12 L38 22 L26 22 Z"
            fill={color}
            stroke="#1b1510"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Plump bag pouch */}
          <path
            d="M25 22 C16 28 12 37 14 45 C16 51 23 53 32 53 C41 53 48 51 50 45 C52 37 48 28 39 22 Z"
            fill={color}
            stroke="#1b1510"
            strokeWidth="2"
          />
          <path
            d="M25 22 C16 28 12 37 14 45 C16 51 23 53 32 53 C41 53 48 51 50 45 C52 37 48 28 39 22 Z"
            fill={`url(#${uid}-sheen)`}
          />
          {/* Rope tie */}
          <rect x="24.5" y="20.5" width="15" height="4.2" rx="2" fill={`url(#${uid}-metal)`} stroke="#1b1510" strokeWidth="1.3" />
          {/* Embossed Baht crest */}
          <circle cx="32" cy="38" r="9.5" fill={`url(#${uid}-metal)`} stroke="#1b1510" strokeWidth="1.3" />
          <text
            x="32"
            y="42.5"
            textAnchor="middle"
            fontSize="13.5"
            fontWeight="800"
            fill="#2b1c08"
            fontFamily="var(--font-display)"
          >
            ฿
          </text>
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
