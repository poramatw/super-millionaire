import { BOARD_TILES, type TileDefinition } from '@super-millionaire/shared';
import {
  BOARD_9028_RECT_MAP,
  type TilePixelBounds,
  type TileSide,
} from '../artwork/board9028Coords';
import { COLOR_GROUP_META, getTileGridPlacement } from '../utils/boardLayout';

export type TileGlyphDrawer = (
  ctx: CanvasRenderingContext2D,
  tile: TileDefinition,
  cx: number,
  cy: number,
  size: number,
) => void;

const CHEST_ART_CROP = { x: 416, y: 396, w: 484, h: 465 };
const GATE_ART_CROP = { x: 1215, y: 1140, w: 465, h: 455 };

/**
 * Draw a softly feathered circular crop from the authentic No. 9028 artwork so scan
 * creases and background seams melt seamlessly into ornate heritage medallions.
 */
function drawFeatheredCircleImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  crop: { x: number; y: number; w: number; h: number },
  cx: number,
  cy: number,
  radius: number,
  bgHex: string,
): void {
  const diameter = Math.ceil(radius * 2);
  const off = document.createElement('canvas');
  off.width = diameter;
  off.height = diameter;
  const octx = off.getContext('2d');
  if (!octx) return;

  octx.save();
  octx.beginPath();
  octx.arc(radius, radius, radius, 0, Math.PI * 2);
  octx.clip();

  octx.fillStyle = bgHex;
  octx.fillRect(0, 0, diameter, diameter);

  // Aspect-cover fit inside the circular medallion
  const scale = Math.max(diameter / crop.w, diameter / crop.h) * 1.04;
  const dw = crop.w * scale;
  const dh = crop.h * scale;
  octx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.w,
    crop.h,
    radius - dw / 2,
    radius - dh / 2,
    dw,
    dh,
  );

  // Warm radial vignette softening outer edge into bezel
  const vig = octx.createRadialGradient(radius, radius, radius * 0.62, radius, radius, radius);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.84, 'rgba(42,24,6,0.14)');
  vig.addColorStop(1, 'rgba(26,15,4,0.48)');
  octx.fillStyle = vig;
  octx.fillRect(0, 0, diameter, diameter);
  octx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(off, cx - radius, cy - radius, diameter, diameter);
  ctx.restore();
}

function drawThaiCornerFiligree(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dx: 1 | -1,
  dy: 1 | -1,
  arm: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(dx, dy);

  ctx.strokeStyle = 'rgba(139, 90, 18, 0.72)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, arm);
  ctx.lineTo(0, 16);
  ctx.quadraticCurveTo(0, 0, 16, 0);
  ctx.lineTo(arm, 0);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(22, 101, 52, 0.78)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(28, 28, 18, Math.PI * 0.9, Math.PI * 2.1);
  ctx.stroke();

  // Golden Kanok rosette dot
  ctx.fillStyle = '#B45309';
  ctx.beginPath();
  ctx.arc(18, 18, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(18, 18, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMedallionFrame(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  outerHex: string,
  innerHex: string,
): void {
  ctx.save();
  // Soft drop shadow on parchment court
  ctx.fillStyle = 'rgba(28, 18, 8, 0.2)';
  ctx.beginPath();
  ctx.arc(cx + 4, cy + 7, radius + 12, 0, Math.PI * 2);
  ctx.fill();

  // Outer brass ring
  const brass = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  brass.addColorStop(0, '#FEF08A');
  brass.addColorStop(0.5, '#D97706');
  brass.addColorStop(1, '#78350F');
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 11, 0, Math.PI * 2);
  ctx.fill();

  // Coloured enamel band
  ctx.strokeStyle = outerHex;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
  ctx.stroke();

  // Interior backdrop
  ctx.fillStyle = innerHex;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRibbonTag(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  bgHex: string,
  borderHex: string,
  textHex: string,
  label: string,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(18, 12, 6, 0.25)';
  ctx.beginPath();
  ctx.roundRect(cx - w / 2 + 2, cy - h / 2 + 3, w, h, h / 2);
  ctx.fill();

  ctx.fillStyle = bgHex;
  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = textHex;
  ctx.font = '800 23px "Prompt", "Noto Sans Thai", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + 1);
  ctx.restore();
}

function drawProceduralChestFallback(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  const s = radius / 95;
  ctx.scale(s, s);

  // Chest rays
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 44, Math.sin(a) * 44);
    ctx.lineTo(Math.cos(a) * 76, Math.sin(a) * 76);
    ctx.stroke();
  }

  ctx.fillStyle = '#92400E';
  ctx.strokeStyle = '#1C1814';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-52, -8, 104, 58, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#B45309';
  ctx.beginPath();
  ctx.moveTo(-52, -8);
  ctx.quadraticCurveTo(0, -68, 52, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FACC15';
  ctx.fillRect(-14, -18, 28, 24);
  ctx.strokeRect(-14, -18, 28, 24);
  ctx.restore();
}

function drawProceduralGateFallback(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  const s = radius / 95;
  ctx.scale(s, s);

  ctx.fillStyle = '#7F1D1D';
  ctx.fillRect(-46, -12, 16, 76);
  ctx.fillRect(30, -12, 16, 76);

  ctx.fillStyle = '#C8232C';
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-66, -10);
  ctx.lineTo(0, -66);
  ctx.lineTo(66, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FDE047';
  ctx.beginPath();
  ctx.arc(0, 22, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7F1D1D';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#991B1B';
  ctx.font = '900 22px "Prompt", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ดวง', 0, 23);
  ctx.restore();
}

function drawTreasuryCrest(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
  drawMedallionFrame(ctx, cx, cy, radius, '#166534', '#FAF3DC');

  // Subtle compass spokes inside crest
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = 'rgba(180, 128, 32, 0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 32, Math.sin(a) * 32);
    ctx.lineTo(Math.cos(a) * (radius - 12), Math.sin(a) * (radius - 12));
    ctx.stroke();
  }

  // Stylized banknote fan
  [-0.24, -0.06, 0.14].forEach((rot, idx) => {
    ctx.save();
    ctx.rotate(rot);
    ctx.fillStyle = idx === 1 ? '#15803D' : idx === 0 ? '#1D4ED8' : '#B45309';
    ctx.strokeStyle = '#FFFBEB';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-52, -26, 104, 52, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FEF08A';
    ctx.font = '800 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('฿1,000', 0, 6);
    ctx.restore();
  });

  // Twin mini dice motif below banknotes
  [
    { x: -24, y: 42, pip: '6' },
    { x: 24, y: 42, pip: '1' },
  ].forEach((d) => {
    ctx.fillStyle = '#FFFDF7';
    ctx.strokeStyle = '#2A2118';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(d.x - 16, d.y - 16, 32, 32, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = d.pip === '1' ? '#DC2626' : '#1C1814';
    ctx.font = '800 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.pip, d.x, d.y + 1);
  });
  ctx.restore();

  drawRibbonTag(ctx, cx, cy + radius + 8, 250, 38, '#14532D', '#FACC15', '#FEF9C3', 'คลังหลวง • ฿15,000');
}

function drawCompassCrest(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
  drawMedallionFrame(ctx, cx, cy, radius, '#991B1B', '#FFFBEB');

  ctx.save();
  ctx.translate(cx, cy - 6);

  // Outer degree ticks
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 22, 0, Math.PI * 2);
  ctx.stroke();

  // 8-point compass star
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 4);
    const len = i % 2 === 0 ? radius * 0.68 : radius * 0.44;
    ctx.fillStyle = i === 0 ? '#DC2626' : i % 2 === 0 ? '#B45309' : '#D97706';
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.lineTo(13, 0);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = i % 2 === 0 ? '#FEF08A' : '#FDE68A';
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.lineTo(-13, 0);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#14532D';
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FEF08A';
  ctx.font = '800 13px "Prompt", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GO!', 0, 1);
  ctx.restore();

  drawRibbonTag(ctx, cx, cy + radius + 8, 258, 38, '#7F1D1D', '#FACC15', '#FEF9C3', 'ผ่านจุดเริ่มต้น +฿2,000');
}

function drawCardDeckTraySlot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  angle: number,
  accentHex: string,
  title: string,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Recessed tabletop shadow groove
  ctx.fillStyle = 'rgba(20, 14, 6, 0.22)';
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 18);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 248, 220, 0.28)';
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 18);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 12);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#3B2810';
  ctx.font = '700 22px "Prompt", "Noto Sans Thai", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 0, 0);

  ctx.restore();
}

/** Convert world XZ on 11x11 board (`-5.5..+5.5`) to inner canvas coordinates (`0..innerBoard`). */
function worldToInnerPx(wx: number, wz: number, innerBoard: number): { x: number; y: number } {
  return {
    x: ((wx + 5.5) / 11) * innerBoard,
    y: ((wz + 5.5) / 11) * innerBoard,
  };
}

export function drawRichCenterCourt(
  ctx: CanvasRenderingContext2D,
  innerBoard: number,
  cell: number,
  boardImg: HTMLImageElement | null,
): void {
  const cX = cell;
  const cY = cell;
  const cSize = innerBoard - cell * 2;
  const center = innerBoard / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(cX, cY, cSize, cSize);
  ctx.clip();

  // Warm Heritage Sunburst Center Court (replaces sparse flat yellow)
  const bg = ctx.createRadialGradient(center, center, 40, center, center, cSize * 0.74);
  bg.addColorStop(0, '#F6DE7A');
  bg.addColorStop(0.45, '#E4BD3E');
  bg.addColorStop(0.84, '#CE9B24');
  bg.addColorStop(1, '#B37E15');
  ctx.fillStyle = bg;
  ctx.fillRect(cX, cY, cSize, cSize);

  // Subtle 24-ray vintage guilloche sunburst
  ctx.save();
  ctx.translate(center, center);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 250, 215, 0.14)' : 'rgba(130, 82, 8, 0.06)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-92, -cSize * 0.78);
    ctx.lineTo(92, -cSize * 0.78);
    ctx.closePath();
    ctx.fill();
  }

  // Concentric engraved compass rings
  [cSize * 0.25, cSize * 0.36, cSize * 0.45].forEach((r, idx) => {
    ctx.strokeStyle = idx === 1 ? 'rgba(20, 83, 45, 0.26)' : 'rgba(146, 64, 14, 0.22)';
    ctx.lineWidth = idx === 1 ? 4 : 2.5;
    if (idx === 0) ctx.setLineDash([12, 10]);
    else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.restore();

  // Ornate emerald + brass inner framing border
  ctx.strokeStyle = '#14532D';
  ctx.lineWidth = 18;
  ctx.strokeRect(cX + 9, cY + 9, cSize - 18, cSize - 18);

  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 4;
  ctx.strokeRect(cX + 24, cY + 24, cSize - 48, cSize - 48);

  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 2;
  ctx.strokeRect(cX + 34, cY + 34, cSize - 68, cSize - 68);

  // 4 Thai filigree corner ornaments
  const pad = 42;
  drawThaiCornerFiligree(ctx, cX + pad, cY + pad, 1, 1, 130);
  drawThaiCornerFiligree(ctx, cX + cSize - pad, cY + pad, -1, 1, 130);
  drawThaiCornerFiligree(ctx, cX + pad, cY + cSize - pad, 1, -1, 130);
  drawThaiCornerFiligree(ctx, cX + cSize - pad, cY + cSize - pad, -1, -1, 130);

  // 1) Deck tray slot outlines (exact positions aligned to 3D card stacks in SuperMillionaire3DScene)
  const chestSlot = worldToInnerPx(-2.75, -2.45, innerBoard);
  drawCardDeckTraySlot(
    ctx,
    chestSlot.x,
    chestSlot.y,
    296,
    194,
    -Math.PI / 4,
    '#0F766E',
    'กองการ์ดกองทุน',
  );

  const chanceSlot = worldToInnerPx(2.75, 2.45, innerBoard);
  drawCardDeckTraySlot(
    ctx,
    chanceSlot.x,
    chanceSlot.y,
    296,
    194,
    -Math.PI / 4,
    '#B91C1C',
    'กองการ์ดเสี่ยงโชค',
  );

  // 2) Authentic Illustrated Medallions (positioned beside the 3D decks, 100% visible)
  const chestArtPos = worldToInnerPx(-0.82, -2.85, innerBoard);
  const medRadius = cell * 0.94;
  drawMedallionFrame(ctx, chestArtPos.x, chestArtPos.y, medRadius, '#0F766E', '#DFB732');
  if (boardImg) {
    drawFeatheredCircleImage(
      ctx,
      boardImg,
      CHEST_ART_CROP,
      chestArtPos.x,
      chestArtPos.y,
      medRadius,
      '#DFB732',
    );
  } else {
    drawProceduralChestFallback(ctx, chestArtPos.x, chestArtPos.y, medRadius);
  }
  drawRibbonTag(
    ctx,
    chestArtPos.x,
    chestArtPos.y + medRadius + 8,
    236,
    38,
    '#0F766E',
    '#FDE047',
    '#FEFCE8',
    'หีบสมบัติ • กองทุน',
  );

  const gateArtPos = worldToInnerPx(0.82, 2.85, innerBoard);
  drawMedallionFrame(ctx, gateArtPos.x, gateArtPos.y, medRadius, '#991B1B', '#E3BD3D');
  if (boardImg) {
    drawFeatheredCircleImage(
      ctx,
      boardImg,
      GATE_ART_CROP,
      gateArtPos.x,
      gateArtPos.y,
      medRadius,
      '#E3BD3D',
    );
  } else {
    drawProceduralGateFallback(ctx, gateArtPos.x, gateArtPos.y, medRadius);
  }
  drawRibbonTag(
    ctx,
    gateArtPos.x,
    gateArtPos.y + medRadius + 8,
    236,
    38,
    '#991B1B',
    '#FDE047',
    '#FEFCE8',
    'ประตูดวง • เสี่ยงโชค',
  );

  // 3) Symmetric Treasury & Compass Heritage Crests on open diagonal corners
  const treasuryPos = worldToInnerPx(2.8, -2.8, innerBoard);
  drawTreasuryCrest(ctx, treasuryPos.x, treasuryPos.y, cell * 0.78);

  const compassPos = worldToInnerPx(-2.8, 2.8, innerBoard);
  drawCompassCrest(ctx, compassPos.x, compassPos.y, cell * 0.78);

  // 4) Central Heraldic Diagonal Emblem ("ซุปเปอร์เศรษฐี No. 9028")
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(-Math.PI / 4);

  const bw = 640;
  const bh = 186;
  ctx.fillStyle = 'rgba(18, 12, 4, 0.34)';
  ctx.beginPath();
  ctx.roundRect(-bw / 2 + 8, -bh / 2 + 12, bw, bh, 26);
  ctx.fill();

  const bannerGrad = ctx.createLinearGradient(-bw / 2, -bh / 2, bw / 2, bh / 2);
  bannerGrad.addColorStop(0, '#991B1B');
  bannerGrad.addColorStop(0.5, '#C8232C');
  bannerGrad.addColorStop(1, '#7F1D1D');
  ctx.fillStyle = bannerGrad;
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 24);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#14532D';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-bw / 2 + 12, -bh / 2 + 12, bw - 24, bh - 24, 16);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.font = '900 72px "Prompt", "Noto Sans Thai", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ซุปเปอร์เศรษฐี', 3, -12);

  ctx.fillStyle = '#FFFDF5';
  ctx.fillText('ซุปเปอร์เศรษฐี', 0, -16);

  ctx.fillStyle = '#FDE047';
  ctx.font = '800 22px "JetBrains Mono", monospace';
  ctx.fillText('SUPER MILLIONAIRE  •  No. 9028', 0, 48);

  ctx.restore();
  ctx.restore();
}

/**
 * Draw authentic No. 9028 middle artwork inside an upright rotated tile rectangle
 * without aspect squishing or text rotation errors.
 */
function drawTileMiddleIllustration(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  pb: TilePixelBounds,
  edge: TileSide,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  // Middle artwork zone along inward->outward axis (~36%..82% from inner color band)
  let sx = pb.x;
  let sy = pb.y;
  let sw = pb.width;
  let sh = pb.height;
  let fixAngle = 0;

  if (edge === 'bottom') {
    sx = pb.x + 5;
    sw = pb.width - 10;
    sy = pb.y + pb.height * 0.37;
    sh = pb.height * 0.45;
    fixAngle = 0;
  } else if (edge === 'left') {
    sx = pb.x + pb.width * 0.18;
    sw = pb.width * 0.45;
    sy = pb.y + 5;
    sh = pb.height - 10;
    fixAngle = -Math.PI / 2;
  } else if (edge === 'top') {
    sx = pb.x + 5;
    sw = pb.width - 10;
    sy = pb.y + pb.height * 0.18;
    sh = pb.height * 0.45;
    fixAngle = Math.PI;
  } else if (edge === 'right') {
    sx = pb.x + pb.width * 0.37;
    sw = pb.width * 0.45;
    sy = pb.y + 5;
    sh = pb.height - 10;
    fixAngle = Math.PI / 2;
  }

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(dx, dy, dw, dh, 8);
  ctx.clip();

  // Compute upright size after fixAngle so cover-fit fills (dw, dh) with 1:1 aspect ratio
  const uprightSrcW = Math.abs(fixAngle) === Math.PI / 2 ? sh : sw;
  const uprightSrcH = Math.abs(fixAngle) === Math.PI / 2 ? sw : sh;
  const scale = Math.max(dw / uprightSrcW, dh / uprightSrcH);

  ctx.translate(dx + dw / 2, dy + dh / 2);
  ctx.rotate(fixAngle);
  ctx.drawImage(
    img,
    sx,
    sy,
    sw,
    sh,
    (-sw * scale) / 2,
    (-sh * scale) / 2,
    sw * scale,
    sh * scale,
  );
  ctx.restore();

  // Crisp inner ink frame around postcard artwork
  ctx.save();
  ctx.strokeStyle = 'rgba(28, 24, 20, 0.42)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(dx, dy, dw, dh, 8);
  ctx.stroke();
  ctx.restore();
}

export function renderPerimeterTiles(
  ctx: CanvasRenderingContext2D,
  cell: number,
  drawTileArtworkGlyph: TileGlyphDrawer,
  boardImg: HTMLImageElement | null,
): void {
  const hw = cell / 2;
  const hh = cell / 2;

  for (const tile of BOARD_TILES) {
    const { row, col, edge } = getTileGridPlacement(tile.index);
    const tx = (col - 1) * cell;
    const ty = (row - 1) * cell;
    const rect9028 = BOARD_9028_RECT_MAP[tile.index];

    ctx.save();
    ctx.translate(tx + cell / 2, ty + cell / 2);

    if (edge === 'left') ctx.rotate(Math.PI / 2);
    else if (edge === 'top') ctx.rotate(Math.PI);
    else if (edge === 'right') ctx.rotate(-Math.PI / 2);

    const isDarkCard = tile.type === 'chest' || tile.type === 'chance';
    ctx.fillStyle = isDarkCard ? '#1C1917' : '#F8F1DE';
    ctx.fillRect(-hw, -hh, cell, cell);

    if (!isDarkCard) {
      const grad = ctx.createLinearGradient(0, -hh, 0, hh);
      grad.addColorStop(0, 'rgba(255, 253, 244, 0.55)');
      grad.addColorStop(1, 'rgba(227, 190, 59, 0.14)');
      ctx.fillStyle = grad;
      ctx.fillRect(-hw, -hh, cell, cell);
    }

    if (edge === 'corner') {
      if (boardImg && rect9028) {
        const pb = rect9028.pixelBounds;
        const pad = 4;
        ctx.save();
        ctx.beginPath();
        ctx.rect(-hw + 3, -hh + 3, cell - 6, cell - 6);
        ctx.clip();
        ctx.drawImage(
          boardImg,
          pb.x + pad,
          pb.y + pad,
          pb.width - pad * 2,
          pb.height - pad * 2,
          -hw + 2,
          -hh + 2,
          cell - 4,
          cell - 4,
        );
        ctx.restore();
      } else {
        drawTileArtworkGlyph(ctx, tile, 0, -cell * 0.04, cell * 0.92);
        ctx.fillStyle = '#1C1814';
        ctx.font = '800 22px "Prompt", "Noto Sans Thai", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tile.name, 0, hh - 18);
      }
    } else {
      const bandH = cell * 0.22;
      const meta = tile.colorGroup ? COLOR_GROUP_META[tile.colorGroup] : null;
      if (meta) {
        ctx.fillStyle = meta.bandBg;
        ctx.fillRect(-hw, -hh, cell, bandH);
        ctx.strokeStyle = '#1C1814';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-hw, -hh + bandH);
        ctx.lineTo(hw, -hh + bandH);
        ctx.stroke();

        if (tile.deedNumber !== undefined) {
          ctx.fillStyle = meta.bandText;
          ctx.font = '800 21px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`#${tile.deedNumber}`, 0, -hh + bandH * 0.72);
        }
      } else {
        ctx.fillStyle =
          tile.type === 'chance'
            ? '#B91C1C'
            : tile.type === 'chest'
              ? '#0F766E'
              : tile.type === 'tax'
                ? '#78350F'
                : '#1E293B';
        ctx.fillRect(-hw, -hh, cell, bandH);
        ctx.fillStyle = '#FEF3C7';
        ctx.font = '800 17px "Prompt", "Noto Sans Thai", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          tile.type === 'chance'
            ? 'เสี่ยงโชค'
            : tile.type === 'chest'
              ? 'กองทุน'
              : tile.type === 'tax'
                ? 'ภาษี'
                : 'โฉนด',
          0,
          -hh + bandH * 0.68,
        );
      }

      // Authentic illustration artwork window for all edge tiles
      const artTop = -hh + bandH + 6;
      const artH = cell * 0.48;
      if (boardImg && rect9028) {
        drawTileMiddleIllustration(
          ctx,
          boardImg,
          rect9028.pixelBounds,
          edge,
          -hw + 8,
          artTop,
          cell - 16,
          artH,
        );
      } else {
        drawTileArtworkGlyph(ctx, tile, 0, artTop + artH * 0.5, cell * 0.62);
      }

      // Crisp Thai Tile Name under illustration
      ctx.fillStyle = isDarkCard ? '#FFF7D6' : '#1C1814';
      const nameLen = tile.name.length;
      const fontSize = nameLen > 12 ? 15.5 : nameLen > 9 ? 17.5 : 19.5;
      ctx.font = `800 ${fontSize}px "Prompt", "Noto Sans Thai", sans-serif`;
      ctx.textAlign = 'center';
      const hasFooterVal = Boolean(tile.price || tile.taxAmount);
      ctx.fillText(tile.name, 0, hh - (hasFooterVal ? 31 : 14));

      // Crisp price/tax pill at outer rim
      const priceVal = tile.price ?? tile.taxAmount;
      if (priceVal) {
        ctx.fillStyle = tile.taxAmount ? '#991B1B' : '#1C1814';
        ctx.beginPath();
        ctx.roundRect(-hw + 22, hh - 24, cell - 44, 19, 4);
        ctx.fill();
        ctx.fillStyle = '#FDE047';
        ctx.font = '800 15px "JetBrains Mono", monospace';
        ctx.fillText(`฿${priceVal.toLocaleString('en-US')}`, 0, hh - 9);
      }
    }

    // Crisp ink divider frame
    ctx.strokeStyle = '#1C1814';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(-hw, -hh, cell, cell);

    ctx.restore();
  }
}
