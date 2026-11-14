import { useState } from 'react';
import {
  BANKNOTE_DENOMINATIONS,
  BOARD_TILES,
  calculatePlayerNetWorth,
  calculateRent,
  canBuildOnCurrentTile,
  canUnmortgageCurrentTile,
  getCurrentPlayer,
  type ColorGroup,
  type GameState,
} from '@super-millionaire/shared';
import { Layers, List, Sparkles, Wallet } from 'lucide-react';
import { HotelPiece, HousePiece, PlayerToken, ThaiBanknote } from '../artwork';
import { COLOR_GROUP_META, formatBahtNumber } from '../utils/boardLayout';

export interface WalletDeedsPanelProps {
  gameState: GameState;
  inspectedPlayerId: string;
  myPlayerId: string | null;
  isSpectator?: boolean;
  selectedTileIndex?: number | null;
  onSelectPlayer: (playerId: string) => void;
  onSelectTile: (tileIndex: number) => void;
}

const COLOR_GROUP_ORDER: readonly ColorGroup[] = [
  'brown',
  'lightBlue',
  'darkGreen',
  'orange',
  'skyBlue',
  'red',
  'limeGreen',
  'darkRed',
  'hotel',
  'utility',
];

export function WalletDeedsPanel({
  gameState,
  inspectedPlayerId,
  myPlayerId,
  selectedTileIndex = null,
  onSelectPlayer,
  onSelectTile,
}: WalletDeedsPanelProps) {
  const [deedViewMode, setDeedViewMode] = useState<'hand' | 'list'>('hand');
  const [hoveredTileIndex, setHoveredTileIndex] = useState<number | null>(null);

  const effectivePlayerId =
    inspectedPlayerId || myPlayerId || getCurrentPlayer(gameState).id;

  const player =
    gameState.players.find((p) => p.id === effectivePlayerId) ??
    getCurrentPlayer(gameState);

  const currentPlayer = getCurrentPlayer(gameState);
  const netWorth = calculatePlayerNetWorth(gameState, player.id);

  const ownedDeeds = BOARD_TILES.filter((tile) => {
    const deed = gameState.deeds[tile.index];
    return deed && deed.ownerId === player.id;
  });

  const deedsByGroup = COLOR_GROUP_ORDER.map((group) => ({
    group,
    tiles: ownedDeeds.filter((t) => t.colorGroup === group),
  })).filter((entry) => entry.tiles.length > 0);

  const orderedHandTiles = deedsByGroup.flatMap((entry) => entry.tiles);

  const canBuildHere =
    myPlayerId === player.id &&
    currentPlayer.id === player.id &&
    canBuildOnCurrentTile(gameState, player.id).allowed;
  const canUnmortgageHere =
    myPlayerId === player.id &&
    currentPlayer.id === player.id &&
    canUnmortgageCurrentTile(gameState, player.id).allowed;
  const canUpgradeHere = canBuildHere || canUnmortgageHere;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-stone-900/90 p-3.5 text-amber-50 shadow-lg">
      {/* Player Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-amber-300" />
          <span className="font-[var(--font-display)] text-sm font-bold text-amber-200">
            กระเป๋าเงิน & โฉนด
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {gameState.players.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPlayer(p.id)}
              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                p.id === player.id
                  ? 'border-amber-300 bg-amber-300/20 text-amber-100'
                  : 'border-stone-700 bg-stone-950/60 text-stone-400 hover:text-stone-200'
              }`}
            >
              <PlayerToken tokenId={p.tokenId} color={p.color} size={14} />
              <span className="max-w-[64px] truncate">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Total Cash & Net Worth */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/50 px-3 py-2">
          <div className="text-[11px] text-emerald-200/80">เงินสดในมือ</div>
          <div className="mono-num text-lg font-extrabold text-emerald-300">
            ฿{formatBahtNumber(player.cash)}
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-2">
          <div className="text-[11px] text-amber-200/80">มูลค่าทรัพย์สินสุทธิ</div>
          <div className="mono-num text-lg font-extrabold text-amber-300">
            ฿{formatBahtNumber(netWorth)}
          </div>
        </div>
      </div>

      {/* 6 Thai Banknotes */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-stone-300">
          <span>ธนบัตรไทยในกระเป๋า</span>
          {player.jailFreeCards > 0 && (
            <span className="rounded-full bg-sky-900/80 px-2 py-0.5 text-[10px] font-bold text-sky-200">
              บัตรผ่านคุกฟรี ×{player.jailFreeCards}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {BANKNOTE_DENOMINATIONS.map((denom) => (
            <div key={denom} className="flex justify-center">
              <ThaiBanknote
                denomination={denom}
                count={player.banknotes[denom] ?? 0}
                compact
              />
            </div>
          ))}
        </div>
      </div>

      {/* Owned Deeds: Held-in-Hand Fan (default) or Color Group List */}
      <div className="space-y-2 border-t border-stone-800 pt-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-amber-200/90">
            โฉนดที่ถือครอง ({ownedDeeds.length}/29)
          </span>

          <div className="inline-flex rounded-lg border border-stone-700 bg-stone-950 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setDeedViewMode('hand')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-bold transition ${
                deedViewMode === 'hand'
                  ? 'bg-amber-400 text-stone-950'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Layers className="h-3 w-3" />
              <span>การ์ดบนมือ</span>
            </button>
            <button
              type="button"
              onClick={() => setDeedViewMode('list')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-bold transition ${
                deedViewMode === 'list'
                  ? 'bg-amber-400 text-stone-950'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <List className="h-3 w-3" />
              <span>เรียงตามสี</span>
            </button>
          </div>
        </div>

        {ownedDeeds.length === 0 ? (
          <div className="rounded-xl border border-stone-800 bg-stone-950/50 py-5 text-center text-xs text-stone-400">
            ยังไม่มีโฉนดในครอบครอง
          </div>
        ) : deedViewMode === 'hand' ? (
          <div className="overflow-visible rounded-xl border border-amber-500/20 bg-gradient-to-b from-stone-950/75 to-[#163623]/75 select-none">
            <div
              className="flex w-full justify-center overflow-visible px-3 pt-10 pb-4"
              onMouseLeave={() => setHoveredTileIndex(null)}
            >
              <div className="mx-auto flex max-w-full items-end justify-center px-2">
                {(() => {
                  const count = orderedHandTiles.length;
                  const activeFocusIdx = orderedHandTiles.findIndex(
                    (t) => t.index === (hoveredTileIndex ?? selectedTileIndex),
                  );
                  const overlapPx =
                    count >= 14
                      ? -76
                      : count >= 10
                        ? -68
                        : count >= 7
                          ? -56
                          : count >= 5
                            ? -42
                            : count >= 3
                              ? -26
                              : -12;

                  return orderedHandTiles.map((tile, idx) => {
                    const deed = gameState.deeds[tile.index]!;
                    const meta = tile.colorGroup ? COLOR_GROUP_META[tile.colorGroup] : null;
                    const mid = (count - 1) / 2;
                    const offset = idx - mid;
                    const maxDeg = Math.min(14, Math.max(4, count * 1.6));
                    const fanDeg = count <= 1 ? 0 : (offset / Math.max(1, mid)) * maxDeg;
                    const arcY =
                      count <= 2 ? 0 : Math.round(((offset * offset) / Math.max(1, mid * mid)) * 12);

                    const isStandingOn =
                      currentPlayer.id === player.id && currentPlayer.position === tile.index;
                    const isLifted =
                      hoveredTileIndex === tile.index || selectedTileIndex === tile.index;

                    let neighborPushX = 0;
                    if (activeFocusIdx !== -1 && idx !== activeFocusIdx) {
                      const dist = Math.abs(idx - activeFocusIdx);
                      if (dist <= 3) {
                        const pushBase = count >= 8 ? 30 : 22;
                        neighborPushX = idx < activeFocusIdx ? -pushBase / dist : pushBase / dist;
                      }
                    }

                    const currentRent =
                      tile.type === 'utility'
                        ? null
                        : calculateRent(gameState, tile.index, 7);

                    return (
                      <button
                        key={tile.index}
                        type="button"
                        onPointerEnter={() => setHoveredTileIndex(tile.index)}
                        onPointerMove={() => {
                          if (hoveredTileIndex !== tile.index) setHoveredTileIndex(tile.index);
                        }}
                        onFocus={() => setHoveredTileIndex(tile.index)}
                        onBlur={() =>
                          setHoveredTileIndex((prev) => (prev === tile.index ? null : prev))
                        }
                        onClick={() => onSelectTile(tile.index)}
                        style={{
                          transform: `translate3d(${neighborPushX.toFixed(1)}px, 0, 0)`,
                          marginLeft: idx === 0 ? '0px' : `${overlapPx}px`,
                          zIndex: isLifted ? 55 : idx + 1,
                        }}
                        title={`#${tile.deedNumber} ${tile.name} — คลิกเพื่อดูรายละเอียดโฉนด`}
                        className="deed-hand-slot relative shrink-0 bg-transparent p-0 text-left focus:outline-none"
                      >
                        <div
                          style={{
                            transform: isLifted
                              ? 'translate3d(0, -28px, 0) scale(1.12) rotate(0deg)'
                              : `translate3d(0, ${arcY}px, 0) rotate(${fanDeg.toFixed(2)}deg)`,
                          }}
                          className={`deed-hand-card relative flex h-[132px] w-[96px] flex-col justify-between overflow-hidden rounded-xl border-2 bg-[#f7f0de] text-[#1c1814] sm:h-[140px] sm:w-[104px] ${
                            isStandingOn
                              ? 'border-emerald-400 ring-2 ring-emerald-300/80'
                              : isLifted
                                ? 'border-amber-400 shadow-[0_18px_32px_rgba(0,0,0,0.65)] ring-2 ring-amber-300/90'
                                : 'border-[#2a2118]'
                          }`}
                        >
                          {/* Top Color Band */}
                          <div
                            className="flex items-center justify-between px-1.5 py-1"
                            style={{
                              backgroundColor: meta?.bandBg ?? '#1C6B3A',
                              color: meta?.bandText ?? '#FFF8EB',
                              borderBottom: `1.5px solid ${meta?.borderColor ?? '#123d23'}`,
                            }}
                          >
                            <span className="mono-num text-[10px] font-extrabold leading-none">
                              #{tile.deedNumber}
                            </span>
                            {deed.hasHotel ? (
                              <HotelPiece size={13} />
                            ) : deed.houses > 0 ? (
                              <span className="flex items-center -space-x-1">
                                {Array.from({ length: deed.houses }).map((_, i) => (
                                  <HousePiece key={i} size={10} />
                                ))}
                              </span>
                            ) : null}
                          </div>

                          {/* Card Body */}
                          <div className="relative flex flex-1 flex-col justify-between p-1.5">
                            <div>
                              <div className="text-[8.5px] font-bold tracking-wider text-stone-500 uppercase">
                                โฉนดที่ดิน
                              </div>
                              <div className="mt-0.5 line-clamp-2 text-[11px] font-extrabold leading-tight text-stone-900">
                                {tile.name}
                              </div>
                            </div>

                            <div className="space-y-0.5 border-t border-dashed border-stone-400/70 pt-1 text-[9.5px]">
                              {tile.price !== undefined && (
                                <div className="flex items-center justify-between text-stone-700">
                                  <span>ราคา</span>
                                  <span className="mono-num font-bold">
                                    ฿{formatBahtNumber(tile.price)}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[#1b7a43]">
                                <span>ค่าเช่า</span>
                                <span className="mono-num font-extrabold">
                                  {currentRent !== null
                                    ? `฿${formatBahtNumber(currentRent)}`
                                    : '40/100×'}
                                </span>
                              </div>
                            </div>

                            {deed.isMortgaged && (
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-900/20">
                                <span className="-rotate-12 rounded border border-red-950 bg-red-600/95 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow">
                                  จำนอง
                                </span>
                              </div>
                            )}

                            {isStandingOn && canUpgradeHere && (
                              <div className="mt-0.5 flex items-center justify-center gap-0.5 rounded bg-emerald-600 px-1 py-0.5 text-[8.5px] font-extrabold text-white">
                                <Sparkles className="h-2.5 w-2.5 shrink-0" />
                                <span>{canBuildHere ? 'สร้างบ้านได้!' : 'ไถ่ถอนได้!'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
            <div className="border-t border-white/10 px-3 py-1.5 text-center text-[10px] text-amber-200/80">
              เลื่อนเมาส์รูดเลือกไพ่โฉนดบนมือ แล้วคลิกเพื่อเปิดรายละเอียดโฉนด
            </div>
          </div>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {deedsByGroup.map(({ group, tiles }) => {
              const meta = COLOR_GROUP_META[group];
              return (
                <div key={group} className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-300">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: meta.bandBg }}
                    />
                    <span>กลุ่ม{meta.label}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {tiles.map((tile) => {
                      const deed = gameState.deeds[tile.index]!;
                      const isStandingOn =
                        currentPlayer.id === player.id &&
                        currentPlayer.position === tile.index;

                      return (
                        <button
                          key={tile.index}
                          type="button"
                          onClick={() => onSelectTile(tile.index)}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition hover:brightness-110 ${
                            isStandingOn
                              ? 'border-amber-300 bg-amber-500/20 ring-1 ring-amber-300/60'
                              : 'border-stone-700/80 bg-stone-950/70'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 truncate font-semibold text-amber-50">
                              <span className="mono-num text-[10px] text-amber-300">
                                #{tile.deedNumber}
                              </span>
                              <span className="truncate">{tile.name}</span>
                            </div>
                            {isStandingOn && canUpgradeHere && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-300">
                                <Sparkles className="h-2.5 w-2.5" />
                                ยืนอยู่ — อัปเกรด/ไถ่ถอนได้
                              </span>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            {deed.isMortgaged && (
                              <span className="rounded bg-rose-700 px-1 py-0.5 text-[9px] font-bold text-white">
                                จำนอง
                              </span>
                            )}
                            {deed.hasHotel ? (
                              <HotelPiece size={15} />
                            ) : deed.houses > 0 ? (
                              <span className="flex items-center -space-x-1">
                                {Array.from({ length: deed.houses }).map((_, idx) => (
                                  <HousePiece key={idx} size={12} />
                                ))}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
