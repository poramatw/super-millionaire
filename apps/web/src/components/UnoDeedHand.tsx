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
  if (isSpectator || !myPlayerId) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-stone-950/70 px-3 py-2 text-center text-xs text-amber-200/80">
        โหมดผู้ชม — โฉนดและเงินสดของผู้เล่นถูกปิดเป็นความลับ
      </div>
    );
  }

  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  if (!myPlayer) return null;

  const ownedDeeds = Object.values(gameState.deeds)
    .filter((d) => d.ownerId === myPlayer.id)
    .sort((a, b) => a.tileIndex - b.tileIndex);

  const count = ownedDeeds.length;

  return (
    <section
      aria-label="โฉนดในมือของคุณ"
      className="w-full max-w-full overflow-hidden rounded-2xl border border-amber-400/35 bg-gradient-to-b from-[#1d1710]/95 to-[#120e0a]/98 px-3 pt-2.5 pb-2 shadow-xl backdrop-blur-sm"
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.85)]" />
          <h3 className="font-[var(--font-display)] text-xs font-extrabold tracking-wide text-amber-200 sm:text-sm">
            โฉนดในมือของคุณ ({count} ใบ)
          </h3>
          {myPlayer.jailFreeCards > 0 && (
            <span className="rounded-full border border-emerald-400/50 bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
              บัตรพ้นคุก ×{myPlayer.jailFreeCards}
            </span>
          )}
        </div>
        <span className="text-[10px] text-amber-200/70">
          แตะโฉนดเพื่อดูรายละเอียด / สร้างบ้าน
        </span>
      </div>

      {count === 0 ? (
        <div className="flex min-h-[76px] items-center justify-center rounded-xl border border-dashed border-amber-300/25 bg-stone-900/45 px-3 py-3 text-center text-xs text-amber-100/65">
          ยังไม่มีโฉนดในมือ — ทอยลูกเต๋าและซื้อโฉนดที่ดินเพื่อสะสมไพ่โฉนดของคุณ
        </div>
      ) : (
        <div className="deed-hand-scroll w-full overflow-x-auto pt-3 pb-2">
          <div className="mx-auto flex w-max items-end justify-center px-3">
            {ownedDeeds.map((deed, idx) => {
              const tile = getTile(deed.tileIndex);
              const meta = tile.colorGroup ? COLOR_GROUP_META[tile.colorGroup] : null;
              const headerHex = meta?.bandBg ?? '#5a4d3f';
              const headerText = meta?.bandText ?? '#FFF8EB';
              const isStanding = myPlayer.position === tile.index;
              const isSelected = selectedTileIndex === tile.index;
              const fullGroup =
                tile.colorGroup && tile.colorGroup !== 'hotel' && tile.colorGroup !== 'utility'
                  ? ownsFullColorGroup(gameState, myPlayer.id, tile.colorGroup)
                  : false;
              const currentRent = calculateRent(gameState, tile.index);

              const mid = (count - 1) / 2;
              const normalized = count <= 1 ? 0 : (idx - mid) / Math.max(mid, 1);
              const fanDeg = Math.max(-11, Math.min(11, normalized * 10));
              const arcDrop = Math.abs(normalized) * 6;

              return (
                <button
                  key={deed.tileIndex}
                  type="button"
                  onClick={() => onSelectTile(tile.index)}
                  style={{
                    transform: `rotate(${fanDeg.toFixed(1)}deg) translateY(${arcDrop.toFixed(1)}px)`,
                    marginLeft: idx === 0 ? 0 : count > 7 ? '-18px' : '-10px',
                    zIndex: isSelected ? 40 : isStanding ? 30 : idx + 1,
                  }}
                  className={`deed-hand-card cardstock-texture relative flex h-[112px] w-[84px] shrink-0 flex-col overflow-hidden rounded-xl border-2 text-left text-[#1c1814] shadow-lg transition-all sm:h-[124px] sm:w-[94px] ${
                    isSelected
                      ? 'border-amber-300 ring-2 ring-amber-400/90 -translate-y-3'
                      : isStanding
                        ? 'border-emerald-400 ring-2 ring-emerald-400/70 -translate-y-2'
                        : 'border-[#2a2118]'
                  }`}
                >
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
      )}
    </section>
  );
}
