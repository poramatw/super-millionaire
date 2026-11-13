import {
  BOARD_IMAGE_HEIGHT,
  BOARD_IMAGE_URL,
  BOARD_IMAGE_WIDTH,
  getTileRect,
} from './board9028Coords';

export interface OriginalTileCropProps {
  tileIndex: number;
  className?: string;
}

export function OriginalTileCrop({ tileIndex, className = '' }: OriginalTileCropProps) {
  const rect = getTileRect(tileIndex);

  if (!rect) {
    return (
      <div
        className={`flex items-center justify-center rounded border border-stone-400 bg-amber-50 font-mono text-xs font-bold text-stone-700 ${className}`}
      >
        #{tileIndex}
      </div>
    );
  }

  const { pixelBounds, uprightRotateDeg } = rect;
  const { x, y, width, height } = pixelBounds;
  const cx = x + width / 2;
  const cy = y + height / 2;

  const isRotatedQuarter = uprightRotateDeg === 90 || uprightRotateDeg === -90;
  const vw = isRotatedQuarter ? height : width;
  const vh = isRotatedQuarter ? width : height;

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      style={{ aspectRatio: `${vw} / ${vh}` }}
      className={`block h-full w-full overflow-hidden select-none ${className}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`ภาพช่องที่ ${tileIndex} จากกระดานซุปเปอร์เศรษฐี No. 9028`}
    >
      <g transform={`translate(${vw / 2}, ${vh / 2}) rotate(${uprightRotateDeg}) translate(${-cx}, ${-cy})`}>
        <image
          href={BOARD_IMAGE_URL}
          x={0}
          y={0}
          width={BOARD_IMAGE_WIDTH}
          height={BOARD_IMAGE_HEIGHT}
          preserveAspectRatio="none"
        />
      </g>
    </svg>
  );
}
