import { useId } from 'react';

export type BanknoteDenomination = 5000 | 1000 | 500 | 100 | 50 | 10;

export interface ThaiBanknoteProps {
  denomination: BanknoteDenomination;
  count?: number;
  compact?: boolean;
  className?: string;
}

interface DenominationStyle {
  thaiNum: string;
  paper: string;
  paperDeep: string;
  primary: string;
  dark: string;
  accent: string;
  label: string;
}

const DENOM_STYLES: Record<BanknoteDenomination, DenominationStyle> = {
  5000: {
    thaiNum: '๕๐๐๐',
    paper: '#fcf2d4',
    paperDeep: '#f3df9f',
    primary: '#c88719',
    dark: '#6e4305',
    accent: '#e6b23c',
    label: 'ห้าพันบาท',
  },
  1000: {
    thaiNum: '๑๐๐๐',
    paper: '#f2eff5',
    paperDeep: '#dfd9e6',
    primary: '#6b6275',
    dark: '#352f3b',
    accent: '#9c92a8',
    label: 'หนึ่งพันบาท',
  },
  500: {
    thaiNum: '๕๐๐',
    paper: '#f5eafb',
    paperDeep: '#e5cef3',
    primary: '#7938a1',
    dark: '#42185c',
    accent: '#a967d1',
    label: 'ห้าร้อยบาท',
  },
  100: {
    thaiNum: '๑๐๐',
    paper: '#fdebec',
    paperDeep: '#f6cdd0',
    primary: '#c22932',
    dark: '#6d1016',
    accent: '#e05a61',
    label: 'หนึ่งร้อยบาท',
  },
  50: {
    thaiNum: '๕๐',
    paper: '#e8f3fc',
    paperDeep: '#cbe2f7',
    primary: '#1f64a6',
    dark: '#0f3861',
    accent: '#4f92d1',
    label: 'ห้าสิบบาท',
  },
  10: {
    thaiNum: '๑๐',
    paper: '#e7f5ed',
    paperDeep: '#c7e8d5',
    primary: '#1e7544',
    dark: '#0d4023',
    accent: '#49a36f',
    label: 'สิบบาท',
  },
};

export function ThaiBanknote({
  denomination,
  count,
  compact = false,
  className = '',
}: ThaiBanknoteProps) {
  const uid = useId().replace(/:/g, '');
  const style = DENOM_STYLES[denomination];
  const hasStack = count !== undefined && count > 1;
  const isZero = count === 0;

  return (
    <div
      className={`relative inline-block select-none ${compact ? 'w-24' : 'w-44'} ${isZero ? 'opacity-45 grayscale-[30%]' : ''} ${className}`}
      role="img"
      aria-label={`ธนบัตร ${denomination} บาท${count !== undefined ? ` จำนวน ${count} ใบ` : ''}`}
    >
      {/* Subtle stacked paper edges when count > 1 */}
      {hasStack && (
        <>
          <div
            className="pointer-events-none absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-[4px] border border-black/25"
            style={{ backgroundColor: style.paperDeep }}
          />
          {count > 2 && (
            <div
              className="pointer-events-none absolute inset-0 translate-x-[1.5px] translate-y-[1.5px] rounded-[4px] border border-black/20"
              style={{ backgroundColor: style.paper }}
            />
          )}
        </>
      )}

      <svg
        viewBox="0 0 220 110"
        className="relative block h-auto w-full rounded-[4px] shadow-[0_2px_6px_rgba(0,0,0,0.28)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`${uid}-paper`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={style.paper} />
            <stop offset="60%" stopColor={style.paperDeep} />
            <stop offset="100%" stopColor={style.paper} />
          </linearGradient>
          <pattern id={`${uid}-guilloche`} width="16" height="16" patternUnits="userSpaceOnUse">
            <path
              d="M0 8 Q4 2 8 8 T16 8 M0 8 Q4 14 8 8 T16 8"
              fill="none"
              stroke={style.primary}
              strokeWidth="0.6"
              strokeOpacity="0.32"
            />
            <circle cx="8" cy="8" r="2.2" fill="none" stroke={style.accent} strokeWidth="0.45" strokeOpacity="0.28" />
          </pattern>
          <pattern id={`${uid}-wave`} width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="4.5" fill="none" stroke={style.primary} strokeWidth="0.55" strokeOpacity="0.24" />
            <circle cx="0" cy="0" r="4.5" fill="none" stroke={style.primary} strokeWidth="0.55" strokeOpacity="0.24" />
            <circle cx="12" cy="12" r="4.5" fill="none" stroke={style.primary} strokeWidth="0.55" strokeOpacity="0.24" />
          </pattern>
        </defs>

        {/* Paper base */}
        <rect x="0" y="0" width="220" height="110" rx="4" fill={`url(#${uid}-paper)`} />
        <rect x="0" y="0" width="220" height="110" rx="4" fill={`url(#${uid}-wave)`} />

        {/* Outer guilloche frame */}
        <rect
          x="4.5"
          y="4.5"
          width="211"
          height="101"
          rx="2.5"
          fill="none"
          stroke={style.primary}
          strokeWidth="2.4"
        />
        <rect
          x="8.5"
          y="8.5"
          width="203"
          height="93"
          rx="1.5"
          fill={`url(#${uid}-guilloche)`}
          stroke={style.dark}
          strokeWidth="0.9"
        />
        <rect x="13" y="13" width="194" height="84" rx="1" fill={style.paper} fillOpacity="0.72" stroke={style.primary} strokeWidth="0.8" />

        {/* Corner filigree medallions */}
        {[
          [23, 22],
          [197, 22],
          [23, 88],
          [197, 88],
        ].map(([cx, cy], idx) => (
          <g key={idx}>
            <circle cx={cx} cy={cy} r="10.5" fill={style.paperDeep} stroke={style.primary} strokeWidth="1.2" />
            <circle cx={cx} cy={cy} r="8.2" fill="none" stroke={style.dark} strokeWidth="0.5" strokeDasharray="1.8 1.2" />
          </g>
        ))}

        {/* Top-left & bottom-right Thai numerals; top-right & bottom-left Arabic numerals */}
        <text
          x="23"
          y="25.5"
          textAnchor="middle"
          fontSize={denomination >= 1000 ? '7.5' : '9'}
          fontWeight="700"
          fill={style.dark}
          fontFamily="var(--font-thai)"
        >
          {style.thaiNum}
        </text>
        <text
          x="197"
          y="25.5"
          textAnchor="middle"
          fontSize={denomination >= 1000 ? '7.5' : '9'}
          fontWeight="700"
          fill={style.dark}
          fontFamily="var(--font-mono)"
        >
          {denomination}
        </text>
        <text
          x="23"
          y="91.5"
          textAnchor="middle"
          fontSize={denomination >= 1000 ? '7.5' : '9'}
          fontWeight="700"
          fill={style.dark}
          fontFamily="var(--font-mono)"
        >
          {denomination}
        </text>
        <text
          x="197"
          y="91.5"
          textAnchor="middle"
          fontSize={denomination >= 1000 ? '7.5' : '9'}
          fontWeight="700"
          fill={style.dark}
          fontFamily="var(--font-thai)"
        >
          {style.thaiNum}
        </text>

        {/* Central decorative oval rosette */}
        <ellipse
          cx="110"
          cy="55"
          rx={compact ? 56 : 52}
          ry={compact ? 31 : 29}
          fill={style.paperDeep}
          stroke={style.primary}
          strokeWidth="1.6"
        />
        <ellipse
          cx="110"
          cy="55"
          rx={compact ? 52 : 48}
          ry={compact ? 27 : 25}
          fill={style.paper}
          stroke={style.dark}
          strokeWidth="0.7"
          strokeDasharray="2.5 1.5"
        />

        {/* Header & footer banners */}
        {!compact && (
          <>
            <text
              x="110"
              y="22.5"
              textAnchor="middle"
              fontSize="7.2"
              fontWeight="700"
              letterSpacing="0.5"
              fill={style.dark}
              fontFamily="var(--font-display)"
            >
              ซุปเปอร์เศรษฐี • ธนาคารกลาง
            </text>
            <text
              x="110"
              y="91.5"
              textAnchor="middle"
              fontSize="6.8"
              fontWeight="600"
              fill={style.dark}
              fontFamily="var(--font-thai)"
            >
              {style.label} • No. 9028
            </text>
          </>
        )}

        {/* Side serial marks */}
        {!compact && (
          <>
            <text
              x="38"
              y="58"
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={style.primary}
              opacity="0.75"
              fontFamily="var(--font-thai)"
            >
              ฿
            </text>
            <text
              x="182"
              y="58"
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={style.primary}
              opacity="0.75"
              fontFamily="var(--font-thai)"
            >
              ฿
            </text>
          </>
        )}

        {/* Bold center numeral */}
        <text
          x="110"
          y={compact ? '60' : '58'}
          textAnchor="middle"
          fontSize={compact ? (denomination >= 1000 ? '25' : '28') : denomination >= 1000 ? '23' : '26'}
          fontWeight="800"
          fill={style.dark}
          fontFamily="var(--font-mono)"
        >
          {denomination}
        </text>
        <text
          x="110"
          y={compact ? '75' : '73'}
          textAnchor="middle"
          fontSize={compact ? '10' : '9'}
          fontWeight="700"
          fill={style.primary}
          fontFamily="var(--font-thai)"
        >
          {style.thaiNum} บาท
        </text>
      </svg>

      {/* Optional banknote count badge */}
      {count !== undefined && (
        <span
          className="mono-num absolute -top-1.5 -right-1.5 inline-flex items-center justify-center rounded-full border border-amber-200/70 bg-stone-900 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-100 shadow-sm"
        >
          ×{count}
        </span>
      )}
    </div>
  );
}
