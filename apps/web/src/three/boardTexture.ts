import * as THREE from 'three';
import type { TileDefinition } from '@super-millionaire/shared';
import { BOARD_IMAGE_URL } from '../artwork/board9028Coords';
import { COLOR_GROUP_META, getTileGridPlacement } from '../utils/boardLayout';
import { drawRichCenterCourt, renderPerimeterTiles } from './boardArtworkCanvas';

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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  const paintSurface = (boardImg: HTMLImageElement | null) => {
    // Classic #165932 heritage green bezel with subtle gold pinstripe
    ctx.fillStyle = '#15542E';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(7, 7, size - 14, size - 14);

    const margin = 16;
    const innerBoard = size - margin * 2;
    const cell = innerBoard / 11;

    ctx.save();
    ctx.translate(margin, margin);
    drawRichCenterCourt(ctx, innerBoard, cell, boardImg);
    renderPerimeterTiles(ctx, cell, drawTileArtworkGlyph, boardImg);

    // Crisp outer perimeter ink border
    ctx.strokeStyle = '#120E0A';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, innerBoard, innerBoard);
    ctx.restore();

    texture.needsUpdate = true;
  };

  // Synchronous crisp heritage render on initial frame
  paintSurface(null);

  // Progressive enhancement: composite authentic No. 9028 board illustrations when decoded
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        paintSurface(img);
      }
    };
    img.src = BOARD_IMAGE_URL;
  }

  return texture;
}
