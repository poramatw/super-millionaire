export const BOARD_IMAGE_URL = '/assets/board-9028.jpg';
export const BOARD_IMAGE_WIDTH = 2094;
export const BOARD_IMAGE_HEIGHT = 2036;
export const BOARD_ASPECT = BOARD_IMAGE_WIDTH / BOARD_IMAGE_HEIGHT;

export type TileSide = 'corner' | 'bottom' | 'left' | 'top' | 'right';
export type HouseBarPosition = 'top' | 'right' | 'bottom' | 'left' | 'none';
export type UprightRotationDeg = 0 | -90 | 180 | 90;

export interface TilePixelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TileRect {
  tileIndex: number;
  side: TileSide;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  centerXPct: number;
  centerYPct: number;
  uprightRotateDeg: UprightRotationDeg;
  houseBarPosition: HouseBarPosition;
  pixelBounds: TilePixelBounds;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function makeRect(
  tileIndex: number,
  side: TileSide,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  uprightRotateDeg: UprightRotationDeg,
  houseBarPosition: HouseBarPosition,
): TileRect {
  const width = x2 - x1;
  const height = y2 - y1;
  const leftPct = round2((x1 / BOARD_IMAGE_WIDTH) * 100);
  const topPct = round2((y1 / BOARD_IMAGE_HEIGHT) * 100);
  const widthPct = round2((width / BOARD_IMAGE_WIDTH) * 100);
  const heightPct = round2((height / BOARD_IMAGE_HEIGHT) * 100);
  return {
    tileIndex,
    side,
    leftPct,
    topPct,
    widthPct,
    heightPct,
    centerXPct: round2(((x1 + width / 2) / BOARD_IMAGE_WIDTH) * 100),
    centerYPct: round2(((y1 + height / 2) / BOARD_IMAGE_HEIGHT) * 100),
    uprightRotateDeg,
    houseBarPosition,
    pixelBounds: {
      x: Math.round(x1),
      y: Math.round(y1),
      width: Math.round(width),
      height: Math.round(height),
    },
  };
}

/**
 * Measured divider coordinates on `apps/web/public/assets/board-9028.jpg` (2094 x 2036):
 * Outer black border: left=59, right=2035, top=39, bottom=2000
 * Inner yellow square: left=364..372, right=1734..1739, top=338..349, bottom=1680..1685
 */
const OUTER_LEFT = 59;
const OUTER_RIGHT = 2035;
const OUTER_TOP = 39;
const OUTER_BOTTOM = 2000;

// Bottom row dividers (left-to-right between x=372 and x=1736.5; tiles 9..1)
const BOT_X = [372, 524, 678, 828, 978, 1133, 1281, 1436, 1588, 1736.5] as const;
const BOT_TOP = 1684;

// Left column dividers (top-to-bottom between y=338.5 and y=1682; tiles 19..11)
const LEFT_Y = [338.5, 489, 643, 789, 941, 1088, 1236, 1390, 1542, 1682] as const;
const LEFT_RIGHT = 368;

// Top row dividers (left-to-right between x=374 and x=1739; tiles 21..29)
const TOP_X = [374, 527, 676, 829, 983, 1133, 1284, 1437, 1587, 1739] as const;
const TOP_BOTTOM = 342;

// Right column dividers (top-to-bottom between y=349 and y=1685; tiles 31..39)
const RIGHT_Y = [349, 500, 649, 790, 941, 1094, 1236, 1387, 1534, 1685] as const;
const RIGHT_LEFT = 1736;

export const BOARD_9028_RECTS: TileRect[] = [
  // 0: Bottom-right corner (จุดเริ่มต้น START)
  makeRect(0, 'corner', BOT_X[9], BOT_TOP, OUTER_RIGHT, OUTER_BOTTOM, 0, 'none'),

  // 1..9: Bottom row right-to-left (กรุงเทพฯ .. จันทบุรี)
  ...Array.from({ length: 9 }, (_, i) => {
    const tileIndex = i + 1;
    const seg = 8 - i; // tile 1 is rightmost segment [8..9], tile 9 is leftmost segment [0..1]
    return makeRect(
      tileIndex,
      'bottom',
      BOT_X[seg],
      BOT_TOP,
      BOT_X[seg + 1],
      OUTER_BOTTOM,
      0,
      'top',
    );
  }),

  // 10: Bottom-left corner (เข้าคุก)
  makeRect(10, 'corner', OUTER_LEFT, LEFT_Y[9], BOT_X[0], OUTER_BOTTOM, 0, 'none'),

  // 11..19: Left column bottom-to-top (กาญจนบุรี .. สงขลา)
  ...Array.from({ length: 9 }, (_, i) => {
    const tileIndex = 11 + i;
    const seg = 8 - i; // tile 11 is bottommost segment [8..9], tile 19 is topmost segment [0..1]
    return makeRect(
      tileIndex,
      'left',
      OUTER_LEFT,
      LEFT_Y[seg],
      LEFT_RIGHT,
      LEFT_Y[seg + 1],
      -90,
      'right',
    );
  }),

  // 20: Top-left corner (แวะพักผ่อนคนจน)
  makeRect(20, 'corner', OUTER_LEFT, OUTER_TOP, TOP_X[0], TOP_BOTTOM, 0, 'none'),

  // 21..29: Top row left-to-right (เพชรบุรี .. โคราช)
  ...Array.from({ length: 9 }, (_, i) => {
    const tileIndex = 21 + i;
    return makeRect(
      tileIndex,
      'top',
      TOP_X[i],
      OUTER_TOP,
      TOP_X[i + 1],
      TOP_BOTTOM,
      180,
      'bottom',
    );
  }),

  // 30: Top-right corner (ไปติดคุก)
  makeRect(30, 'corner', TOP_X[9], OUTER_TOP, OUTER_RIGHT, RIGHT_Y[0], 0, 'none'),

  // 31..39: Right column top-to-bottom (ศรีสะเกษ .. เสาชิงช้า)
  ...Array.from({ length: 9 }, (_, i) => {
    const tileIndex = 31 + i;
    return makeRect(
      tileIndex,
      'right',
      RIGHT_LEFT,
      RIGHT_Y[i],
      OUTER_RIGHT,
      RIGHT_Y[i + 1],
      90,
      'left',
    );
  }),
];

export const BOARD_9028_RECT_MAP: Record<number, TileRect> = Object.fromEntries(
  BOARD_9028_RECTS.map((rect) => [rect.tileIndex, rect]),
);

export function getTileRect(tileIndex: number): TileRect | undefined {
  return BOARD_9028_RECT_MAP[tileIndex];
}
