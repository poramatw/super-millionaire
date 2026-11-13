import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { DrawnCardInfo, PlayerState } from '@super-millionaire/shared';
import { Sparkles, X } from 'lucide-react';
import { TileIllustration } from '../artwork';

export interface CardRevealModalProps {
  drawnCard: DrawnCardInfo | null;
  player?: PlayerState;
  onClose: () => void;
}

export function CardRevealModal({ drawnCard, player, onClose }: CardRevealModalProps) {
  useEffect(() => {
    if (!drawnCard) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawnCard, onClose]);

  if (!drawnCard || typeof document === 'undefined') return null;

  const isChance = drawnCard.card.deck === 'chance';

  return createPortal(
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isChance ? 'การ์ดประตูดวง' : 'การ์ดหีบสมบัติ'}
    >
      <div
        key={`${drawnCard.turnNumber}-${drawnCard.card.id}`}
        className={`animate-card-draw-flip deed-card-bevel relative w-full max-w-sm overflow-hidden rounded-2xl border-4 text-[#1c1814] shadow-2xl ${
          isChance
            ? 'border-[#c8232c] bg-[#fdf6e2]'
            : 'border-[#c59c22] bg-[#f7eed3]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between px-4 py-3 text-white ${
            isChance ? 'bg-[#c8232c]' : 'bg-[#b37412]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-bold tracking-wider text-white/80 uppercase">
                จั่วการ์ดออกจากกอง
              </span>
              <span className="font-[var(--font-display)] text-lg font-extrabold">
                {isChance ? 'ประตูดวง' : 'หีบสมบัติ'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดการ์ด"
            className="touch-target flex h-8 w-8 items-center justify-center rounded-full bg-black/25 hover:bg-black/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center p-5 text-center">
          <div className="h-28 w-36 overflow-hidden rounded-xl border-2 border-[#2a2118]/30 shadow-md">
            <TileIllustration tileIndex={isChance ? 7 : 2} className="h-full w-full" />
          </div>

          {player && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-bold">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: player.color }}
              />
              <span>{player.name} จั่วได้</span>
            </div>
          )}

          <h4 className="mt-3 font-[var(--font-display)] text-xl font-extrabold text-stone-900">
            {drawnCard.card.title}
          </h4>
          <p className="mt-2 rounded-xl border border-dashed border-stone-400/70 bg-white/75 p-3 text-sm leading-relaxed font-medium text-stone-800">
            {drawnCard.card.description}
          </p>

          <button
            type="button"
            onClick={onClose}
            className={`tactile-btn mt-4 w-full rounded-xl px-4 py-2.5 font-extrabold text-white shadow ${
              isChance ? 'bg-[#c8232c]' : 'bg-[#b37412]'
            }`}
          >
            ดำเนินการต่อ
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
