import { useMemo, useState, type CSSProperties } from 'react';
import {
  BOARD_TILES,
  getCurrentPlayer,
  type DiceRollResult,
  type GameState,
  type PlayerState,
} from '@super-millionaire/shared';
import { Box, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { BoardCenterArt, Dice3D, type DiceValue } from '../artwork';
import { formatBahtNumber, getTileGridPlacement } from '../utils/boardLayout';
import { BoardTile, type TileCashPopup } from './BoardTile';

export interface RecentlyBuiltFx {
  tileIndex: number;
  kind: 'house' | 'hotel';
  key: number;
}

export interface CashTransferFx {
  key: number;
  kind: 'RENT' | 'TAX' | 'PASS_START';
  amount: number;
  payerId?: string;
  recipientId?: string;
  payerTileIndex?: number;
  recipientTileIndex?: number;
  message: string;
}

export interface BoardProps {
  gameState: GameState;
  displayPositions: Record<string, number>;
  animatingPlayerId?: string | null;
  hopSpotlightTile?: number | null;
  recentlyBuilt?: RecentlyBuiltFx | null;
  cashTransferFx?: CashTransferFx | null;
  selectedTileIndex: number | null;
  onSelectTile: (tileIndex: number) => void;
  showThrownDiceOverlay: boolean;
  isThrowingDice: boolean;
  throwKey: number;
  thrownDiceFaces: DiceRollResult | null;
}

export function Board({
  gameState,
  displayPositions,
  animatingPlayerId = null,
  hopSpotlightTile = null,
  recentlyBuilt = null,
  cashTransferFx = null,
  selectedTileIndex,
  onSelectTile,
  showThrownDiceOverlay,
  isThrowingDice,
  throwKey,
  thrownDiceFaces,
}: BoardProps) {
  const [mobileZoom, setMobileZoom] = useState(false);
  const [is25D, setIs25D] = useState(true);

  const currentPlayer = getCurrentPlayer(gameState);

  const playersById = useMemo(() => {
    const map = new Map<string, PlayerState>();
    for (const p of gameState.players) {
      map.set(p.id, p);
    }
    return map;
  }, [gameState.players]);

  const playersByTile = useMemo(() => {
    const map = new Map<number, PlayerState[]>();
    for (const p of gameState.players) {
      if (p.isBankrupt) continue;
      const pos = displayPositions[p.id] ?? p.position;
      const list = map.get(pos) ?? [];
      list.push(p);
      map.set(pos, list);
    }
    return map;
  }, [gameState.players, displayPositions]);

  // Compute flying cash trajectory across the 11x11 square board when rent/cash transfer occurs
  const flyingMoneyStyle = useMemo(() => {
    if (!cashTransferFx) return null;
    if (
      cashTransferFx.payerTileIndex === undefined ||
      cashTransferFx.recipientTileIndex === undefined
    ) {
      return null;
    }
    const from = getTileGridPlacement(cashTransferFx.payerTileIndex);
    const to = getTileGridPlacement(cashTransferFx.recipientTileIndex);
    const startX = ((from.col - 0.5) / 11) * 100;
    const startY = ((from.row - 0.5) / 11) * 100;
    const endX = ((to.col - 0.5) / 11) * 100;
    const endY = ((to.row - 0.5) / 11) * 100;
    const dx = endX - startX;
    const dy = endY - startY;

    return {
      left: `${startX.toFixed(2)}%`,
      top: `${startY.toFixed(2)}%`,
      '--fly-mid-x': `${(dx * 0.5).toFixed(2)}cqw`,
      '--fly-mid-y': `${(dy * 0.5 - 10).toFixed(2)}cqw`,
      '--fly-end-x': `${dx.toFixed(2)}cqw`,
      '--fly-end-y': `${dy.toFixed(2)}cqw`,
    } as CSSProperties;
  }, [cashTransferFx]);

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {/* Board Perspective & Mobile Zoom Control Strip */}
      <div className="flex w-full items-center justify-between gap-2 px-1">
        <span className="truncate text-[11px] font-medium text-amber-200/80 sm:text-xs">
          แตะช่องบนกระดานเพื่อดูโฉนดหรือสร้างบ้าน
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIs25D((v) => !v)}
            className={`tactile-btn inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow ${
              is25D
                ? 'border-amber-300/70 bg-amber-950/90 text-amber-100'
                : 'border-stone-600 bg-stone-900/90 text-stone-200'
            }`}
            title="สลับมุมมองกระดาน 2.5D โต๊ะจริง / 2D ด้านบน"
          >
            {is25D ? <Box className="h-3.5 w-3.5 text-amber-300" /> : <Layers className="h-3.5 w-3.5" />}
            <span>{is25D ? '2.5D โต๊ะจริง' : '2D มุมมองบน'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileZoom((z) => !z)}
            className="tactile-btn inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-stone-900/90 px-2.5 py-1 text-xs font-semibold text-amber-200 shadow lg:hidden"
          >
            {mobileZoom ? (
              <>
                <ZoomOut className="h-3.5 w-3.5" />
                <span>1×</span>
              </>
            ) : (
              <>
                <ZoomIn className="h-3.5 w-3.5" />
                <span>1.65×</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabletop Felt Surface + Perspective Stage */}
      <div
        className={`tabletop-felt relative w-full rounded-2xl border border-amber-500/25 ${
          mobileZoom
            ? 'max-h-[68dvh] overflow-auto p-2'
            : 'overflow-visible px-2 pt-3 pb-5 sm:px-5 sm:pt-4 sm:pb-7'
        }`}
      >
        {/* Top Rent / Cash Transfer Banner */}
        {cashTransferFx && (
          <div
            key={cashTransferFx.key}
            className="pointer-events-none absolute top-2 left-1/2 z-40 w-max max-w-[92%] -translate-x-1/2"
          >
            <div
              className={`rounded-full border px-3 py-1 text-center text-xs font-extrabold shadow-xl backdrop-blur-md sm:text-sm ${
                cashTransferFx.kind === 'PASS_START'
                  ? 'border-emerald-300 bg-emerald-950/90 text-emerald-100'
                  : cashTransferFx.kind === 'TAX'
                    ? 'border-rose-300 bg-rose-950/90 text-rose-100'
                    : 'border-amber-300 bg-stone-950/92 text-amber-100'
              }`}
            >
              {cashTransferFx.message}
            </div>
          </div>
        )}

        <div
          style={{ perspective: '1200px' }}
          className={`mx-auto aspect-square transition-all duration-300 ${
            mobileZoom ? 'w-[165%] min-w-[600px]' : 'w-full max-w-[780px]'
          }`}
        >
          {/* Classic #1C6B3A Green Outer Bezel with 2.5D Cardboard Slab Depth */}
          <div
            style={{
              transform: is25D ? 'rotateX(24deg)' : 'rotateX(0deg)',
              transformStyle: 'preserve-3d',
            }}
            className={`preserve-3d h-full w-full rounded-xl bg-[#1C6B3A] p-1.5 transition-transform duration-500 sm:p-2.5 md:p-3 ${
              is25D ? 'board-slab-3d' : 'board-bevel-outer'
            }`}
          >
            <div
              style={{ containerType: 'inline-size' }}
              className="preserve-3d relative grid h-full w-full grid-cols-11 grid-rows-11 gap-[1px] border-2 border-[#18120c] bg-[#18120c]"
            >
              {/* Iconic 9x9 Yellow Center */}
              <div
                style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}
                className="relative overflow-hidden border border-[#2a2118]"
              >
                <BoardCenterArt className="h-full w-full" />

                {/* Subtle top floating turn pill inside center */}
                <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 sm:top-3">
                  <div className="flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-stone-950/80 px-2.5 py-1 text-[10px] font-semibold text-amber-100 shadow-md backdrop-blur-sm sm:text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-white/60"
                      style={{ backgroundColor: currentPlayer?.color ?? '#E3BE3B' }}
                    />
                    <span className="max-w-[110px] truncate sm:max-w-[160px]">
                      ตาที่ <span className="mono-num">{gameState.turnNumber}</span> •{' '}
                      {currentPlayer?.name}
                    </span>
                  </div>
                </div>

                {/* Animated Thrown 2-Dice Overlay in Center */}
                {showThrownDiceOverlay && thrownDiceFaces && (
                  <div
                    key={throwKey}
                    className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
                  >
                    <div
                      style={is25D ? { transform: 'rotateX(-16deg) translateZ(18px)' } : undefined}
                      className="flex flex-col items-center gap-2 rounded-2xl border-2 border-amber-300/80 bg-stone-950/78 px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.65)] backdrop-blur-xs sm:px-6 sm:py-4"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="animate-dice-throw-a">
                          <Dice3D
                            value={Math.max(1, Math.min(6, thrownDiceFaces.die1)) as DiceValue}
                            rolling={isThrowingDice}
                            size={mobileZoom ? 58 : 52}
                          />
                        </div>
                        <div className="animate-dice-throw-b">
                          <Dice3D
                            value={Math.max(1, Math.min(6, thrownDiceFaces.die2)) as DiceValue}
                            rolling={isThrowingDice}
                            size={mobileZoom ? 58 : 52}
                          />
                        </div>
                      </div>

                      {!isThrowingDice && (
                        <div className="flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-stone-900/95 px-3 py-0.5 text-xs font-extrabold text-amber-100 shadow sm:text-sm">
                          <span className="mono-num">
                            รวม {thrownDiceFaces.total} แต้ม
                          </span>
                          {thrownDiceFaces.isDoubles && (
                            <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black text-stone-950">
                              เบิ้ล!
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 40 Counter-Clockwise Tiles */}
              {BOARD_TILES.map((tile) => {
                const deed = gameState.deeds[tile.index];
                const owner = deed?.ownerId ? playersById.get(deed.ownerId) : undefined;
                const playersOnTile = playersByTile.get(tile.index) ?? [];
                const isCurrentPlayerTile =
                  (displayPositions[currentPlayer.id] ?? currentPlayer.position) === tile.index;
                const isPendingDecisionTile =
                  gameState.phase === 'AWAIT_DECISION' &&
                  gameState.pendingDecisionTileIndex === tile.index;

                let cashDeltaPopup: TileCashPopup | null = null;
                if (cashTransferFx) {
                  if (cashTransferFx.recipientTileIndex === tile.index) {
                    cashDeltaPopup = {
                      key: cashTransferFx.key,
                      amount: cashTransferFx.amount,
                      isPositive: true,
                    };
                  } else if (cashTransferFx.payerTileIndex === tile.index) {
                    cashDeltaPopup = {
                      key: cashTransferFx.key,
                      amount: cashTransferFx.amount,
                      isPositive: false,
                    };
                  }
                }

                return (
                  <BoardTile
                    key={tile.index}
                    tile={tile}
                    deed={deed}
                    owner={owner}
                    playersOnTile={playersOnTile}
                    currentTurnPlayerId={currentPlayer?.id}
                    animatingPlayerId={animatingPlayerId}
                    isCurrentPlayerTile={isCurrentPlayerTile}
                    isHopSpotlight={hopSpotlightTile === tile.index}
                    isPendingDecisionTile={isPendingDecisionTile}
                    isSelected={selectedTileIndex === tile.index}
                    is25D={is25D}
                    recentlyBuiltKind={
                      recentlyBuilt && recentlyBuilt.tileIndex === tile.index
                        ? recentlyBuilt.kind
                        : null
                    }
                    cashDeltaPopup={cashDeltaPopup}
                    zoomed={mobileZoom}
                    onSelect={onSelectTile}
                  />
                );
              })}

              {/* Flying Cash Particle between Payer & Creditor */}
              {cashTransferFx && flyingMoneyStyle && (
                <div
                  key={`fly-${cashTransferFx.key}`}
                  style={flyingMoneyStyle}
                  className="pointer-events-none animate-cash-fly absolute z-50 -translate-x-1/2 -translate-y-1/2"
                >
                  <div className="flex items-center gap-1 rounded-full border-2 border-amber-200 bg-[#1b7a43] px-2.5 py-1 text-[11px] font-black text-amber-100 shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
                    <span>฿</span>
                    <span className="mono-num">{formatBahtNumber(cashTransferFx.amount)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
