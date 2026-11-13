import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BANKNOTE_DENOMINATIONS,
  JAIL_BAIL_AMOUNT,
  calculatePlayerNetWorth,
  canBuildOnCurrentTile,
  canRollAgain,
  canRollTurnOrder,
  canUnmortgageCurrentTile,
  getCurrentPlayer,
  getTile,
  type DiceRollResult,
  type DrawnCardInfo,
  type GameAction,
  type GameState,
} from '@super-millionaire/shared';
import {
  AlertCircle,
  ArrowLeftRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Dices,
  Home,
  KeyRound,
  LayoutGrid,
  LogOut,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  ScrollText,
  ShoppingBag,
  SkipForward,
  Users,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import { BankerAvatar, PlayerToken, ThaiBanknote } from './artwork';
import { BankerPanel } from './components/BankerPanel';
import { Board, type CashTransferFx, type RecentlyBuiltFx } from './components/Board';
import { CardRevealModal } from './components/CardRevealModal';
import { GameOverModal } from './components/GameOverModal';
import { LobbyView } from './components/LobbyView';
import { PlayerStrip } from './components/PlayerStrip';
import { TileModal } from './components/TileModal';
import { TradeModal } from './components/TradeModal';
import { TurnControls, getTurnRollButtonLabel } from './components/TurnControls';
import { TurnOrderBanner } from './components/TurnOrderBanner';
import { UnoDeedHand } from './components/UnoDeedHand';
import { WalletDeedsPanel } from './components/WalletDeedsPanel';
import { useSocketGame } from './hooks/useSocketGame';
import { formatBahtNumber } from './utils/boardLayout';
import { soundFX } from './utils/sound';

type DesktopSidebarTab = 'players' | 'wallet' | 'banker';
type MobileTab = 'board' | 'players' | 'wallet' | 'banker';

function deriveQuickTurnActions(
  gameState: GameState,
  myPlayerId: string | null,
  isSpectator: boolean,
  isAnimatingMove: boolean,
) {
  const currentPlayer = getCurrentPlayer(gameState);
  const isMyTurn = Boolean(myPlayerId && currentPlayer.id === myPlayerId && !isSpectator);
  const effectivePlayerId = myPlayerId ?? currentPlayer.id;

  const canRollInitial =
    (gameState.phase === 'AWAIT_ROLL' && !gameState.hasRolledThisTurn) ||
    canRollTurnOrder(gameState, currentPlayer.id);
  const canRollDoubles = canRollAgain(gameState, currentPlayer.id);
  const rollButtonLabel = getTurnRollButtonLabel(gameState, canRollDoubles);
  const buildCheck = isMyTurn ? canBuildOnCurrentTile(gameState, currentPlayer.id) : { allowed: false };
  const unmortgageCheck = isMyTurn
    ? canUnmortgageCurrentTile(gameState, currentPlayer.id)
    : { allowed: false };
  const canEndTurn =
    isMyTurn &&
    !isAnimatingMove &&
    gameState.phase === 'ACTION_PHASE' &&
    !canRollDoubles;
  const canProposeTrade =
    isMyTurn &&
    !isAnimatingMove &&
    (gameState.phase === 'AWAIT_ROLL' || gameState.phase === 'ACTION_PHASE');

  const decisionTile =
    gameState.pendingDecisionTileIndex !== null
      ? getTile(gameState.pendingDecisionTileIndex)
      : null;

  return {
    currentPlayer,
    isMyTurn,
    effectivePlayerId,
    canRollInitial,
    canRollDoubles,
    rollButtonLabel,
    buildCheck,
    unmortgageCheck,
    canEndTurn,
    canProposeTrade,
    decisionTile,
  };
}

function CollapsedDesktopTurnDock({
  gameState,
  myPlayerId,
  isSpectator,
  isAnimatingMove,
  onDispatchAction,
  onOpenTradeModal,
  onExpandSidebar,
}: {
  gameState: GameState;
  myPlayerId: string | null;
  isSpectator: boolean;
  isAnimatingMove: boolean;
  onDispatchAction: (action: GameAction) => void;
  onOpenTradeModal: () => void;
  onExpandSidebar: () => void;
}) {
  const {
    currentPlayer,
    isMyTurn,
    effectivePlayerId,
    canRollInitial,
    canRollDoubles,
    rollButtonLabel,
    buildCheck,
    unmortgageCheck,
    canEndTurn,
    canProposeTrade,
    decisionTile,
  } = deriveQuickTurnActions(gameState, myPlayerId, isSpectator, isAnimatingMove);

  return (
    <div className="luxury-glass-panel hidden items-center justify-between gap-3 rounded-xl px-3.5 py-2 lg:flex">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="h-3 w-3 shrink-0 rounded-full border border-white/60"
          style={{ backgroundColor: currentPlayer.color }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-100">
            <span className="truncate">
              {isAnimatingMove
                ? `${currentPlayer.name} กำลังเดิน...`
                : isMyTurn
                  ? 'ตาของคุณ'
                  : `ตาของ ${currentPlayer.name}`}
            </span>
            {currentPlayer.inJail && (
              <span className="rounded bg-amber-950/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/40">
                ติดคุก ({Math.min(3, currentPlayer.jailTurns + 1)}/3)
              </span>
            )}
            {(gameState.hasRolledThisTurn || gameState.phase === 'TURN_ORDER_ROLL') &&
              gameState.lastDice && (
                <span className="mono-num rounded bg-black/45 px-1.5 py-0.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                  เต๋า {gameState.lastDice.die1} + {gameState.lastDice.die2} ={' '}
                  {gameState.lastDice.total}
                </span>
              )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isMyTurn && !isAnimatingMove && (
          <>
            {(canRollInitial || canRollDoubles) && (
              <>
                {gameState.phase === 'AWAIT_ROLL' && canRollInitial && currentPlayer.inJail && (
                  <>
                    <button
                      type="button"
                      disabled={currentPlayer.cash < JAIL_BAIL_AMOUNT}
                      onClick={() =>
                        onDispatchAction({ type: 'PAY_JAIL_BAIL', playerId: effectivePlayerId })
                      }
                      className="tactile-btn inline-flex items-center gap-1 rounded-xl border border-amber-500/70 bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-stone-950 disabled:opacity-45"
                    >
                      <span>ประกัน ฿{JAIL_BAIL_AMOUNT}</span>
                    </button>
                    {currentPlayer.jailFreeCards > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onDispatchAction({ type: 'USE_JAIL_CARD', playerId: effectivePlayerId })
                        }
                        className="tactile-btn inline-flex items-center gap-1 rounded-xl border border-sky-400/50 bg-sky-700 px-3 py-1.5 text-xs font-extrabold text-white"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>บัตรพ้นคุก</span>
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() =>
                    onDispatchAction({ type: 'ROLL_DICE', playerId: effectivePlayerId })
                  }
                  className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/60 bg-gradient-to-b from-[#228d4f] to-[#155e34] px-4 py-1.5 text-xs font-extrabold text-amber-50 shadow"
                >
                  <Dices className="h-4 w-4 text-amber-200" />
                  <span>{rollButtonLabel}</span>
                </button>
              </>
            )}

            {gameState.phase === 'AWAIT_DECISION' && decisionTile && (
              <>
                <button
                  type="button"
                  disabled={currentPlayer.cash < (decisionTile.price ?? 0)}
                  onClick={() =>
                    onDispatchAction({ type: 'BUY_CURRENT_TILE', playerId: effectivePlayerId })
                  }
                  className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/60 bg-gradient-to-b from-[#21874c] to-[#14532e] px-3.5 py-1.5 text-xs font-extrabold text-amber-50 disabled:opacity-45"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>
                    ซื้อ #{decisionTile.deedNumber} (฿{formatBahtNumber(decisionTile.price ?? 0)})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onDispatchAction({ type: 'DECLINE_CURRENT_TILE', playerId: effectivePlayerId })
                  }
                  className="tactile-btn inline-flex items-center gap-1 rounded-xl border border-stone-600 bg-stone-800 px-3 py-1.5 text-xs font-bold text-stone-200 hover:bg-stone-700"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  <span>ไม่ซื้อ</span>
                </button>
              </>
            )}

            {gameState.phase === 'AWAIT_DEBT_RESOLUTION' && (
              <button
                type="button"
                onClick={onExpandSidebar}
                className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border border-rose-400/60 bg-rose-800 px-3.5 py-1.5 text-xs font-extrabold text-white"
              >
                <span>จัดการหนี้ค้างชำระ (เปิดแผงขวา)</span>
              </button>
            )}

            {gameState.phase === 'ACTION_PHASE' && (
              <>
                {buildCheck.allowed && (
                  <button
                    type="button"
                    onClick={() =>
                      onDispatchAction({
                        type: 'BUILD_ON_CURRENT_TILE',
                        playerId: effectivePlayerId,
                      })
                    }
                    className="tactile-btn inline-flex items-center gap-1 rounded-xl border border-amber-400/70 bg-gradient-to-b from-[#b45309] to-[#78350f] px-3 py-1.5 text-xs font-extrabold text-amber-50"
                  >
                    {buildCheck.isHotelUpgrade ? (
                      <Building2 className="h-3.5 w-3.5" />
                    ) : (
                      <Home className="h-3.5 w-3.5" />
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
                    className="tactile-btn inline-flex items-center gap-1 rounded-xl border border-emerald-400/50 bg-[#155e34] px-3 py-1.5 text-xs font-extrabold text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>ไถ่ถอน (฿{formatBahtNumber(unmortgageCheck.cost ?? 0)})</span>
                  </button>
                )}
              </>
            )}

            {canProposeTrade && (
              <button
                type="button"
                onClick={onOpenTradeModal}
                className="tactile-btn inline-flex items-center gap-1 rounded-xl border border-sky-400/50 bg-[#163f72] px-3 py-1.5 text-xs font-bold text-white"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>แลกเปลี่ยน</span>
              </button>
            )}

            {canEndTurn && (
              <button
                type="button"
                onClick={() =>
                  onDispatchAction({ type: 'END_TURN', playerId: effectivePlayerId })
                }
                className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border border-rose-400/50 bg-gradient-to-b from-[#d92b35] to-[#9e1a22] px-3.5 py-1.5 text-xs font-extrabold text-white shadow"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {currentPlayer.inJail && gameState.hasRolledThisTurn
                    ? 'จบตา (หยุดในคุก)'
                    : 'จบเทิร์น'}
                </span>
              </button>
            )}
          </>
        )}

        <button
          type="button"
          onClick={onExpandSidebar}
          className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-black/50 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-white/10"
          title="เปิดแผงข้อมูลและผู้เล่นทางด้านขวา"
        >
          <PanelRightOpen className="h-4 w-4 text-amber-300" />
          <span>เปิดแผงขวา</span>
        </button>
      </div>
    </div>
  );
}

function MobileBottomDock({
  gameState,
  myPlayerId,
  isSpectator,
  isAnimatingMove,
  onDispatchAction,
  onOpenWalletTab,
}: {
  gameState: GameState;
  myPlayerId: string | null;
  isSpectator: boolean;
  isAnimatingMove: boolean;
  onDispatchAction: (action: GameAction) => void;
  onOpenWalletTab: () => void;
}) {
  const {
    currentPlayer,
    isMyTurn,
    effectivePlayerId,
    canRollInitial,
    canRollDoubles,
    rollButtonLabel,
    buildCheck,
    unmortgageCheck,
    canEndTurn,
    decisionTile,
  } = deriveQuickTurnActions(gameState, myPlayerId, isSpectator, isAnimatingMove);

  return (
    <div className="safe-pb fixed inset-x-0 bottom-0 z-40 border-t-2 border-amber-500/40 bg-stone-950/95 px-3 py-2 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-2">
        {!isMyTurn || isAnimatingMove ? (
          <div className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-xs text-amber-100">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: currentPlayer.color }}
              />
              <span className="truncate font-semibold">
                {isAnimatingMove
                  ? `${currentPlayer.name} กำลังเดิน...`
                  : `ตาของ ${currentPlayer.name}`}
              </span>
            </div>
            <span className="mono-num shrink-0 font-bold text-emerald-300">
              {myPlayerId && !isSpectator && currentPlayer.id !== myPlayerId
                ? '฿ •••••'
                : `฿${formatBahtNumber(currentPlayer.cash)}`}
            </span>
          </div>
        ) : canRollInitial || canRollDoubles ? (
          <>
            {canRollInitial && currentPlayer.inJail && (
              <>
                <button
                  type="button"
                  disabled={currentPlayer.cash < JAIL_BAIL_AMOUNT}
                  onClick={() =>
                    onDispatchAction({ type: 'PAY_JAIL_BAIL', playerId: effectivePlayerId })
                  }
                  className="tactile-btn shrink-0 rounded-xl border border-amber-600 bg-amber-400 px-2.5 py-2 text-xs font-extrabold text-stone-950 disabled:opacity-45"
                >
                  ประกัน ฿{JAIL_BAIL_AMOUNT}
                </button>
                {currentPlayer.jailFreeCards > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onDispatchAction({ type: 'USE_JAIL_CARD', playerId: effectivePlayerId })
                    }
                    className="tactile-btn shrink-0 rounded-xl border border-sky-700 bg-sky-600 px-2.5 py-2 text-xs font-extrabold text-white"
                  >
                    บัตรพ้นคุก
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => onDispatchAction({ type: 'ROLL_DICE', playerId: effectivePlayerId })}
              className="tactile-btn flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#143d25] bg-[#1b7a43] px-4 py-2.5 text-sm font-extrabold text-amber-50 shadow"
            >
              <Dices className="h-4 w-4" />
              <span>{rollButtonLabel}</span>
            </button>
          </>
        ) : gameState.phase === 'AWAIT_DECISION' && decisionTile ? (
          <>
            <button
              type="button"
              disabled={currentPlayer.cash < (decisionTile.price ?? 0)}
              onClick={() =>
                onDispatchAction({ type: 'BUY_CURRENT_TILE', playerId: effectivePlayerId })
              }
              className="tactile-btn flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[#143d25] bg-[#1b7a43] px-3 py-2.5 text-xs font-extrabold text-white disabled:opacity-45"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>
                ซื้อ #{decisionTile.deedNumber} (฿{formatBahtNumber(decisionTile.price ?? 0)})
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                onDispatchAction({ type: 'DECLINE_CURRENT_TILE', playerId: effectivePlayerId })
              }
              className="tactile-btn flex items-center justify-center gap-1 rounded-xl border-2 border-stone-500 bg-stone-200 px-3.5 py-2.5 text-xs font-extrabold text-stone-900"
            >
              <SkipForward className="h-4 w-4" />
              <span>ไม่ซื้อ</span>
            </button>
          </>
        ) : gameState.phase === 'AWAIT_DEBT_RESOLUTION' ? (
          <button
            type="button"
            onClick={onOpenWalletTab}
            className="tactile-btn flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-rose-800 bg-rose-700 px-4 py-2.5 text-xs font-extrabold text-white shadow"
          >
            <span>
              ค้างชำระ ฿{formatBahtNumber(gameState.pendingDebt?.amount ?? 0)} — แตะเพื่อจัดการหนี้
            </span>
          </button>
        ) : (
          <>
            {buildCheck.allowed && (
              <button
                type="button"
                onClick={() =>
                  onDispatchAction({ type: 'BUILD_ON_CURRENT_TILE', playerId: effectivePlayerId })
                }
                className={`tactile-btn flex items-center justify-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-extrabold text-amber-50 shadow ${
                  buildCheck.isHotelUpgrade
                    ? 'border-amber-300/70 bg-gradient-to-b from-[#b91c1c] to-[#7f1d1d]'
                    : 'border-amber-400/70 bg-gradient-to-b from-[#b45309] to-[#78350f]'
                }`}
              >
                {buildCheck.isHotelUpgrade ? (
                  <Building2 className="h-4 w-4" />
                ) : (
                  <Home className="h-4 w-4" />
                )}
                <span>{buildCheck.isHotelUpgrade ? 'สร้างโรงแรม' : 'สร้างบ้าน'}</span>
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
                className="tactile-btn flex items-center justify-center gap-1 rounded-xl border-2 border-emerald-800 bg-emerald-600 px-3 py-2.5 text-xs font-extrabold text-white"
              >
                <RotateCcw className="h-4 w-4" />
                <span>ไถ่ถอน</span>
              </button>
            )}

            {canEndTurn && (
              <button
                type="button"
                onClick={() => onDispatchAction({ type: 'END_TURN', playerId: effectivePlayerId })}
                className="tactile-btn flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[#7f1319] bg-[#c8232c] px-4 py-2.5 text-sm font-extrabold text-white shadow"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {currentPlayer.inJail && gameState.hasRolledThisTurn
                    ? 'จบตา (หยุดในคุก)'
                    : 'จบเทิร์น'}
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const {
    roomState,
    gameState,
    connectionStatus,
    transportMode,
    isLocalOffline,
    mySeatIndex,
    myPlayerId,
    isSpectator,
    isHost,
    deepLinkRoomCode,
    savedPlayerName,
    errorToast,
    clearError,
    createRoom,
    startLocalGame,
    joinRoom,
    selectSeat,
    updateRoomConfig,
    setReady,
    startGame,
    dispatchGameAction,
    leaveRoom,
    resetLobby,
  } = useSocketGame();

  const [muted, setMuted] = useState(() => soundFX.isMuted());
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [revealedCard, setRevealedCard] = useState<DrawnCardInfo | null>(null);
  const [sidebarTab, setSidebarTab] = useState<DesktopSidebarTab>('players');
  const [mobileTab, setMobileTab] = useState<MobileTab>('board');
  const [isPlayerHudCollapsed, setIsPlayerHudCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string>('');
  const [displayPositions, setDisplayPositions] = useState<Record<string, number>>({});
  const [animatingPlayerId, setAnimatingPlayerId] = useState<string | null>(null);
  const [hopSpotlightTile, setHopSpotlightTile] = useState<number | null>(null);
  const [recentlyBuilt, setRecentlyBuilt] = useState<RecentlyBuiltFx | null>(null);
  const [cashTransferFx, setCashTransferFx] = useState<CashTransferFx | null>(null);
  const [myCashDelta, setMyCashDelta] = useState<{ amount: number; key: number } | null>(null);
  const [jailAlertBanner, setJailAlertBanner] = useState<{ message: string; key: number } | null>(null);
  const [showTurnOrderWinnerBanner, setShowTurnOrderWinnerBanner] = useState(false);
  const [isThrowingDice, setIsThrowingDice] = useState(false);
  const [showThrownDiceOverlay, setShowThrownDiceOverlay] = useState(false);
  const [throwKey, setThrowKey] = useState(0);
  const [thrownDiceFaces, setThrownDiceFaces] = useState<DiceRollResult | null>(null);
  const [activeCardDraw, setActiveCardDraw] = useState<{
    deck: 'chance' | 'chest';
    key: number;
  } | null>(null);

  const prevPositionsRef = useRef<Record<string, number>>({});
  const lastLedgerSeqRef = useRef<number>(0);
  const lastDiceRollSeqRef = useRef<number>(0);
  const lastCardKeyRef = useRef<string | null>(null);
  const hopTimerRef = useRef<number | null>(null);
  const diceIntervalRef = useRef<number | null>(null);
  const diceSettleTimerRef = useRef<number | null>(null);
  const diceHideTimerRef = useRef<number | null>(null);
  const buildFxTimerRef = useRef<number | null>(null);
  const jailBannerTimerRef = useRef<number | null>(null);
  const pendingJailBannerRef = useRef<{ message: string; key: number } | null>(null);
  const cashFxTimerRef = useRef<number | null>(null);
  const cashDeltaTimerRef = useRef<number | null>(null);
  const autoModalTimerRef = useRef<number | null>(null);
  const pendingWalkCashFxRef = useRef<CashTransferFx | null>(null);
  const pendingWalkCashDeltaRef = useRef<{ amount: number; key: number } | null>(null);
  const pendingWalkSoundsRef = useRef<Array<'cash' | 'card' | 'jail'>>([]);
  const pendingCardRevealRef = useRef<DrawnCardInfo | null>(null);
  const postCardAutoTileRef = useRef<number | null>(null);
  const turnOrderWinnerTimerRef = useRef<number | null>(null);
  const prevTurnPhaseRef = useRef<GameState['phase'] | undefined>(undefined);

  const triggerCashTransferFx = useCallback((fx: CashTransferFx) => {
    if (cashFxTimerRef.current !== null) window.clearTimeout(cashFxTimerRef.current);
    setCashTransferFx(fx);
    cashFxTimerRef.current = window.setTimeout(() => {
      setCashTransferFx(null);
    }, 3400);
  }, []);

  const triggerCashDelta = useCallback((delta: { amount: number; key: number }) => {
    if (cashDeltaTimerRef.current !== null) window.clearTimeout(cashDeltaTimerRef.current);
    setMyCashDelta(delta);
    cashDeltaTimerRef.current = window.setTimeout(() => {
      setMyCashDelta(null);
    }, 3200);
  }, []);

  const triggerJailBanner = useCallback((banner: { message: string; key: number }) => {
    if (jailBannerTimerRef.current !== null) window.clearTimeout(jailBannerTimerRef.current);
    setJailAlertBanner(banner);
    jailBannerTimerRef.current = window.setTimeout(() => {
      setJailAlertBanner(null);
    }, 3600);
  }, []);

  const flushPostWalkEffects = useCallback(
    (autoOpenTileIndex: number | null) => {
      const sounds = pendingWalkSoundsRef.current;
      pendingWalkSoundsRef.current = [];
      for (const s of sounds) {
        if (s === 'cash') soundFX.playCashChing();
        else if (s === 'card') soundFX.playCardFlip();
        else if (s === 'jail') soundFX.playJailBuzzer();
      }

      const queuedJailBanner = pendingJailBannerRef.current;
      pendingJailBannerRef.current = null;
      if (queuedJailBanner) {
        triggerJailBanner(queuedJailBanner);
      }

      const queuedCashFx = pendingWalkCashFxRef.current;
      pendingWalkCashFxRef.current = null;
      if (queuedCashFx) {
        triggerCashTransferFx(queuedCashFx);
      }

      const queuedCashDelta = pendingWalkCashDeltaRef.current;
      pendingWalkCashDeltaRef.current = null;
      if (queuedCashDelta) {
        triggerCashDelta(queuedCashDelta);
      }

      const queuedCard = pendingCardRevealRef.current;
      pendingCardRevealRef.current = null;
      if (queuedCard) {
        setActiveCardDraw({ deck: queuedCard.card.deck, key: Date.now() });
        setRevealedCard(queuedCard);
        postCardAutoTileRef.current = autoOpenTileIndex;
        return;
      }

      if (autoOpenTileIndex !== null) {
        if (autoModalTimerRef.current !== null) {
          window.clearTimeout(autoModalTimerRef.current);
          autoModalTimerRef.current = null;
        }
        // If rent/tax coins are flying, give 750ms so the player clearly sees coins & -฿ before modal pops
        if (queuedCashFx || queuedCashDelta) {
          autoModalTimerRef.current = window.setTimeout(() => {
            autoModalTimerRef.current = null;
            setSelectedTileIndex(autoOpenTileIndex);
          }, 750);
        } else {
          setSelectedTileIndex(autoOpenTileIndex);
        }
      }
    },
    [triggerCashDelta, triggerCashTransferFx, triggerJailBanner],
  );

  useEffect(() => {
    document.title = 'ซุปเปอร์เศรษฐี No. 9028 — Super Millionaire';
  }, []);

  // Default inspected wallet player to myself or current turn player
  useEffect(() => {
    if (!gameState) return;
    if (
      !inspectedPlayerId ||
      !gameState.players.some((p) => p.id === inspectedPlayerId)
    ) {
      setInspectedPlayerId(myPlayerId ?? gameState.players[0]?.id ?? '');
    }
  }, [gameState, inspectedPlayerId, myPlayerId]);

  // Step-by-step pawn hop animation when player position updates
  useEffect(() => {
    if (!gameState) {
      if (hopTimerRef.current !== null) {
        window.clearTimeout(hopTimerRef.current);
        hopTimerRef.current = null;
      }
      prevPositionsRef.current = {};
      setDisplayPositions({});
      setAnimatingPlayerId(null);
      setHopSpotlightTile(null);
      return;
    }

    // First snapshot initialization
    if (Object.keys(prevPositionsRef.current).length === 0) {
      const initial: Record<string, number> = {};
      for (const p of gameState.players) {
        initial[p.id] = p.position;
      }
      prevPositionsRef.current = initial;
      setDisplayPositions(initial);
      return;
    }

    let movedPlayerId: string | null = null;
    let fromPos = 0;
    let toPos = 0;
    let movedInJail = false;

    for (const p of gameState.players) {
      const prev = prevPositionsRef.current[p.id];
      if (prev !== undefined && prev !== p.position) {
        movedPlayerId = p.id;
        fromPos = prev;
        toPos = p.position;
        movedInJail = p.inJail;
        break;
      }
    }

    // Always keep prevPositionsRef synced for non-animating players
    const nextSnapshot: Record<string, number> = {};
    for (const p of gameState.players) {
      nextSnapshot[p.id] = p.position;
    }
    prevPositionsRef.current = nextSnapshot;

    if (!movedPlayerId) {
      if (hopTimerRef.current === null) {
        setDisplayPositions(nextSnapshot);
      }
      return;
    }

    if (hopTimerRef.current !== null) {
      window.clearTimeout(hopTimerRef.current);
      hopTimerRef.current = null;
    }

    const forwardDist = (toPos - fromPos + 40) % 40;
    const backwardDist = (fromPos - toPos + 40) % 40;
    const rolledTotal = gameState.lastDice?.total ?? 0;
    const wentViaGoToJail =
      movedInJail &&
      toPos === 10 &&
      rolledTotal >= 2 &&
      rolledTotal <= 12 &&
      (fromPos + rolledTotal) % 40 === 30;
    const isShortForward =
      (!movedInJail && forwardDist >= 1 && forwardDist <= 12) || wentViaGoToJail;
    const isShortBackward = !movedInJail && backwardDist >= 1 && backwardDist <= 3;

    const shouldAutoOpenTileModal = Boolean(
      !movedInJail &&
        myPlayerId &&
        !isSpectator &&
        movedPlayerId === myPlayerId &&
        gameState.deeds[toPos] &&
        !gameState.players.find((p) => p.id === movedPlayerId)?.isBankrupt,
    );

    if (!isShortForward && !isShortBackward) {
      setDisplayPositions(nextSnapshot);
      setAnimatingPlayerId(null);
      setHopSpotlightTile(null);
      window.setTimeout(() => {
        flushPostWalkEffects(shouldAutoOpenTileModal ? toPos : null);
      }, 60);
      return;
    }

    const totalSteps = wentViaGoToJail
      ? rolledTotal
      : isShortForward
        ? forwardDist
        : backwardDist;
    const delta = isShortForward ? 1 : -1;
    let step = 0;

    setAnimatingPlayerId(movedPlayerId);

    // Check if this update also contains a fresh dice roll so hops start cleanly after dice tumble
    const latestRoll = [...gameState.banker.ledger]
      .reverse()
      .find((e) => e.type === 'DICE_ROLL');
    const isFreshDiceMove = Boolean(
      latestRoll && latestRoll.seq > lastDiceRollSeqRef.current,
    );
    const initialDelay = isFreshDiceMove ? 560 : 140;

    const runStep = () => {
      step += 1;
      const intermediate = (fromPos + delta * step + 40) % 40;
      soundFX.playPawnHop(step);
      setHopSpotlightTile(intermediate);
      setDisplayPositions((prev) => ({
        ...prev,
        [movedPlayerId!]: intermediate,
      }));

      if (step < totalSteps) {
        hopTimerRef.current = window.setTimeout(runStep, 440);
      } else {
        hopTimerRef.current = window.setTimeout(
          () => {
            hopTimerRef.current = null;
            setAnimatingPlayerId(null);
            setHopSpotlightTile(null);
            setDisplayPositions(nextSnapshot);
            flushPostWalkEffects(shouldAutoOpenTileModal ? toPos : null);
          },
          wentViaGoToJail ? 440 : 260,
        );
      }
    };

    hopTimerRef.current = window.setTimeout(runStep, initialDelay);
  }, [gameState, myPlayerId, isSpectator, flushPostWalkEffects]);

  // Cleanup dice, hop & FX timers on unmount
  useEffect(() => {
    return () => {
      if (hopTimerRef.current !== null) window.clearTimeout(hopTimerRef.current);
      if (diceIntervalRef.current !== null) window.clearInterval(diceIntervalRef.current);
      if (diceSettleTimerRef.current !== null) window.clearTimeout(diceSettleTimerRef.current);
      if (diceHideTimerRef.current !== null) window.clearTimeout(diceHideTimerRef.current);
      if (buildFxTimerRef.current !== null) window.clearTimeout(buildFxTimerRef.current);
      if (cashFxTimerRef.current !== null) window.clearTimeout(cashFxTimerRef.current);
      if (cashDeltaTimerRef.current !== null) window.clearTimeout(cashDeltaTimerRef.current);
      if (autoModalTimerRef.current !== null) window.clearTimeout(autoModalTimerRef.current);
      if (jailBannerTimerRef.current !== null) window.clearTimeout(jailBannerTimerRef.current);
      if (turnOrderWinnerTimerRef.current !== null) {
        window.clearTimeout(turnOrderWinnerTimerRef.current);
      }
    };
  }, []);

  // Keep TurnOrderBanner open briefly to celebrate when turn order finishes
  useEffect(() => {
    if (!gameState) {
      prevTurnPhaseRef.current = undefined;
      setShowTurnOrderWinnerBanner(false);
      if (turnOrderWinnerTimerRef.current !== null) {
        window.clearTimeout(turnOrderWinnerTimerRef.current);
        turnOrderWinnerTimerRef.current = null;
      }
      return;
    }

    const prevPhase = prevTurnPhaseRef.current;
    prevTurnPhaseRef.current = gameState.phase;

    if (gameState.phase === 'TURN_ORDER_ROLL') {
      setShowTurnOrderWinnerBanner(false);
      if (turnOrderWinnerTimerRef.current !== null) {
        window.clearTimeout(turnOrderWinnerTimerRef.current);
        turnOrderWinnerTimerRef.current = null;
      }
    } else if (
      prevPhase === 'TURN_ORDER_ROLL' &&
      gameState.phase === 'AWAIT_ROLL' &&
      gameState.turnOrder?.winnerId
    ) {
      if (turnOrderWinnerTimerRef.current !== null) {
        window.clearTimeout(turnOrderWinnerTimerRef.current);
      }
      setShowTurnOrderWinnerBanner(true);
      turnOrderWinnerTimerRef.current = window.setTimeout(() => {
        setShowTurnOrderWinnerBanner(false);
        turnOrderWinnerTimerRef.current = null;
      }, 2800);
    }
  }, [gameState?.phase, gameState?.turnOrder?.winnerId, gameState]);

  // Sound effects & lively dice-throw trigger from new Banker Ledger entries
  useEffect(() => {
    if (!gameState) {
      lastLedgerSeqRef.current = 0;
      lastDiceRollSeqRef.current = 0;
      setIsThrowingDice(false);
      setShowThrownDiceOverlay(false);
      return;
    }
    const ledger = gameState.banker.ledger;
    if (ledger.length === 0) return;

    const latestSeq = ledger[ledger.length - 1]!.seq;
    if (latestSeq < lastLedgerSeqRef.current) {
      lastLedgerSeqRef.current = latestSeq;
      const existingRoll = [...ledger].reverse().find((e) => e.type === 'DICE_ROLL');
      lastDiceRollSeqRef.current = existingRoll?.seq ?? latestSeq;
      return;
    }
    if (lastLedgerSeqRef.current === 0) {
      lastLedgerSeqRef.current = latestSeq;
      const existingRoll = [...ledger].reverse().find((e) => e.type === 'DICE_ROLL');
      lastDiceRollSeqRef.current = existingRoll?.seq ?? latestSeq;
      return;
    }

    const newEntries = ledger.filter((e) => e.seq > lastLedgerSeqRef.current);
    if (newEntries.length === 0) return;
    lastLedgerSeqRef.current = latestSeq;

    const isWalkInProgress = hopTimerRef.current !== null;

    for (const entry of newEntries) {
      switch (entry.type) {
        case 'DICE_ROLL': {
          lastDiceRollSeqRef.current = entry.seq;
          soundFX.playDiceRoll();

          const realDice = gameState.lastDice;
          if (realDice) {
            if (diceIntervalRef.current !== null) window.clearInterval(diceIntervalRef.current);
            if (diceSettleTimerRef.current !== null) window.clearTimeout(diceSettleTimerRef.current);
            if (diceHideTimerRef.current !== null) window.clearTimeout(diceHideTimerRef.current);

            setThrowKey((k) => k + 1);
            setIsThrowingDice(true);
            setShowThrownDiceOverlay(true);
            setThrownDiceFaces(realDice);

            diceSettleTimerRef.current = window.setTimeout(() => {
              setIsThrowingDice(false);
            }, 900);

            diceHideTimerRef.current = window.setTimeout(() => {
              setShowThrownDiceOverlay(false);
            }, 2200);
          }
          break;
        }
        case 'BUILD_HOUSE':
        case 'BUILD_HOTEL': {
          soundFX.playCashChing();
          if (entry.tileIndex !== undefined) {
            if (buildFxTimerRef.current !== null) window.clearTimeout(buildFxTimerRef.current);
            setRecentlyBuilt({
              tileIndex: entry.tileIndex,
              kind: entry.type === 'BUILD_HOTEL' ? 'hotel' : 'house',
              key: entry.seq,
            });
            buildFxTimerRef.current = window.setTimeout(() => {
              setRecentlyBuilt(null);
            }, 1450);
          }
          break;
        }
        case 'RENT':
        case 'TAX':
        case 'PASS_START': {
          if (isWalkInProgress) {
            pendingWalkSoundsRef.current.push('cash');
          } else {
            soundFX.playCashChing();
          }

          if (entry.amount && entry.amount > 0) {
            const actor = entry.actorId
              ? gameState.players.find((p) => p.id === entry.actorId)
              : undefined;
            const target = entry.targetId
              ? gameState.players.find((p) => p.id === entry.targetId)
              : undefined;

            const fx: CashTransferFx =
              entry.type === 'RENT'
                ? {
                    key: entry.seq,
                    kind: 'RENT',
                    amount: entry.amount,
                    payerId: actor?.id,
                    recipientId: target?.id,
                    payerTileIndex: entry.tileIndex ?? actor?.position,
                    recipientTileIndex: target?.position,
                    message: `💸 ${actor?.name ?? 'ผู้เล่น'} จ่ายค่าเช่า -฿${formatBahtNumber(entry.amount)} → ${target?.name ?? 'เจ้าของโฉนด'}`,
                  }
                : entry.type === 'TAX'
                  ? {
                      key: entry.seq,
                      kind: 'TAX',
                      amount: entry.amount,
                      payerId: actor?.id,
                      payerTileIndex: entry.tileIndex ?? actor?.position,
                      message: `💸 ${actor?.name ?? 'ผู้เล่น'} จ่ายภาษี -฿${formatBahtNumber(entry.amount)} ให้ธนาคาร`,
                    }
                  : {
                      key: entry.seq,
                      kind: 'PASS_START',
                      amount: entry.amount,
                      recipientId: actor?.id,
                      recipientTileIndex: 0,
                      message: `✨ ${actor?.name ?? 'ผู้เล่น'} ผ่านจุดเริ่มต้น รับ +฿${formatBahtNumber(entry.amount)}`,
                    };

            if (isWalkInProgress) {
              pendingWalkCashFxRef.current = fx;
            } else {
              triggerCashTransferFx(fx);
            }

            if (myPlayerId && !isSpectator) {
              let deltaForMe = 0;
              if (entry.type === 'RENT') {
                if (entry.actorId === myPlayerId) deltaForMe = -entry.amount;
                else if (entry.targetId === myPlayerId) deltaForMe = entry.amount;
              } else if (entry.type === 'TAX' && entry.actorId === myPlayerId) {
                deltaForMe = -entry.amount;
              } else if (entry.type === 'PASS_START' && entry.actorId === myPlayerId) {
                deltaForMe = entry.amount;
              }
              if (deltaForMe !== 0) {
                const deltaObj = { amount: deltaForMe, key: entry.seq };
                if (isWalkInProgress) {
                  pendingWalkCashDeltaRef.current = deltaObj;
                } else {
                  triggerCashDelta(deltaObj);
                }
              }
            }
          }
          break;
        }
        case 'BUY_DEED':
        case 'SELL_HOUSE':
        case 'SELL_HOTEL':
        case 'MORTGAGE':
        case 'UNMORTGAGE':
        case 'TRADE':
          soundFX.playCashChing();
          break;
        case 'CARD_CHANCE':
        case 'CARD_CHEST':
          if (isWalkInProgress) pendingWalkSoundsRef.current.push('card');
          else soundFX.playCardFlip();
          break;
        case 'JAIL': {
          const actor = entry.actorId
            ? gameState.players.find((p) => p.id === entry.actorId)
            : undefined;
          const banner = {
            key: entry.seq,
            message: `🔒 ${actor?.name ?? 'ผู้เล่น'} เข้าคุก! หยุดเดินชั่วคราว (ทอยเบิ้ลหรือจ่าย ฿${JAIL_BAIL_AMOUNT} ในตาถัดไป)`,
          };
          if (isWalkInProgress) {
            pendingWalkSoundsRef.current.push('jail');
            pendingJailBannerRef.current = banner;
          } else {
            soundFX.playJailBuzzer();
            triggerJailBanner(banner);
          }
          break;
        }
        case 'GAME_OVER':
          soundFX.playFanfare();
          break;
      }
    }
  }, [gameState, myPlayerId, isSpectator, triggerCashDelta, triggerCashTransferFx]);

  // Trigger CardRevealModal when a new card is drawn (deferred until walk reaches deck tile)
  useEffect(() => {
    const drawn = gameState?.lastCardDrawn;
    if (!drawn) {
      lastCardKeyRef.current = null;
      return;
    }
    const key = `${drawn.turnNumber}:${drawn.card.id}:${drawn.playerId}`;
    if (lastCardKeyRef.current === null) {
      // Avoid popping stale card immediately on initial reconnect unless turn just happened
      lastCardKeyRef.current = key;
      return;
    }
    if (lastCardKeyRef.current !== key) {
      lastCardKeyRef.current = key;
      if (hopTimerRef.current !== null) {
        pendingCardRevealRef.current = drawn;
      } else {
        setActiveCardDraw({ deck: drawn.card.deck, key: Date.now() });
        setRevealedCard(drawn);
      }
    }
  }, [gameState?.lastCardDrawn]);

  const handleToggleMute = () => {
    setMuted(soundFX.toggleMute());
  };

  const handleCopyInvite = async () => {
    if (!roomState) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomState.roomId);
      await navigator.clipboard.writeText(url.toString());
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleDispatchAction = useCallback(
    (action: GameAction) => {
      void dispatchGameAction(action);
    },
    [dispatchGameAction],
  );

  const incomingTradeCount = useMemo(() => {
    if (!gameState || !myPlayerId) return 0;
    return gameState.pendingTrades.filter(
      (t) => t.status === 'PENDING' && t.toPlayerId === myPlayerId,
    ).length;
  }, [gameState, myPlayerId]);

  const showLobby = !roomState || roomState.status === 'LOBBY' || !gameState;

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-clip bg-[#17120c] text-amber-50">
      {/* Global Error Toast */}
      {errorToast && (
        <div
          role="alert"
          className="fixed top-3 left-1/2 z-[120] flex w-[92%] max-w-md -translate-x-1/2 items-center justify-between gap-2 rounded-xl border-2 border-rose-400 bg-rose-950/95 px-3.5 py-2.5 text-xs font-bold text-rose-100 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-300" />
            <span>{errorToast}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            aria-label="ปิดการแจ้งเตือน"
            className="rounded p-1 hover:bg-rose-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Jail Entry / Detention Banner */}
      {jailAlertBanner && (
        <div
          key={jailAlertBanner.key}
          role="status"
          className="fixed top-14 left-1/2 z-[115] flex w-[92%] max-w-md -translate-x-1/2 items-center justify-between gap-2 rounded-xl border-2 border-amber-400/80 bg-[#2a120f]/95 px-3.5 py-2.5 text-xs font-extrabold text-amber-100 shadow-2xl backdrop-blur"
        >
          <span>{jailAlertBanner.message}</span>
          <button
            type="button"
            onClick={() => setJailAlertBanner(null)}
            aria-label="ปิดประกาศเข้าคุก"
            className="rounded p-1 text-amber-300 hover:bg-amber-900/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showLobby ? (
        <LobbyView
          roomState={roomState}
          connectionStatus={connectionStatus}
          transportMode={transportMode}
          mySeatIndex={mySeatIndex}
          isSpectator={isSpectator}
          isHost={isHost}
          deepLinkRoomCode={deepLinkRoomCode}
          savedPlayerName={savedPlayerName}
          onCreateRoom={createRoom}
          onStartLocalGame={startLocalGame}
          onJoinRoom={joinRoom}
          onSelectSeat={selectSeat}
          onUpdateRoomConfig={updateRoomConfig}
          onSetReady={setReady}
          onStartGame={startGame}
          onLeaveRoom={leaveRoom}
        />
      ) : (
        <div className="flex min-h-dvh w-full flex-col">
          {/* Top Compact Game Header */}
          <header className="safe-pt luxury-header-bar sticky top-0 z-30 px-3 py-2 backdrop-blur-md sm:px-5">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span className="truncate font-[var(--font-display)] text-base font-extrabold tracking-tight text-amber-200 drop-shadow-[0_1px_6px_rgba(245,158,11,0.28)] sm:text-lg">
                  ซุปเปอร์เศรษฐี
                </span>
                <span className="mono-num rounded-md border border-amber-400/50 bg-gradient-to-b from-amber-400/20 to-amber-600/10 px-2 py-0.5 text-xs font-extrabold tracking-wider text-amber-200 shadow-inner">
                  {roomState.roomId}
                </span>
                {isLocalOffline && (
                  <span className="hidden rounded-full border border-emerald-400/40 bg-emerald-950/70 px-2 py-0.5 text-[10px] font-bold text-emerald-200 sm:inline-block">
                    โหมดเบราว์เซอร์ (AI บอท)
                  </span>
                )}
                <span
                  className={`hidden h-2 w-2 rounded-full sm:inline-block ${
                    connectionStatus === 'connected' || isLocalOffline
                      ? 'bg-emerald-400'
                      : 'bg-rose-400 animate-pulse'
                  }`}
                  title={isLocalOffline ? 'offline-local' : connectionStatus}
                />
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setIsRightPanelCollapsed((v) => !v)}
                  className={`touch-target hidden lg:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                    isRightPanelCollapsed
                      ? 'border-amber-400/60 bg-amber-950/75 text-amber-200 hover:bg-amber-900/70'
                      : 'border-stone-700 bg-stone-900 text-amber-100 hover:bg-stone-800'
                  }`}
                  title={isRightPanelCollapsed ? 'เปิดแผงควบคุมด้านขวา' : 'หุบแผงด้านขวาเพื่อขยายกระดานเต็มพื้นที่'}
                >
                  {isRightPanelCollapsed ? (
                    <PanelRightOpen className="h-3.5 w-3.5 text-amber-300" />
                  ) : (
                    <PanelRightClose className="h-3.5 w-3.5 text-amber-300" />
                  )}
                  <span>{isRightPanelCollapsed ? 'เปิดแผงขวา' : 'หุบแผงขวา'}</span>
                  {isRightPanelCollapsed && incomingTradeCount > 0 && (
                    <span className="mono-num rounded-full bg-amber-400 px-1.5 text-[10px] font-black text-stone-950">
                      {incomingTradeCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="touch-target inline-flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs font-semibold text-amber-100 hover:bg-stone-800"
                  title="คัดลอกลิงก์เชิญ"
                >
                  {copiedInvite ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {copiedInvite ? 'คัดลอกแล้ว' : 'เชิญเพื่อน'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleMute}
                  aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
                  className="touch-target flex items-center justify-center rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-amber-100 hover:bg-stone-800"
                >
                  {muted ? (
                    <VolumeX className="h-4 w-4 text-rose-300" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-emerald-300" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={leaveRoom}
                  className="touch-target inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-950/70 px-2.5 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-900"
                  title="ออกจากห้อง"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">ออก</span>
                </button>
              </div>
            </div>

            {/* Mobile View Switcher (< lg) */}
            <nav className="mx-auto mt-2 grid max-w-xl grid-cols-4 gap-1.5 lg:hidden">
              {(
                [
                  { id: 'board', label: 'กระดาน', icon: LayoutGrid },
                  {
                    id: 'players',
                    label: incomingTradeCount > 0 ? `ผู้เล่น (${incomingTradeCount})` : 'ผู้เล่น',
                    icon: Users,
                  },
                  { id: 'wallet', label: 'กระเป๋า', icon: Wallet },
                  { id: 'banker', label: 'นายธนาคาร', icon: ScrollText },
                ] as const
              ).map(({ id, label, icon: Icon }) => {
                const active = mobileTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMobileTab(id)}
                    className={`tactile-btn flex items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 text-[11px] font-bold ${
                      active
                        ? 'border-amber-400 bg-amber-400 text-stone-950'
                        : 'border-stone-700 bg-stone-900 text-stone-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </nav>
          </header>

          {/* Main Responsive Workspace */}
          <main
            className={`mx-auto flex w-full flex-1 flex-col gap-4 overflow-x-clip px-2.5 pt-2.5 pb-24 sm:px-5 lg:flex-row lg:items-start lg:py-3 ${
              isRightPanelCollapsed ? 'max-w-[1680px]' : 'max-w-[1440px]'
            }`}
          >
            {/* Desktop & Mobile Board Pane */}
            <section
              className={`min-w-0 max-w-full flex-1 space-y-2.5 pb-4 lg:pb-2 ${
                mobileTab === 'board' ? 'block' : 'hidden lg:block'
              }`}
            >
              {isRightPanelCollapsed && (
                <CollapsedDesktopTurnDock
                  gameState={gameState}
                  myPlayerId={myPlayerId}
                  isSpectator={isSpectator}
                  isAnimatingMove={animatingPlayerId !== null || isThrowingDice}
                  onDispatchAction={handleDispatchAction}
                  onOpenTradeModal={() => setTradeModalOpen(true)}
                  onExpandSidebar={() => setIsRightPanelCollapsed(false)}
                />
              )}

              <TurnOrderBanner
                gameState={gameState}
                myPlayerId={myPlayerId}
                isSpectator={isSpectator}
                visible={Boolean(
                  gameState.turnOrder &&
                    (gameState.phase === 'TURN_ORDER_ROLL' ||
                      (showTurnOrderWinnerBanner && gameState.turnOrder.winnerId)),
                )}
                onDismissWinner={() => {
                  setShowTurnOrderWinnerBanner(false);
                  if (turnOrderWinnerTimerRef.current !== null) {
                    window.clearTimeout(turnOrderWinnerTimerRef.current);
                    turnOrderWinnerTimerRef.current = null;
                  }
                }}
              />

              <Board
                gameState={gameState}
                displayPositions={displayPositions}
                animatingPlayerId={animatingPlayerId}
                hopSpotlightTile={hopSpotlightTile}
                recentlyBuilt={recentlyBuilt}
                cashTransferFx={cashTransferFx}
                selectedTileIndex={selectedTileIndex}
                onSelectTile={(idx) => setSelectedTileIndex(idx)}
                myPlayerId={myPlayerId}
                isSpectator={isSpectator}
                isExpandedView={isRightPanelCollapsed}
                showThrownDiceOverlay={showThrownDiceOverlay}
                isThrowingDice={isThrowingDice}
                throwKey={throwKey}
                thrownDiceFaces={thrownDiceFaces}
                activeCardDraw={activeCardDraw}
              />

              {/* Non-overlapping Bottom-Left Collapsible Wallet + Hearthstone/UNO Deed Hand */}
              <div className="mt-2.5 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-end sm:gap-3">
                {(() => {
                  const myPlayer =
                    myPlayerId && !isSpectator
                      ? gameState.players.find((p) => p.id === myPlayerId)
                      : null;
                  if (!myPlayer) return null;
                  const myNetWorth = calculatePlayerNetWorth(gameState, myPlayer.id);

                  return (
                    <div className="relative z-20 shrink-0">
                      {myCashDelta && (
                        <div
                          key={myCashDelta.key}
                          className={`pointer-events-none absolute -top-4 right-2 z-10 rounded-full border px-2.5 py-0.5 text-xs font-black shadow-lg ${
                            myCashDelta.amount > 0
                              ? 'animate-cash-gain border-emerald-300 bg-emerald-600 text-white'
                              : 'animate-cash-deduct border-rose-300 bg-rose-600 text-white'
                          }`}
                        >
                          <span className="mono-num">
                            {myCashDelta.amount > 0 ? '+' : '-'}฿
                            {formatBahtNumber(Math.abs(myCashDelta.amount))}
                          </span>
                        </div>
                      )}

                      {isPlayerHudCollapsed ? (
                        <button
                          type="button"
                          onClick={() => setIsPlayerHudCollapsed(false)}
                          className="hud-collapsible hud-pill-enter flex min-h-[46px] items-center gap-2 rounded-xl border border-emerald-400/45 bg-stone-950/92 px-3 py-1.5 text-xs font-extrabold text-amber-100 shadow-lg backdrop-blur-md hover:border-amber-300"
                          title="ขยายกระเป๋าเงินของคุณ"
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[#f7f0de]"
                            style={{ boxShadow: `inset 0 0 0 2px ${myPlayer.color}` }}
                          >
                            <PlayerToken tokenId={myPlayer.tokenId} color={myPlayer.color} size={20} />
                          </span>
                          <span className="mono-num text-sm font-black text-emerald-300">
                            ฿{formatBahtNumber(myPlayer.cash)}
                          </span>
                          {myPlayer.inJail && (
                            <span className="rounded bg-rose-700 px-1 py-0.5 text-[9px] text-white">
                              คุก
                            </span>
                          )}
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-200/85">
                            ขยาย
                            <ChevronUp className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      ) : (
                        <div className="hud-collapsible hud-pill-enter w-full rounded-2xl border border-emerald-400/35 bg-gradient-to-br from-[#13251a]/95 to-[#0f1712]/96 p-3 shadow-xl backdrop-blur-md sm:w-[252px]">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <div
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-[#f7f0de]"
                                style={{ boxShadow: `inset 0 0 0 2px ${myPlayer.color}` }}
                              >
                                <PlayerToken
                                  tokenId={myPlayer.tokenId}
                                  color={myPlayer.color}
                                  size={24}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-xs font-extrabold text-amber-100">
                                  {myPlayer.name}
                                </div>
                                <div className="text-[10px] text-emerald-300/80">
                                  กระเป๋าเงินของคุณ
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              {myPlayer.inJail && (
                                <span className="rounded-md bg-rose-800 px-1.5 py-0.5 text-[9px] font-bold text-rose-100">
                                  ติดคุก
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsPlayerHudCollapsed(true)}
                                className="inline-flex min-h-[28px] items-center gap-0.5 rounded-lg border border-amber-300/30 bg-stone-900/80 px-2 py-1 text-[10px] font-bold text-amber-200 hover:bg-stone-800"
                                title="หุบหน้าต่างเงินสด"
                              >
                                <span>หุบ</span>
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 flex items-baseline justify-between gap-2">
                            <div className="mono-num text-xl font-black text-emerald-300">
                              ฿{formatBahtNumber(myPlayer.cash)}
                            </div>
                            <div className="mono-num text-[11px] font-semibold text-amber-200/85">
                              สุทธิ ฿{formatBahtNumber(myNetWorth)}
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-1">
                            {BANKNOTE_DENOMINATIONS.map((denom) => (
                              <div key={denom} className="flex justify-center">
                                <ThaiBanknote
                                  denomination={denom}
                                  count={myPlayer.banknotes[denom] ?? 0}
                                  compact
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="min-w-0 flex-1 overflow-visible">
                  <UnoDeedHand
                    gameState={gameState}
                    myPlayerId={myPlayerId}
                    isSpectator={isSpectator}
                    selectedTileIndex={selectedTileIndex}
                    onSelectTile={(idx) => setSelectedTileIndex(idx)}
                  />
                </div>
              </div>
            </section>

            {/* Right Sidebar (Desktop collapsible for full-board play; Mobile renders active subtab) */}
            <aside
              className={`flex w-full min-w-0 max-w-full flex-col gap-3 ${
                isRightPanelCollapsed
                  ? 'lg:hidden'
                  : 'lg:w-[410px] lg:shrink-0 xl:w-[445px]'
              }`}
            >
              <div className="hidden items-center justify-between px-0.5 lg:flex">
                <span className="text-[11px] font-bold tracking-wider text-amber-200/70 uppercase">
                  แผงควบคุม & ข้อมูลผู้เล่น
                </span>
                <button
                  type="button"
                  onClick={() => setIsRightPanelCollapsed(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-400/25 bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-white/10"
                  title="หุบแผงด้านขวาเพื่อให้แสดงกระดานเต็มพื้นที่"
                >
                  <span>หุบแผง</span>
                  <PanelRightClose className="h-3.5 w-3.5 text-amber-300" />
                </button>
              </div>
              {/* Desktop TurnControls always pinned at top of sidebar */}
              <div className={mobileTab === 'board' ? 'block' : 'hidden lg:block'}>
                <TurnControls
                  gameState={gameState}
                  myPlayerId={myPlayerId}
                  isSpectator={isSpectator}
                  isAnimatingMove={animatingPlayerId !== null || isThrowingDice}
                  isThrowingDice={isThrowingDice}
                  throwKey={throwKey}
                  thrownDiceFaces={thrownDiceFaces}
                  onDispatchAction={handleDispatchAction}
                  onOpenTradeModal={() => setTradeModalOpen(true)}
                  onSelectTile={(idx) => setSelectedTileIndex(idx)}
                />
              </div>

              {/* Compact Live Banker Banner on Desktop */}
              <div className="luxury-glass-panel hidden items-center gap-2.5 rounded-xl px-3 py-2 lg:flex">
                <BankerAvatar size={32} className="shrink-0" />
                <p className="line-clamp-2 flex-1 text-xs font-medium text-amber-100/95">
                  {gameState.banker.ledger[gameState.banker.ledger.length - 1]?.message ??
                    'นายธนาคารพร้อมให้บริการ'}
                </p>
              </div>

              {/* Desktop Sidebar Tabs */}
              <div className="hidden grid-cols-3 gap-1.5 rounded-xl border border-amber-500/20 bg-stone-950/75 p-1 lg:grid">
                {(
                  [
                    {
                      id: 'players',
                      label:
                        incomingTradeCount > 0 ? `ผู้เล่น (${incomingTradeCount})` : 'ผู้เล่น',
                      icon: Users,
                    },
                    { id: 'wallet', label: 'กระเป๋า & โฉนด', icon: Wallet },
                    { id: 'banker', label: 'นายธนาคาร', icon: ScrollText },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSidebarTab(id)}
                    className={`tactile-btn flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-bold transition ${
                      sidebarTab === id
                        ? 'border-amber-300/80 bg-gradient-to-b from-amber-300 to-amber-500 text-stone-950 shadow-[0_2px_10px_rgba(245,158,11,0.35)]'
                        : 'border-transparent bg-transparent text-stone-300 hover:bg-stone-800/80 hover:text-amber-100'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Players Pane */}
              <div
                className={`${
                  mobileTab === 'players' ? 'block' : 'hidden'
                } ${sidebarTab === 'players' ? 'lg:block' : 'lg:hidden'}`}
              >
                <div className="space-y-3">
                  {myPlayerId &&
                    !isSpectator &&
                    getCurrentPlayer(gameState).id === myPlayerId &&
                    (gameState.phase === 'AWAIT_ROLL' || gameState.phase === 'ACTION_PHASE') && (
                      <button
                        type="button"
                        onClick={() => setTradeModalOpen(true)}
                        className="tactile-btn flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1c4e8a] bg-[#1c4e8a] px-4 py-2.5 text-sm font-bold text-white shadow lg:hidden"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                        <span>ยื่นข้อเสนอแลกเปลี่ยน</span>
                      </button>
                    )}

                  <PlayerStrip
                    gameState={gameState}
                    myPlayerId={myPlayerId}
                    isSpectator={isSpectator}
                    selectedPlayerId={inspectedPlayerId}
                    onSelectPlayer={(pid) => {
                      setInspectedPlayerId(pid);
                      setSidebarTab('wallet');
                      if (mobileTab === 'players') {
                        setMobileTab('wallet');
                      }
                    }}
                    onDispatchAction={handleDispatchAction}
                  />
                </div>
              </div>

              {/* Wallet & Deeds Pane */}
              <div
                className={`${
                  mobileTab === 'wallet' ? 'block' : 'hidden'
                } ${sidebarTab === 'wallet' ? 'lg:block' : 'lg:hidden'}`}
              >
                <div className="space-y-3">
                  {mobileTab === 'wallet' && gameState.phase === 'AWAIT_DEBT_RESOLUTION' && (
                    <div className="lg:hidden">
                      <TurnControls
                        gameState={gameState}
                        myPlayerId={myPlayerId}
                        isSpectator={isSpectator}
                        isAnimatingMove={animatingPlayerId !== null || isThrowingDice}
                        isThrowingDice={isThrowingDice}
                        throwKey={throwKey}
                        thrownDiceFaces={thrownDiceFaces}
                        onDispatchAction={handleDispatchAction}
                        onOpenTradeModal={() => setTradeModalOpen(true)}
                        onSelectTile={(idx) => setSelectedTileIndex(idx)}
                      />
                    </div>
                  )}
                  <WalletDeedsPanel
                    gameState={gameState}
                    inspectedPlayerId={inspectedPlayerId}
                    myPlayerId={myPlayerId}
                    isSpectator={isSpectator}
                    selectedTileIndex={selectedTileIndex}
                    onSelectPlayer={(pid) => setInspectedPlayerId(pid)}
                    onSelectTile={(idx) => setSelectedTileIndex(idx)}
                  />
                </div>
              </div>

              {/* Banker Ledger Pane */}
              <div
                className={`${
                  mobileTab === 'banker' ? 'block' : 'hidden'
                } ${sidebarTab === 'banker' ? 'lg:block' : 'lg:hidden'}`}
              >
                <BankerPanel gameState={gameState} />
              </div>
            </aside>
          </main>

          {/* Mobile Fixed-Bottom Turn Action Dock (< lg) */}
          <MobileBottomDock
            gameState={gameState}
            myPlayerId={myPlayerId}
            isSpectator={isSpectator}
            isAnimatingMove={animatingPlayerId !== null || isThrowingDice}
            onDispatchAction={handleDispatchAction}
            onOpenWalletTab={() => setMobileTab('wallet')}
          />

          {/* React-Portal Modals */}
          <TileModal
            tileIndex={selectedTileIndex}
            gameState={gameState}
            myPlayerId={myPlayerId}
            onClose={() => setSelectedTileIndex(null)}
            onDispatchAction={handleDispatchAction}
          />

          <TradeModal
            open={tradeModalOpen}
            gameState={gameState}
            myPlayerId={myPlayerId}
            onClose={() => setTradeModalOpen(false)}
            onDispatchAction={handleDispatchAction}
          />

          <CardRevealModal
            drawnCard={revealedCard}
            player={
              revealedCard
                ? gameState.players.find((p) => p.id === revealedCard.playerId)
                : undefined
            }
            onClose={() => {
              setRevealedCard(null);
              if (postCardAutoTileRef.current !== null) {
                const nextTile = postCardAutoTileRef.current;
                postCardAutoTileRef.current = null;
                setSelectedTileIndex(nextTile);
              }
            }}
          />

          <GameOverModal
            gameState={gameState}
            isHost={isHost}
            onPlayAgain={() => void resetLobby()}
            onLeaveRoom={leaveRoom}
          />
        </div>
      )}
    </div>
  );
}
