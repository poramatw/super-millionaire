import { useState } from 'react';
import {
  JAIL_BAIL_AMOUNT,
  canBuildOnCurrentTile,
  canHostileTakeoverCurrentTile,
  canMortgageTile,
  canRollAgain,
  canRollTurnOrder,
  canSellHouseOnTile,
  canUnmortgageCurrentTile,
  getCurrentPlayer,
  getTile,
  type DiceRollResult,
  type GameAction,
  type GameState,
} from '@super-millionaire/shared';
import {
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Coins,
  Home,
  KeyRound,
  Landmark,
  Lock,
  RotateCcw,
  ShoppingBag,
  SkipForward,
  Skull,
  Zap,
} from 'lucide-react';
import { Dice3D, type DiceValue } from '../artwork';
import { formatBahtNumber } from '../utils/boardLayout';
import { DiceChargeButton } from './DiceChargeButton';

export interface TurnControlsProps {
  gameState: GameState;
  myPlayerId: string | null;
  isSpectator: boolean;
  isAnimatingMove: boolean;
  isThrowingDice?: boolean;
  throwKey?: number;
  thrownDiceFaces?: DiceRollResult | null;
  onDispatchAction: (action: GameAction) => void;
  onOpenTradeModal: () => void;
  onSelectTile: (tileIndex: number) => void;
}

export function getTurnRollButtonLabel(
  gameState: GameState,
  canRollDoubles: boolean,
): string {
  if (gameState.phase === 'TURN_ORDER_ROLL') {
    const round = gameState.turnOrder?.round ?? 1;
    return round > 1 ? `ทอยตัดสินเสมอ (รอบ ${round})!` : 'ทอยลูกเต๋าจัดลำดับ';
  }
  const currentPlayer = getCurrentPlayer(gameState);
  if (currentPlayer.inJail) return 'ทอยลุ้นเบิ้ลออกคุก (ไม่เบิ้ลหยุดเดิน)';
  if (canRollDoubles) return 'ทอยเบิ้ลอีกครั้ง!';
  return 'ทอยลูกเต๋า 2 ลูก';
}

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  const safeVal = Math.max(1, Math.min(6, Math.trunc(value))) as DiceValue;
  return <Dice3D value={safeVal} rolling={rolling} size={40} />;
}

export function TurnControls({
  gameState,
  myPlayerId,
  isSpectator,
  isAnimatingMove,
  isThrowingDice = false,
  throwKey = 0,
  thrownDiceFaces = null,
  onDispatchAction,
  onOpenTradeModal,
  onSelectTile,
}: TurnControlsProps) {
  const [confirmBankrupt, setConfirmBankrupt] = useState(false);

  const currentPlayer = getCurrentPlayer(gameState);
  const isMyTurn = Boolean(myPlayerId && currentPlayer.id === myPlayerId && !isSpectator);
  const effectivePlayerId = myPlayerId ?? currentPlayer.id;

  const canRollInitial =
    (gameState.phase === 'AWAIT_ROLL' && !gameState.hasRolledThisTurn) ||
    canRollTurnOrder(gameState, currentPlayer.id);
  const canRollDoubles = canRollAgain(gameState, currentPlayer.id);
  const showRollButton = isMyTurn && !isAnimatingMove && (canRollInitial || canRollDoubles);

  const buildCheck = isMyTurn
    ? canBuildOnCurrentTile(gameState, currentPlayer.id)
    : { allowed: false };
  const unmortgageCheck = isMyTurn
    ? canUnmortgageCurrentTile(gameState, currentPlayer.id)
    : { allowed: false };
  const takeoverCheck = isMyTurn
    ? canHostileTakeoverCurrentTile(gameState, currentPlayer.id)
    : { allowed: false };

  const currentTile = getTile(currentPlayer.position);
  const decisionTile =
    gameState.pendingDecisionTileIndex !== null
      ? getTile(gameState.pendingDecisionTileIndex)
      : null;

  const debt = gameState.pendingDebt;
  const isDebtResolver =
    isMyTurn &&
    gameState.phase === 'AWAIT_DEBT_RESOLUTION' &&
    debt?.debtorId === currentPlayer.id;

  const mortgageCandidates = isDebtResolver
    ? Object.values(gameState.deeds).filter(
        (d) =>
          d.ownerId === currentPlayer.id &&
          !d.isMortgaged &&
          canMortgageTile(gameState, currentPlayer.id, d.tileIndex).allowed,
      )
    : [];

  const sellCandidates = isDebtResolver
    ? Object.values(gameState.deeds).filter(
        (d) =>
          d.ownerId === currentPlayer.id &&
          (d.houses > 0 || d.hasHotel) &&
          canSellHouseOnTile(gameState, currentPlayer.id, d.tileIndex).allowed,
      )
    : [];

  const canEndTurn =
    isMyTurn &&
    !isAnimatingMove &&
    gameState.phase === 'ACTION_PHASE' &&
    !canRollAgain(gameState, currentPlayer.id);

  const canProposeTrade =
    isMyTurn &&
    (gameState.phase === 'AWAIT_ROLL' || gameState.phase === 'ACTION_PHASE');

  const phaseText: Record<GameState['phase'], string> = {
    LOBBY: 'รอเริ่มเกม',
    TURN_ORDER_ROLL:
      (gameState.turnOrder?.round ?? 1) > 1
        ? `รอบตัดสินเสมอ #${gameState.turnOrder?.round} — ทอยหาผู้เริ่มคนแรก`
        : 'สุ่มลำดับการเริ่มเกม — ทอยหาแต้มสูงสุด',
    AWAIT_ROLL: currentPlayer.inJail ? 'อยู่ในคุก — เลือกวิธีออกหรือทอยลูกเต๋า' : 'รอทอยลูกเต๋า 2 ลูก',
    AWAIT_DECISION: 'ตัดสินใจซื้อโฉนด (ไม่มีการประมูล)',
    AWAIT_DEBT_RESOLUTION: 'ต้องชำระหนี้ — ขายบ้านหรือจำนองโฉนด',
    ACTION_PHASE: canRollDoubles
      ? 'ทอยเบิ้ล! จัดการทรัพย์สินหรือทอยต่อ'
      : 'จัดการโฉนดบนช่องที่ยืน แล้วกดจบเทิร์น',
    GAME_OVER: 'จบเกมแล้ว',
  };

  const showDiceValue =
    isThrowingDice || gameState.hasRolledThisTurn || gameState.phase === 'TURN_ORDER_ROLL';
  const activeDice =
    showDiceValue && isThrowingDice && thrownDiceFaces
      ? thrownDiceFaces
      : showDiceValue
        ? gameState.lastDice
        : null;
  const rollLabel = getTurnRollButtonLabel(gameState, canRollDoubles);

  return (
    <div className="luxury-glass-panel flex flex-col gap-3 rounded-2xl p-3.5 text-amber-50">
      {/* Turn Status Header + 2-Dice Tray */}
      <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-white/50 shadow-[0_0_8px_currentColor]"
              style={{ backgroundColor: currentPlayer.color, color: currentPlayer.color }}
            />
            <span className="truncate font-[var(--font-display)] text-sm font-extrabold text-amber-100">
              {isMyTurn ? 'ตาของคุณ!' : `ตาของ ${currentPlayer.name}`}
            </span>
            {currentPlayer.kind === 'bot' && (
              <span className="rounded-md border border-amber-500/35 bg-amber-950/75 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                AI
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs font-medium text-amber-100/75">
            {phaseText[gameState.phase]}
          </p>
          {gameState.phase === 'TURN_ORDER_ROLL' ? (
            <div className="mt-1 text-[11px] font-semibold text-amber-300/90">
              กำลังจัดลำดับการเริ่มเกม (ทุกคนอยู่ที่จุดเริ่มต้น)
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSelectTile(currentTile.index)}
              className="mt-1 text-left text-[11px] font-semibold text-emerald-300 underline decoration-dotted underline-offset-2 hover:text-emerald-200"
            >
              ยืนอยู่ที่: {currentTile.deedNumber !== undefined ? `#${currentTile.deedNumber} ` : ''}
              {currentTile.name}
            </button>
          )}
        </div>

        {/* 2-Dice Tray */}
        <div
          key={throwKey}
          className="flex shrink-0 flex-col items-center gap-1 rounded-xl border border-amber-400/35 bg-[radial-gradient(circle_at_top,#1f7341,#0f4023)] px-2.5 py-2 shadow-inner"
        >
          {activeDice ? (
            <>
              <div className="flex items-center gap-1.5">
                <div className={isThrowingDice ? 'animate-dice-throw-a' : ''}>
                  <DiceFace value={activeDice.die1} rolling={isThrowingDice} />
                </div>
                <div className={isThrowingDice ? 'animate-dice-throw-b' : ''}>
                  <DiceFace value={activeDice.die2} rolling={isThrowingDice} />
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-100">
                <span className="mono-num">
                  {isThrowingDice ? 'กำลังทอย...' : `รวม ${activeDice.total}`}
                </span>
                {!isThrowingDice && activeDice.isDoubles && (
                  <span className="rounded bg-amber-300 px-1 text-stone-950">เบิ้ล!</span>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-11 w-24 items-center justify-center text-[11px] font-semibold text-amber-100/80">
              พร้อมทอยเต๋า
            </div>
          )}
        </div>
      </div>

      {/* Waiting indicator when viewing another player or spectator */}
      {!isMyTurn && gameState.phase !== 'GAME_OVER' && isSpectator && (
        <div className="rounded-xl border border-amber-500/20 bg-stone-950/55 px-3 py-1.5 text-center text-[11px] font-medium text-amber-200/80">
          โหมดผู้ชม — บอทและผู้เล่นกำลังเดินเกมตามลำดับ
        </div>
      )}

      {/* Jail Detention Alert Banner (always visible when current player is stopped in Jail) */}
      {currentPlayer.inJail && (
        <div className="rounded-xl border border-amber-400/50 bg-gradient-to-r from-[#2c1512]/90 via-[#381b14]/85 to-[#2c1512]/90 px-3 py-2 text-xs text-amber-100 shadow-inner">
          <div className="flex items-center gap-2 font-extrabold text-amber-300">
            <Lock className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              {currentPlayer.name} ติดคุก — ถูกหยุดเดิน (ตาที่{' '}
              {Math.min(3, currentPlayer.jailTurns + 1)}/3)
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-amber-100/80">
            {gameState.hasRolledThisTurn
              ? 'ทอยไม่เบิ้ล จึงถูกหยุดเดินอยู่ในคุกตานี้ — กดจบตาเพื่อผ่านเทิร์น'
              : `ทอยเบิ้ล 2 ลูกเพื่อออกคุกทันที หรือจ่ายประกันตัว ฿${JAIL_BAIL_AMOUNT} / ใช้บัตรพ้นคุก (ถ้าไม่เบิ้ลจะหยุดเดิน)`}
          </p>
        </div>
      )}

      {/* Jail Pre-Roll Actions (Desktop only; Mobile uses MobileBottomDock) */}
      {isMyTurn &&
        !isAnimatingMove &&
        gameState.phase === 'AWAIT_ROLL' &&
        currentPlayer.inJail && (
          <div className="hidden lg:grid lg:grid-cols-2 lg:gap-2">
            <button
              type="button"
              disabled={currentPlayer.cash < JAIL_BAIL_AMOUNT}
              onClick={() =>
                onDispatchAction({ type: 'PAY_JAIL_BAIL', playerId: effectivePlayerId })
              }
              className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-amber-700 bg-amber-400 px-3 py-2.5 text-xs font-extrabold text-stone-950 shadow disabled:opacity-45"
            >
              <Coins className="h-4 w-4" />
              <span>จ่ายค่าปรับ ฿{JAIL_BAIL_AMOUNT}</span>
            </button>

            {currentPlayer.jailFreeCards > 0 && (
              <button
                type="button"
                onClick={() =>
                  onDispatchAction({ type: 'USE_JAIL_CARD', playerId: effectivePlayerId })
                }
                className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-sky-800 bg-sky-600 px-3 py-2.5 text-xs font-extrabold text-white shadow"
              >
                <KeyRound className="h-4 w-4" />
                <span>ใช้บัตรพ้นคุก ({currentPlayer.jailFreeCards})</span>
              </button>
            )}
          </div>
        )}

      {/* Roll Dice Button with Charge Gauge (Desktop only; Mobile uses MobileBottomDock) */}
      {showRollButton && (
        <DiceChargeButton
          label={rollLabel}
          enableCharge={gameState.phase !== 'TURN_ORDER_ROLL' && !currentPlayer.inJail}
          currentTileIndex={currentPlayer.position}
          onRoll={(powerRange) =>
            onDispatchAction({
              type: 'ROLL_DICE',
              playerId: effectivePlayerId,
              powerRange,
            })
          }
        />
      )}

      {/* Buy / Decline Decision (NO AUCTION) (Desktop only; Mobile uses MobileBottomDock) */}
      {isMyTurn &&
        !isAnimatingMove &&
        gameState.phase === 'AWAIT_DECISION' &&
        decisionTile && (
          <div className="hidden lg:block space-y-2.5 rounded-xl border border-amber-400/45 bg-stone-950/75 p-3 shadow-inner">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-amber-100">
                {decisionTile.deedNumber !== undefined ? `#${decisionTile.deedNumber} ` : ''}
                {decisionTile.name}
              </span>
              <span className="mono-num font-extrabold text-emerald-300">
                ฿{formatBahtNumber(decisionTile.price ?? 0)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={currentPlayer.cash < (decisionTile.price ?? 0)}
                onClick={() =>
                  onDispatchAction({ type: 'BUY_CURRENT_TILE', playerId: effectivePlayerId })
                }
                className="tactile-btn flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-emerald-400/60 bg-gradient-to-b from-[#21874c] to-[#14532e] px-3 py-2 text-sm font-extrabold text-amber-50 shadow disabled:opacity-45"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>ซื้อโฉนด</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onDispatchAction({ type: 'DECLINE_CURRENT_TILE', playerId: effectivePlayerId })
                }
                className="tactile-btn flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-stone-600 bg-stone-800/90 px-3 py-2 text-sm font-bold text-stone-200 hover:bg-stone-700"
              >
                <SkipForward className="h-4 w-4" />
                <span>ไม่ซื้อ</span>
              </button>
            </div>
          </div>
        )}

      {/* Action Phase: Land-on-own-tile Build / Unmortgage / Hostile Takeover (Desktop only; Mobile uses MobileBottomDock) */}
      {isMyTurn && !isAnimatingMove && gameState.phase === 'ACTION_PHASE' && (
        <div className="hidden lg:block space-y-2">
          {(buildCheck.allowed || unmortgageCheck.allowed || takeoverCheck.allowed) && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {buildCheck.allowed && (
                <button
                  type="button"
                  onClick={() =>
                    onDispatchAction({ type: 'BUILD_ON_CURRENT_TILE', playerId: effectivePlayerId })
                  }
                  className={`tactile-btn flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold text-amber-50 shadow ${
                    buildCheck.isHotelUpgrade
                      ? 'border-amber-300/60 bg-gradient-to-b from-[#b91c1c] to-[#7f1d1d]'
                      : 'border-amber-400/60 bg-gradient-to-b from-[#b45309] to-[#78350f]'
                  }`}
                >
                  {buildCheck.isHotelUpgrade ? (
                    <Building2 className="h-4 w-4 text-amber-200" />
                  ) : (
                    <Home className="h-4 w-4 text-amber-200" />
                  )}
                  <span>
                    {buildCheck.isHotelUpgrade ? 'สร้างโรงแรม' : 'สร้างบ้าน'} (฿
                    {formatBahtNumber(buildCheck.cost ?? 0)})
                  </span>
                </button>
              )}

              {unmortgageCheck.allowed && (
                <button
                  type="button"
                  onClick={() =>
                    onDispatchAction({
                      type: 'UNMORTGAGE_CURRENT_TILE',
                      playerId: effectivePlayerId,
                    })
                  }
                  className="tactile-btn flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-emerald-400/50 bg-gradient-to-b from-[#1f7d47] to-[#14532e] px-3 py-2 text-xs font-extrabold text-amber-50 shadow"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>ไถ่ถอนจำนอง (฿{formatBahtNumber(unmortgageCheck.cost ?? 0)})</span>
                </button>
              )}

              {takeoverCheck.allowed && (
                <button
                  type="button"
                  onClick={() =>
                    onDispatchAction({
                      type: 'HOSTILE_TAKEOVER_CURRENT_TILE',
                      playerId: effectivePlayerId,
                    })
                  }
                  className="tactile-btn sm:col-span-2 flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-amber-300/80 bg-gradient-to-r from-[#7c2d12] via-[#b45309] to-[#7c2d12] px-3 py-2 text-xs font-extrabold text-amber-50 shadow-[0_0_16px_rgba(245,158,11,0.3)] hover:brightness-110"
                >
                  <Zap className="h-4 w-4 text-amber-300" />
                  <span>
                    ซื้อฮุบโฉนด 2× ทันที (฿{formatBahtNumber(takeoverCheck.cost ?? 0)})
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Debt Resolution Panel */}
      {isDebtResolver && debt && (
        <div className="space-y-2.5 rounded-xl border border-rose-400/50 bg-rose-950/75 p-3 text-rose-50">
          <div className="flex items-start gap-2 text-rose-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div className="text-xs">
              <div className="font-extrabold text-amber-200">
                ค้างชำระ <span className="mono-num">฿{formatBahtNumber(debt.amount)}</span> ({debt.reason})
              </div>
              <div className="mt-0.5 text-rose-200/90">
                เงินสดปัจจุบัน: <span className="mono-num font-bold text-emerald-300">฿{formatBahtNumber(currentPlayer.cash)}</span> — กรุณาขายบ้านหรือจำนองโฉนดเพื่อชำระหนี้
              </div>
            </div>
          </div>

          {(sellCandidates.length > 0 || mortgageCandidates.length > 0) && (
            <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
              {sellCandidates.map((deed) => {
                const tile = getTile(deed.tileIndex);
                const info = canSellHouseOnTile(gameState, currentPlayer.id, deed.tileIndex);
                return (
                  <button
                    key={`sell-${deed.tileIndex}`}
                    type="button"
                    onClick={() =>
                      onDispatchAction({
                        type: 'SELL_HOUSE_ON_TILE',
                        playerId: effectivePlayerId,
                        tileIndex: deed.tileIndex,
                      })
                    }
                    className="tactile-btn flex min-h-[40px] w-full items-center justify-between rounded-lg border border-amber-400/40 bg-stone-950/75 px-2.5 py-1.5 text-xs font-bold text-amber-100 hover:bg-stone-900"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Home className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                      ขายสิ่งปลูกสร้าง: #{tile.deedNumber} {tile.name}
                    </span>
                    <span className="mono-num shrink-0 text-emerald-300">
                      +฿{formatBahtNumber(info.refund ?? 0)}
                    </span>
                  </button>
                );
              })}

              {mortgageCandidates.map((deed) => {
                const tile = getTile(deed.tileIndex);
                const info = canMortgageTile(gameState, currentPlayer.id, deed.tileIndex);
                return (
                  <button
                    key={`mort-${deed.tileIndex}`}
                    type="button"
                    onClick={() =>
                      onDispatchAction({
                        type: 'MORTGAGE_TILE',
                        playerId: effectivePlayerId,
                        tileIndex: deed.tileIndex,
                      })
                    }
                    className="tactile-btn flex min-h-[40px] w-full items-center justify-between rounded-lg border border-rose-400/40 bg-stone-950/75 px-2.5 py-1.5 text-xs font-bold text-rose-100 hover:bg-stone-900"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Landmark className="h-3.5 w-3.5 shrink-0 text-rose-300" />
                      จำนอง: #{tile.deedNumber} {tile.name}
                    </span>
                    <span className="mono-num shrink-0 text-emerald-300">
                      +฿{formatBahtNumber(info.proceeds ?? 0)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!confirmBankrupt ? (
            <button
              type="button"
              onClick={() => setConfirmBankrupt(true)}
              className="tactile-btn flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-rose-900 bg-rose-700 px-3 py-2 text-xs font-extrabold text-white hover:bg-rose-800"
            >
              <Skull className="h-4 w-4" />
              <span>ประกาศล้มละลาย</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmBankrupt(false);
                  onDispatchAction({ type: 'DECLARE_BANKRUPTCY', playerId: effectivePlayerId });
                }}
                className="tactile-btn flex-1 rounded-xl bg-red-700 px-3 py-2 text-xs font-extrabold text-white"
              >
                ยืนยันล้มละลาย
              </button>
              <button
                type="button"
                onClick={() => setConfirmBankrupt(false)}
                className="tactile-btn rounded-xl border border-stone-400 bg-white px-3 py-2 text-xs font-bold text-stone-800"
              >
                ยกเลิก
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trade & End Turn Footer (End Turn desktop-only; Mobile uses MobileBottomDock) */}
      {(canProposeTrade || canEndTurn) && (
        <div
          className={`${canProposeTrade ? 'grid' : 'hidden lg:grid'} grid-cols-1 gap-2 sm:grid-cols-2`}
        >
          {canProposeTrade && (
            <button
              type="button"
              onClick={onOpenTradeModal}
              className="tactile-btn sm:col-span-2 lg:col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-sky-400/50 bg-gradient-to-b from-[#2260aa] to-[#163f72] px-3 py-2.5 text-sm font-bold text-white shadow hover:brightness-110"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>ยื่นแลกเปลี่ยน</span>
            </button>
          )}

          {canEndTurn && (
            <button
              type="button"
              onClick={() => onDispatchAction({ type: 'END_TURN', playerId: effectivePlayerId })}
              className="tactile-btn hidden lg:flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/50 bg-gradient-to-b from-[#d92b35] to-[#9e1a22] px-4 py-2.5 text-sm font-extrabold text-white shadow-md hover:brightness-110"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {currentPlayer.inJail && gameState.hasRolledThisTurn
                  ? 'จบตา (หยุดในคุกต่อ)'
                  : 'จบเทิร์น'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
