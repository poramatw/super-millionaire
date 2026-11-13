import {
  INITIAL_HOTELS_SUPPLY,
  INITIAL_HOUSES_SUPPLY,
  type GameState,
  type LedgerEntryType,
} from '@super-millionaire/shared';
import { ScrollText } from 'lucide-react';
import { BankerAvatar, HotelPiece, HousePiece } from '../artwork';

export interface BankerPanelProps {
  gameState: GameState;
}

const LEDGER_BADGE_STYLES: Partial<Record<LedgerEntryType, string>> = {
  GAME_START: 'bg-emerald-900/70 text-emerald-200 border-emerald-500/40',
  TURN_ORDER: 'bg-sky-900/75 text-sky-200 border-sky-400/50',
  PASS_START: 'bg-emerald-900/70 text-emerald-200 border-emerald-500/40',
  BUY_DEED: 'bg-amber-900/70 text-amber-200 border-amber-500/40',
  RENT: 'bg-rose-900/70 text-rose-200 border-rose-500/40',
  TAX: 'bg-rose-900/70 text-rose-200 border-rose-500/40',
  BUILD_HOUSE: 'bg-pink-900/70 text-pink-200 border-pink-500/40',
  BUILD_HOTEL: 'bg-orange-900/70 text-orange-200 border-orange-500/40',
  JAIL: 'bg-red-950/90 text-red-200 border-red-500/50',
  CARD_CHANCE: 'bg-sky-900/70 text-sky-200 border-sky-500/40',
  CARD_CHEST: 'bg-yellow-900/70 text-yellow-200 border-yellow-500/40',
  TRADE: 'bg-purple-900/70 text-purple-200 border-purple-500/40',
  BANKRUPTCY: 'bg-stone-950 text-red-300 border-red-600/60',
  GAME_OVER: 'bg-amber-500 text-stone-950 border-amber-300',
};

export function BankerPanel({ gameState }: BankerPanelProps) {
  const { banker } = gameState;
  const latestEntry = banker.ledger[banker.ledger.length - 1];
  const reversedLedger = [...banker.ledger].reverse().slice(0, 60);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-stone-900/90 p-3.5 text-amber-50 shadow-lg">
      {/* Header + Live Announcement Bubble */}
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <BankerAvatar size={48} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-[var(--font-display)] text-sm font-bold text-amber-300">
              นายธนาคารกลาง
            </span>
            <span className="mono-num text-[10px] text-amber-200/60">
              รายการ #{banker.ledger.length}
            </span>
          </div>
          <div className="relative mt-1.5 rounded-xl border border-amber-300/30 bg-[#f7f0de] px-3 py-2 text-xs font-semibold leading-relaxed text-[#1c1814] shadow-sm">
            {latestEntry?.message ?? 'นายธนาคารพร้อมดูแลบัญชีและโฉนดทั้งหมด'}
          </div>
        </div>
      </div>

      {/* Bank Supply Inventory */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between rounded-xl border border-stone-700/80 bg-stone-950/70 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <HousePiece size={18} />
            <span className="text-xs font-medium text-stone-300">บ้านเหลือ</span>
          </div>
          <span className="mono-num text-sm font-bold text-pink-300">
            {banker.housesRemaining}/{INITIAL_HOUSES_SUPPLY}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-stone-700/80 bg-stone-950/70 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <HotelPiece size={18} />
            <span className="text-xs font-medium text-stone-300">โรงแรมเหลือ</span>
          </div>
          <span className="mono-num text-sm font-bold text-orange-300">
            {banker.hotelsRemaining}/{INITIAL_HOTELS_SUPPLY}
          </span>
        </div>
      </div>

      {/* Scrollable Transaction Ledger */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200/80">
          <ScrollText className="h-3.5 w-3.5" />
          <span>สมุดบัญชีธนาคาร (ล่าสุดอยู่บน)</span>
        </div>
        <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {reversedLedger.map((entry) => {
            const badgeCls =
              LEDGER_BADGE_STYLES[entry.type] ??
              'bg-stone-800/80 text-stone-200 border-stone-600/40';
            return (
              <div
                key={entry.id}
                className="flex items-start gap-2 rounded-lg border border-stone-800 bg-stone-950/60 px-2.5 py-1.5 text-xs"
              >
                <span
                  className={`mono-num mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${badgeCls}`}
                >
                  #{entry.seq}
                </span>
                <span className="leading-snug text-stone-200">{entry.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
