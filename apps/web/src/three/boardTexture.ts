import * as THREE from 'three';
import { BOARD_TILES, type TileDefinition } from '@super-millionaire/shared';
import { COLOR_GROUP_META, getTileGridPlacement } from '../utils/boardLayout';

export interface TileWorldCoords {
  x: number;
  z: number;
  row: number;
  col: number;
  edge: 'corner' | 'bottom' | 'left' | 'top' | 'right';
}

export function tileIndexToWorldXZ(tileIndex: number): TileWorldCoords {
  const { row, col, edge } = getTileGridPlacement(tileIndex);
  return {
    x: col - 6,
    z: row - 6,
    row,
    col,
    edge,
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawTileArtworkGlyph(
  ctx: CanvasRenderingContext2D,
  tile: TileDefinition,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.save();
  ctx.translate(cx, cy);

  if (tile.type === 'start') {
    // Red sweeping arrow + +2,000 badge
    ctx.fillStyle = '#C8232C';
    ctx.beginPath();
    ctx.moveTo(-size * 0.36, size * 0.2);
    ctx.lineTo(size * 0.14, size * 0.2);
    ctx.lineTo(size * 0.14, size * 0.08);
    ctx.lineTo(size * 0.38, size * 0.26);
    ctx.lineTo(size * 0.14, size * 0.44);
    ctx.lineTo(size * 0.14, size * 0.32);
    ctx.lineTo(-size * 0.36, size * 0.32);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1B7A43';
    ctx.font = `800 ${Math.round(size * 0.22)}px "Prompt", "Noto Sans Thai", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('START', 0, -size * 0.18);

    ctx.fillStyle = '#C8232C';
    ctx.font = `700 ${Math.round(size * 0.17)}px "JetBrains Mono", monospace`;
    ctx.fillText('+฿2,000', 0, size * 0.02);
  } else if (tile.type === 'jail') {
    // Classic orange-red jail bars
    ctx.fillStyle = '#D94326';
    drawRoundedRect(ctx, -size * 0.34, -size * 0.34, size * 0.68, size * 0.56, 8);
    ctx.fill();
    ctx.strokeStyle = '#1C1814';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = '#1F2229';
    ctx.lineWidth = 5;
    for (let i = -2; i <= 2; i++) {
      const bx = i * size * 0.11;
      ctx.beginPath();
      ctx.moveTo(bx, -size * 0.32);
      ctx.lineTo(bx, size * 0.2);
      ctx.stroke();
    }
  } else if (tile.type === 'freeParking') {
    // Tropical beach sun + palm silhouette
    ctx.fillStyle = '#1C85C9';
    drawRoundedRect(ctx, -size * 0.34, -size * 0.1, size * 0.68, size * 0.28, 6);
    ctx.fill();
    ctx.fillStyle = '#F5C43D';
    ctx.beginPath();
    ctx.arc(size * 0.12, -size * 0.16, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5C3A16';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-size * 0.16, size * 0.16);
    ctx.quadraticCurveTo(-size * 0.18, -size * 0.08, -size * 0.05, -size * 0.24);
    ctx.stroke();
    ctx.fillStyle = '#1B7A43';
    ctx.beginPath();
    ctx.arc(-size * 0.06, -size * 0.24, size * 0.12, Math.PI, Math.PI * 2);
    ctx.fill();
  } else if (tile.type === 'goToJail') {
    // Police siren badge + bold arrow
    ctx.fillStyle = '#1C4E8A';
    drawRoundedRect(ctx, -size * 0.34, -size * 0.34, size * 0.68, size * 0.52, 10);
    ctx.fill();
    ctx.fillStyle = '#C8232C';
    ctx.beginPath();
    ctx.arc(0, -size * 0.12, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFD447';
    ctx.lineWidth = 4;
    ctx.stroke();
  } else if (tile.type === 'chest') {
    // Open treasure chest
    ctx.fillStyle = '#9C521D';
    drawRoundedRect(ctx, -size * 0.32, -size * 0.06, size * 0.64, size * 0.34, 5);
    ctx.fill();
    ctx.fillStyle = '#F2C438';
    ctx.beginPath();
    ctx.arc(0, -size * 0.06, size * 0.22, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3B1E08';
    ctx.lineWidth = 3;
    ctx.strokeRect(-size * 0.32, -size * 0.06, size * 0.64, size * 0.34);
  } else if (tile.type === 'chance') {
    // Ornate Thai fortune gate medallion
    ctx.fillStyle = '#C8232C';
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, size * 0.22);
    ctx.lineTo(-size * 0.3, -size * 0.08);
    ctx.lineTo(0, -size * 0.28);
    ctx.lineTo(size * 0.3, -size * 0.08);
    ctx.lineTo(size * 0.3, size * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#F2C438';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#F2C438';
    ctx.beginPath();
    ctx.arc(0, size * 0.02, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6E0D14';
    ctx.font = `800 ${Math.round(size * 0.15)}px "Prompt", "Noto Sans Thai", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ดวง', 0, size * 0.07);
  } else if (tile.type === 'hotel') {
    // Classic stepped hotel silhouette
    ctx.fillStyle = '#1E3A5F';
    ctx.fillRect(-size * 0.22, -size * 0.24, size * 0.44, size * 0.48);
    ctx.fillStyle = '#E8B838';
    for (let r = 0; r < 3; r++) {
      for (let c = -1; c <= 1; c++) {
        ctx.fillRect(c * size * 0.11 - 4, -size * 0.16 + r * size * 0.11, 8, 8);
      }
    }
  } else if (tile.type === 'utility') {
    ctx.fillStyle = tile.index === 12 ? '#E8B838' : '#2488D8';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1C1814';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${Math.round(size * 0.22)}px "Prompt", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(tile.index === 12 ? '⚡' : '💧', 0, size * 0.08);
  } else if (tile.type === 'tax') {
    ctx.fillStyle = '#334155';
    ctx.fillRect(-size * 0.18, -size * 0.26, size * 0.36, size * 0.5);
    ctx.fillStyle = '#F2C438';
    ctx.font = `800 ${Math.round(size * 0.22)}px "Prompt", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('฿', 0, size * 0.06);
  } else {
    // Subtle Thai landmark silhouette crest behind deed name
    const meta = tile.colorGroup ? COLOR_GROUP_META[tile.colorGroup] : null;
    ctx.fillStyle = meta ? meta.bandBg : '#8B6D3B';
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, size * 0.22);
    ctx.lineTo(-size * 0.2, -size * 0.02);
    ctx.lineTo(0, -size * 0.24);
    ctx.lineTo(size * 0.2, -size * 0.02);
    ctx.lineTo(size * 0.28, size * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawCenterBoardArt(ctx: CanvasRenderingContext2D, boardSize: number, cell: number) {
  const innerStart = cell;
  const innerSize = cell * 9;

  // Classic #E3BE3B gold center
  const grad = ctx.createRadialGradient(
    boardSize / 2,
    boardSize / 2,
    innerSize * 0.08,
    boardSize / 2,
    boardSize / 2,
    innerSize * 0.72,
  );
  grad.addColorStop(0, '#F3DA73');
  grad.addColorStop(0.65, '#E3BE3B');
  grad.addColorStop(1, '#C59A20');
  ctx.fillStyle = grad;
  ctx.fillRect(innerStart, innerStart, innerSize, innerSize);

  // Subtle retro print grain dots
  ctx.fillStyle = 'rgba(54, 38, 12, 0.045)';
  for (let gx = innerStart + 8; gx < innerStart + innerSize; gx += 18) {
    for (let gy = innerStart + 8; gy < innerStart + innerSize; gy += 18) {
      ctx.fillRect(gx, gy, 2, 2);
    }
  }

  // Double inner border
  ctx.strokeStyle = '#3B2A0A';
  ctx.lineWidth = 6;
  ctx.strokeRect(innerStart + 22, innerStart + 22, innerSize - 44, innerSize - 44);
  ctx.strokeStyle = 'rgba(130, 88, 14, 0.48)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([14, 8]);
  ctx.strokeRect(innerStart + 36, innerStart + 36, innerSize - 72, innerSize - 72);
  ctx.setLineDash([]);

  // Card Deck Spaces in opposite corners
  const drawDeckSlot = (cx: number, cy: number, title: string, accent: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = 'rgba(30, 20, 6, 0.25)';
    drawRoundedRect(ctx, -124, -74, 256, 156, 16);
    ctx.fill();

    ctx.fillStyle = '#F7EED3';
    drawRoundedRect(ctx, -130, -80, 256, 156, 16);
    ctx.fill();
    ctx.strokeStyle = '#3A280A';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    drawRoundedRect(ctx, -114, -64, 224, 124, 10);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = accent;
    ctx.font = '800 34px "Prompt", "Noto Sans Thai", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, -2, 12);
    ctx.restore();
  };

  drawDeckSlot(innerStart + innerSize * 0.24, innerStart + innerSize * 0.24, 'หีบสมบัติ', '#0F766E');
  drawDeckSlot(innerStart + innerSize * 0.76, innerStart + innerSize * 0.76, 'ประตูดวง', '#C8232C');

  // Center Diagonal #9028 "ซุปเปอร์เศรษฐี" Emblem
  ctx.save();
  ctx.translate(boardSize / 2, boardSize / 2);
  ctx.rotate(-Math.PI / 4);

  // Drop shadow
  ctx.fillStyle = 'rgba(20, 14, 6, 0.36)';
  drawRoundedRect(ctx, -398, -118, 812, 248, 30);
  ctx.fill();

  // Outer green plaque
  ctx.fillStyle = '#1B7A43';
  drawRoundedRect(ctx, -406, -126, 812, 248, 30);
  ctx.fill();
  ctx.strokeStyle = '#14110E';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Inner gold trim
  ctx.strokeStyle = '#F4D15A';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, -390, -110, 780, 216, 22);
  ctx.stroke();

  // Red banner face
  ctx.fillStyle = '#C8232C';
  drawRoundedRect(ctx, -372, -92, 744, 144, 16);
  ctx.fill();
  ctx.strokeStyle = '#14110E';
  ctx.lineWidth = 5;
  ctx.stroke();

  // 3D black shadow + cream-gold Thai title
  ctx.font = '800 102px "Prompt", "Noto Sans Thai", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#14110E';
  ctx.fillText('ซุปเปอร์เศรษฐี', 7, 22);
  ctx.fillStyle = '#FFF7D4';
  ctx.fillText('ซุปเปอร์เศรษฐี', 0, 15);
  ctx.strokeStyle = '#14110E';
  ctx.lineWidth = 2.5;
  ctx.strokeText('ซุปเปอร์เศรษฐี', 0, 15);

  // Sub-plate No. 9028
  ctx.fillStyle = '#145E33';
  drawRoundedRect(ctx, -230, 62, 460, 40, 20);
  ctx.fill();
  ctx.strokeStyle = '#F4D15A';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#FFF7D4';
  ctx.font = '700 22px "JetBrains Mono", monospace';
  ctx.fillText('No. 9028 • SUPER MILLIONAIRE', 0, 90);

  ctx.restore();
}

export function createBoardCanvasTexture(maxAnisotropy = 8): THREE.CanvasTexture {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.colorSpace = THREE.SRGBColorSpace;
    return fallback;
  }

  // Outer classic #1C6B3A retro green bezel
  ctx.fillStyle = '#1C6B3A';
  ctx.fillRect(0, 0, size, size);

  const margin = 16;
  const innerBoard = size - margin * 2;
  const cell = innerBoard / 11;

  // Center 9x9 golden area
  ctx.save();
  ctx.translate(margin, margin);
  drawCenterBoardArt(ctx, innerBoard, cell);

  // Draw all 40 perimeter tiles
  for (const tile of BOARD_TILES) {
    const { row, col, edge } = getTileGridPlacement(tile.index);
    const tx = (col - 1) * cell;
    const ty = (row - 1) * cell;

    ctx.save();
    ctx.translate(tx + cell / 2, ty + cell / 2);

    if (edge === 'left') ctx.rotate(Math.PI / 2);
    else if (edge === 'top') ctx.rotate(Math.PI);
    else if (edge === 'right') ctx.rotate(-Math.PI / 2);

    const hw = cell / 2;
    const hh = cell / 2;

    // Cream cardstock background
    ctx.fillStyle = tile.type === 'chest' || tile.type === 'chance' ? '#1E1B18' : '#F7F0DE';
    ctx.fillRect(-hw, -hh, cell, cell);

    // Subtle paper warmth tint
    if (tile.type !== 'chest' && tile.type !== 'chance') {
      ctx.fillStyle = 'rgba(227, 190, 59, 0.08)';
      ctx.fillRect(-hw, -hh, cell, cell);
    }

    if (edge === 'corner') {
      // Corner tiles
      drawTileArtworkGlyph(ctx, tile, 0, -cell * 0.04, cell * 0.92);
      ctx.fillStyle = '#1C1814';
      ctx.font = '800 22px "Prompt", "Noto Sans Thai", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tile.name, 0, hh - 18);
    } else {
      // Color band facing center (top of rotated tile)
      const bandH = cell * 0.24;
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
          ctx.font = '800 22px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`#${tile.deedNumber}`, 0, -hh + bandH * 0.7);
        }
      } else {
        // Special non-deed edge tile top label
        ctx.fillStyle =
          tile.type === 'chance'
            ? '#C8232C'
            : tile.type === 'chest'
              ? '#0F766E'
              : '#334155';
        ctx.fillRect(-hw, -hh, cell, bandH);
      }

      // Center illustration glyph
      drawTileArtworkGlyph(ctx, tile, 0, cell * 0.03, cell * 0.65);

      // Thai Tile Name
      const isDarkCard = tile.type === 'chest' || tile.type === 'chance';
      ctx.fillStyle = isDarkCard ? '#FFF5D6' : '#1C1814';
      const nameLen = tile.name.length;
      const fontSize = nameLen > 12 ? 17 : nameLen > 8 ? 19 : 22;
      ctx.font = `700 ${fontSize}px "Prompt", "Noto Sans Thai", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(tile.name, 0, hh - (tile.price || tile.taxAmount ? 34 : 16));

      // Price / Tax badge at outer edge
      const priceVal = tile.price ?? tile.taxAmount;
      if (priceVal) {
        ctx.fillStyle = tile.taxAmount ? '#B91C1C' : '#1C1814';
        ctx.font = '700 20px "JetBrains Mono", monospace';
        ctx.fillText(`฿${priceVal.toLocaleString('en-US')}`, 0, hh - 10);
      }
    }

    // Crisp black divider border
    ctx.strokeStyle = '#1C1814';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(-hw, -hh, cell, cell);

    ctx.restore();
  }

  // Outer perimeter ink border
  ctx.strokeStyle = '#120E0A';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, innerBoard, innerBoard);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}
