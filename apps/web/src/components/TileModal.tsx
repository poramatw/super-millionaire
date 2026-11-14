import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  calculateRent,
  canBuildOnCurrentTile,
  canHostileTakeoverCurrentTile,
  canMortgageTile,
  canSellHouseOnTile,
  canUnmortgageCurrentTile,
  calculateUnmortgageCost,
  getCurrentPlayer,
  getTile,
  type GameAction,
  type GameState,
} from '@super-millionaire/shared';
import { Building2, ChevronDown, ChevronUp, Coins, Home, Landmark, RotateCcw, X, Zap } from 'lucide-react';
import { HotelPiece, HousePiece, OriginalTileCrop } from '../artwork';
import { COLOR_GROUP_META, formatBahtNumber } from '../utils/boardLayout';

export interface TileModalProps {
  tileIndex: number | null;
  gameState: GameState;
  myPlayerId: string | null;
  onClose: () => void;
  onDispatchAction: (action: GameAction) => void;
}

export function TileModal({
  tileIndex,
  gameState,
  myPlayerId,
  onClose,
  onDispatchAction,
}: TileModalProps) {
  const [showLiquidationOptions, setShowLiquidationOptions] = useState(false);

  useEffect(() => {
    setShowLiquidationOptions(false);
  }, [tileIndex]);

  useEffect(() => {
    if (tileIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tileIndex, onClose]);

  if (tileIndex === null || typeof document === 'undefined') return null;

  const tile = getTile(tileIndex);
  const deed = gameState.deeds[tile.index];
  const owner = deed?.ownerId
    ? gameState.players.find((p) => p.id === deed.ownerId)
    : undefined;
  const colorMeta = tile.colorGroup ? COLOR_GROUP_META[tile.colorGroup] : null;
  const currentPlayer = getCurrentPlayer(gameState);
  const isMyTurn = Boolean(myPlayerId && currentPlayer.id === myPlayerId);
  const isStandingHere = Boolean(myPlayerId && currentPlayer.id === myPlayerId && currentPlayer.position === tile.index);
  const canDecideBuy = Boolean(
    isMyTurn &&
      isStandingHere &&
      gameState.phase === 'AWAIT_DECISION' &&
      gameState.pendingDecisionTileIndex === tile.index &&
      deed &&
      !deed.ownerId,
  );
  const isOpponentDeed = Boolean(deed?.ownerId && deed.ownerId !== myPlayerId);
  const isMyDeed = Boolean(deed?.ownerId && deed.ownerId === myPlayerId);
  const currentTileRent = deed ? calculateRent(gameState, tile.index, gameState.lastDice?.total ?? 7) : 0;
  const isInDebtMode = Boolean(
    isMyTurn &&
      gameState.phase === 'AWAIT_DEBT_RESOLUTION' &&
      gameState.pendingDebt?.debtorId === myPlayerId,
  );

  const buildCheck = isMyTurn && isStandingHere
    ? canBuildOnCurrentTile(gameState, myPlayerId!)
    : { allowed: false, reason: undefined, cost: undefined, isHotelUpgrade: false };
  const unmortgageCheck = isMyTurn && isStandingHere
    ? canUnmortgageCurrentTile(gameState, myPlayerId!)
    : { allowed: false, reason: undefined, cost: undefined };
  const sellCheck = isMyTurn
    ? canSellHouseOnTile(gameState, myPlayerId!, tile.index)
    : { allowed: false };
  const mortgageCheck = isMyTurn
    ? canMortgageTile(gameState, myPlayerId!, tile.index)
    : { allowed: false };
  const takeoverCheck = isMyTurn && isStandingHere
    ? canHostileTakeoverCurrentTile(gameState, myPlayerId!)
    : { allowed: false, cost: undefined, reason: undefined };

  const unmortgagePrice = tile.price !== undefined ? calculateUnmortgageCost(tile) : 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={tile.name}
    >
      <div
        className="cardstock-texture deed-card-bevel relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-[#2a2118] text-[#1c1814]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Color Band */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            backgroundColor: colorMeta?.bandBg ?? '#1C6B3A',
            color: colorMeta?.bandText ?? '#FFF8EB',
          }}
        >
          <div className="flex items-center gap-2">
            {tile.deedNumber !== undefined && (
              <span className="mono-num rounded-md bg-black/25 px-2 py-0.5 text-xs font-extrabold">
                โฉนด #{tile.deedNumber}
              </span>
            )}
            <h3 className="font-[var(--font-display)] text-lg font-extrabold">
              {tile.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างโฉนด"
            className="touch-target flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-current hover:bg-black/40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Authentic Board Crop Header */}
        <div className="relative flex h-48 w-full items-center justify-center overflow-hidden border-b-2 border-[#2a2118]/25 bg-[#e8d9b0] p-2.5">
          <div className="h-full w-40 overflow-hidden rounded-xl border-2 border-[#2a2118]/30 bg-[#f6ecd2] shadow-inner">
            <OriginalTileCrop tileIndex={tile.index} className="h-full w-full" />
          </div>
          {deed?.isMortgaged && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/35">
              <span className="-rotate-12 rounded-lg border-2 border-red-900 bg-red-600 px-3 py-1 text-base font-extrabold text-white shadow-lg">
                ติดจำนองอยู่
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 p-4">
          {/* Debt Liquidation Guidance when clicking own cards during AWAIT_DEBT_RESOLUTION */}
          {isInDebtMode && isMyDeed && gameState.pendingDebt && (
            <div className="rounded-xl border-2 border-rose-600/60 bg-rose-100/95 px-3 py-2 text-xs font-bold text-rose-950">
              ค้างชำระ ฿{formatBahtNumber(gameState.pendingDebt.amount)} ({gameState.pendingDebt.reason}) —
              สามารถกดขายสิ่งปลูกสร้างหรือจำนองโฉนดนี้ด้านล่างเพื่อหาเงินมาจ่ายได้
            </div>
          )}

          {/* Contextual Arrival Callout Banner */}
          {isMyTurn && isStandingHere && deed && (
            <div
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                canDecideBuy
                  ? 'border-emerald-600/40 bg-emerald-100/90 text-emerald-950'
                  : isOpponentDeed
                    ? 'border-rose-600/40 bg-rose-100/90 text-rose-950'
                    : buildCheck.allowed || unmortgageCheck.allowed
                      ? 'border-emerald-600/40 bg-emerald-100/90 text-emerald-950'
                      : 'border-amber-600/40 bg-amber-100/90 text-amber-950'
              }`}
            >
              {canDecideBuy && (
                <span>
                  พื้นที่ว่าง — คุณสามารถซื้อโฉนดนี้ได้ในราคา ฿
                  {formatBahtNumber(tile.price ?? 0)}
                </span>
              )}
              {isOpponentDeed && owner && (
                <span>
                  โฉนดของ {owner.name}
                  {deed.isMortgaged
                    ? ' (ติดจำนองอยู่ — ไม่ต้องจ่ายค่าเช่า)'
                    : isInDebtMode
                      ? ` — เงินสดไม่พอจ่ายค่าเช่า ฿${formatBahtNumber(gameState.pendingDebt?.amount ?? currentTileRent)}! กรุณาขายบ้านหรือจำนองโฉนด`
                      : ` — ชำระค่าเช่า -฿${formatBahtNumber(currentTileRent)} แล้ว`}
                </span>
              )}
              {isMyDeed && (
                <span>
                  {buildCheck.allowed
                    ? `ตกซ้ำที่ดินของคุณ — สามารถ${buildCheck.isHotelUpgrade ? 'อัปเกรดเป็นโรงแรม' : 'สร้างบ้านเพิ่ม 1 หลัง'}ได้!`
                    : unmortgageCheck.allowed
                      ? 'ตกซ้ำที่ดินของคุณ (ติดจำนอง) — สามารถไถ่ถอนจำนองได้'
                      : `ตกซ้ำที่ดินของคุณ: ${buildCheck.reason ?? 'จัดการโฉนดหรือกดจบเทิร์น'}`}
                </span>
              )}
            </div>
          )}

          {/* Owner & Building Summary */}
          {deed && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2a2118]/15 bg-white/75 px-3 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-stone-600">เจ้าของ:</span>
                {owner ? (
                  <span className="inline-flex items-center gap-1.5 font-bold">
                    <span
                      className="h-3 w-3 rounded-full border border-black/20"
                      style={{ backgroundColor: owner.color }}
                    />
                    {owner.name}
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-700">ว่าง (รอซื้อ)</span>
                )}
              </div>

              {(deed.hasHotel || deed.houses > 0) && (
                <div className="flex items-center gap-1">
                  {deed.hasHotel ? (
                    <>
                      <HotelPiece size={20} />
                      <span className="text-xs font-bold text-orange-700">โรงแรม 1 แห่ง</span>
                    </>
                  ) : (
                    <>
                      {Array.from({ length: deed.houses }).map((_, i) => (
                        <HousePiece key={i} size={18} />
                      ))}
                      <span className="mono-num text-xs font-bold text-pink-700">
                        {deed.houses} หลัง
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Price & Mortgage Info */}
          {tile.price !== undefined && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-[#2a2118]/15 bg-white/70 p-2">
                <div className="text-stone-500">ราคาซื้อ</div>
                <div className="mono-num mt-0.5 text-sm font-extrabold text-stone-900">
                  ฿{formatBahtNumber(tile.price)}
                </div>
              </div>
              <div className="rounded-xl border border-[#2a2118]/15 bg-white/70 p-2">
                <div className="text-stone-500">มูลค่าจำนอง</div>
                <div className="mono-num mt-0.5 text-sm font-extrabold text-amber-800">
                  ฿{formatBahtNumber(tile.mortgageValue ?? Math.floor(tile.price / 2))}
                </div>
              </div>
              <div className="rounded-xl border border-[#2a2118]/15 bg-white/70 p-2">
                <div className="text-stone-500">ไถ่ถอน (+10%)</div>
                <div className="mono-num mt-0.5 text-sm font-extrabold text-emerald-800">
                  ฿{formatBahtNumber(unmortgagePrice)}
                </div>
              </div>
            </div>
          )}

          {/* Property Rent Table */}
          {tile.type === 'property' && tile.rents && (
            <div className="rounded-xl border border-[#2a2118]/20 bg-white/80 p-3 text-xs">
              <div className="mb-2 flex items-center justify-between font-bold text-stone-800">
                <span>ตารางค่าเช่า</span>
                {tile.houseCost && (
                  <span className="mono-num text-stone-600">
                    ค่าสร้างบ้าน/โรงแรม: ฿{formatBahtNumber(tile.houseCost)}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {[
                  { label: 'ที่ดินเปล่า', value: tile.rents[0] },
                  { label: 'เมื่อครบชุดสี (×2)', value: (tile.rents[0] ?? 0) * 2 },
                  { label: 'บ้าน 1 หลัง', value: tile.rents[1] },
                  { label: 'บ้าน 2 หลัง', value: tile.rents[2] },
                  { label: 'บ้าน 3 หลัง', value: tile.rents[3] },
                  { label: 'บ้าน 4 หลัง', value: tile.rents[4] },
                  { label: 'โรงแรม 1 แห่ง', value: tile.rents[5] },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between border-b border-stone-200/70 py-1 last:border-none"
                  >
                    <span className="text-stone-700">{row.label}</span>
                    <span className="mono-num font-bold text-stone-900">
                      ฿{formatBahtNumber(row.value ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hotel Rent Table */}
          {tile.type === 'hotel' && tile.rents && (
            <div className="rounded-xl border border-[#2a2118]/20 bg-white/80 p-3 text-xs">
              <div className="mb-2 font-bold text-stone-800">ตารางค่าเช่ากลุ่มโรงแรม</div>
              <div className="space-y-1">
                {tile.rents.map((rent, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border-b border-stone-200/70 py-1 last:border-none"
                  >
                    <span className="text-stone-700">ถือครอง {idx + 1} แห่ง</span>
                    <span className="mono-num font-bold text-stone-900">
                      ฿{formatBahtNumber(rent)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description for Utilities / Special Tiles */}
          {tile.description && (
            <div className="rounded-xl border border-[#2a2118]/15 bg-[#ede1c4]/70 p-3 text-xs leading-relaxed text-stone-800">
              {tile.description}
            </div>
          )}

          {/* Contextual Buy / Decline Actions when landing on vacant purchasable tile */}
          {canDecideBuy && (
            <div className="space-y-2 border-t border-[#2a2118]/15 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={currentPlayer.cash < (tile.price ?? 0)}
                  onClick={() => {
                    onDispatchAction({ type: 'BUY_CURRENT_TILE', playerId: myPlayerId! });
                    onClose();
                  }}
                  className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#143d25] bg-[#1b7a43] px-3 py-2.5 text-xs font-extrabold text-white shadow disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Coins className="h-4 w-4" />
                  <span>ซื้อโฉนดนี้ (฿{formatBahtNumber(tile.price ?? 0)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDispatchAction({ type: 'DECLINE_CURRENT_TILE', playerId: myPlayerId! });
                    onClose();
                  }}
                  className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-stone-600 bg-stone-700 px-3 py-2.5 text-xs font-extrabold text-white shadow"
                >
                  <span>ไม่ซื้อ (ผ่าน)</span>
                </button>
              </div>
              {currentPlayer.cash < (tile.price ?? 0) && (
                <p className="text-center text-[11px] font-semibold text-rose-700">
                  เงินสดไม่พอสำหรับซื้อโฉนดนี้
                </p>
              )}
            </div>
          )}

          {/* Acknowledge / Hostile Takeover buttons when landing on an opponent's deed */}
          {isMyTurn && isStandingHere && isOpponentDeed && (
            <div className="space-y-2 border-t border-[#2a2118]/15 pt-3">
              {takeoverCheck.allowed && (
                <button
                  type="button"
                  onClick={() => {
                    onDispatchAction({
                      type: 'HOSTILE_TAKEOVER_CURRENT_TILE',
                      playerId: myPlayerId!,
                    });
                    onClose();
                  }}
                  className="tactile-btn flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-amber-900 bg-gradient-to-r from-[#9a3412] via-[#c2410c] to-[#9a3412] px-4 py-2.5 text-xs font-extrabold text-white shadow-md hover:brightness-110"
                >
                  <Zap className="h-4 w-4 text-amber-200" />
                  <span>
                    ซื้อฮุบโฉนดนี้ทันที 2× (฿{formatBahtNumber(takeoverCheck.cost ?? 0)})
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="tactile-btn flex w-full items-center justify-center rounded-xl border-2 border-[#2a2118] bg-[#2a2118] px-4 py-2.5 text-xs font-extrabold text-amber-100 shadow"
              >
                รับทราบ / ปิดรายละเอียด
              </button>
            </div>
          )}

          {/* Contextual Management Buttons when legal */}
          {isMyTurn && deed?.ownerId === myPlayerId && (
            <div className="space-y-2 border-t border-[#2a2118]/15 pt-3">
              {!isStandingHere && gameState.phase === 'ACTION_PHASE' && (
                <p className="text-center text-[11px] font-medium text-amber-800">
                  ตามกติกา: ในตาปกติต้องยืนอยู่บนช่องนี้จึงจะสร้างบ้าน ขายบ้าน จำนอง หรือไถ่ถอนได้
                </p>
              )}

              {(buildCheck.allowed || unmortgageCheck.allowed) && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {buildCheck.allowed && (
                    <button
                      type="button"
                      onClick={() => {
                        onDispatchAction({ type: 'BUILD_ON_CURRENT_TILE', playerId: myPlayerId! });
                        onClose();
                      }}
                      className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#143d25] bg-[#1b7a43] px-3 py-2.5 text-xs font-bold text-white shadow"
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
                      onClick={() => {
                        onDispatchAction({ type: 'UNMORTGAGE_CURRENT_TILE', playerId: myPlayerId! });
                        onClose();
                      }}
                      className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-800 bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>ไถ่ถอน (฿{formatBahtNumber(unmortgageCheck.cost ?? 0)})</span>
                    </button>
                  )}
                </div>
              )}

              {/* Liquidation actions: Shown directly during debt resolution, or tucked behind a secondary toggle during normal play to prevent accidental misclicks */}
              {(sellCheck.allowed || mortgageCheck.allowed) && (
                <div className="pt-1">
                  {!isInDebtMode && !showLiquidationOptions ? (
                    <button
                      type="button"
                      onClick={() => setShowLiquidationOptions(true)}
                      className="flex w-full items-center justify-center gap-1 rounded-lg border border-stone-400/60 bg-stone-200/70 px-3 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-300/70"
                    >
                      <span>ตัวเลือกสำรอง: ขายบ้านคืน / จำนองโฉนด</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <div className="space-y-1.5 rounded-xl border border-rose-900/20 bg-rose-50/70 p-2">
                      {!isInDebtMode && (
                        <div className="flex items-center justify-between text-[10px] font-bold text-rose-900">
                          <span>ระวัง: การจำนองหรือขายบ้านจะลดรายได้ค่าเช่า</span>
                          <button
                            type="button"
                            onClick={() => setShowLiquidationOptions(false)}
                            className="inline-flex items-center gap-0.5 text-stone-600 hover:text-stone-900"
                          >
                            <span>ซ่อน</span>
                            <ChevronUp className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {sellCheck.allowed && (
                          <button
                            type="button"
                            onClick={() => {
                              onDispatchAction({
                                type: 'SELL_HOUSE_ON_TILE',
                                playerId: myPlayerId!,
                                tileIndex: tile.index,
                              });
                            }}
                            className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-amber-700 bg-amber-500 px-3 py-2 text-xs font-bold text-stone-950 shadow"
                          >
                            <Coins className="h-4 w-4" />
                            <span>ขายบ้านคืน (+฿{formatBahtNumber(sellCheck.refund ?? 0)})</span>
                          </button>
                        )}

                        {mortgageCheck.allowed && (
                          <button
                            type="button"
                            onClick={() => {
                              onDispatchAction({
                                type: 'MORTGAGE_TILE',
                                playerId: myPlayerId!,
                                tileIndex: tile.index,
                              });
                            }}
                            className="tactile-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-rose-900 bg-rose-700 px-3 py-2 text-xs font-bold text-white shadow"
                          >
                            <Landmark className="h-4 w-4" />
                            <span>จำนอง (+฿{formatBahtNumber(mortgageCheck.proceeds ?? 0)})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
