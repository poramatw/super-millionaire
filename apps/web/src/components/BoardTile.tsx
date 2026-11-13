import type { DeedState, PlayerState, TileDefinition } from '@super-millionaire/shared';
import { HotelPiece, HousePiece, PlayerToken, TileIllustration } from '../artwork';
import { COLOR_GROUP_META, formatBahtNumber, getTileGridPlacement } from '../utils/boardLayout';

export interface TileCashPopup {
  key: number;
  amount: number;
  isPositive: boolean;
}

export interface BoardTileProps {
  tile: TileDefinition;
  deed?: DeedState;
  owner?: PlayerState;
  playersOnTile: PlayerState[];
  currentTurnPlayerId?: string;
  animatingPlayerId?: string | null;
  isCurrentPlayerTile: boolean;
  isHopSpotlight?: boolean;
  isPendingDecisionTile: boolean;
  isSelected: boolean;
  is25D?: boolean;
  recentlyBuiltKind?: 'house' | 'hotel' | null;
  cashDeltaPopup?: TileCashPopup | null;
  zoomed?: boolean;
  onSelect: (tileIndex: number) => void;
}

export function BoardTile({
  tile,
  deed,
  owner,
  playersOnTile,
  currentTurnPlayerId,
  animatingPlayerId = null,
  isCurrentPlayerTile,
  isHopSpotlight = false,
  isPendingDecisionTile,
  isSelected,
  is25D = false,
  recentlyBuiltKind = null,
  cashDeltaPopup = null,
  zoomed = false,
  onSelect,
}: BoardTileProps) {
  const placement = getTileGridPlacement(tile.index);
  const isCorner = placement.edge === 'corner';
  const colorMeta = tile.colorGroup ? COLOR_GROUP_META[tile.colorGroup] : null;
  const isMortgaged = deed?.isMortgaged === true;

  const highlightRing = isHopSpotlight
    ? 'ring-2 ring-amber-300 z-30 shadow-[0_0_22px_rgba(251,191,36,0.95)] brightness-110'
    : isPendingDecisionTile
      ? 'ring-2 ring-amber-400 ring-inset z-20 shadow-[0_0_16px_rgba(251,191,36,0.65)]'
      : isCurrentPlayerTile
        ? 'ring-2 ring-emerald-400/90 ring-inset z-10'
        : isSelected
          ? 'ring-2 ring-sky-400 ring-inset z-10'
          : '';

  const tokenSize = zoomed ? 24 : 19;
  const counterTiltStyle = is25D
    ? { transform: 'rotateX(-24deg) translateZ(8px)', transformOrigin: 'center bottom' as const }
    : undefined;

  return (
    <button
      type="button"
      onClick={() => onSelect(tile.index)}
      style={{
        gridRow: placement.row,
        gridColumn: placement.col,
      }}
      title={`${tile.deedNumber !== undefined ? `#${tile.deedNumber} ` : ''}${tile.name}${tile.price ? ` (${formatBahtNumber(tile.price)} ฿)` : ''}`}
      className={`tile-bevel preserve-3d group relative flex h-full w-full flex-col overflow-visible border border-[#2a2118]/75 bg-[#f7f0de] text-left transition-all duration-150 hover:z-20 hover:brightness-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${highlightRing}`}
    >
      {/* Inner clipped layer for tile artwork, gradient, text, and owner strip */}
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        {/* Color Header Band for purchasable properties/hotels/utilities */}
        {colorMeta && (
          <div
            className="relative flex w-full shrink-0 items-center justify-between px-0.5 sm:px-1"
            style={{
              backgroundColor: colorMeta.bandBg,
              color: colorMeta.bandText,
              height: isCorner ? '18%' : '20%',
              minHeight: zoomed ? '14px' : '11px',
              borderBottom: `1px solid ${colorMeta.borderColor}`,
            }}
          >
            <span className="mono-num truncate text-[7px] leading-none font-bold sm:text-[9px]">
              {tile.deedNumber !== undefined ? `#${tile.deedNumber}` : ''}
            </span>
          </div>
        )}

        {/* Main Illustration Area */}
        <div
          className={`relative min-h-0 flex-1 overflow-hidden ${isMortgaged ? 'opacity-55 grayscale-[60%]' : ''}`}
        >
          <TileIllustration tileIndex={tile.index} className="h-full w-full" />

          {/* Subtle bottom gradient for crisp Thai title legibility */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#16100a]/85 via-[#16100a]/30 to-transparent" />

          {/* Hop Spotlight Sweep Glow */}
          {isHopSpotlight && (
            <div className="pointer-events-none absolute inset-0 bg-amber-300/25 animate-pulse" />
          )}

          {/* Mortgaged Stamp */}
          {isMortgaged && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="-rotate-12 rounded border border-red-900 bg-red-600/90 px-1 py-0.5 text-[7px] font-extrabold tracking-wide text-white shadow sm:text-[9px]">
                จำนอง
              </span>
            </div>
          )}

          {/* Tile Name & Price overlay */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center px-0.5 pb-0.5 text-center">
            <span
              className={`w-full truncate font-semibold leading-tight text-amber-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ${
                zoomed ? 'text-[9px]' : 'text-[6.5px] sm:text-[8.5px] md:text-[9.5px]'
              }`}
            >
              {tile.name}
            </span>
            {tile.price !== undefined && (
              <span
                className={`mono-num leading-none font-bold text-amber-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)] ${
                  zoomed ? 'text-[8px]' : 'text-[6px] sm:text-[7.5px] md:text-[8px]'
                }`}
              >
                ฿{formatBahtNumber(tile.price)}
              </span>
            )}
            {tile.taxAmount !== undefined && (
              <span
                className={`mono-num leading-none font-bold text-rose-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)] ${
                  zoomed ? 'text-[8px]' : 'text-[6px] sm:text-[7.5px]'
                }`}
              >
                -฿{formatBahtNumber(tile.taxAmount)}
              </span>
            )}
          </div>
        </div>

        {/* Owner Indicator Strip */}
        {owner && (
          <div
            className="h-1 w-full shrink-0 sm:h-1.5"
            style={{ backgroundColor: owner.color }}
            title={`เจ้าของ: ${owner.name}`}
          />
        )}
      </div>

      {/* 3D Pop-Up Houses (1-4) or Hotel standing along top edge */}
      {deed && (deed.hasHotel || deed.houses > 0) && (
        <div
          style={counterTiltStyle}
          className={`pointer-events-none preserve-3d absolute top-0 right-0.5 z-30 flex items-center -space-x-0.5 sm:right-1 ${
            recentlyBuiltKind ? 'animate-build-pop' : ''
          }`}
        >
          {deed.hasHotel ? (
            <HotelPiece size={zoomed ? 18 : 14} />
          ) : (
            Array.from({ length: deed.houses }).map((_, idx) => (
              <HousePiece key={idx} size={zoomed ? 14 : 11} />
            ))
          )}
        </div>
      )}

      {/* Construction Sparkle Badge */}
      {recentlyBuiltKind && (
        <div
          style={counterTiltStyle}
          className="pointer-events-none animate-build-pop absolute -top-5 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-300 bg-emerald-800 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-100 shadow-lg"
        >
          {recentlyBuiltKind === 'hotel' ? '+โรงแรม!' : '+บ้าน!'}
        </div>
      )}

      {/* Rent / Cash Delta Floating Popup */}
      {cashDeltaPopup && (
        <div
          key={cashDeltaPopup.key}
          style={counterTiltStyle}
          className={`pointer-events-none absolute -top-6 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-black shadow-lg ${
            cashDeltaPopup.isPositive
              ? 'animate-cash-gain border-emerald-300 bg-emerald-700 text-white'
              : 'animate-cash-deduct border-rose-300 bg-rose-700 text-white'
          }`}
        >
          <span className="mono-num">
            {cashDeltaPopup.isPositive ? '+' : '-'}฿{formatBahtNumber(cashDeltaPopup.amount)}
          </span>
        </div>
      )}

      {/* Standing 3D Player Tokens on this Tile */}
      {playersOnTile.length > 0 && (
        <div className="pointer-events-none preserve-3d absolute inset-0 z-30 flex flex-wrap items-center justify-center gap-0.5 p-0.5">
          {playersOnTile.map((p) => {
            const isActiveTurn = p.id === currentTurnPlayerId;
            const isHopping = p.id === animatingPlayerId;
            return (
              <div
                key={p.id}
                style={counterTiltStyle}
                className={`relative preserve-3d rounded-full transition-all duration-200 ${
                  isHopping
                    ? '-translate-y-6 scale-125 drop-shadow-[0_14px_12px_rgba(0,0,0,0.65)]'
                    : isActiveTurn
                      ? 'scale-110 drop-shadow-[0_6px_8px_rgba(253,224,71,0.85)]'
                      : 'drop-shadow-[0_4px_4px_rgba(0,0,0,0.75)]'
                }`}
              >
                {(isActiveTurn || isHopping) && (
                  <span
                    className={`absolute -inset-1 rounded-full ${
                      isHopping ? 'animate-ping opacity-80' : 'animate-ping opacity-45'
                    }`}
                    style={{ backgroundColor: p.color }}
                  />
                )}
                <div className={isHopping ? 'animate-pawn-hop' : ''}>
                  <PlayerToken tokenId={p.tokenId} color={p.color} size={tokenSize} className="relative" />
                </div>
                {p.inJail && tile.index === 10 && (
                  <span className="absolute -top-1 -right-1 rounded bg-red-700 px-0.5 text-[6px] font-bold text-white shadow">
                    ขัง
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}
