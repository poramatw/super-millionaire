import { useEffect, useState } from 'react';
import {
  getCurrentPlayer,
  getCurrentRoundNumber,
  getRentInflationMultiplier,
  type DiceRollResult,
  type GameState,
} from '@super-millionaire/shared';
import { Box, Flame, Layers, LocateFixed, RotateCcw } from 'lucide-react';
import { SuperMillionaire3DScene } from '../three/SuperMillionaire3DScene';

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
  myPlayerId?: string | null;
  isSpectator?: boolean;
  isExpandedView?: boolean;
  showThrownDiceOverlay: boolean;
  isThrowingDice: boolean;
  throwKey: number;
  thrownDiceFaces: DiceRollResult | null;
  activeCardDraw?: { deck: 'chance' | 'chest'; key: number } | null;
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
  myPlayerId = null,
  isSpectator = false,
  isExpandedView = false,
  showThrownDiceOverlay,
  isThrowingDice,
  throwKey,
  thrownDiceFaces,
  activeCardDraw = null,
}: BoardProps) {
  const currentPlayer = getCurrentPlayer(gameState);
  const currentRound = getCurrentRoundNumber(gameState);
  const rentMultiplier = getRentInflationMultiplier(gameState);
  const maxRounds = gameState.rules?.maxRounds ?? null;
  const hasOwnPawn = Boolean(myPlayerId && !isSpectator);
  const [cameraMode, setCameraMode] = useState<'isometric' | 'topdown'>('isometric');
  const [followMode, setFollowMode] = useState<'owner' | 'off'>(() =>
    Boolean(myPlayerId && !isSpectator) ? 'owner' : 'off',
  );
  const [focusOwnerTrigger, setFocusOwnerTrigger] = useState(0);
  const [resetCameraTrigger, setResetCameraTrigger] = useState(0);

  useEffect(() => {
    if (!hasOwnPawn && followMode === 'owner') {
      setFollowMode('off');
    }
  }, [hasOwnPawn, followMode]);

  return (
    <div className="relative w-full">
      {/* 3D WebGL Tabletop Stage */}
      <div
        className={`tabletop-felt relative w-full overflow-hidden rounded-2xl border border-amber-500/30 shadow-2xl transition-[height] duration-300 ${
          isExpandedView
            ? 'h-[410px] sm:h-[510px] lg:h-[calc(100dvh-228px)] lg:min-h-[590px] lg:max-h-[820px]'
            : 'h-[410px] sm:h-[510px] lg:h-[575px]'
        }`}
      >
        <SuperMillionaire3DScene
          gameState={gameState}
          displayPositions={displayPositions}
          animatingPlayerId={animatingPlayerId}
          hopSpotlightTile={hopSpotlightTile}
          recentlyBuilt={recentlyBuilt}
          cashTransferFx={
            cashTransferFx
              ? {
                  key: cashTransferFx.key,
                  kind: cashTransferFx.kind,
                  amount: cashTransferFx.amount,
                  payerTileIndex: cashTransferFx.payerTileIndex,
                  recipientTileIndex: cashTransferFx.recipientTileIndex,
                }
              : null
          }
          selectedTileIndex={selectedTileIndex}
          onSelectTile={onSelectTile}
          myPlayerId={myPlayerId}
          isSpectator={isSpectator}
          cameraMode={cameraMode}
          followMode={followMode}
          focusOwnerTrigger={focusOwnerTrigger}
          resetCameraTrigger={resetCameraTrigger}
          isThrowingDice={isThrowingDice}
          throwKey={throwKey}
          thrownDiceFaces={thrownDiceFaces}
          activeCardDraw={activeCardDraw}
        />

        {/* Top Floating Bar: Turn Chip + Unified Segmented Camera Controls */}
        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 z-20 flex items-center justify-between gap-2 sm:inset-x-3.5 sm:top-3">
          {/* Active Turn Chip */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-stone-950/82 px-2.5 py-1 text-[11px] font-semibold text-amber-100 shadow-lg backdrop-blur-md sm:px-3 sm:text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/60"
                style={{ backgroundColor: currentPlayer?.color ?? '#E3BE3B' }}
              />
              <span className="max-w-[180px] truncate sm:max-w-[260px]">
                {gameState.phase === 'TURN_ORDER_ROLL' ? (
                  <>
                    จัดลำดับรอบ{' '}
                    <span className="mono-num font-bold text-amber-300">
                      {gameState.turnOrder?.round ?? 1}
                    </span>{' '}
                    • {currentPlayer?.name}
                  </>
                ) : (
                  <>
                    รอบที่{' '}
                    <span className="mono-num font-bold text-amber-300">
                      {maxRounds ? `${currentRound}/${maxRounds}` : currentRound}
                    </span>{' '}
                    • ตาที่{' '}
                    <span className="mono-num font-bold text-amber-300">
                      {gameState.turnNumber}
                    </span>{' '}
                    • {currentPlayer?.name}
                  </>
                )}
              </span>
            </div>

            {rentMultiplier > 1 && (
              <div className="inline-flex items-center gap-1 rounded-full border border-orange-400/60 bg-orange-950/88 px-2.5 py-1 text-[11px] font-extrabold text-amber-200 shadow-lg backdrop-blur-md">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                <span className="mono-num">ค่าเช่า ×{rentMultiplier}</span>
              </div>
            )}
          </div>

          {/* Unified Segmented Camera Bar */}
          <div
            className="pointer-events-auto inline-flex items-center divide-x divide-amber-500/20 rounded-xl border border-amber-400/30 bg-stone-950/85 p-0.5 shadow-lg backdrop-blur-md"
            title="ลากเพื่อหมุนกระดาน • สโครลเพื่อซูม • แตะช่องเพื่อเปิดโฉนด"
          >
            <button
              type="button"
              onClick={() =>
                setCameraMode((m) => (m === 'isometric' ? 'topdown' : 'isometric'))
              }
              className={`inline-flex min-h-[30px] items-center gap-1 rounded-l-lg px-2.5 py-1 text-[11px] font-semibold transition sm:text-xs ${
                cameraMode === 'isometric'
                  ? 'bg-amber-950/90 text-amber-200'
                  : 'text-stone-300 hover:text-amber-100'
              }`}
              title="สลับมุมมองกล้อง 3D / มุมมองด้านบน"
            >
              {cameraMode === 'isometric' ? (
                <Box className="h-3.5 w-3.5 text-amber-300" />
              ) : (
                <Layers className="h-3.5 w-3.5" />
              )}
              <span>{cameraMode === 'isometric' ? '2.5D' : '2D บน'}</span>
            </button>

            {hasOwnPawn && (
              <button
                type="button"
                onClick={() => {
                  setCameraMode('isometric');
                  setFollowMode((m) => {
                    const next = m === 'owner' ? 'off' : 'owner';
                    if (next === 'owner') setFocusOwnerTrigger((n) => n + 1);
                    return next;
                  });
                }}
                className={`inline-flex min-h-[30px] items-center gap-1 px-2.5 py-1 text-[11px] font-semibold transition sm:text-xs ${
                  followMode === 'owner'
                    ? 'bg-amber-500/90 text-stone-950'
                    : 'text-amber-200/90 hover:bg-stone-800/80 hover:text-amber-100'
                }`}
                title="กล้องติดตามตามหลังตัวละครของคุณอย่างนุ่มนวลในเทิร์นของคุณ (ไม่หมุนเหวี่ยงรอบกระดาน)"
              >
                <LocateFixed className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ตามหลังหมากฉัน</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setResetCameraTrigger((n) => n + 1)}
              className="inline-flex min-h-[30px] items-center gap-1 rounded-r-lg px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-stone-800/80 sm:text-xs"
              title="รีเซ็ตมุมกล้องดูภาพรวมทั้งกระดาน"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">รีเซ็ต</span>
            </button>
          </div>
        </div>

        {/* Top-Center Cash Transfer Notification Pill */}
        {cashTransferFx && (
          <div
            key={cashTransferFx.key}
            className="pointer-events-none absolute top-13 left-1/2 z-30 w-max max-w-[92%] -translate-x-1/2 sm:top-12"
          >
            <div
              className={`animate-cash-gain rounded-full border-2 px-4 py-1.5 text-center text-xs font-extrabold shadow-2xl backdrop-blur-md sm:text-sm ${
                cashTransferFx.kind === 'PASS_START'
                  ? 'border-emerald-300 bg-emerald-900/95 text-emerald-50 ring-2 ring-emerald-400/50'
                  : cashTransferFx.kind === 'TAX'
                    ? 'border-rose-300 bg-rose-900/95 text-rose-50 ring-2 ring-rose-400/50'
                    : 'border-amber-300 bg-stone-950/95 text-amber-100 ring-2 ring-amber-400/60'
              }`}
            >
              {cashTransferFx.message}
            </div>
          </div>
        )}

        {/* Smooth Center-Screen Dice Total Medallion (no formula text) */}
        {showThrownDiceOverlay && thrownDiceFaces && !isThrowingDice && (
          <div
            key={`dice-center-${throwKey}`}
            className="pointer-events-none absolute inset-0 z-25 flex items-center justify-center"
          >
            <div className="animate-dice-center-pop flex flex-col items-center">
              <div className="relative flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 border-amber-300/90 bg-[radial-gradient(circle_at_35%_25%,rgba(45,35,18,0.96),rgba(14,11,8,0.96))] shadow-[0_18px_45px_rgba(0,0,0,0.75),0_0_32px_rgba(251,191,36,0.45)] ring-4 ring-amber-400/25 backdrop-blur-md sm:h-28 sm:w-28">
                <span className="text-[10px] font-bold tracking-widest text-amber-200/80 uppercase">
                  {gameState.phase === 'TURN_ORDER_ROLL' ? 'แต้มจัดลำดับ' : 'เดินหน้า'}
                </span>
                <span className="mono-num -mt-0.5 text-4xl font-black leading-none text-amber-300 drop-shadow-[0_2px_12px_rgba(251,191,36,0.65)] sm:text-5xl">
                  {thrownDiceFaces.total}
                </span>
                <span className="text-[10px] font-bold text-amber-100/75">ช่อง</span>
              </div>
              {thrownDiceFaces.isDoubles && (
                <div className="-mt-2.5 rounded-full border border-amber-950 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 px-3.5 py-0.5 text-xs font-black tracking-wide text-stone-950 shadow-lg">
                  เบิ้ล! ทอยซ้ำได้
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
