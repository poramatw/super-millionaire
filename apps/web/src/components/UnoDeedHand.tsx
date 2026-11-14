import { useMemo, useState } from 'react';
import {
  COLOR_GROUP_TILES,
  HOTEL_RENTS,
  calculateRent,
  getCurrentPlayer,
  getTile,
  ownsFullColorGroup,
  type ColorGroup,
  type GameState,
} from '@super-millionaire/shared';
import { HotelPiece, HousePiece } from '../artwork';
import { COLOR_GROUP_META, formatBahtNumber } from '../utils/boardLayout';

const GROUP_SORT_ORDER: Readonly<Record<ColorGroup, number>> = {
  hotel: 0,
  utility: 1,
  brown: 2,
  lightBlue: 3,
  darkGreen: 4,
  orange: 5,
  skyBlue: 6,
  red: 7,
  limeGreen: 8,
  darkRed: 9,
};

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

  const myPlayer = useMemo(
    () =>
      !isSpectator && myPlayerId
        ? gameState.players.find((p) => p.id === myPlayerId) ?? null
        : getCurrentPlayer(gameState),
    [gameState, isSpectator, myPlayerId],
  );

  // Sort deeds by color group so matching sets (especially Hotels & Utilities) stack side-by-side
  const ownedDeeds = useMemo(() => {
    if (!myPlayer) return [];
    return Object.values(gameState.deeds)
      .filter((d) => d.ownerId === myPlayer.id)
      .sort((a, b) => {
        const gA = getTile(a.tileIndex).colorGroup;
        const gB = getTile(b.tileIndex).colorGroup;
        const oA = gA ? GROUP_SORT_ORDER[gA] : 99;
        const oB = gB ? GROUP_SORT_ORDER[gB] : 99;
        if (oA !== oB) return oA - oB;
        return a.tileIndex - b.tileIndex;
      });
  }, [gameState.deeds, myPlayer]);

  if (!myPlayer) return null;

  const count = ownedDeeds.length;

  if (count === 0) {
    return (
      <div className="flex min-h-[48px] w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-amber-500/25 bg-stone-950/60 px-3.5 py-2 backdrop-blur-md">
        <span className="text-[11px] font-medium text-amber-100/75 sm:text-xs">
          สำรับโฉนดในมือว่างอยู่ — ซื้อที่ดินบนกระดานเพื่อจัดเรียงไพ่โฉนดบนมือ
        </span>
        {myPlayer.jailFreeCards > 0 && (
          <span className="rounded-full border border-emerald-400/50 bg-emerald-950/90 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200">
            บัตรพ้นคุก ×{myPlayer.jailFreeCards}
          </span>
        )}
      </div>
    );
  }

  // Group stack stats (Hotels scaling rent, Utilities multiplier, Completed color sets)
  const ownedHotelCount = ownedDeeds.filter(
    (d) => getTile(d.tileIndex).colorGroup === 'hotel' && !d.isMortgaged,
  ).length;
  const totalHotelOwned = ownedDeeds.filter(
    (d) => getTile(d.tileIndex).colorGroup === 'hotel',
  ).length;
  const hotelTierRent =
    ownedHotelCount > 0 ? HOTEL_RENTS[Math.min(ownedHotelCount, HOTEL_RENTS.length) - 1] ?? 0 : 0;

  const ownedUtilCount = ownedDeeds.filter(
    (d) => getTile(d.tileIndex).colorGroup === 'utility' && !d.isMortgaged,
  ).length;
  const totalUtilOwned = ownedDeeds.filter(
    (d) => getTile(d.tileIndex).colorGroup === 'utility',
  ).length;

  const completedColorGroups = (
    ['brown', 'lightBlue', 'darkGreen', 'orange', 'skyBlue', 'red', 'limeGreen', 'darkRed'] as ColorGroup[]
  ).filter((g) => ownsFullColorGroup(gameState, myPlayer.id, g));

  const activeFocusIndex = ownedDeeds.findIndex(
    (d) => d.tileIndex === (hoveredTileIndex ?? selectedTileIndex),
  );
  const maxSpread = Math.min(18, Math.max(3, count * 1.9));

  // Responsive card overlap so the entire hand always fits in a single fanned arc without a scrollbar
  const sameGroupOverlap =
    count >= 16
      ? -62
      : count >= 12
        ? -54
        : count >= 8
          ? -44
          : count >= 5
            ? -34
            : -24;
  const diffGroupOverlap =
    count >= 16
      ? -52
      : count >= 12
        ? -42
        : count >= 8
          ? -28
          : count >= 5
            ? -14
            : 4;

  return (
    <section
      aria-label="โฉนดในมือของคุณ"
      className="pointer-events-none relative z-10 flex w-full max-w-full flex-col items-center select-none"
    >
      {/* Floating Playing-Card Hand Fan — Smooth Sweep Hover & Zero Scrollbar */}
      <div
        className="pointer-events-auto flex w-full max-w-full justify-center overflow-visible pt-12 pb-2"
        onMouseLeave={() => setHoveredTileIndex(null)}
      >
        <div className="mx-auto flex max-w-full items-end justify-center px-3 sm:px-6">
          {ownedDeeds.map((deed, idx) => {
            const tile = getTile(deed.tileIndex);
            const prevTile = idx > 0 ? getTile(ownedDeeds[idx - 1]!.tileIndex) : null;
            const sameGroupAsPrev = Boolean(
              prevTile && tile.colorGroup && prevTile.colorGroup === tile.colorGroup,
            );
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

            const groupTotal = tile.colorGroup ? COLOR_GROUP_TILES[tile.colorGroup].length : 1;
            const groupOwned = tile.colorGroup
              ? ownedDeeds.filter((d) => getTile(d.tileIndex).colorGroup === tile.colorGroup).length
              : 1;

            const mid = (count - 1) / 2;
            const normalized = count <= 1 ? 0 : (idx - mid) / Math.max(mid, 1);
            const fanDeg = normalized * maxSpread;
            const arcDrop = Math.pow(Math.abs(normalized), 1.65) * 16;

            // Smoothly part adjacent stacked cards when sweeping across the hand
            let neighborPushX = 0;
            if (activeFocusIndex !== -1 && idx !== activeFocusIndex) {
              const distance = Math.abs(idx - activeFocusIndex);
              if (distance <= 3) {
                const spreadBase = count >= 10 ? 34 : 24;
                neighborPushX =
                  idx < activeFocusIndex ? -spreadBase / distance : spreadBase / distance;
              }
            }

            const cardMarginLeft =
              idx === 0 ? '0px' : `${sameGroupAsPrev ? sameGroupOverlap : diffGroupOverlap}px`;

            const innerTransform = isRaised
              ? 'translate3d(0, -44px, 0) scale(1.18) rotate(0deg)'
              : isStanding
                ? `translate3d(0, ${Math.max(-14, arcDrop - 14).toFixed(1)}px, 0) rotate(${(fanDeg * 0.4).toFixed(1)}deg) scale(1.03)`
                : `translate3d(0, ${arcDrop.toFixed(1)}px, 0) rotate(${fanDeg.toFixed(1)}deg) scale(1)`;

            return (
              <button
                key={deed.tileIndex}
                type="button"
                onClick={() => onSelectTile(tile.index)}
                onPointerEnter={() => setHoveredTileIndex(tile.index)}
                onPointerMove={() => {
                  if (hoveredTileIndex !== tile.index) setHoveredTileIndex(tile.index);
                }}
                onFocus={() => setHoveredTileIndex(tile.index)}
                onBlur={() =>
                  setHoveredTileIndex((prev) => (prev === tile.index ? null : prev))
                }
                style={{
                  transform: `translate3d(${neighborPushX.toFixed(1)}px, 0, 0)`,
                  marginLeft: cardMarginLeft,
                  zIndex: isRaised ? 85 : isStanding ? 45 : idx + 10,
                }}
                title={`#${tile.deedNumber ?? tile.index} ${tile.name} — คลิกเพื่อเปิดรายละเอียดโฉนด`}
                className="deed-fan-slot relative shrink-0 bg-transparent p-0 text-left focus:outline-none"
              >
                <div
                  data-raised={isRaised ? 'true' : undefined}
                  data-selected={isSelected ? 'true' : undefined}
                  style={{ transform: innerTransform }}
                  className={`deed-fan-card cardstock-texture relative flex h-[116px] w-[84px] flex-col overflow-hidden rounded-xl border-2 text-[#1c1814] sm:h-[130px] sm:w-[94px] ${
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
                    {fullGroup && !deed.isMortgaged ? (
                      <span className="rounded bg-black/35 px-1 py-0.2 text-[8px] text-white">
                        ครบชุด
                      </span>
                    ) : groupTotal > 1 ? (
                      <span className="mono-num rounded bg-black/25 px-1 py-0.2 text-[8px] text-white/95">
                        {groupOwned}/{groupTotal}
                      </span>
                    ) : null}
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
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating count & combined stack-value badges tucked under the fanned cards */}
      <div className="pointer-events-auto mt-0.5 flex max-w-full flex-wrap items-center justify-center gap-1.5 px-2">
        <div className="flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-stone-950/88 px-3 py-0.5 text-[10px] font-bold text-amber-200 shadow-md backdrop-blur-md">
          <span>โฉนดในมือ ({count})</span>
          {myPlayer.jailFreeCards > 0 && (
            <span className="rounded-full bg-emerald-700/90 px-1.5 py-0.2 text-[9px] text-white">
              พ้นคุก ×{myPlayer.jailFreeCards}
            </span>
          )}
        </div>

        {totalHotelOwned > 0 && (
          <div className="rounded-full border border-sky-400/45 bg-[#1E3A5F]/95 px-2.5 py-0.5 text-[10px] font-bold text-amber-100 shadow-md backdrop-blur-md">
            🏨 โรงแรม {totalHotelOwned}/5 • ค่าเช่า{' '}
            <span className="mono-num text-amber-300">
              ฿{formatBahtNumber(hotelTierRent)}
            </span>
            /แห่ง
          </div>
        )}

        {totalUtilOwned > 0 && (
          <div className="rounded-full border border-slate-400/45 bg-slate-800/95 px-2.5 py-0.5 text-[10px] font-bold text-slate-100 shadow-md backdrop-blur-md">
            ⚡ สาธารณูปโภค {totalUtilOwned}/2 •{' '}
            <span className="mono-num text-emerald-300">
              ×{ownedUtilCount >= 2 ? 100 : 40}
            </span>
          </div>
        )}

        {completedColorGroups.map((cg) => (
          <div
            key={cg}
            className="rounded-full border border-emerald-400/45 bg-emerald-950/90 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200 shadow-md backdrop-blur-md"
          >
            ✨ ครบชุด {COLOR_GROUP_META[cg].label} (×2)
          </div>
        ))}
      </div>
    </section>
  );
}
