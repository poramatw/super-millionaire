import { useState } from 'react';
import {
  getCurrentPlayer,
  type DiceRollResult,
  type GameState,
} from '@super-millionaire/shared';
import { Box, Crosshair, Layers, RotateCcw } from 'lucide-react';
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
  showThrownDiceOverlay,
  isThrowingDice,
  throwKey,
  thrownDiceFaces,
  activeCardDraw = null,
}: BoardProps) {
  const [cameraMode, setCameraMode] = useState<'isometric' | 'topdown'>('isometric');
  const [followActiveToken, setFollowActiveToken] = useState(true);
  const [resetCameraTrigger, setResetCameraTrigger] = useState(0);

  const currentPlayer = getCurrentPlayer(gameState);

  return (
    <div className="relative w-full">
      {/* 3D WebGL Tabletop Stage */}
      <div className="tabletop-felt relative h-[430px] w-full overflow-hidden rounded-2xl border border-amber-500/30 shadow-2xl sm:h-[540px] lg:h-[620px]">
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
          cameraMode={cameraMode}
          followActiveToken={followActiveToken}
          resetCameraTrigger={resetCameraTrigger}
          isThrowingDice={isThrowingDice}
          throwKey={throwKey}
          thrownDiceFaces={thrownDiceFaces}
          activeCardDraw={activeCardDraw}
        />

        {/* Top Floating Bar: Turn Status + 3D Camera Controls */}
        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 z-20 flex flex-wrap items-center justify-between gap-2 sm:inset-x-3.5 sm:top-3">
          {/* Active Turn Pill */}
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-stone-950/85 px-3 py-1 text-[11px] font-semibold text-amber-100 shadow-lg backdrop-blur-md sm:text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/60"
              style={{ backgroundColor: currentPlayer?.color ?? '#E3BE3B' }}
            />
            <span className="max-w-[140px] truncate sm:max-w-[200px]">
              ตาที่ <span className="mono-num">{gameState.turnNumber}</span> •{' '}
              {currentPlayer?.name}
            </span>
          </div>

          {/* 3D Camera & Tracking Controls */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setCameraMode((m) => (m === 'isometric' ? 'topdown' : 'isometric'))
              }
              className={`tactile-btn inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold shadow-md backdrop-blur-md sm:text-xs ${
                cameraMode === 'isometric'
                  ? 'border-amber-300/70 bg-amber-950/90 text-amber-100'
                  : 'border-stone-600 bg-stone-900/90 text-stone-200'
              }`}
              title="สลับมุมมองกล้อง 3D / มุมมองด้านบน"
            >
              {cameraMode === 'isometric' ? (
                <Box className="h-3.5 w-3.5 text-amber-300" />
              ) : (
                <Layers className="h-3.5 w-3.5" />
              )}
              <span>{cameraMode === 'isometric' ? '2.5D โต๊ะจริง' : 'มุมมองบน'}</span>
            </button>

            <button
              type="button"
              onClick={() => setFollowActiveToken((v) => !v)}
              className={`tactile-btn inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold shadow-md backdrop-blur-md sm:text-xs ${
                followActiveToken
                  ? 'border-emerald-400/60 bg-emerald-950/90 text-emerald-100'
                  : 'border-stone-600 bg-stone-900/90 text-stone-300'
              }`}
              title="เลื่อนกล้องตามตัวเดินขณะทอยเต๋า"
            >
              <Crosshair className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ติดตามตัวเดิน</span>
            </button>

            <button
              type="button"
              onClick={() => setResetCameraTrigger((n) => n + 1)}
              className="tactile-btn inline-flex items-center gap-1 rounded-lg border border-stone-600 bg-stone-900/90 px-2.5 py-1 text-[11px] font-semibold text-amber-100 shadow-md backdrop-blur-md hover:bg-stone-800 sm:text-xs"
              title="รีเซ็ตมุมกล้องกลับค่าเริ่มต้น"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">รีเซ็ตมุมกล้อง</span>
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

        {/* Dice Result Floating Badge (complements 3D tumbling dice on board) */}
        {showThrownDiceOverlay && thrownDiceFaces && !isThrowingDice && (
          <div
            key={`dice-pill-${throwKey}`}
            className="pointer-events-none absolute top-13 right-3 z-20 flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-stone-950/88 px-3 py-1 text-xs font-extrabold text-amber-100 shadow-lg backdrop-blur-md sm:top-12"
          >
            <span className="mono-num">
              {thrownDiceFaces.die1} + {thrownDiceFaces.die2} = {thrownDiceFaces.total} แต้ม
            </span>
            {thrownDiceFaces.isDoubles && (
              <span className="rounded-full bg-amber-300 px-1.5 py-0.2 text-[10px] font-black text-stone-950">
                เบิ้ล!
              </span>
            )}
          </div>
        )}

        {/* Subtle Bottom-Right Camera Hint */}
        <div className="pointer-events-none absolute right-3 bottom-2 hidden rounded-full bg-stone-950/65 px-2.5 py-0.5 text-[10px] text-amber-200/75 backdrop-blur-xs sm:block">
          ลากเพื่อหมุนกระดาน • สโครลเพื่อซูม • แตะช่องเพื่อเปิดโฉนด
        </div>
      </div>
    </div>
  );
}
