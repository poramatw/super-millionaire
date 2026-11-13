import { useId } from 'react';
import { renderCornerTile, renderSpecialDeckTile } from './tiles/CornerAndDeckTiles';
import { renderHotelUtilityTaxTile } from './tiles/HotelUtilityTaxTiles';
import { renderProvinceSouthCenter } from './tiles/ProvincesSouthCenter';
import { renderProvinceGulfNorth } from './tiles/ProvincesGulfNorth';
import { renderProvinceIsanBangkok } from './tiles/ProvincesIsanBangkok';

export interface TileIllustrationProps {
  tileIndex: number;
  className?: string;
}

const TILE_LABELS: Record<number, string> = {
  0: 'จุดเริ่มต้น',
  1: 'กรุงเทพฯ',
  2: 'หีบสมบัติ',
  3: 'นครปฐม',
  4: 'โรงแรมเซ็นทรัล',
  5: 'โรงแรมการ์เด้น',
  6: 'ตลาดโบ๊เบ๊',
  7: 'ประตูดวง',
  8: 'เยาวราช',
  9: 'จันทบุรี',
  10: 'เข้าคุก',
  11: 'กาญจนบุรี',
  12: 'การไฟฟ้า',
  13: 'ระนอง',
  14: 'สุโขทัย',
  15: 'โรงแรมอินทรา',
  16: 'ภูเก็ต',
  17: 'หีบสมบัติ',
  18: 'สุราษฎร์ธานี',
  19: 'สงขลา',
  20: 'แวะพักผ่อนคนจน',
  21: 'เพชรบุรี',
  22: 'ประตูดวง',
  23: 'เชียงใหม่',
  24: 'เชียงราย',
  25: 'โรงแรมแกรนด์คอนติเนนตัล',
  26: 'แม่ฮ่องสอน',
  27: 'ลำปาง',
  28: 'การประปา',
  29: 'โคราช',
  30: 'ไปติดคุก',
  31: 'ศรีสะเกษ',
  32: 'สุรินทร์',
  33: 'หีบสมบัติ',
  34: 'อุบลราชธานี',
  35: 'โรงแรมโนโวเทล',
  36: 'ประตูดวง',
  37: 'ดอนเมือง',
  38: 'จ่ายภาษี',
  39: 'เสาชิงช้า',
};

const CORNER_INDICES = new Set([0, 10, 20, 30]);

export function TileIllustration({ tileIndex, className = '' }: TileIllustrationProps) {
  const uid = useId().replace(/:/g, '');
  const isCorner = CORNER_INDICES.has(tileIndex);
  const viewBox = isCorner ? '0 0 120 120' : '0 0 120 96';

  const artwork =
    renderCornerTile(tileIndex, uid) ??
    renderSpecialDeckTile(tileIndex, uid) ??
    renderHotelUtilityTaxTile(tileIndex, uid) ??
    renderProvinceSouthCenter(tileIndex, uid) ??
    renderProvinceGulfNorth(tileIndex, uid) ??
    renderProvinceIsanBangkok(tileIndex, uid);

  return (
    <svg
      viewBox={viewBox}
      className={`block h-full w-full overflow-hidden select-none ${className}`}
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={TILE_LABELS[tileIndex] ?? `ช่องที่ ${tileIndex}`}
    >
      {artwork ?? (
        <g>
          <rect width="120" height={isCorner ? 120 : 96} fill="#efe1b8" />
          <text
            x="60"
            y={isCorner ? 64 : 52}
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill="#5e4318"
            fontFamily="var(--font-mono)"
          >
            #{tileIndex}
          </text>
        </g>
      )}
    </svg>
  );
}
