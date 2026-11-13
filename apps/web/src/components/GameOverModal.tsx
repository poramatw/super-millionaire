import { createPortal } from 'react-dom';
import { calculatePlayerNetWorth, type GameState } from '@super-millionaire/shared';
import { Crown, LogOut, RotateCcw, Trophy } from 'lucide-react';
import { PlayerToken } from '../artwork';
import { formatBahtNumber } from '../utils/boardLayout';

export interface GameOverModalProps {
  gameState: GameState;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export function GameOverModal({
  gameState,
  isHost,
  onPlayAgain,
  onLeaveRoom,
}: GameOverModalProps) {
  if (gameState.phase !== 'GAME_OVER' || typeof document === 'undefined') {
    return null;
  }

  const rankings = [...gameState.players]
    .map((p) => ({
      player: p,
      netWorth: calculatePlayerNetWorth(gameState, p.id),
    }))
    .sort((a, b) => {
      if (a.player.id === gameState.winnerId) return -1;
      if (b.player.id === gameState.winnerId) return 1;
      if (a.player.isBankrupt !== b.player.isBankrupt) {
        return a.player.isBankrupt ? 1 : -1;
      }
      return b.netWorth - a.netWorth;
    });

  const winner = rankings[0]?.player;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="จบเกมซุปเปอร์เศรษฐี"
    >
      <div className="cardstock-texture deed-card-bevel w-full max-w-md overflow-hidden rounded-2xl border-4 border-amber-500 text-[#1c1814] shadow-2xl">
        <div className="bg-gradient-to-r from-[#1b7a43] via-[#156135] to-[#1b7a43] px-5 py-4 text-center text-amber-50">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-400 text-stone-950 shadow-lg">
            <Trophy className="h-6 w-6" />
          </div>
          <h2 className="mt-2 font-[var(--font-display)] text-2xl font-extrabold text-amber-200">
            ซุปเปอร์เศรษฐีผู้ชนะ!
          </h2>
          {winner && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-stone-950/60 px-4 py-1 text-sm font-bold text-amber-100">
              <PlayerToken tokenId={winner.tokenId} color={winner.color} size={22} />
              <span>{winner.name}</span>
              <Crown className="h-4 w-4 text-amber-300" />
            </div>
          )}
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wide text-stone-600">
              อันดับมูลค่าทรัพย์สินสุทธิ
            </div>
            {rankings.map(({ player, netWorth }, idx) => (
              <div
                key={player.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                  idx === 0
                    ? 'border-amber-500 bg-amber-100/90 font-bold'
                    : 'border-stone-300 bg-white/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="mono-num w-5 text-center font-extrabold text-stone-600">
                    #{idx + 1}
                  </span>
                  <PlayerToken tokenId={player.tokenId} color={player.color} size={22} />
                  <span>{player.name}</span>
                </div>
                <span className="mono-num font-extrabold text-[#1b7a43]">
                  {player.isBankrupt ? 'ล้มละลาย' : `฿${formatBahtNumber(netWorth)}`}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {isHost ? (
              <button
                type="button"
                onClick={onPlayAgain}
                className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#143d25] bg-[#1b7a43] px-4 py-2.5 text-sm font-extrabold text-white shadow"
              >
                <RotateCcw className="h-4 w-4" />
                <span>เล่นอีกครั้ง (กลับห้องรอ)</span>
              </button>
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-stone-300 bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600">
                รอเจ้าบ้านเริ่มเกมใหม่
              </div>
            )}

            <button
              type="button"
              onClick={onLeaveRoom}
              className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-stone-400 bg-white px-4 py-2.5 text-sm font-bold text-stone-800 hover:bg-stone-100"
            >
              <LogOut className="h-4 w-4" />
              <span>ออกจากห้อง</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
