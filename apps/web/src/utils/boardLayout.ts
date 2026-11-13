import type { ColorGroup } from '@super-millionaire/shared';

export type BoardEdge = 'corner' | 'bottom' | 'left' | 'top' | 'right';

export interface GridPlacement {
  row: number;
  col: number;
  edge: BoardEdge;
}

export interface ColorGroupStyle {
  label: string;
  bandBg: string;
  bandText: string;
  badgeBg: string;
  borderColor: string;
}

export const COLOR_GROUP_META: Readonly<Record<ColorGroup, ColorGroupStyle>> = {
  brown: {
    label: 'น้ำตาล',
    bandBg: '#7A4223',
    bandText: '#FFF8EB',
    badgeBg: '#663418',
    borderColor: '#562912',
  },
  lightBlue: {
    label: 'ฟ้าอ่อน',
    bandBg: '#73C7E8',
    bandText: '#142636',
    badgeBg: '#57B4DA',
    borderColor: '#3A8CAE',
  },
  darkGreen: {
    label: 'เขียวเข้ม',
    bandBg: '#1B7A43',
    bandText: '#FFFBF0',
    badgeBg: '#146234',
    borderColor: '#0E4825',
  },
  orange: {
    label: 'ส้ม',
    bandBg: '#EB7D1E',
    bandText: '#FFFBF2',
    badgeBg: '#D4680E',
    borderColor: '#A64D07',
  },
  skyBlue: {
    label: 'ฟ้าคราม',
    bandBg: '#2488D8',
    bandText: '#FFFFFF',
    badgeBg: '#1A6EB3',
    borderColor: '#124F85',
  },
  red: {
    label: 'แดง',
    bandBg: '#C8232C',
    bandText: '#FFF9F2',
    badgeBg: '#A61921',
    borderColor: '#7B1016',
  },
  limeGreen: {
    label: 'เขียวตอง',
    bandBg: '#76B82A',
    bandText: '#192907',
    badgeBg: '#629E1E',
    borderColor: '#487613',
  },
  darkRed: {
    label: 'แดงเลือดหมู',
    bandBg: '#8A1526',
    bandText: '#FFF7EB',
    badgeBg: '#6E0E1C',
    borderColor: '#4E0812',
  },
  hotel: {
    label: 'โรงแรมหรู',
    bandBg: '#1E3A5F',
    bandText: '#F8E39A',
    badgeBg: '#162C49',
    borderColor: '#0E1F36',
  },
  utility: {
    label: 'สาธารณูปโภค',
    bandBg: '#465466',
    bandText: '#F8FAFC',
    badgeBg: '#364150',
    borderColor: '#252E3A',
  },
};

/**
 * Counter-clockwise 11x11 placement for tiles 0..39:
 * 0 bottom-right -> 1..9 bottom -> 10 bottom-left -> 11..19 left ->
 * 20 top-left -> 21..29 top -> 30 top-right -> 31..39 right.
 */
export function getTileGridPlacement(tileIndex: number): GridPlacement {
  const idx = ((tileIndex % 40) + 40) % 40;

  if (idx === 0) return { row: 11, col: 11, edge: 'corner' };
  if (idx >= 1 && idx <= 9) return { row: 11, col: 11 - idx, edge: 'bottom' };
  if (idx === 10) return { row: 11, col: 1, edge: 'corner' };
  if (idx >= 11 && idx <= 19) return { row: 21 - idx, col: 1, edge: 'left' };
  if (idx === 20) return { row: 1, col: 1, edge: 'corner' };
  if (idx >= 21 && idx <= 29) return { row: 1, col: idx - 19, edge: 'top' };
  if (idx === 30) return { row: 1, col: 11, edge: 'corner' };
  return { row: idx - 29, col: 11, edge: 'right' };
}

export function formatBahtNumber(amount: number): string {
  return amount.toLocaleString('en-US');
}
