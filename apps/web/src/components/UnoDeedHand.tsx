import { useState } from 'react';
import {
  calculateRent,
  getTile,
  ownsFullColorGroup,
  type GameState,
} from '@super-millionaire/shared';
import { HotelPiece, HousePiece } from '../artwork';
import { COLOR_GROUP_META, formatBahtNumber } from '../utils/boardLayout';

export interface UnoDeedHandProps {
  gameState: GameState;
  myPlayerId: string | null;
  isSpectator: boolean;
  selectedTileIndex: number | null;
  onSelectTile: (tileIndex: number) => void;
}

export function UnoDeedHand({
  gameState,
  myPlayerId,
  isSpectator,
  selectedTileIndex,
  onSelectTile,
}: UnoDeedHandProps) {
  const [hoveredTileIndex, setHoveredTileIndex] = useState<number | null>(null);

  if (isSpectator || !myPlayerId) {
    return (
      <div className="pointer-events-none flex w-full justify-center px-2">
        <div className="pointer-events-auto rounded-full border border-amber-400/35 bg-stone-950/85 px-3.5 py-1.5 text-center text-[11px] font-semibold text-amber-200/90 shadow-lg backdrop-blur-md">
          โหมดผู้ชม — โฉนดและเงินสดของผู้เล่นถูกปิดเป็นความลับ
        </div>
      </div>
    );
  }

  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  if (!myPlayer) return null;

  const ownedDeeds = Object.values(gameState.deeds)
    .filter((d) => d.ownerId === myPlayer.id)
    .sort((a, b) => a.tileIndex - b.tileIndex);

  const count = ownedDeeds.length;

  if (count === 0) {
    return (
      <div className="pointer-events-none flex w-full flex-col items-center gap-1.5 px-2">
        {myPlayer.jailFreeCards > 0 && (
          <span className="pointer-events-auto rounded-full border border-emerald-400/60 bg-emerald-950/90 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200 shadow-lg backdrop-blur-md">
            บัตรพ้นคุก ×{myPlayer.jailFreeCards}
          </span>
        )}
        <div className="pointer-events-auto rounded-full border border-amber-400/30 bg-stone-950/80 px-4 py-1.5 text-center text-[11px] font-medium text-amber-100/80 shadow-lg backdrop-blur-md">
          ยังไม่มีโฉนดในมือ — ซื้อที่ดินเพื่อถือไพ่โฉนดแบบการ์ดในมือ
        </div>
      </div>
    );
  }

  const maxSpread = Math.min(18, Math.max(4, count * 2.5));
  const overlapMargin =
    count >= 10 ? '-32px' : count >= 7 ? '-26px' : count >= 4 ? '-20px' : '-12px';

  return (
    <section
      aria-label="โฉนดในมือของคุณ"
      className="pointer-events-none relative flex w-full max-w-full flex-col items-center"
    >
      {/* Floating Hearthstone / Balatro / UNO Arc */}
      <div className="deed-hand-scroll pointer-events-auto w-full max-w-full overflow-x-auto overflow-y-visible pt-6 pb-2">
        <div className="mx-auto flex w-max items-end justify-center px-6 sm:px-10">
          {ownedDeeds.map((deed, idx) => {
            const tile = getTile(deed.tileIndex);
            const meta = tile.colorGroup ? COLOR_GROUP_META[tile.colorGroup] : null;
            const headerHex = meta?.bandBg ?? '#5a4d3f';
            const headerText = meta?.bandText ?? '#FFF8EB';
            const isStanding = myPlayer.position === tile.index;
            const isSelected = selectedTileIndex === tile.index;
            const isHovered = hoveredTileIndex === tile.index;
            const isRaised = isSelected || isHovered;
            const fullGroup =
              tile.colorGroup && tile.colorGroup !== 'hotel' && tile.colorGroup !== 'utility'
                ? ownsFullColorGroup(gameState, myPlayer.id, tile.colorGroup)
                : false;
            const currentRent = calculateRent(gameState, tile.index);

            const mid = (count - 1) / 2;
            const normalized = count <= 1 ? 0 : (idx - mid) / Math.max(mid, 1);
            const fanDeg = normalized * maxSpread;
            const arcDrop = Math.pow(Math.abs(normalized), 1.6) * 18;

            const cardTransform = isRaised
              ? 'rotate(0deg) translateY(-36px) scale(1.14)'
              : isStanding
                ? `rotate(${(fanDeg * 0.4).toFixed(1)}deg) translateY(${Math.max(-14, arcDrop - 14).toFixed(1)}px) scale(1.03)`
                : `rotate(${fanDeg.toFixed(1)}deg) translateY(${arcDrop.toFixed(1)}px) scale(1)`;

            return (
              <button
                key={deed.tileIndex}
                type="button"
                data-selected={isSelected ? 'true' : undefined}
                onClick={() => onSelectTile(tile.index)}
                onMouseEnter={() => setHoveredTileIndex(tile.index)}
                onMouseLeave={() => setHoveredTileIndex((prev) => (prev === tile.index ? null : prev))}
                style={{
                  transform: cardTransform,
                  transformOrigin: 'center 220%',
                  marginLeft: idx === 0 ? 0 : overlapMargin,
                  zIndex: isRaised ? 80 : isStanding ? 45 : idx + 10,
                }}
                className={`deed-fan-card cardstock-texture relative flex h-[116px] w-[84px] shrink-0 flex-col overflow-hidden rounded-xl border-2 text-left text-[#1c1814] focus:outline-none sm:h-[130px] sm:w-[94px] ${
                  isRaised
                    ? 'border-amber-300 ring-2 ring-amber-300/95'
                    : isStanding
                      ? 'border-emerald-400 ring-2 ring-emerald-400/75'
                      : 'border-[#2a2118]'
                }`}
              >
                <div className="deed-foil-shimmer pointer-events-none absolute inset-0 z-10 opacity-0" />
                {/* Color Group Header */}
                <div
                  className="flex h-5 shrink-0 items-center justify-between px-1.5 text-[9px] font-extrabold"
                  style={{ backgroundColor: headerHex, color: headerText }}
                >
                  <span className="mono-num drop-shadow-sm">
                    #{tile.deedNumber ?? tile.index}
                  </span>
                  {fullGroup && !deed.isMortgaged && (
                    <span className="rounded bg-black/35 px-1 py-0.2 text-[8px] text-white">
                      ครบชุด
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="flex min-h-0 flex-1 flex-col justify-between p-1.5">
                  <div>
                    <div className="line-clamp-2 text-[10px] font-extrabold leading-tight text-[#1c1814] sm:text-[11px]">
                      {tile.name}
                    </div>
                    {isStanding && (
                      <span className="mt-0.5 inline-block rounded bg-emerald-700 px-1 py-0.5 text-[8px] font-bold text-white">
                        ยืนอยู่!
                      </span>
                    )}
                  </div>

                  {/* Houses / Hotel / Mortgage */}
                  <div className="flex items-center justify-between gap-1">
                    {deed.isMortgaged ? (
                      <span className="rounded border border-rose-700 bg-rose-100 px-1 py-0.5 text-[8px] font-extrabold text-rose-800">
                        จำนอง
                      </span>
                    ) : deed.hasHotel ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-rose-950/10 px-1 py-0.5 text-[8px] font-bold text-rose-800">
                        <HotelPiece size={12} /> รร.
                      </span>
                    ) : deed.houses > 0 ? (
                      <span className="inline-flex items-center gap-0.5">
                        {Array.from({ length: Math.min(deed.houses, 4) }, (_, hIdx) => (
                          <HousePiece key={hIdx} size={10} />
                        ))}
                      </span>
                    ) : (
                      <span className="text-[8px] font-semibold text-stone-500">
                        ที่เปล่า
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-[#2a2118]/15 pt-1 text-[9px]">
                    <span className="text-stone-600">เช่า</span>
                    <span className="mono-num font-extrabold text-[#1b7a43]">
                      {deed.isMortgaged ? '฿0' : `฿${formatBahtNumber(currentRent)}`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtle floating count & jail-free badge tucked under the fanned cards */}
      <div className="pointer-events-auto mt-0.5 flex items-center gap-2 rounded-full border border-amber-400/35 bg-stone-950/85 px-3 py-0.5 text-[10px] font-bold text-amber-200 shadow-md backdrop-blur-md">
        <span>โฉนดในมือ ({count})</span>
        {myPlayer.jailFreeCards > 0 && (
          <span className="rounded-full bg-emerald-700/90 px-1.5 py-0.2 text-[9px] text-white">
            พ้นคุก ×{myPlayer.jailFreeCards}
          </span>
        )}
      </div>
    </section>
  );
}
