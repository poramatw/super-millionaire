import {
  calculatePlayerNetWorth,
  getCurrentPlayer,
  getTile,
  type GameAction,
  type GameState,
} from '@super-millionaire/shared';
import { Bot, Check, KeyRound, Lock, Skull, Wifi, WifiOff, X } from 'lucide-react';
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
  isSpectator = false,
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

      {/* Player Cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {gameState.players.map((p) => {
          const isTurn = currentPlayer.id === p.id && gameState.phase !== 'GAME_OVER';
          const isMe = myPlayerId === p.id;
          const hideFinances = Boolean(myPlayerId && !isSpectator && !isMe);
          const isInspected = selectedPlayerId === p.id;
          const deedCount = Object.values(gameState.deeds).filter(
            (d) => d.ownerId === p.id,
          ).length;
          const netWorth = hideFinances ? 0 : calculatePlayerNetWorth(gameState, p.id);

          return (
            <button
              key={p.id}
              type="button"
              disabled={hideFinances}
              onClick={() => {
                if (!hideFinances) onSelectPlayer(p.id);
              }}
              className={`flex items-center justify-between gap-2.5 rounded-xl border p-2.5 text-left transition ${
                p.isBankrupt
                  ? 'border-stone-800/80 bg-stone-950/60 opacity-55'
                  : isTurn
                    ? 'border-amber-300/90 bg-gradient-to-r from-[#211b12] to-[#13291b] shadow-[0_0_18px_rgba(251,191,36,0.22)] ring-1 ring-amber-300/60'
                    : isInspected
                      ? 'border-sky-400/60 bg-stone-900/95'
                      : 'border-amber-500/20 bg-stone-900/80 hover:border-amber-400/45'
              } ${hideFinances ? 'cursor-default' : ''}`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
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
                    {p.kind === 'bot' ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-purple-900/90 px-1.5 py-0.5 text-[9px] font-bold text-purple-200">
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
                      {hideFinances && (
                        <span className="inline-block h-3 w-2 rounded-[2px] border border-amber-300/60 bg-amber-900/80" />
                      )}
                      {hideFinances ? 'ถือโฉนด' : 'โฉนด'}{' '}
                      <span className="mono-num font-bold text-amber-200">{deedCount}</span>{' '}
                      {hideFinances ? 'ใบ' : ''}
                    </span>
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
                {hideFinances ? (
                  <>
                    <div className="mono-num text-sm font-extrabold text-stone-400">
                      ฿ •••••
                    </div>
                    <div className="text-[10px] text-stone-500">ทรัพย์สินลับ</div>
                  </>
                ) : (
                  <>
                    <div className="mono-num text-sm font-extrabold text-emerald-300">
                      ฿{formatBahtNumber(p.cash)}
                    </div>
                    <div className="mono-num text-[10px] text-stone-400">
                      สุทธิ ฿{formatBahtNumber(netWorth)}
                    </div>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
