import { useState } from 'react';
import {
  JAIL_BAIL_AMOUNT,
  canBuildOnCurrentTile,
  canMortgageTile,
  canRollAgain,
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
  Dices,
  Home,
  KeyRound,
  Landmark,
  RotateCcw,
  ShoppingBag,
  SkipForward,
  Skull,
} from 'lucide-react';
import { Dice3D, type DiceValue } from '../artwork';
import { formatBahtNumber } from '../utils/boardLayout';

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

  const canRollInitial = gameState.phase === 'AWAIT_ROLL' && !gameState.hasRolledThisTurn;
  const canRollDoubles = canRollAgain(gameState, currentPlayer.id);
  const showRollButton = isMyTurn && !isAnimatingMove && (canRollInitial || canRollDoubles);

  const buildCheck = isMyTurn
    ? canBuildOnCurrentTile(gameState, currentPlayer.id)
    : { allowed: false };
  const unmortgageCheck = isMyTurn
    ? canUnmortgageCurrentTile(gameState, currentPlayer.id)
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
    AWAIT_ROLL: currentPlayer.inJail ? 'อยู่ในคุก — เลือกวิธีออกหรือทอยลูกเต๋า' : 'รอทอยลูกเต๋า 2 ลูก',
    AWAIT_DECISION: 'ตัดสินใจซื้อโฉนด (ไม่มีการประมูล)',
    AWAIT_DEBT_RESOLUTION: 'ต้องชำระหนี้ — ขายบ้านหรือจำนองโฉนด',
    ACTION_PHASE: canRollDoubles
      ? 'ทอยเบิ้ล! จัดการทรัพย์สินหรือทอยต่อ'
      : 'จัดการโฉนดบนช่องที่ยืน แล้วกดจบเทิร์น',
    GAME_OVER: 'จบเกมแล้ว',
  };

  const activeDice = isThrowingDice && thrownDiceFaces ? thrownDiceFaces : gameState.lastDice;

  return (
    <div className="cardstock-texture deed-card-bevel flex flex-col gap-3 rounded-2xl border-2 border-[#2a2118] p-3.5 text-[#1c1814]">
      {/* Turn Status Header + 2-Dice Tray */}
      <div className="flex items-center justify-between gap-3 border-b border-[#2a2118]/15 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-black/30"
              style={{ backgroundColor: currentPlayer.color }}
            />
            <span className="truncate font-[var(--font-display)] text-sm font-extrabold">
              {isMyTurn ? 'ตาของคุณ!' : `ตาของ ${currentPlayer.name}`}
            </span>
            {currentPlayer.kind === 'bot' && (
              <span className="rounded bg-purple-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                AI
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs font-medium text-stone-700">
            {phaseText[gameState.phase]}
          </p>
          <button
            type="button"
            onClick={() => onSelectTile(currentTile.index)}
            className="mt-1 text-left text-[11px] font-semibold text-[#1b7a43] underline decoration-dotted underline-offset-2 hover:brightness-90"
          >
            ยืนอยู่ที่: {currentTile.deedNumber !== undefined ? `#${currentTile.deedNumber} ` : ''}
            {currentTile.name}
          </button>
        </div>

        {/* 2-Dice Tray */}
        <div
          key={throwKey}
          className="flex shrink-0 flex-col items-center gap-1 rounded-xl border border-[#2a2118]/25 bg-[#1C6B3A] px-2.5 py-2 shadow-inner"
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

      {/* Waiting message when not my turn */}
      {!isMyTurn && gameState.phase !== 'GAME_OVER' && (
        <div className="rounded-xl border border-[#2a2118]/15 bg-[#ede1c4]/80 px-3 py-2 text-center text-xs font-semibold text-stone-700">
          {isSpectator
            ? 'คุณกำลังรับชมเกม (โหมดผู้ชม — บอท/ผู้เล่นกำลังดำเนินการ)'
            : `กำลังรอ ${currentPlayer.name} ตัดสินใจ (ไม่มีจับเวลา)`}
        </div>
      )}

      {/* Jail Pre-Roll Actions */}
      {isMyTurn &&
        !isAnimatingMove &&
        gameState.phase === 'AWAIT_ROLL' &&
        currentPlayer.inJail && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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

      {/* Roll Dice Button */}
      {showRollButton && (
        <button
          type="button"
          onClick={() => onDispatchAction({ type: 'ROLL_DICE', playerId: effectivePlayerId })}
          className="tactile-btn flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#143d25] bg-[#1b7a43] px-4 py-3 text-base font-extrabold text-amber-50 shadow-md hover:brightness-110"
        >
          <Dices className="h-5 w-5" />
          <span>{canRollDoubles ? 'ทอยเบิ้ลอีกครั้ง!' : 'ทอยลูกเต๋า 2 ลูก'}</span>
        </button>
      )}

      {/* Buy / Decline Decision (NO AUCTION) */}
      {isMyTurn &&
        !isAnimatingMove &&
        gameState.phase === 'AWAIT_DECISION' &&
        decisionTile && (
          <div className="space-y-2 rounded-xl border-2 border-amber-600/50 bg-amber-50 p-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-stone-900">
                {decisionTile.deedNumber !== undefined ? `#${decisionTile.deedNumber} ` : ''}
                {decisionTile.name}
              </span>
              <span className="mono-num font-extrabold text-[#1b7a43]">
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
                className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#143d25] bg-[#1b7a43] px-3 py-2.5 text-sm font-extrabold text-white shadow disabled:opacity-45"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>ซื้อโฉนด</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onDispatchAction({ type: 'DECLINE_CURRENT_TILE', playerId: effectivePlayerId })
                }
                className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-stone-500 bg-stone-200 px-3 py-2.5 text-sm font-bold text-stone-900 hover:bg-stone-300"
              >
                <SkipForward className="h-4 w-4" />
                <span>ไม่ซื้อ</span>
              </button>
            </div>
          </div>
        )}

      {/* Action Phase: Land-on-own-tile Build / Unmortgage */}
      {isMyTurn && !isAnimatingMove && gameState.phase === 'ACTION_PHASE' && (
        <div className="space-y-2">
          {(buildCheck.allowed || unmortgageCheck.allowed) && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {buildCheck.allowed && (
                <button
                  type="button"
                  onClick={() =>
                    onDispatchAction({ type: 'BUILD_ON_CURRENT_TILE', playerId: effectivePlayerId })
                  }
                  className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-pink-800 bg-pink-600 px-3 py-2.5 text-xs font-extrabold text-white shadow"
                >
                  {buildCheck.isHotelUpgrade ? (
                    <Building2 className="h-4 w-4" />
                  ) : (
                    <Home className="h-4 w-4" />
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
                  className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-800 bg-emerald-600 px-3 py-2.5 text-xs font-extrabold text-white shadow"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>ไถ่ถอนจำนอง (฿{formatBahtNumber(unmortgageCheck.cost ?? 0)})</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Debt Resolution Panel */}
      {isDebtResolver && debt && (
        <div className="space-y-2.5 rounded-xl border-2 border-rose-700 bg-rose-50 p-3">
          <div className="flex items-start gap-2 text-rose-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="text-xs">
              <div className="font-extrabold">
                ค้างชำระ <span className="mono-num">฿{formatBahtNumber(debt.amount)}</span> ({debt.reason})
              </div>
              <div className="mt-0.5 text-rose-800">
                เงินสดปัจจุบัน: <span className="mono-num font-bold">฿{formatBahtNumber(currentPlayer.cash)}</span> — กรุณาขายบ้านหรือจำนองโฉนดเพื่อชำระหนี้
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
                    className="tactile-btn flex w-full items-center justify-between rounded-lg border border-amber-700/40 bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-200"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Home className="h-3.5 w-3.5 shrink-0" />
                      ขายสิ่งปลูกสร้าง: #{tile.deedNumber} {tile.name}
                    </span>
                    <span className="mono-num shrink-0 text-emerald-800">
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
                    className="tactile-btn flex w-full items-center justify-between rounded-lg border border-rose-700/40 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-950 hover:bg-rose-100"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Landmark className="h-3.5 w-3.5 shrink-0" />
                      จำนอง: #{tile.deedNumber} {tile.name}
                    </span>
                    <span className="mono-num shrink-0 text-emerald-800">
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

      {/* Trade & End Turn Footer */}
      {(canProposeTrade || canEndTurn) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {canProposeTrade && (
            <button
              type="button"
              onClick={onOpenTradeModal}
              className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#1c4e8a] bg-[#1c4e8a] px-3 py-2.5 text-sm font-bold text-white shadow hover:brightness-110"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>ยื่นแลกเปลี่ยน</span>
            </button>
          )}

          {canEndTurn && (
            <button
              type="button"
              onClick={() => onDispatchAction({ type: 'END_TURN', playerId: effectivePlayerId })}
              className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#7f1319] bg-[#c8232c] px-4 py-2.5 text-sm font-extrabold text-white shadow-md hover:brightness-110"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>จบเทิร์น</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
