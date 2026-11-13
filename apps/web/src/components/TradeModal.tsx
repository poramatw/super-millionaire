import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BOARD_TILES,
  hasAnyBuildingInColorGroup,
  type GameAction,
  type GameState,
} from '@super-millionaire/shared';
import { ArrowLeftRight, Send, X } from 'lucide-react';
import { PlayerToken } from '../artwork';
import { COLOR_GROUP_META, formatBahtNumber } from '../utils/boardLayout';

export interface TradeModalProps {
  open: boolean;
  gameState: GameState;
  myPlayerId: string | null;
  onClose: () => void;
  onDispatchAction: (action: GameAction) => void;
}

export function TradeModal({
  open,
  gameState,
  myPlayerId,
  onClose,
  onDispatchAction,
}: TradeModalProps) {
  const me = gameState.players.find((p) => p.id === myPlayerId);
  const opponents = gameState.players.filter(
    (p) => !p.isBankrupt && p.id !== myPlayerId,
  );

  const [targetId, setTargetId] = useState<string>(opponents[0]?.id ?? '');
  const [offeredCash, setOfferedCash] = useState(0);
  const [requestedCash, setRequestedCash] = useState(0);
  const [offeredJailCards, setOfferedJailCards] = useState(0);
  const [requestedJailCards, setRequestedJailCards] = useState(0);
  const [offeredTiles, setOfferedTiles] = useState<number[]>([]);
  const [requestedTiles, setRequestedTiles] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    if (!opponents.some((o) => o.id === targetId)) {
      setTargetId(opponents[0]?.id ?? '');
    }
    setOfferedCash(0);
    setRequestedCash(0);
    setOfferedJailCards(0);
    setRequestedJailCards(0);
    setOfferedTiles([]);
    setRequestedTiles([]);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !me || opponents.length === 0 || typeof document === 'undefined') {
    return null;
  }

  const target = opponents.find((o) => o.id === targetId) ?? opponents[0]!;

  const myTradableTiles = BOARD_TILES.filter((tile) => {
    const deed = gameState.deeds[tile.index];
    if (!deed || deed.ownerId !== me.id) return false;
    return !(tile.colorGroup && hasAnyBuildingInColorGroup(gameState, tile.colorGroup));
  });

  const targetTradableTiles = BOARD_TILES.filter((tile) => {
    const deed = gameState.deeds[tile.index];
    if (!deed || deed.ownerId !== target.id) return false;
    return !(tile.colorGroup && hasAnyBuildingInColorGroup(gameState, tile.colorGroup));
  });

  const toggleTile = (list: number[], setList: (next: number[]) => void, idx: number) => {
    setList(list.includes(idx) ? list.filter((i) => i !== idx) : [...list, idx]);
  };

  const handleSubmit = () => {
    onDispatchAction({
      type: 'CREATE_TRADE_OFFER',
      playerId: me.id,
      offer: {
        toPlayerId: target.id,
        offeredTileIndices: offeredTiles,
        requestedTileIndices: requestedTiles,
        offeredCash: Math.max(0, Math.min(me.cash, offeredCash)),
        requestedCash: Math.max(0, Math.min(target.cash, requestedCash)),
        offeredJailCards,
        requestedJailCards,
      },
    });
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="แลกเปลี่ยนทรัพย์สิน"
    >
      <div
        className="cardstock-texture deed-card-bevel relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-[#2a2118] text-[#1c1814]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-[#1c4e8a] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            <h3 className="font-[var(--font-display)] text-lg font-bold">
              ยื่นข้อเสนอแลกเปลี่ยนโฉนด / เงินสด
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างแลกเปลี่ยน"
            className="touch-target flex h-9 w-9 items-center justify-center rounded-full bg-black/25 hover:bg-black/40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* Select Trade Partner */}
          <div>
            <span className="text-xs font-bold text-stone-700">เลือกคู่ค้า:</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {opponents.map((opp) => (
                <button
                  key={opp.id}
                  type="button"
                  onClick={() => {
                    setTargetId(opp.id);
                    setRequestedTiles([]);
                    setRequestedCash(0);
                    setRequestedJailCards(0);
                  }}
                  className={`tactile-btn flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-xs font-bold ${
                    target.id === opp.id
                      ? 'border-[#1c4e8a] bg-[#1c4e8a] text-white'
                      : 'border-stone-300 bg-white text-stone-800'
                  }`}
                >
                  <PlayerToken tokenId={opp.tokenId} color={opp.color} size={18} />
                  <span>{opp.name}</span>
                  <span className="mono-num opacity-80">฿{formatBahtNumber(opp.cash)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Two Columns: Offer vs Request */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* My Offer */}
            <div className="space-y-3 rounded-xl border-2 border-emerald-700/30 bg-white/80 p-3">
              <div className="flex items-center justify-between text-xs font-extrabold text-emerald-900">
                <span>สิ่งที่คุณเสนอให้ ({me.name})</span>
                <span className="mono-num">มี ฿{formatBahtNumber(me.cash)}</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600">
                  เงินสด (บาท)
                </label>
                <input
                  type="number"
                  min={0}
                  max={me.cash}
                  step={100}
                  value={offeredCash}
                  onChange={(e) => setOfferedCash(Math.max(0, Number(e.target.value) || 0))}
                  className="mono-num mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm font-bold"
                />
              </div>

              {me.jailFreeCards > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span>บัตรพ้นคุก (มี {me.jailFreeCards})</span>
                  <input
                    type="number"
                    min={0}
                    max={me.jailFreeCards}
                    value={offeredJailCards}
                    onChange={(e) =>
                      setOfferedJailCards(
                        Math.max(0, Math.min(me.jailFreeCards, Number(e.target.value) || 0)),
                      )
                    }
                    className="mono-num w-16 rounded-lg border border-stone-300 bg-white px-2 py-1 text-center font-bold"
                  />
                </div>
              )}

              <div>
                <div className="mb-1 text-[11px] font-semibold text-stone-600">
                  โฉนดที่เสนอ ({offeredTiles.length} ใบ)
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                  {myTradableTiles.length === 0 ? (
                    <div className="text-[11px] text-stone-400">ไม่มีโฉนดที่แลกเปลี่ยนได้</div>
                  ) : (
                    myTradableTiles.map((tile) => {
                      const checked = offeredTiles.includes(tile.index);
                      const color = tile.colorGroup
                        ? COLOR_GROUP_META[tile.colorGroup].bandBg
                        : '#555';
                      return (
                        <button
                          key={tile.index}
                          type="button"
                          onClick={() => toggleTile(offeredTiles, setOfferedTiles, tile.index)}
                          className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-left text-xs font-semibold ${
                            checked
                              ? 'border-emerald-600 bg-emerald-100 text-emerald-950'
                              : 'border-stone-200 bg-stone-50 text-stone-800'
                          }`}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate">
                            #{tile.deedNumber} {tile.name}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Target Request */}
            <div className="space-y-3 rounded-xl border-2 border-amber-700/30 bg-white/80 p-3">
              <div className="flex items-center justify-between text-xs font-extrabold text-amber-900">
                <span>สิ่งที่คุณขอแลก ({target.name})</span>
                <span className="mono-num">มี ฿{formatBahtNumber(target.cash)}</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600">
                  เงินสด (บาท)
                </label>
                <input
                  type="number"
                  min={0}
                  max={target.cash}
                  step={100}
                  value={requestedCash}
                  onChange={(e) => setRequestedCash(Math.max(0, Number(e.target.value) || 0))}
                  className="mono-num mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm font-bold"
                />
              </div>

              {target.jailFreeCards > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span>บัตรพ้นคุก (มี {target.jailFreeCards})</span>
                  <input
                    type="number"
                    min={0}
                    max={target.jailFreeCards}
                    value={requestedJailCards}
                    onChange={(e) =>
                      setRequestedJailCards(
                        Math.max(0, Math.min(target.jailFreeCards, Number(e.target.value) || 0)),
                      )
                    }
                    className="mono-num w-16 rounded-lg border border-stone-300 bg-white px-2 py-1 text-center font-bold"
                  />
                </div>
              )}

              <div>
                <div className="mb-1 text-[11px] font-semibold text-stone-600">
                  โฉนดที่ขอ ({requestedTiles.length} ใบ)
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                  {targetTradableTiles.length === 0 ? (
                    <div className="text-[11px] text-stone-400">อีกฝ่ายไม่มีโฉนดที่แลกเปลี่ยนได้</div>
                  ) : (
                    targetTradableTiles.map((tile) => {
                      const checked = requestedTiles.includes(tile.index);
                      const color = tile.colorGroup
                        ? COLOR_GROUP_META[tile.colorGroup].bandBg
                        : '#555';
                      return (
                        <button
                          key={tile.index}
                          type="button"
                          onClick={() => toggleTile(requestedTiles, setRequestedTiles, tile.index)}
                          className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-left text-xs font-semibold ${
                            checked
                              ? 'border-amber-600 bg-amber-100 text-amber-950'
                              : 'border-stone-200 bg-stone-50 text-stone-800'
                          }`}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate">
                            #{tile.deedNumber} {tile.name}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-stone-600">
            หมายเหตุ: โฉนดในกลุ่มสีที่ยังมีบ้านหรือโรงแรมสร้างอยู่ไม่สามารถนำมาแลกเปลี่ยนได้ (ถ้าคู่ค้าเป็น AI บอท จะประเมินความคุ้มค่าและตอบกลับทันที)
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="tactile-btn rounded-xl border border-stone-400 bg-white px-4 py-2 text-sm font-bold text-stone-800"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="tactile-btn flex items-center gap-1.5 rounded-xl border-2 border-[#12335c] bg-[#1c4e8a] px-5 py-2 text-sm font-extrabold text-white shadow"
            >
              <Send className="h-4 w-4" />
              <span>ส่งข้อเสนอ</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
