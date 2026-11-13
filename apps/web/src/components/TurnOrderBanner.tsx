import type { DiceRollResult, GameState } from '@super-millionaire/shared';
import { Crown, Dices, Sparkles, Swords, X } from 'lucide-react';
import { PlayerToken } from '../artwork';

export interface TurnOrderBannerProps {
  gameState: GameState;
  myPlayerId: string | null;
  isSpectator: boolean;
  visible: boolean;
  onDismissWinner?: () => void;
}

/**
 * Compact tabletop banner displaying pre-game dice roll turn-order rounds,
 * highest-tie rerolls, and the starting-player announcement without occluding the 3D dice tray.
 */
export function TurnOrderBanner({
  gameState,
  myPlayerId,
  isSpectator,
  visible,
  onDismissWinner,
}: TurnOrderBannerProps) {
  const turnOrder = gameState.turnOrder;
  if (!visible || !turnOrder) return null;

  const isRollingPhase = gameState.phase === 'TURN_ORDER_ROLL';
  const currentRoller = gameState.players[gameState.currentTurnIndex];
  const contenderSet = new Set(turnOrder.contenderIds);
  const lastHistoryRound =
    turnOrder.history.length > 0 ? turnOrder.history[turnOrder.history.length - 1]! : null;

  const lastRoundByPlayer = new Map<string, DiceRollResult>();
  for (const h of turnOrder.history) {
    for (const r of h.rolls) {
      lastRoundByPlayer.set(r.playerId, r.roll);
    }
  }

  const activeRolls = Object.entries(turnOrder.rolls);
  const leadingTotal =
    activeRolls.length > 0 ? Math.max(...activeRolls.map(([, r]) => r.total)) : null;

  const winnerPlayer = turnOrder.winnerId
    ? gameState.players.find((p) => p.id === turnOrder.winnerId)
    : null;
  const isTieBreakRound = isRollingPhase && turnOrder.round > 1;
  const tiedContenderNames = turnOrder.contenderIds
    .map((id) => gameState.players.find((p) => p.id === id)?.name ?? id)
    .join(', ');

  return (
    <div
      role="region"
      aria-label="ลำดับการเริ่มเกม"
      className={`luxury-glass-panel rounded-2xl border px-3 py-2.5 shadow-xl transition ${
        winnerPlayer
          ? 'border-emerald-400/70 bg-gradient-to-r from-[#13291b]/95 via-[#182e20]/95 to-[#211b10]/95'
          : isTieBreakRound
            ? 'border-amber-400/75 bg-gradient-to-r from-[#2b1c0e]/95 via-[#22170e]/95 to-[#182016]/95'
            : 'border-amber-500/45 bg-gradient-to-r from-[#1d170f]/95 to-[#132117]/95'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {winnerPlayer ? (
              <Crown className="h-4 w-4 shrink-0 text-amber-300" />
            ) : isTieBreakRound ? (
              <Swords className="h-4 w-4 shrink-0 text-amber-300" />
            ) : (
              <Dices className="h-4 w-4 shrink-0 text-emerald-300" />
            )}
            <span className="font-[var(--font-display)] text-xs font-extrabold text-amber-100 sm:text-sm">
              {winnerPlayer
                ? `${winnerPlayer.name} ชนะจัดลำดับ — ได้เริ่มเดินเป็นคนแรก!`
                : isTieBreakRound
                  ? `รอบตัดสินเสมอ #${turnOrder.round} • เสมอกันที่ ${lastHistoryRound?.highestTotal ?? ''} แต้ม`
                  : `สุ่มลำดับการเริ่มเกม • รอบที่ ${turnOrder.round}`}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] font-medium text-amber-100/75">
            {winnerPlayer
              ? `ทอยได้สูงสุด ${lastHistoryRound?.highestTotal ?? ''} แต้ม (เดินวนตามลำดับที่นั่งถัดจากผู้ชนะ)`
              : isTieBreakRound
                ? `เฉพาะผู้ที่ได้สูงสุดเท่ากัน (${tiedContenderNames}) ทอยใหม่อีกครั้ง`
                : 'ผู้ทอยได้แต้มรวมมากที่สุดเริ่มก่อน — หากได้เท่ากันจะทอยตัดสินเฉพาะผู้ที่ได้สูงสุด'}
          </p>
        </div>

        {winnerPlayer && onDismissWinner && (
          <button
            type="button"
            onClick={onDismissWinner}
            className="tactile-btn inline-flex items-center gap-1 rounded-lg border border-emerald-400/50 bg-emerald-800/80 px-2.5 py-1 text-[11px] font-bold text-emerald-50 hover:bg-emerald-700"
          >
            <Sparkles className="h-3 w-3" />
            <span>เริ่มตาที่ 1</span>
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {gameState.players.map((p) => {
          const inCurrentRound = contenderSet.has(p.id);
          const roundRoll = turnOrder.rolls[p.id];
          const prevRoll = lastRoundByPlayer.get(p.id);
          const isWinner = winnerPlayer?.id === p.id;
          const isCurrentTurn =
            isRollingPhase && currentRoller?.id === p.id && inCurrentRound && !roundRoll;
          const isLeading =
            inCurrentRound &&
            roundRoll !== undefined &&
            leadingTotal !== null &&
            roundRoll.total === leadingTotal;
          const isMe = !isSpectator && myPlayerId === p.id;

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between gap-1.5 rounded-xl border px-2 py-1.5 text-xs transition ${
                isWinner
                  ? 'border-emerald-300 bg-emerald-950/85 ring-1 ring-emerald-400/60'
                  : isCurrentTurn
                    ? 'border-amber-300 bg-amber-950/75 ring-1 ring-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.22)]'
                    : !inCurrentRound
                      ? 'border-stone-800/70 bg-stone-950/55 opacity-50'
                      : isLeading
                        ? 'border-amber-400/60 bg-amber-950/45'
                        : 'border-amber-500/20 bg-stone-950/65'
              }`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[#f7f0de]"
                  style={{ boxShadow: `inset 0 0 0 2px ${p.color}` }}
                >
                  <PlayerToken tokenId={p.tokenId} color={p.color} size={17} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-[11px] font-bold text-amber-50">
                      {p.name}
                    </span>
                    {isMe && (
                      <span className="shrink-0 rounded bg-emerald-500/20 px-1 text-[9px] font-extrabold text-emerald-300">
                        คุณ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {isWinner && roundRoll ? (
                  <span className="mono-num rounded-md bg-emerald-400 px-1.5 py-0.5 text-[10px] font-black text-stone-950">
                    อันดับ 1 • {roundRoll.total}
                  </span>
                ) : roundRoll ? (
                  <span
                    className={`mono-num rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                      isLeading
                        ? 'bg-amber-300 text-stone-950'
                        : 'bg-stone-800 text-amber-100 ring-1 ring-amber-500/25'
                    }`}
                    title={`${roundRoll.die1} + ${roundRoll.die2} = ${roundRoll.total}`}
                  >
                    {roundRoll.die1}+{roundRoll.die2}={roundRoll.total}
                  </span>
                ) : !inCurrentRound ? (
                  <span className="mono-num text-[10px] font-semibold text-stone-400">
                    {prevRoll ? `พัก (${prevRoll.total})` : 'ไม่เข้าชิง'}
                  </span>
                ) : isCurrentTurn ? (
                  <span className="animate-pulse rounded-md bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-200 ring-1 ring-amber-300/60">
                    {isMe ? 'ทอยเลย' : 'กำลังทอย'}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-stone-400">รอทอย</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
