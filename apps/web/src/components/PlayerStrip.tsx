import {
  calculatePlayerNetWorth,
  countCompletedColorGroups,
  getCurrentPlayer,
  getTile,
  type GameAction,
  type GameState,
} from '@super-millionaire/shared';
import { Bot, Check, Crown, KeyRound, Lock, Skull, Trophy, Wifi, WifiOff, X } from 'lucide-react';
import { PlayerToken } from '../artwork';
import { formatBahtNumber } from '../utils/boardLayout';

export interface PlayerStripProps {
  gameState: GameState;
  myPlayerId: string | null;
  isSpectator?: boolean;
  selectedPlayerId: string;
  onSelectPlayer: (playerId: string) => void;
  onDispatchAction: (action: GameAction) => void;
}

export function PlayerStrip({
  gameState,
  myPlayerId,
  selectedPlayerId,
  onSelectPlayer,
  onDispatchAction,
}: PlayerStripProps) {
  const currentPlayer = getCurrentPlayer(gameState);

  const incomingTrades = myPlayerId
    ? gameState.pendingTrades.filter(
        (t) => t.status === 'PENDING' && t.toPlayerId === myPlayerId,
      )
    : [];

  // Rank players by highest total Net Worth (active players first, then bankrupt)
  const rankedPlayers = [...gameState.players]
    .map((p) => {
      const ownedDeeds = Object.values(gameState.deeds).filter((d) => d.ownerId === p.id);
      const deedCount = ownedDeeds.length;
      const hotelCount = ownedDeeds.filter(
        (d) => (getTile(d.tileIndex).colorGroup === 'hotel' || d.hasHotel) && !d.isMortgaged,
      ).length;
      const monopolyCount = countCompletedColorGroups(gameState, p.id).length;
      const netWorth = calculatePlayerNetWorth(gameState, p.id);
      return {
        player: p,
        deedCount,
        hotelCount,
        monopolyCount,
        netWorth,
      };
    })
    .sort((a, b) => {
      if (a.player.isBankrupt !== b.player.isBankrupt) {
        return a.player.isBankrupt ? 1 : -1;
      }
      if (b.netWorth !== a.netWorth) {
        return b.netWorth - a.netWorth;
      }
      if (b.monopolyCount !== a.monopolyCount) {
        return b.monopolyCount - a.monopolyCount;
      }
      if (b.hotelCount !== a.hotelCount) {
        return b.hotelCount - a.hotelCount;
      }
      if (b.deedCount !== a.deedCount) {
        return b.deedCount - a.deedCount;
      }
      if (b.player.cash !== a.player.cash) {
        return b.player.cash - a.player.cash;
      }
      return a.player.seatIndex - b.player.seatIndex;
    });

  return (
    <div className="flex flex-col gap-2.5">
      {/* Incoming Trade Offers Banner for Me */}
      {incomingTrades.map((trade) => {
        const sender = gameState.players.find((p) => p.id === trade.fromPlayerId);
        return (
          <div
            key={trade.id}
            className="cardstock-texture deed-card-bevel rounded-xl border-2 border-amber-500 p-3 text-xs text-[#1c1814]"
          >
            <div className="font-extrabold text-amber-900">
              ข้อเสนอแลกเปลี่ยนจาก {sender?.name ?? 'ผู้เล่นอื่น'}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-emerald-50 p-2">
                <div className="font-bold text-emerald-800">คุณจะได้รับ:</div>
                {trade.offeredCash > 0 && (
                  <div className="mono-num font-bold">+฿{formatBahtNumber(trade.offeredCash)}</div>
                )}
                {trade.offeredJailCards > 0 && (
                  <div>บัตรพ้นคุก ×{trade.offeredJailCards}</div>
                )}
                {trade.offeredTileIndices.map((idx) => {
                  const t = getTile(idx);
                  return (
                    <div key={idx} className="truncate">
                      #{t.deedNumber} {t.name}
                    </div>
                  );
                })}
                {trade.offeredCash === 0 &&
                  trade.offeredJailCards === 0 &&
                  trade.offeredTileIndices.length === 0 && <div className="text-stone-400">ไม่มี</div>}
              </div>

              <div className="rounded-lg bg-rose-50 p-2">
                <div className="font-bold text-rose-800">คุณต้องมอบให้:</div>
                {trade.requestedCash > 0 && (
                  <div className="mono-num font-bold">-฿{formatBahtNumber(trade.requestedCash)}</div>
                )}
                {trade.requestedJailCards > 0 && (
                  <div>บัตรพ้นคุก ×{trade.requestedJailCards}</div>
                )}
                {trade.requestedTileIndices.map((idx) => {
                  const t = getTile(idx);
                  return (
                    <div key={idx} className="truncate">
                      #{t.deedNumber} {t.name}
                    </div>
                  );
                })}
                {trade.requestedCash === 0 &&
                  trade.requestedJailCards === 0 &&
                  trade.requestedTileIndices.length === 0 && <div className="text-stone-400">ไม่มี</div>}
              </div>
            </div>

            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  onDispatchAction({
                    type: 'RESPOND_TRADE_OFFER',
                    playerId: myPlayerId!,
                    tradeId: trade.id,
                    accept: true,
                  })
                }
                className="tactile-btn flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#1b7a43] px-3 py-1.5 font-bold text-white"
              >
                <Check className="h-3.5 w-3.5" />
                <span>ยอมรับ</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onDispatchAction({
                    type: 'RESPOND_TRADE_OFFER',
                    playerId: myPlayerId!,
                    tradeId: trade.id,
                    accept: false,
                  })
                }
                className="tactile-btn flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-700 px-3 py-1.5 font-bold text-white"
              >
                <X className="h-3.5 w-3.5" />
                <span>ปฏิเสธ</span>
              </button>
            </div>
          </div>
        );
      })}

      {/* Leaderboard Header */}
      <div className="flex items-center justify-between px-1 text-[11px] font-bold text-amber-200/85">
        <span className="inline-flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-amber-300" />
          <span>อันดับมูลค่าทรัพย์สินสุทธิ</span>
        </span>
        <span className="text-[10px] font-medium text-stone-400">
          แตะผู้เล่นเพื่อดูโฉนด & กระเป๋าเงิน
        </span>
      </div>

      {/* Ranked Player Cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {rankedPlayers.map(({ player: p, deedCount, hotelCount, monopolyCount, netWorth }, rankIdx) => {
          const rank = rankIdx + 1;
          const isTurn = currentPlayer.id === p.id && gameState.phase !== 'GAME_OVER';
          const isMe = myPlayerId === p.id;
          const isInspected = selectedPlayerId === p.id;

          const rankBadgeClass = p.isBankrupt
            ? 'border-stone-700 bg-stone-900 text-stone-500'
            : rank === 1
              ? 'border-amber-300 bg-gradient-to-b from-amber-300 to-amber-500 text-stone-950 shadow-[0_0_10px_rgba(251,191,36,0.45)]'
              : rank === 2
                ? 'border-slate-300/70 bg-slate-200 text-slate-950'
                : rank === 3
                  ? 'border-amber-600/80 bg-amber-700 text-amber-50'
                  : 'border-stone-700 bg-stone-800 text-stone-300';

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPlayer(p.id)}
              className={`flex items-center justify-between gap-2.5 rounded-xl border p-2.5 text-left transition ${
                p.isBankrupt
                  ? 'border-stone-800/80 bg-stone-950/60 opacity-55'
                  : isTurn
                    ? 'border-amber-300/90 bg-gradient-to-r from-[#211b12] to-[#13291b] shadow-[0_0_18px_rgba(251,191,36,0.22)] ring-1 ring-amber-300/60'
                    : isInspected
                      ? 'border-sky-400/60 bg-stone-900/95'
                      : 'border-amber-500/20 bg-stone-900/80 hover:border-amber-400/45'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {/* Rank Medal Badge */}
                <div
                  className={`mono-num flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-lg border text-xs font-black ${rankBadgeClass}`}
                  title={`อันดับที่ ${rank}`}
                >
                  {rank === 1 && !p.isBankrupt ? (
                    <Crown className="h-3.5 w-3.5" />
                  ) : (
                    <span>#{rank}</span>
                  )}
                </div>

                <div
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-[#f7f0de]"
                  style={{ boxShadow: `inset 0 0 0 2px ${p.color}` }}
                >
                  <PlayerToken tokenId={p.tokenId} color={p.color} size={30} />
                  {isTurn && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border border-stone-950 bg-amber-300 animate-pulse" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="truncate text-sm font-bold text-amber-50">
                      {p.name}
                    </span>
                    {isMe && (
                      <span className="rounded bg-emerald-700 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        คุณ
                      </span>
                    )}
                    {isTurn && (
                      <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300 ring-1 ring-amber-400/40">
                        กำลังเล่น
                      </span>
                    )}
                    {p.kind === 'bot' ? (
                      <span className="inline-flex items-center gap-0.5 rounded border border-amber-500/35 bg-amber-950/75 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
                        <Bot className="h-2.5 w-2.5" />
                        AI
                      </span>
                    ) : p.connected ? (
                      <Wifi className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-rose-400" />
                    )}
                  </div>

                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-stone-300">
                    <span className="inline-flex items-center gap-1">
                      โฉนด{' '}
                      <span className="mono-num font-bold text-amber-200">{deedCount}</span>
                    </span>
                    {monopolyCount > 0 && (
                      <span className="rounded bg-emerald-950/90 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300 ring-1 ring-emerald-400/35">
                        ครบสี {monopolyCount}
                      </span>
                    )}
                    {hotelCount > 0 && (
                      <span className="rounded bg-sky-950/90 px-1.5 py-0.2 text-[9px] font-bold text-amber-200 ring-1 ring-sky-400/35">
                        รร. {hotelCount}
                      </span>
                    )}
                    {p.inJail && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-red-900/80 px-1 py-0.5 text-[9px] font-bold text-red-200">
                        <Lock className="h-2.5 w-2.5" />
                        ติดคุก
                      </span>
                    )}
                    {p.jailFreeCards > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-sky-300">
                        <KeyRound className="h-2.5 w-2.5" />×{p.jailFreeCards}
                      </span>
                    )}
                    {p.isBankrupt && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-400">
                        <Skull className="h-3 w-3" />
                        ล้มละลาย
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="mono-num text-sm font-extrabold text-amber-300">
                  ฿{formatBahtNumber(netWorth)}
                </div>
                <div className="mono-num text-[10px] font-semibold text-emerald-300/90">
                  เงินสด ฿{formatBahtNumber(p.cash)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
