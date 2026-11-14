import { INITIAL_BANKNOTES, INITIAL_CASH, cloneBanknotes, roundToNearestTen } from './banknotes.js';
import {
  adjustPlayerCash,
  buildTileLedgerLabel,
  calculatePlayerNetWorth,
  calculateRent,
  calculateUnmortgageCost,
  countCompletedColorGroups,
  createInitialBankerState,
  formatBaht,
  getCurrentRoundNumber,
  getDeedLevel,
  hasAnyBuildingInColorGroup,
  hasMortgagedInColorGroup,
  ownsAllGrandHotels,
  ownsFullColorGroup,
  recordBankerEntry,
  setPlayerCash,
} from './bankerBot.js';
import {
  BOARD_TILES,
  BOT_DEFAULT_NAMES,
  CARD_BY_ID,
  CHANCE_CARDS,
  CHEST_CARDS,
  COLOR_GROUP_TILES,
  GO_TO_JAIL_TILE_INDEX,
  JAIL_BAIL_AMOUNT,
  JAIL_TILE_INDEX,
  PLAYER_COLORS,
  PURCHASABLE_TILE_INDICES,
  START_BONUS,
  TOKEN_NAMES,
  getTile,
} from './boardData.js';
import type {
  CardDeck,
  CardDefinition,
  DebtState,
  DeedState,
  DicePowerRange,
  DiceRollResult,
  GameAction,
  GameRulesConfig,
  GameState,
  LedgerEntry,
  PlayerSlotConfig,
  PlayerState,
  RoomConfig,
  TradeOffer,
  TradeOfferInput,
  TurnOrderRollRecord,
  TurnOrderRoundRecord,
  TurnOrderState,
} from './types.js';

export const DEFAULT_GAME_RULES: Required<GameRulesConfig> = {
  maxRounds: 30,
  monopolyVictory: true,
  hostileTakeover: true,
  escalatingRent: true,
};

export function normalizeGameRules(
  raw?: Partial<GameRulesConfig> | null,
): Required<GameRulesConfig> {
  const maxRounds =
    raw && 'maxRounds' in raw
      ? typeof raw.maxRounds === 'number' &&
        Number.isFinite(raw.maxRounds) &&
        raw.maxRounds >= 5
        ? Math.trunc(raw.maxRounds)
        : null
      : DEFAULT_GAME_RULES.maxRounds;
  return {
    maxRounds,
    monopolyVictory: raw?.monopolyVictory ?? DEFAULT_GAME_RULES.monopolyVictory,
    hostileTakeover: raw?.hostileTakeover ?? DEFAULT_GAME_RULES.hostileTakeover,
    escalatingRent: raw?.escalatingRent ?? DEFAULT_GAME_RULES.escalatingRent,
  };
}

export interface EngineResult {
  ok: boolean;
  state: GameState;
  error?: string;
  entries: LedgerEntry[];
}

export type RollInput = (() => number) | readonly [number, number];

function fail(state: GameState, error: string): EngineResult {
  return { ok: false, state, error, entries: [] };
}

function ok(state: GameState, entries: LedgerEntry[]): EngineResult {
  return { ok: true, state, entries };
}

function shuffleIds(ids: readonly string[], rng: () => number): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function appendEntry(
  state: GameState,
  entries: LedgerEntry[],
  params: Parameters<typeof recordBankerEntry>[1],
): GameState {
  const { banker, entry } = recordBankerEntry(state.banker, params);
  entries.push(entry);
  return {
    ...state,
    banker,
  };
}

function updatePlayer(
  state: GameState,
  playerId: string,
  updater: (p: PlayerState) => PlayerState,
): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? updater(p) : p)),
  };
}

function updateDeed(
  state: GameState,
  tileIndex: number,
  updater: (d: DeedState) => DeedState,
): GameState {
  const existing = state.deeds[tileIndex];
  if (!existing) return state;
  return {
    ...state,
    deeds: {
      ...state.deeds,
      [tileIndex]: updater(existing),
    },
  };
}

export function getCurrentPlayer(state: GameState): PlayerState {
  return state.players[state.currentTurnIndex]!;
}

function findPlayer(state: GameState, playerId: string): PlayerState | undefined {
  return state.players.find((p) => p.id === playerId);
}

function getNextActiveTurnIndex(players: readonly PlayerState[], fromIndex: number): number {
  const count = players.length;
  for (let step = 1; step <= count; step++) {
    const idx = (fromIndex + step) % count;
    if (!players[idx]!.isBankrupt) {
      return idx;
    }
  }
  return fromIndex;
}

function activePlayersCount(state: GameState): number {
  return state.players.filter((p) => !p.isBankrupt).length;
}

const DICE_PAIRS_BY_RANGE: Readonly<Record<DicePowerRange, ReadonlyArray<readonly [number, number]>>> = {
  // 2..5
  low: [
    [1, 1],
    [1, 2],
    [2, 1],
    [1, 3],
    [2, 2],
    [3, 1],
    [1, 4],
    [2, 3],
    [3, 2],
    [4, 1],
  ],
  // 6..8
  mid: [
    [1, 5],
    [2, 4],
    [3, 3],
    [4, 2],
    [5, 1],
    [1, 6],
    [2, 5],
    [3, 4],
    [4, 3],
    [5, 2],
    [6, 1],
    [2, 6],
    [3, 5],
    [4, 4],
    [5, 3],
    [6, 2],
  ],
  // 9..12
  high: [
    [3, 6],
    [4, 5],
    [5, 4],
    [6, 3],
    [4, 6],
    [5, 5],
    [6, 4],
    [5, 6],
    [6, 5],
    [6, 6],
  ],
};

function rollTwoDice(rollInput?: RollInput, powerRange?: DicePowerRange): DiceRollResult {
  let die1: number;
  let die2: number;
  if (Array.isArray(rollInput)) {
    die1 = Math.max(1, Math.min(6, Math.trunc(rollInput[0])));
    die2 = Math.max(1, Math.min(6, Math.trunc(rollInput[1])));
  } else {
    const rng = typeof rollInput === 'function' ? rollInput : Math.random;
    const validRange =
      powerRange === 'low' || powerRange === 'mid' || powerRange === 'high'
        ? powerRange
        : undefined;
    // When player charges into a range, give ~68% chance of landing within that range and ~32% full random
    if (validRange && rng() < 0.68) {
      const pool = DICE_PAIRS_BY_RANGE[validRange];
      const picked = pool[Math.floor(rng() * pool.length)]!;
      die1 = picked[0];
      die2 = picked[1];
    } else {
      die1 = Math.floor(rng() * 6) + 1;
      die2 = Math.floor(rng() * 6) + 1;
    }
  }
  return {
    die1,
    die2,
    total: die1 + die2,
    isDoubles: die1 === die2,
    ...(powerRange ? { powerRange } : {}),
  };
}

function requireCurrentPlayer(
  state: GameState,
  playerId: string,
): { ok: true; player: PlayerState } | { ok: false; error: string } {
  if (state.phase === 'LOBBY' || state.phase === 'GAME_OVER') {
    return { ok: false, error: 'เกมยังไม่ได้เริ่มหรือจบลงแล้ว' };
  }
  const current = getCurrentPlayer(state);
  if (!current || current.id !== playerId) {
    return { ok: false, error: 'ยังไม่ถึงตาของคุณ' };
  }
  if (current.isBankrupt) {
    return { ok: false, error: 'ผู้เล่นนี้ล้มละลายแล้ว' };
  }
  return { ok: true, player: current };
}

export function canRollTurnOrder(state: GameState, playerId: string): boolean {
  if (state.phase !== 'TURN_ORDER_ROLL' || !state.turnOrder) return false;
  const current = getCurrentPlayer(state);
  return (
    current.id === playerId &&
    !current.isBankrupt &&
    state.turnOrder.contenderIds.includes(playerId) &&
    !state.turnOrder.rolls[playerId]
  );
}

export function canRollAgain(state: GameState, playerId: string): boolean {
  const current = getCurrentPlayer(state);
  return (
    state.phase === 'ACTION_PHASE' &&
    current.id === playerId &&
    !current.isBankrupt &&
    !current.inJail &&
    state.doublesCount > 0 &&
    state.doublesCount < 3
  );
}

export function canBuildOnCurrentTile(
  state: GameState,
  playerId: string,
): { allowed: boolean; reason?: string; cost?: number; isHotelUpgrade?: boolean } {
  if (state.phase !== 'ACTION_PHASE') {
    return { allowed: false, reason: 'สามารถสร้างได้เฉพาะในช่วง ACTION_PHASE เท่านั้น' };
  }
  const current = getCurrentPlayer(state);
  if (current.id !== playerId || current.isBankrupt || current.inJail) {
    return { allowed: false, reason: 'ไม่ใช่ตาของคุณหรือกำลังติดคุก' };
  }

  const tileIndex = current.position;
  const tile = getTile(tileIndex);
  if (tile.type !== 'property' || !tile.colorGroup || !tile.houseCost) {
    return { allowed: false, reason: 'ช่องนี้ไม่สามารถสร้างบ้านหรือโรงแรมได้' };
  }

  const deed = state.deeds[tileIndex];
  if (!deed || deed.ownerId !== playerId) {
    return { allowed: false, reason: 'คุณต้องยืนอยู่บนโฉนดของตนเองจึงจะสร้างได้' };
  }

  if (deed.isMortgaged) {
    return { allowed: false, reason: 'โฉนดนี้ติดจำนองอยู่' };
  }

  if (!ownsFullColorGroup(state, playerId, tile.colorGroup)) {
    return { allowed: false, reason: 'ต้องครอบครองโฉนดครบทั้งกลุ่มสีก่อนจึงจะสร้างได้' };
  }

  if (hasMortgagedInColorGroup(state, tile.colorGroup)) {
    return { allowed: false, reason: 'ห้ามมีโฉนดติดจำนองในกลุ่มสีเดียวกัน' };
  }

  const groupDeeds = COLOR_GROUP_TILES[tile.colorGroup].map((idx) => state.deeds[idx]!);
  const currentLevel = getDeedLevel(deed);
  if (currentLevel >= 5) {
    return { allowed: false, reason: 'ช่องนี้มีโรงแรมแล้ว (ระดับสูงสุด)' };
  }

  const minLevel = Math.min(...groupDeeds.map(getDeedLevel));
  if (currentLevel > minLevel) {
    return { allowed: false, reason: 'ต้องสร้างบ้านให้เท่ากันในกลุ่มสีเดียวกัน (Even-Build)' };
  }

  const isHotelUpgrade = currentLevel === 4;
  if (isHotelUpgrade) {
    if (state.banker.hotelsRemaining < 1) {
      return { allowed: false, reason: 'โรงแรมในธนาคารหมดแล้ว' };
    }
  } else if (state.banker.housesRemaining < 1) {
    return { allowed: false, reason: 'บ้านในธนาคารหมดแล้ว' };
  }

  if (current.cash < tile.houseCost) {
    return { allowed: false, reason: 'เงินสดไม่พอสำหรับก่อสร้าง' };
  }

  return { allowed: true, cost: tile.houseCost, isHotelUpgrade };
}

export function canUnmortgageCurrentTile(
  state: GameState,
  playerId: string,
): { allowed: boolean; reason?: string; cost?: number } {
  if (state.phase !== 'ACTION_PHASE') {
    return { allowed: false, reason: 'สามารถไถ่ถอนได้เฉพาะในช่วง ACTION_PHASE เท่านั้น' };
  }
  const current = getCurrentPlayer(state);
  if (current.id !== playerId || current.isBankrupt || current.inJail) {
    return { allowed: false, reason: 'ไม่ใช่ตาของคุณหรือกำลังติดคุก' };
  }

  const tileIndex = current.position;
  const deed = state.deeds[tileIndex];
  if (!deed || deed.ownerId !== playerId) {
    return { allowed: false, reason: 'คุณต้องยืนอยู่บนโฉนดของตนเองจึงจะไถ่ถอนได้' };
  }
  if (!deed.isMortgaged) {
    return { allowed: false, reason: 'โฉนดนี้ไม่ได้ติดจำนอง' };
  }

  const tile = getTile(tileIndex);
  const cost = calculateUnmortgageCost(tile);
  if (current.cash < cost) {
    return { allowed: false, reason: 'เงินสดไม่พอสำหรับไถ่ถอนจำนอง', cost };
  }

  return { allowed: true, cost };
}

export function canSellHouseOnTile(
  state: GameState,
  playerId: string,
  tileIndex: number,
): { allowed: boolean; reason?: string; refund?: number } {
  const isDebtPhase =
    state.phase === 'AWAIT_DEBT_RESOLUTION' && state.pendingDebt?.debtorId === playerId;
  const isActionPhase = state.phase === 'ACTION_PHASE';
  if (!isDebtPhase && !isActionPhase) {
    return { allowed: false, reason: 'ไม่สามารถขายสิ่งปลูกสร้างในขั้นตอนนี้ได้' };
  }

  const current = getCurrentPlayer(state);
  if (current.id !== playerId || current.isBankrupt) {
    return { allowed: false, reason: 'ไม่ใช่ตาของคุณ' };
  }

  if (isActionPhase && current.position !== tileIndex) {
    return { allowed: false, reason: 'ในตาปกติต้องยืนอยู่บนช่องนั้นจึงจะขายสิ่งปลูกสร้างได้' };
  }

  const tile = getTile(tileIndex);
  if (tile.type !== 'property' || !tile.colorGroup || !tile.houseCost) {
    return { allowed: false, reason: 'ช่องนี้ไม่มีสิ่งปลูกสร้างให้ขาย' };
  }

  const deed = state.deeds[tileIndex];
  if (!deed || deed.ownerId !== playerId) {
    return { allowed: false, reason: 'คุณไม่ได้เป็นเจ้าของโฉนดนี้' };
  }

  const currentLevel = getDeedLevel(deed);
  if (currentLevel <= 0) {
    return { allowed: false, reason: 'ไม่มีบ้านหรือโรงแรมบนช่องนี้' };
  }

  const groupDeeds = COLOR_GROUP_TILES[tile.colorGroup].map((idx) => state.deeds[idx]!);
  const maxLevel = Math.max(...groupDeeds.map(getDeedLevel));
  if (currentLevel < maxLevel) {
    return { allowed: false, reason: 'ต้องขายสิ่งปลูกสร้างจากช่องที่มีจำนวนมากที่สุดในกลุ่มก่อน (Even-Sell)' };
  }

  const refund = Math.floor(tile.houseCost / 2);
  return { allowed: true, refund };
}

export function canMortgageTile(
  state: GameState,
  playerId: string,
  tileIndex: number,
): { allowed: boolean; reason?: string; proceeds?: number } {
  const isDebtPhase =
    state.phase === 'AWAIT_DEBT_RESOLUTION' && state.pendingDebt?.debtorId === playerId;
  const isActionPhase = state.phase === 'ACTION_PHASE';
  if (!isDebtPhase && !isActionPhase) {
    return { allowed: false, reason: 'ไม่สามารถจำนองในขั้นตอนนี้ได้' };
  }

  const current = getCurrentPlayer(state);
  if (current.id !== playerId || current.isBankrupt) {
    return { allowed: false, reason: 'ไม่ใช่ตาของคุณ' };
  }

  if (isActionPhase && current.position !== tileIndex) {
    return { allowed: false, reason: 'ในตาปกติต้องยืนอยู่บนช่องนั้นจึงจะจำนองได้' };
  }

  const deed = state.deeds[tileIndex];
  if (!deed || deed.ownerId !== playerId) {
    return { allowed: false, reason: 'คุณไม่ได้เป็นเจ้าของโฉนดนี้' };
  }

  if (deed.isMortgaged) {
    return { allowed: false, reason: 'โฉนดนี้จำนองอยู่แล้ว' };
  }

  const tile = getTile(tileIndex);
  if (tile.type === 'property' && tile.colorGroup) {
    if (hasAnyBuildingInColorGroup(state, tile.colorGroup)) {
      return { allowed: false, reason: 'ต้องขายบ้านและโรงแรมทั้งหมดในกลุ่มสีนี้ก่อนจำนอง' };
    }
  }

  const proceeds = tile.mortgageValue ?? Math.floor((tile.price ?? 0) / 2);
  return { allowed: true, proceeds };
}

export function canHostileTakeoverCurrentTile(
  state: GameState,
  playerId: string,
): { allowed: boolean; reason?: string; cost?: number; targetOwnerId?: string } {
  if (!state.rules?.hostileTakeover) {
    return { allowed: false, reason: 'ไม่ได้เปิดกติกาซื้อฮุบที่ดิน 2× ในห้องนี้' };
  }
  if (state.phase !== 'ACTION_PHASE') {
    return { allowed: false, reason: 'สามารถซื้อฮุบที่ดินได้เฉพาะในช่วง ACTION_PHASE' };
  }
  const current = getCurrentPlayer(state);
  if (current.id !== playerId || current.isBankrupt || current.inJail) {
    return { allowed: false, reason: 'ไม่ใช่ตาของคุณหรือกำลังติดคุก' };
  }

  const tileIndex = current.position;
  const tile = getTile(tileIndex);
  if (tile.type !== 'property' && tile.type !== 'utility') {
    return { allowed: false, reason: 'สามารถซื้อฮุบได้เฉพาะที่ดินหรือสาธารณูปโภค (ไม่สามารถฮุบโรงแรมใหญ่ได้)' };
  }

  const deed = state.deeds[tileIndex];
  if (!deed || !deed.ownerId || deed.ownerId === playerId) {
    return { allowed: false, reason: 'ต้องยืนอยู่บนโฉนดของผู้เล่นอื่นจึงจะซื้อฮุบได้' };
  }
  if (deed.hasHotel) {
    return { allowed: false, reason: 'ไม่สามารถซื้อฮุบที่ดินที่สร้างโรงแรมแล้วได้' };
  }

  const baseValue = (tile.price ?? 0) + deed.houses * (tile.houseCost ?? 0);
  const cost = roundToNearestTen(baseValue * 2);
  if (current.cash < cost) {
    return {
      allowed: false,
      reason: `เงินสดไม่พอสำหรับซื้อฮุบ 2× (${formatBaht(cost)})`,
      cost,
      targetOwnerId: deed.ownerId,
    };
  }

  return {
    allowed: true,
    cost,
    targetOwnerId: deed.ownerId,
  };
}

function checkSpecialVictory(state: GameState, entries: LedgerEntry[]): GameState {
  if (state.phase === 'GAME_OVER' || !state.rules?.monopolyVictory) {
    return state;
  }

  for (const player of state.players) {
    if (player.isBankrupt) continue;
    const completedGroups = countCompletedColorGroups(state, player.id);
    if (completedGroups.length >= 3) {
      const reason = 'ชนะด้วยการผูกขาดที่ดินครบ 3 กลุ่มสี!';
      let next: GameState = {
        ...state,
        phase: 'GAME_OVER',
        winnerId: player.id,
        victoryReason: reason,
        pendingDecisionTileIndex: null,
        pendingDebt: null,
      };
      next = appendEntry(next, entries, {
        type: 'GAME_OVER',
        actorId: player.id,
        message: `🏆 จบเกม! ${player.name} ${reason}`,
      });
      return next;
    }

    if (ownsAllGrandHotels(state, player.id)) {
      const reason = 'ชนะด้วยการผูกขาดเครือโรงแรมใหญ่ครบทั้ง 5 แห่ง!';
      let next: GameState = {
        ...state,
        phase: 'GAME_OVER',
        winnerId: player.id,
        victoryReason: reason,
        pendingDecisionTileIndex: null,
        pendingDebt: null,
      };
      next = appendEntry(next, entries, {
        type: 'GAME_OVER',
        actorId: player.id,
        message: `🏆 จบเกม! ${player.name} ${reason}`,
      });
      return next;
    }
  }

  return state;
}

export interface CreateGameStateOptions {
  skipTurnOrderRoll?: boolean;
}

/**
 * Create a brand-new GameState for 2–8 players (supporting any mix of humans and bots).
 */
export function createGameState(
  roomId: string,
  config: RoomConfig,
  rng: () => number = Math.random,
  options?: CreateGameStateOptions,
): GameState {
  const totalSeats = config.totalSeats;
  if (totalSeats < 2 || totalSeats > 8) {
    throw new Error('Room must have between 2 and 8 seats.');
  }

  const slotMap = new Map<number, PlayerSlotConfig>();
  for (const slot of config.slots) {
    if (slot.seatIndex >= 0 && slot.seatIndex < totalSeats) {
      slotMap.set(slot.seatIndex, slot);
    }
  }

  const players: PlayerState[] = [];
  for (let seat = 0; seat < totalSeats; seat++) {
    const slot = slotMap.get(seat);
    const kind = slot?.kind ?? 'bot';
    const defaultName =
      kind === 'bot'
        ? BOT_DEFAULT_NAMES[seat % BOT_DEFAULT_NAMES.length]!
        : `ผู้เล่น ${seat + 1}`;
    const name = slot?.name?.trim() ? slot.name.trim() : defaultName;

    const rawToken = slot?.tokenId;
    const resolvedTokenId =
      typeof rawToken === 'number' && Number.isFinite(rawToken) && rawToken >= 0
        ? Math.trunc(rawToken) % TOKEN_NAMES.length
        : seat % TOKEN_NAMES.length;

    players.push({
      id: `player-${seat + 1}`,
      seatIndex: seat,
      name,
      kind,
      botStyle: kind === 'bot' ? (slot?.botStyle ?? 'balanced') : undefined,
      tokenId: resolvedTokenId,
      color: PLAYER_COLORS[seat % PLAYER_COLORS.length]!,
      cash: INITIAL_CASH,
      banknotes: cloneBanknotes(INITIAL_BANKNOTES),
      position: 0,
      inJail: false,
      jailTurns: 0,
      jailFreeCards: 0,
      heldJailCardDecks: [],
      isBankrupt: false,
      connected: true,
    });
  }

  const deeds: Record<number, DeedState> = {};
  for (const tileIndex of PURCHASABLE_TILE_INDICES) {
    deeds[tileIndex] = {
      tileIndex,
      ownerId: null,
      houses: 0,
      hasHotel: false,
      isMortgaged: false,
    };
  }

  const skipTurnOrderRoll = Boolean(options?.skipTurnOrderRoll);
  const initialBanker = createInitialBankerState();
  const { banker } = recordBankerEntry(initialBanker, {
    type: 'GAME_START',
    message: skipTurnOrderRoll
      ? `เริ่มเกมซุปเปอร์เศรษฐี (${players.length} ผู้เล่น) ธนาคารแจกเงินเริ่มต้นคนละ ${formatBaht(INITIAL_CASH)}`
      : `เริ่มเกมซุปเปอร์เศรษฐี (${players.length} ผู้เล่น) แจกเงินคนละ ${formatBaht(INITIAL_CASH)} — ทอยลูกเต๋าหาผู้ได้แต้มสูงสุดเริ่มคนแรก!`,
  });

  const contenderIds = players.map((p) => p.id);

  return {
    roomId,
    phase: skipTurnOrderRoll ? 'AWAIT_ROLL' : 'TURN_ORDER_ROLL',
    mapTheme: config.mapTheme ?? 'siam_park',
    rules: normalizeGameRules(config.rules),
    startedAt: Date.now(),
    victoryReason: null,
    players,
    currentTurnIndex: 0,
    turnNumber: 1,
    turnOrder: skipTurnOrderRoll
      ? null
      : {
          round: 1,
          contenderIds,
          rolls: {},
          history: [],
          winnerId: null,
        },
    doublesCount: 0,
    hasRolledThisTurn: false,
    lastDice: null,
    lastCardDrawn: null,
    deeds,
    banker,
    chanceDeck: shuffleIds(
      CHANCE_CARDS.map((c) => c.id),
      rng,
    ),
    chestDeck: shuffleIds(
      CHEST_CARDS.map((c) => c.id),
      rng,
    ),
    pendingDecisionTileIndex: null,
    pendingDebt: null,
    pendingTrades: [],
    winnerId: null,
  };
}

function sendPlayerToJail(
  state: GameState,
  playerId: string,
  reasonMessage: string,
  entries: LedgerEntry[],
): GameState {
  const player = findPlayer(state, playerId)!;
  let next = updatePlayer(state, playerId, (p) => ({
    ...p,
    position: JAIL_TILE_INDEX,
    inJail: true,
    jailTurns: 0,
  }));
  next = {
    ...next,
    doublesCount: 0,
    phase: 'ACTION_PHASE',
    pendingDecisionTileIndex: null,
  };
  next = appendEntry(next, entries, {
    type: 'JAIL',
    actorId: playerId,
    tileIndex: JAIL_TILE_INDEX,
    message: `${player.name} ${reasonMessage}`,
  });
  return next;
}

function applyDebtOrPay(
  state: GameState,
  debtorId: string,
  debt: Omit<DebtState, 'debtorId'>,
  entries: LedgerEntry[],
): GameState {
  const debtor = findPlayer(state, debtorId)!;
  if (debt.amount <= 0) {
    return {
      ...state,
      phase: 'ACTION_PHASE',
      pendingDebt: null,
    };
  }

  if (debtor.cash >= debt.amount) {
    let next = updatePlayer(state, debtorId, (p) => adjustPlayerCash(p, -debt.amount));
    if (debt.splitCreditorIds && debt.splitCreditorIds.length > 0) {
      const share = Math.floor(debt.amount / debt.splitCreditorIds.length);
      for (const cid of debt.splitCreditorIds) {
        next = updatePlayer(next, cid, (p) => adjustPlayerCash(p, share));
      }
    } else if (debt.creditorId) {
      next = updatePlayer(next, debt.creditorId, (p) => adjustPlayerCash(p, debt.amount));
    }

    const creditorName = debt.creditorId
      ? (findPlayer(next, debt.creditorId)?.name ?? 'ผู้เล่นอื่น')
      : debt.splitCreditorIds
        ? 'ผู้เล่นทุกคน'
        : 'ธนาคาร';

    const entryType =
      debt.tileIndex !== undefined && debt.creditorId
        ? 'RENT'
        : debt.tileIndex === 38
          ? 'TAX'
          : 'RENT';

    next = appendEntry(next, entries, {
      type: entryType,
      actorId: debtorId,
      targetId: debt.creditorId ?? undefined,
      amount: debt.amount,
      tileIndex: debt.tileIndex,
      message: `${debtor.name} จ่าย${debt.reason}ให้${creditorName} ${formatBaht(debt.amount)}`,
    });

    return {
      ...next,
      phase: 'ACTION_PHASE',
      pendingDebt: null,
    };
  }

  // Insufficient cash -> enter AWAIT_DEBT_RESOLUTION
  return {
    ...state,
    phase: 'AWAIT_DEBT_RESOLUTION',
    pendingDebt: {
      debtorId,
      ...debt,
    },
  };
}

function settlePendingDebtIfAble(state: GameState, entries: LedgerEntry[]): GameState {
  const debt = state.pendingDebt;
  if (!debt) return state;
  const debtor = findPlayer(state, debt.debtorId);
  if (!debtor || debtor.cash < debt.amount) {
    return state;
  }
  return applyDebtOrPay(
    state,
    debt.debtorId,
    {
      creditorId: debt.creditorId,
      splitCreditorIds: debt.splitCreditorIds,
      amount: debt.amount,
      reason: debt.reason,
      tileIndex: debt.tileIndex,
    },
    entries,
  );
}

function rebuildShuffledDeck(
  state: GameState,
  deck: CardDeck,
  rng: () => number,
): string[] {
  const pool = deck === 'chance' ? CHANCE_CARDS : CHEST_CARDS;
  const jailCardId = deck === 'chance' ? 'chance-8' : 'chest-15';
  const jailCardHeld = state.players.some((p) => p.heldJailCardDecks.includes(deck));
  const ids = pool
    .map((c) => c.id)
    .filter((id) => !(jailCardHeld && id === jailCardId));
  return shuffleIds(ids, rng);
}

function resolveCardEffect(
  state: GameState,
  playerId: string,
  card: CardDefinition,
  entries: LedgerEntry[],
  depth: number,
  rng: () => number,
): GameState {
  const player = findPlayer(state, playerId)!;
  const effect = card.effect;

  switch (effect.kind) {
    case 'CASH': {
      if (effect.amount >= 0) {
        let next = updatePlayer(state, playerId, (p) => adjustPlayerCash(p, effect.amount));
        next = appendEntry(next, entries, {
          type: card.deck === 'chance' ? 'CARD_CHANCE' : 'CARD_CHEST',
          actorId: playerId,
          amount: effect.amount,
          message: `${player.name} จั่วได้ "${card.title}" รับเงิน ${formatBaht(effect.amount)}`,
        });
        return { ...next, phase: 'ACTION_PHASE' };
      }
      const owed = Math.abs(effect.amount);
      return applyDebtOrPay(
        state,
        playerId,
        { creditorId: null, amount: owed, reason: `ตามการ์ด "${card.title}"` },
        entries,
      );
    }

    case 'COLLECT_FROM_ALL': {
      const others = state.players.filter((p) => !p.isBankrupt && p.id !== playerId);
      let collected = 0;
      let next = state;
      for (const other of others) {
        const paid = Math.min(other.cash, effect.amountPerPlayer);
        collected += paid;
        next = updatePlayer(next, other.id, (p) => adjustPlayerCash(p, -paid));
      }
      next = updatePlayer(next, playerId, (p) => adjustPlayerCash(p, collected));
      next = appendEntry(next, entries, {
        type: card.deck === 'chance' ? 'CARD_CHANCE' : 'CARD_CHEST',
        actorId: playerId,
        amount: collected,
        message: `${player.name} จั่วได้ "${card.title}" เก็บเงินจากผู้เล่นอื่นรวม ${formatBaht(collected)}`,
      });
      return { ...next, phase: 'ACTION_PHASE' };
    }

    case 'PAY_ALL': {
      const others = state.players.filter((p) => !p.isBankrupt && p.id !== playerId);
      if (others.length === 0) {
        return { ...state, phase: 'ACTION_PHASE' };
      }
      const total = effect.amountPerPlayer * others.length;
      return applyDebtOrPay(
        state,
        playerId,
        {
          creditorId: null,
          splitCreditorIds: others.map((o) => o.id),
          amount: total,
          reason: `ตามการ์ด "${card.title}"`,
        },
        entries,
      );
    }

    case 'REPAIRS': {
      let houses = 0;
      let hotels = 0;
      for (const deed of Object.values(state.deeds)) {
        if (deed.ownerId === playerId) {
          houses += deed.houses;
          if (deed.hasHotel) hotels += 1;
        }
      }
      const total = houses * effect.perHouse + hotels * effect.perHotel;
      if (total === 0) {
        const next = appendEntry(state, entries, {
          type: card.deck === 'chance' ? 'CARD_CHANCE' : 'CARD_CHEST',
          actorId: playerId,
          amount: 0,
          message: `${player.name} จั่วได้ "${card.title}" (ไม่มีสิ่งปลูกสร้าง ไม่ต้องจ่าย)`,
        });
        return { ...next, phase: 'ACTION_PHASE' };
      }
      return applyDebtOrPay(
        state,
        playerId,
        {
          creditorId: null,
          amount: total,
          reason: `ค่าซ่อมแซมตามการ์ด "${card.title}"`,
        },
        entries,
      );
    }

    case 'MOVE_TO': {
      const oldPos = player.position;
      const target = effect.tileIndex;
      const passedStart = effect.collectStartIfPassed && target <= oldPos;
      let next = updatePlayer(state, playerId, (p) => {
        const moved = { ...p, position: target };
        return passedStart ? adjustPlayerCash(moved, START_BONUS) : moved;
      });
      if (passedStart) {
        next = appendEntry(next, entries, {
          type: 'PASS_START',
          actorId: playerId,
          amount: START_BONUS,
          tileIndex: 0,
          message: `${player.name} ผ่านจุดเริ่มต้น รับเงินเดือน ${formatBaht(START_BONUS)}`,
        });
      }
      return resolveLanding(next, playerId, target, entries, depth + 1, rng);
    }

    case 'MOVE_BACK': {
      const target = (player.position - effect.spaces + 40) % 40;
      const next = updatePlayer(state, playerId, (p) => ({
        ...p,
        position: target,
      }));
      return resolveLanding(next, playerId, target, entries, depth + 1, rng);
    }

    case 'GO_TO_JAIL': {
      return sendPlayerToJail(state, playerId, `จั่วได้ "${card.title}" จึงถูกส่งเข้าคุก!`, entries);
    }

    case 'GET_OUT_OF_JAIL_FREE': {
      let next = updatePlayer(state, playerId, (p) => ({
        ...p,
        jailFreeCards: p.jailFreeCards + 1,
        heldJailCardDecks: [...p.heldJailCardDecks, card.deck],
      }));
      next = appendEntry(next, entries, {
        type: card.deck === 'chance' ? 'CARD_CHANCE' : 'CARD_CHEST',
        actorId: playerId,
        message: `${player.name} ได้รับบัตรผ่านคุกฟรี (${card.deck === 'chance' ? 'ประตูดวง' : 'หีบสมบัติ'})`,
      });
      return { ...next, phase: 'ACTION_PHASE' };
    }
  }
}

function drawCard(
  state: GameState,
  playerId: string,
  deck: CardDeck,
  entries: LedgerEntry[],
  depth: number,
  rng: () => number,
): GameState {
  const player = findPlayer(state, playerId)!;
  const deckKey = deck === 'chance' ? 'chanceDeck' : 'chestDeck';
  const sourceDeck =
    state[deckKey].length > 0 ? state[deckKey] : rebuildShuffledDeck(state, deck, rng);

  const cardId = sourceDeck[0]!;
  const card = CARD_BY_ID[cardId]!;
  const restDeck = sourceDeck.slice(1);

  let next: GameState = {
    ...state,
    [deckKey]: restDeck,
    lastCardDrawn: {
      card,
      playerId,
      turnNumber: state.turnNumber,
      drawnAtTileIndex: player.position,
    },
  };

  if (restDeck.length === 0) {
    // Reshuffle remaining deck (accounting for GET_OUT_OF_JAIL_FREE if just kept in hand)
    const heldAfterDraw =
      card.effect.kind === 'GET_OUT_OF_JAIL_FREE'
        ? state.players.map((p) =>
            p.id === playerId
              ? { ...p, heldJailCardDecks: [...p.heldJailCardDecks, deck] }
              : p,
          )
        : state.players;
    next = {
      ...next,
      [deckKey]: rebuildShuffledDeck({ ...next, players: heldAfterDraw }, deck, rng),
    };
  }

  next = appendEntry(next, entries, {
    type: deck === 'chance' ? 'CARD_CHANCE' : 'CARD_CHEST',
    actorId: playerId,
    tileIndex: player.position,
    message: `${player.name} จั่วการ์ด${deck === 'chance' ? 'ประตูดวง' : 'หีบสมบัติ'}: "${card.title}" — ${card.description}`,
  });

  return resolveCardEffect(next, playerId, card, entries, depth, rng);
}

function resolveLanding(
  state: GameState,
  playerId: string,
  tileIndex: number,
  entries: LedgerEntry[],
  depth = 0,
  rng: () => number = Math.random,
): GameState {
  if (depth > 4) {
    return { ...state, phase: 'ACTION_PHASE' };
  }

  const player = findPlayer(state, playerId)!;
  const tile = getTile(tileIndex);

  switch (tile.type) {
    case 'start':
    case 'jail':
    case 'freeParking': {
      return {
        ...state,
        phase: 'ACTION_PHASE',
        pendingDecisionTileIndex: null,
      };
    }

    case 'goToJail': {
      return sendPlayerToJail(state, playerId, 'ตกช่องไปติดคุก จึงถูกส่งเข้าคุกทันที!', entries);
    }

    case 'tax': {
      const amount = tile.taxAmount ?? 2000;
      return applyDebtOrPay(
        state,
        playerId,
        {
          creditorId: null,
          amount,
          reason: 'ภาษี',
          tileIndex: tile.index,
        },
        entries,
      );
    }

    case 'chance': {
      return drawCard(state, playerId, 'chance', entries, depth, rng);
    }

    case 'chest': {
      return drawCard(state, playerId, 'chest', entries, depth, rng);
    }

    case 'property':
    case 'hotel':
    case 'utility': {
      const deed = state.deeds[tile.index];
      if (!deed) {
        return { ...state, phase: 'ACTION_PHASE' };
      }

      if (deed.ownerId === null) {
        // NO AUCTION rule: offer buy or decline to current player.
        return {
          ...state,
          phase: 'AWAIT_DECISION',
          pendingDecisionTileIndex: tile.index,
        };
      }

      if (deed.ownerId === playerId) {
        return {
          ...state,
          phase: 'ACTION_PHASE',
          pendingDecisionTileIndex: null,
        };
      }

      if (deed.isMortgaged) {
        const next = appendEntry(state, entries, {
          type: 'RENT',
          actorId: playerId,
          targetId: deed.ownerId,
          amount: 0,
          tileIndex: tile.index,
          message: `${player.name} หยุดที่ ${buildTileLedgerLabel(tile.index)} (ติดจำนอง ไม่ต้องจ่ายค่าเช่า)`,
        });
        return {
          ...next,
          phase: 'ACTION_PHASE',
          pendingDecisionTileIndex: null,
        };
      }

      const diceTotal = state.lastDice?.total ?? 7;
      const rent = calculateRent(state, tile.index, diceTotal);
      return applyDebtOrPay(
        state,
        playerId,
        {
          creditorId: deed.ownerId,
          amount: rent,
          reason: `ค่าเช่า ${buildTileLedgerLabel(tile.index)}`,
          tileIndex: tile.index,
        },
        entries,
      );
    }
  }
}

function findNextUnrolledContenderIndex(
  state: GameState,
  contenderIds: readonly string[],
  rolls: Record<string, DiceRollResult>,
  fromPlayerIndex: number,
): number {
  const unrolled = new Set(
    contenderIds.filter((id) => {
      const p = findPlayer(state, id);
      return Boolean(p && !p.isBankrupt && !rolls[id]);
    }),
  );
  const total = state.players.length;
  for (let step = 1; step <= total; step++) {
    const idx = (fromPlayerIndex + step) % total;
    if (unrolled.has(state.players[idx]!.id)) {
      return idx;
    }
  }
  for (const cid of contenderIds) {
    if (unrolled.has(cid)) {
      const idx = state.players.findIndex((p) => p.id === cid);
      if (idx >= 0) return idx;
    }
  }
  return getNextActiveTurnIndex(state.players, fromPlayerIndex);
}

function finalizeTurnOrderWinner(
  state: GameState,
  winnerId: string,
  highestTotal: number,
  nextHistory: TurnOrderRoundRecord[],
  finalContenderIds: string[],
  finalRolls: Record<string, DiceRollResult>,
  entries: LedgerEntry[],
  reasonLabel?: string,
): GameState {
  const winnerIdx = Math.max(
    0,
    state.players.findIndex((p) => p.id === winnerId),
  );
  const winner = state.players[winnerIdx]!;
  let next: GameState = {
    ...state,
    phase: 'AWAIT_ROLL',
    currentTurnIndex: winnerIdx,
    turnNumber: 1,
    doublesCount: 0,
    hasRolledThisTurn: false,
    pendingDecisionTileIndex: null,
    turnOrder: {
      round: state.turnOrder?.round ?? nextHistory.length + 1,
      contenderIds: finalContenderIds,
      rolls: finalRolls,
      history: nextHistory,
      winnerId,
    },
  };
  next = appendEntry(next, entries, {
    type: 'TURN_ORDER',
    actorId: winnerId,
    message:
      reasonLabel ??
      `🏆 ${winner.name} ทอยจัดลำดับได้แต้มสูงสุด ${highestTotal} แต้ม — ได้เริ่มเดินเป็นคนแรก!`,
  });
  return next;
}

function evaluateTurnOrderState(
  state: GameState,
  lastActorIndex: number,
  entries: LedgerEntry[],
): GameState {
  const turnOrder = state.turnOrder;
  if (!turnOrder) return state;

  const activeContenders = turnOrder.contenderIds.filter((id) => {
    const p = findPlayer(state, id);
    return Boolean(p && !p.isBankrupt);
  });

  if (activeContenders.length === 0) {
    const fallbackWinner = state.players.find((p) => !p.isBankrupt) ?? state.players[0]!;
    return finalizeTurnOrderWinner(
      state,
      fallbackWinner.id,
      0,
      turnOrder.history,
      [fallbackWinner.id],
      turnOrder.rolls,
      entries,
      `🏆 ${fallbackWinner.name} ได้เริ่มเดินเป็นคนแรก!`,
    );
  }

  if (activeContenders.length === 1) {
    const soleId = activeContenders[0]!;
    const soleRoll = turnOrder.rolls[soleId];
    const roundRolls: TurnOrderRollRecord[] = soleRoll ? [{ playerId: soleId, roll: soleRoll }] : [];
    const total = soleRoll?.total ?? 0;
    const record: TurnOrderRoundRecord = {
      round: turnOrder.round,
      contenderIds: activeContenders,
      rolls: roundRolls,
      highestTotal: total,
      tiedLeaderIds: [soleId],
      winnerId: soleId,
    };
    const nextHistory = soleRoll ? [...turnOrder.history, record] : turnOrder.history;
    const winnerName = findPlayer(state, soleId)?.name ?? soleId;
    return finalizeTurnOrderWinner(
      state,
      soleId,
      total,
      nextHistory,
      activeContenders,
      turnOrder.rolls,
      entries,
      soleRoll
        ? undefined
        : `🏆 ${winnerName} เป็นผู้ทอยคนสุดท้ายที่เหลืออยู่ — ได้เริ่มเดินเป็นคนแรก!`,
    );
  }

  const allRolled = activeContenders.every((id) => Boolean(turnOrder.rolls[id]));
  if (!allRolled) {
    const nextIdx = findNextUnrolledContenderIndex(
      state,
      activeContenders,
      turnOrder.rolls,
      lastActorIndex,
    );
    return {
      ...state,
      currentTurnIndex: nextIdx,
      turnOrder: {
        ...turnOrder,
        contenderIds: activeContenders,
      },
    };
  }

  const roundRolls: TurnOrderRollRecord[] = activeContenders.map((id) => ({
    playerId: id,
    roll: turnOrder.rolls[id]!,
  }));
  const highestTotal = Math.max(...roundRolls.map((r) => r.roll.total));
  const tiedSet = new Set(
    roundRolls.filter((r) => r.roll.total === highestTotal).map((r) => r.playerId),
  );
  // Keep seat order consistent across rounds
  const tiedLeaderIds = state.players.filter((p) => tiedSet.has(p.id)).map((p) => p.id);

  if (tiedLeaderIds.length === 1) {
    const winnerId = tiedLeaderIds[0]!;
    const record: TurnOrderRoundRecord = {
      round: turnOrder.round,
      contenderIds: activeContenders,
      rolls: roundRolls,
      highestTotal,
      tiedLeaderIds,
      winnerId,
    };
    return finalizeTurnOrderWinner(
      state,
      winnerId,
      highestTotal,
      [...turnOrder.history, record],
      activeContenders,
      turnOrder.rolls,
      entries,
    );
  }

  const record: TurnOrderRoundRecord = {
    round: turnOrder.round,
    contenderIds: activeContenders,
    rolls: roundRolls,
    highestTotal,
    tiedLeaderIds,
    winnerId: null,
  };
  const firstNextIdx = Math.max(
    0,
    state.players.findIndex((p) => p.id === tiedLeaderIds[0]),
  );
  const tiedNames = tiedLeaderIds.map((id) => findPlayer(state, id)?.name ?? id).join(', ');
  let next: GameState = {
    ...state,
    phase: 'TURN_ORDER_ROLL',
    currentTurnIndex: firstNextIdx,
    hasRolledThisTurn: false,
    turnOrder: {
      round: turnOrder.round + 1,
      contenderIds: tiedLeaderIds,
      rolls: {},
      history: [...turnOrder.history, record],
      winnerId: null,
    },
  };
  next = appendEntry(next, entries, {
    type: 'TURN_ORDER',
    message: `🎲 รอบจัดลำดับ #${turnOrder.round} เสมอกันที่แต้มสูงสุด ${highestTotal} (${tiedNames}) — ให้ผู้ที่ได้สูงสุดเท่ากันทอยใหม่อีกครั้ง!`,
  });
  return next;
}

function rollTurnOrderDice(
  state: GameState,
  playerId: string,
  rollInput?: RollInput,
): EngineResult {
  const turnOrder = state.turnOrder;
  if (!turnOrder || !turnOrder.contenderIds.includes(playerId)) {
    return fail(state, 'คุณไม่ได้อยู่ในรายชื่อผู้ทอยจัดลำดับรอบนี้');
  }
  if (turnOrder.rolls[playerId]) {
    return fail(state, 'คุณทอยลูกเต๋าจัดลำดับในรอบนี้แล้ว');
  }

  const player = findPlayer(state, playerId)!;
  const dice = rollTwoDice(rollInput);
  const entries: LedgerEntry[] = [];

  let next: GameState = {
    ...state,
    lastDice: dice,
    hasRolledThisTurn: false,
    turnOrder: {
      ...turnOrder,
      rolls: {
        ...turnOrder.rolls,
        [playerId]: dice,
      },
    },
  };

  next = appendEntry(next, entries, {
    type: 'DICE_ROLL',
    actorId: playerId,
    message: `${player.name} ทอยจัดลำดับ (รอบที่ ${turnOrder.round}) ได้ ${dice.die1} + ${dice.die2} = ${dice.total} แต้ม`,
  });

  next = evaluateTurnOrderState(next, state.currentTurnIndex, entries);
  return ok(next, entries);
}

export function rollDice(
  state: GameState,
  playerId: string,
  rollInput?: RollInput,
  powerRange?: DicePowerRange,
): EngineResult {
  const check = requireCurrentPlayer(state, playerId);
  if (!check.ok) return fail(state, check.error);
  const player = check.player;

  if (state.phase === 'TURN_ORDER_ROLL') {
    return rollTurnOrderDice(state, playerId, rollInput);
  }

  const isInitialRoll = state.phase === 'AWAIT_ROLL' && !state.hasRolledThisTurn;
  const isDoublesReroll = canRollAgain(state, playerId);

  if (!isInitialRoll && !isDoublesReroll) {
    return fail(state, 'ไม่สามารถทอยลูกเต๋าในขั้นตอนนี้ได้');
  }

  const rng = typeof rollInput === 'function' ? rollInput : Math.random;
  const effectiveRange = !player.inJail ? powerRange : undefined;
  const dice = rollTwoDice(rollInput, effectiveRange);
  const entries: LedgerEntry[] = [];

  let next: GameState = {
    ...state,
    lastDice: dice,
    hasRolledThisTurn: true,
    pendingDecisionTileIndex: null,
  };

  const rangeBadge =
    effectiveRange === 'low'
      ? ' [ชาร์จเล็ง 2–5]'
      : effectiveRange === 'mid'
        ? ' [ชาร์จเล็ง 6–8]'
        : effectiveRange === 'high'
          ? ' [ชาร์จเล็ง 9–12]'
          : '';

  next = appendEntry(next, entries, {
    type: 'DICE_ROLL',
    actorId: playerId,
    message: `${player.name} ทอยได้ ${dice.die1} + ${dice.die2} = ${dice.total}${dice.isDoubles ? ' (เบิ้ล!)' : ''}${rangeBadge}`,
  });

  // Case 1: Player is currently in jail
  if (player.inJail) {
    if (dice.isDoubles) {
      next = updatePlayer(next, playerId, (p) => ({
        ...p,
        inJail: false,
        jailTurns: 0,
      }));
      next = appendEntry(next, entries, {
        type: 'JAIL',
        actorId: playerId,
        tileIndex: JAIL_TILE_INDEX,
        message: `${player.name} ทอยได้เบิ้ล จึงออกจากคุกฟรี!`,
      });
      // Getting out by doubles does NOT grant an extra turn roll
      next = { ...next, doublesCount: 0 };
      const target = (JAIL_TILE_INDEX + dice.total) % 40;
      next = updatePlayer(next, playerId, (p) => ({ ...p, position: target }));
      return ok(resolveLanding(next, playerId, target, entries, 0, rng), entries);
    }

    const nextJailTurns = player.jailTurns + 1;
    if (nextJailTurns >= 3) {
      // Forced bail on 3rd failed roll
      if (player.cash >= JAIL_BAIL_AMOUNT) {
        next = updatePlayer(next, playerId, (p) =>
          adjustPlayerCash(
            {
              ...p,
              inJail: false,
              jailTurns: 0,
            },
            -JAIL_BAIL_AMOUNT,
          ),
        );
        next = appendEntry(next, entries, {
          type: 'BAIL',
          actorId: playerId,
          amount: JAIL_BAIL_AMOUNT,
          tileIndex: JAIL_TILE_INDEX,
          message: `${player.name} ติดคุกครบ 3 ตา ต้องจ่ายค่าประกันตัว ${formatBaht(JAIL_BAIL_AMOUNT)} และเดินต่อ`,
        });
        const target = (JAIL_TILE_INDEX + dice.total) % 40;
        next = updatePlayer(next, playerId, (p) => ({ ...p, position: target }));
        return ok(resolveLanding(next, playerId, target, entries, 0, rng), entries);
      }

      // Must raise 500 THB bail via debt resolution
      next = updatePlayer(next, playerId, (p) => ({
        ...p,
        inJail: false,
        jailTurns: 0,
      }));
      next = applyDebtOrPay(
        next,
        playerId,
        {
          creditorId: null,
          amount: JAIL_BAIL_AMOUNT,
          reason: 'ค่าประกันตัว (ติดคุกครบ 3 ตา)',
          tileIndex: JAIL_TILE_INDEX,
        },
        entries,
      );
      return ok(next, entries);
    }

    next = updatePlayer(next, playerId, (p) => ({
      ...p,
      jailTurns: nextJailTurns,
    }));
    next = appendEntry(next, entries, {
      type: 'JAIL',
      actorId: playerId,
      tileIndex: JAIL_TILE_INDEX,
      message: `${player.name} ทอยไม่เบิ้ล จึงถูกหยุดเดินอยู่ในคุก (ครั้งที่ ${nextJailTurns}/3)`,
    });
    return ok({ ...next, phase: 'ACTION_PHASE', doublesCount: 0 }, entries);
  }

  // Case 2: Normal movement on board
  const nextDoublesCount = dice.isDoubles ? state.doublesCount + 1 : 0;
  if (nextDoublesCount >= 3) {
    next = sendPlayerToJail(next, playerId, 'ทอยเบิ้ล 3 ครั้งติดกัน ถูกส่งเข้าคุกทันที!', entries);
    return ok(next, entries);
  }

  const oldPos = player.position;
  const newPos = (oldPos + dice.total) % 40;
  const passedStart = oldPos + dice.total >= 40;

  next = {
    ...next,
    doublesCount: nextDoublesCount,
  };

  next = updatePlayer(next, playerId, (p) => {
    const moved = { ...p, position: newPos };
    return passedStart ? adjustPlayerCash(moved, START_BONUS) : moved;
  });

  if (passedStart) {
    next = appendEntry(next, entries, {
      type: 'PASS_START',
      actorId: playerId,
      amount: START_BONUS,
      tileIndex: 0,
      message: `${player.name} ผ่านจุดเริ่มต้น รับเงินเดือน ${formatBaht(START_BONUS)}`,
    });
  }

  return ok(resolveLanding(next, playerId, newPos, entries, 0, rng), entries);
}

export function payJailBail(state: GameState, playerId: string): EngineResult {
  const check = requireCurrentPlayer(state, playerId);
  if (!check.ok) return fail(state, check.error);
  const player = check.player;

  if (state.phase !== 'AWAIT_ROLL' || state.hasRolledThisTurn) {
    return fail(state, 'ต้องจ่ายค่าประกันตัวก่อนทอยลูกเต๋า');
  }
  if (!player.inJail) {
    return fail(state, 'คุณไม่ได้อยู่ในคุก');
  }
  if (player.cash < JAIL_BAIL_AMOUNT) {
    return fail(state, 'เงินสดไม่พอจ่ายค่าประกันตัว 500 บาท');
  }

  const entries: LedgerEntry[] = [];
  let next = updatePlayer(state, playerId, (p) =>
    adjustPlayerCash(
      {
        ...p,
        inJail: false,
        jailTurns: 0,
      },
      -JAIL_BAIL_AMOUNT,
    ),
  );
  next = appendEntry(next, entries, {
    type: 'BAIL',
    actorId: playerId,
    amount: JAIL_BAIL_AMOUNT,
    tileIndex: JAIL_TILE_INDEX,
    message: `${player.name} จ่ายค่าประกันตัว ${formatBaht(JAIL_BAIL_AMOUNT)} ออกจากคุกแล้ว`,
  });

  return ok(next, entries);
}

export function useJailCard(state: GameState, playerId: string): EngineResult {
  const check = requireCurrentPlayer(state, playerId);
  if (!check.ok) return fail(state, check.error);
  const player = check.player;

  if (state.phase !== 'AWAIT_ROLL' || state.hasRolledThisTurn) {
    return fail(state, 'ต้องใช้บัตรผ่านคุกฟรีก่อนทอยลูกเต๋า');
  }
  if (!player.inJail) {
    return fail(state, 'คุณไม่ได้อยู่ในคุก');
  }
  if (player.jailFreeCards <= 0) {
    return fail(state, 'คุณไม่มีบัตรผ่านคุกฟรี');
  }

  const entries: LedgerEntry[] = [];
  const deckToReturn: CardDeck = player.heldJailCardDecks[0] ?? 'chance';
  const cardIdToReturn = deckToReturn === 'chance' ? 'chance-8' : 'chest-15';

  let next = updatePlayer(state, playerId, (p) => ({
    ...p,
    inJail: false,
    jailTurns: 0,
    jailFreeCards: Math.max(0, p.jailFreeCards - 1),
    heldJailCardDecks: p.heldJailCardDecks.slice(1),
  }));

  if (deckToReturn === 'chance') {
    next = { ...next, chanceDeck: [...next.chanceDeck, cardIdToReturn] };
  } else {
    next = { ...next, chestDeck: [...next.chestDeck, cardIdToReturn] };
  }

  next = appendEntry(next, entries, {
    type: 'JAIL_CARD',
    actorId: playerId,
    tileIndex: JAIL_TILE_INDEX,
    message: `${player.name} ใช้บัตรผ่านคุกฟรี ออกจากคุกแล้ว`,
  });

  return ok(next, entries);
}

export function buyCurrentTile(state: GameState, playerId: string): EngineResult {
  const check = requireCurrentPlayer(state, playerId);
  if (!check.ok) return fail(state, check.error);
  const player = check.player;

  if (state.phase !== 'AWAIT_DECISION' || state.pendingDecisionTileIndex === null) {
    return fail(state, 'ไม่อยู่ในขั้นตอนตัดสินใจซื้อโฉนด');
  }

  const tileIndex = state.pendingDecisionTileIndex;
  if (player.position !== tileIndex) {
    return fail(state, 'ตำแหน่งผู้เล่นไม่ตรงกับโฉนดที่กำลังตัดสินใจ');
  }

  const tile = getTile(tileIndex);
  const deed = state.deeds[tileIndex];
  if (!deed || deed.ownerId !== null || tile.price === undefined) {
    return fail(state, 'โฉนดนี้ไม่สามารถซื้อได้');
  }

  if (player.cash < tile.price) {
    return fail(state, `เงินสดไม่พอซื้อ ${buildTileLedgerLabel(tileIndex)} (ราคา ${formatBaht(tile.price)})`);
  }

  const entries: LedgerEntry[] = [];
  let next = updatePlayer(state, playerId, (p) => adjustPlayerCash(p, -tile.price!));
  next = updateDeed(next, tileIndex, (d) => ({
    ...d,
    ownerId: playerId,
  }));
  next = {
    ...next,
    phase: 'ACTION_PHASE',
    pendingDecisionTileIndex: null,
  };
  next = appendEntry(next, entries, {
    type: 'BUY_DEED',
    actorId: playerId,
    amount: tile.price,
    tileIndex,
    message: `${player.name} ซื้อโฉนด ${buildTileLedgerLabel(tileIndex)} ราคา ${formatBaht(tile.price)}`,
  });

  next = checkSpecialVictory(next, entries);
  return ok(next, entries);
}

export function hostileTakeoverCurrentTile(
  state: GameState,
  playerId: string,
): EngineResult {
  const check = requireCurrentPlayer(state, playerId);
  if (!check.ok) return fail(state, check.error);
  const player = check.player;

  const eligibility = canHostileTakeoverCurrentTile(state, playerId);
  if (!eligibility.allowed || eligibility.cost === undefined || !eligibility.targetOwnerId) {
    return fail(state, eligibility.reason ?? 'ไม่สามารถซื้อฮุบโฉนดนี้ได้');
  }

  const tileIndex = player.position;
  const cost = eligibility.cost;
  const targetOwnerId = eligibility.targetOwnerId;
  const targetOwner = findPlayer(state, targetOwnerId);
  const entries: LedgerEntry[] = [];

  let next = updatePlayer(state, playerId, (p) => adjustPlayerCash(p, -cost));
  next = updatePlayer(next, targetOwnerId, (p) => adjustPlayerCash(p, cost));
  next = updateDeed(next, tileIndex, (d) => ({
    ...d,
    ownerId: playerId,
    isMortgaged: false,
  }));

  next = appendEntry(next, entries, {
    type: 'TAKEOVER',
    actorId: playerId,
    targetId: targetOwnerId,
    amount: cost,
    tileIndex,
    message: `⚔️ ${player.name} ซื้อฮุบโฉนด ${buildTileLedgerLabel(tileIndex)} ต่อจาก ${targetOwner?.name ?? 'เจ้าของเดิม'} ในราคา 2× (${formatBaht(cost)})!`,
  });

  next = checkSpecialVictory(next, entries);
  return ok(next, entries);
}

export function declineCurrentTile(state: GameState, playerId: string): EngineResult {
  const check = requireCurrentPlayer(state, playerId);
  if (!check.ok) return fail(state, check.error);
  const player = check.player;

  if (state.phase !== 'AWAIT_DECISION' || state.pendingDecisionTileIndex === null) {
    return fail(state, 'ไม่อยู่ในขั้นตอนตัดสินใจซื้อโฉนด');
  }

  const tileIndex = state.pendingDecisionTileIndex;
  const entries: LedgerEntry[] = [];
  // NO AUCTION: leave deed unowned and move directly to ACTION_PHASE.
  let next: GameState = {
    ...state,
    phase: 'ACTION_PHASE',
    pendingDecisionTileIndex: null,
  };
  next = appendEntry(next, entries, {
    type: 'DECLINE_DEED',
    actorId: playerId,
    tileIndex,
    message: `${player.name} ปฏิเสธการซื้อ ${buildTileLedgerLabel(tileIndex)} (ไม่มีการประมูล)`,
  });

  return ok(next, entries);
}

export function buildOnCurrentTile(state: GameState, playerId: string): EngineResult {
  const check = requireCurrentPlayer(state, playerId);
  if (!check.ok) return fail(state, check.error);
  const player = check.player;

  const eligibility = canBuildOnCurrentTile(state, playerId);
  if (!eligibility.allowed || eligibility.cost === undefined) {
    return fail(state, eligibility.reason ?? 'ไม่สามารถก่อสร้างบนช่องนี้ได้');
  }

  const tileIndex = player.position;
  const cost = eligibility.cost;
  const isHotelUpgrade = eligibility.isHotelUpgrade === true;
  const entries: LedgerEntry[] = [];

  let next = updatePlayer(state, playerId, (p) => adjustPlayerCash(p, -cost));
  if (isHotelUpgrade) {
    next = updateDeed(next, tileIndex, (d) => ({
      ...d,
      houses: 0,
      hasHotel: true,
    }));
    next = {
      ...next,
      banker: {
        ...next.banker,
        housesRemaining: next.banker.housesRemaining + 4,
        hotelsRemaining: next.banker.hotelsRemaining - 1,
      },
    };
    next = appendEntry(next, entries, {
      type: 'BUILD_HOTEL',
      actorId: playerId,
      amount: cost,
      tileIndex,
      message: `${player.name} อัปเกรดเป็นโรงแรมบน ${buildTileLedgerLabel(tileIndex)} (${formatBaht(cost)})`,
    });
  } else {
    const newHouses = (state.deeds[tileIndex]?.houses ?? 0) + 1;
    next = updateDeed(next, tileIndex, (d) => ({
      ...d,
      houses: newHouses,
    }));
    next = {
      ...next,
      banker: {
        ...next.banker,
        housesRemaining: next.banker.housesRemaining - 1,
      },
    };
    next = appendEntry(next, entries, {
      type: 'BUILD_HOUSE',
      actorId: playerId,
      amount: cost,
      tileIndex,
      message: `${player.name} สร้างบ้านหลังที่ ${newHouses} บน ${buildTileLedgerLabel(tileIndex)} (${formatBaht(cost)})`,
    });
  }

  return ok(next, entries);
}

export function sellHouseOnTile(
  state: GameState,
  playerId: string,
  tileIndex: number,
): EngineResult {
  const check = requireCurrentPlayer(state, playerId);
  if (!check.ok) return fail(state, check.error);
  const player = check.player;

  const eligibility = canSellHouseOnTile(state, playerId, tileIndex);
  if (!eligibility.allowed) {
    return fail(state, eligibility.reason ?? 'ไม่สามารถขายสิ่งปลูกสร้างได้');
  }

  const tile = getTile(tileIndex);
  const deed = state.deeds[tileIndex]!;
  const halfCost = Math.floor((tile.houseCost ?? 0) / 2);
  const entries: LedgerEntry[] = [];

  let next = state;
  if (deed.hasHotel) {
    const replacementHouses = Math.min(4, next.banker.housesRemaining);
    const levelsSold = 5 - replacementHouses;
    const refund = levelsSold * halfCost;
    next = updatePlayer(next, playerId, (p) => adjustPlayerCash(p, refund));
    next = updateDeed(next, tileIndex, (d) => ({
      ...d,
      hasHotel: false,
      houses: replacementHouses,
    }));
    next = {
      ...next,
      banker: {
        ...next.banker,
        hotelsRemaining: next.banker.hotelsRemaining + 1,
        housesRemaining: next.banker.housesRemaining - replacementHouses,
      },
    };
    next = appendEntry(next, entries, {
      type: 'SELL_HOTEL',
      actorId: playerId,
      amount: refund,
      tileIndex,
      message: `${player.name} ขายโรงแรมบน ${buildTileLedgerLabel(tileIndex)} รับเงินคืน ${formatBaht(refund)}`,
    });
  } else {
    next = updatePlayer(next, playerId, (p) => adjustPlayerCash(p, halfCost));
    next = updateDeed(next, tileIndex, (d) => ({
      ...d,
      houses: d.houses - 1,
    }));
    next = {
      ...next,
      banker: {
        ...next.banker,
        housesRemaining: next.banker.housesRemaining + 1,
      },
    };
    next = appendEntry(next, entries, {
      type: 'SELL_HOUSE',
      actorId: playerId,
      amount: halfCost,
      tileIndex,
      message: `${player.name} ขายบ้านบน ${buildTileLedgerLabel(tileIndex)} รับเงินคืน ${formatBaht(halfCost)}`,
    });
  }

  if (next.phase === 'AWAIT_DEBT_RESOLUTION') {
    next = settlePendingDebtIfAble(next, entries);
  }

  return ok(next, entries);
}

export function mortgageTile(
  state: GameState,
  playerId: string,
  tileIndex: number,
): EngineResult {
  const check = requireCurrentPlayer(state, playerId);
  if (!check.ok) return fail(state, check.error);
  const player = check.player;

  const eligibility = canMortgageTile(state, playerId, tileIndex);
  if (!eligibility.allowed || eligibility.proceeds === undefined) {
    return fail(state, eligibility.reason ?? 'ไม่สามารถจำนองโฉนดนี้ได้');
  }

  const proceeds = eligibility.proceeds;
  const entries: LedgerEntry[] = [];

  let next = updatePlayer(state, playerId, (p) => adjustPlayerCash(p, proceeds));
  next = updateDeed(next, tileIndex, (d) => ({
    ...d,
    isMortgaged: true,
  }));
  next = appendEntry(next, entries, {
    type: 'MORTGAGE',
    actorId: playerId,
    amount: proceeds,
    tileIndex,
    message: `${player.name} จำนอง ${buildTileLedgerLabel(tileIndex)} รับเงิน ${formatBaht(proceeds)}`,
  });

  if (next.phase === 'AWAIT_DEBT_RESOLUTION') {
    next = settlePendingDebtIfAble(next, entries);
  }

  return ok(next, entries);
}

export function unmortgageCurrentTile(state: GameState, playerId: string): EngineResult {
  const check = requireCurrentPlayer(state, playerId);
  if (!check.ok) return fail(state, check.error);
  const player = check.player;

  const eligibility = canUnmortgageCurrentTile(state, playerId);
  if (!eligibility.allowed || eligibility.cost === undefined) {
    return fail(state, eligibility.reason ?? 'ไม่สามารถไถ่ถอนโฉนดนี้ได้');
  }

  const tileIndex = player.position;
  const cost = eligibility.cost;
  const entries: LedgerEntry[] = [];

  let next = updatePlayer(state, playerId, (p) => adjustPlayerCash(p, -cost));
  next = updateDeed(next, tileIndex, (d) => ({
    ...d,
    isMortgaged: false,
  }));
  next = appendEntry(next, entries, {
    type: 'UNMORTGAGE',
    actorId: playerId,
    amount: cost,
    tileIndex,
    message: `${player.name} ไถ่ถอนจำนอง ${buildTileLedgerLabel(tileIndex)} จ่าย ${formatBaht(cost)}`,
  });

  return ok(next, entries);
}

export function declareBankruptcy(state: GameState, playerId: string): EngineResult {
  const check = requireCurrentPlayer(state, playerId);
  if (!check.ok) return fail(state, check.error);
  const player = check.player;

  if (
    state.phase !== 'AWAIT_DEBT_RESOLUTION' &&
    state.phase !== 'ACTION_PHASE' &&
    state.phase !== 'TURN_ORDER_ROLL'
  ) {
    return fail(state, 'ไม่สามารถประกาศล้มละลายในขั้นตอนนี้ได้');
  }

  const creditorId = state.pendingDebt?.debtorId === playerId ? state.pendingDebt.creditorId : null;
  const entries: LedgerEntry[] = [];
  let next = state;
  let liquidatedBuildingsCash = 0;

  // Return all houses/hotels to Banker first
  for (const deed of Object.values(next.deeds)) {
    if (deed.ownerId !== playerId) continue;
    const tile = getTile(deed.tileIndex);
    const levels = getDeedLevel(deed);
    if (levels > 0 && tile.houseCost) {
      liquidatedBuildingsCash += levels * Math.floor(tile.houseCost / 2);
      next = {
        ...next,
        banker: {
          ...next.banker,
          housesRemaining: next.banker.housesRemaining + deed.houses,
          hotelsRemaining: next.banker.hotelsRemaining + (deed.hasHotel ? 1 : 0),
        },
      };
      next = updateDeed(next, deed.tileIndex, (d) => ({
        ...d,
        houses: 0,
        hasHotel: false,
      }));
    }
  }

  const totalCashToTransfer = player.cash + liquidatedBuildingsCash;

  if (creditorId) {
    // Transfer remaining cash, deeds, and jail-free cards to creditor
    next = updatePlayer(next, creditorId, (c) => {
      const withCash = adjustPlayerCash(c, totalCashToTransfer);
      return {
        ...withCash,
        jailFreeCards: withCash.jailFreeCards + player.jailFreeCards,
        heldJailCardDecks: [...withCash.heldJailCardDecks, ...player.heldJailCardDecks],
      };
    });
    for (const deed of Object.values(next.deeds)) {
      if (deed.ownerId === playerId) {
        next = updateDeed(next, deed.tileIndex, (d) => ({
          ...d,
          ownerId: creditorId,
        }));
      }
    }
  } else {
    // Bankrupt to Bank (or multiple creditors): deeds become unowned & unmortgaged
    for (const deed of Object.values(next.deeds)) {
      if (deed.ownerId === playerId) {
        next = updateDeed(next, deed.tileIndex, (d) => ({
          ...d,
          ownerId: null,
          isMortgaged: false,
          houses: 0,
          hasHotel: false,
        }));
      }
    }
    // Return jail-free cards to bottom of their decks
    for (const deck of player.heldJailCardDecks) {
      if (deck === 'chance') {
        next = { ...next, chanceDeck: [...next.chanceDeck, 'chance-8'] };
      } else {
        next = { ...next, chestDeck: [...next.chestDeck, 'chest-15'] };
      }
    }
  }

  next = updatePlayer(next, playerId, (p) => ({
    ...setPlayerCash(p, 0),
    isBankrupt: true,
    jailFreeCards: 0,
    heldJailCardDecks: [],
    inJail: false,
    jailTurns: 0,
  }));

  // Cancel any pending trades involving the bankrupt player
  next = {
    ...next,
    pendingDebt: null,
    pendingDecisionTileIndex: null,
    doublesCount: 0,
    pendingTrades: next.pendingTrades.map((t) =>
      t.status === 'PENDING' && (t.fromPlayerId === playerId || t.toPlayerId === playerId)
        ? { ...t, status: 'CANCELLED' }
        : t,
    ),
  };

  const creditorName = creditorId ? (findPlayer(next, creditorId)?.name ?? 'เจ้าหนี้') : 'ธนาคาร';
  next = appendEntry(next, entries, {
    type: 'BANKRUPTCY',
    actorId: playerId,
    targetId: creditorId ?? undefined,
    amount: totalCashToTransfer,
    message: `${player.name} ล้มละลาย! ทรัพย์สินทั้งหมดถูกโอนให้${creditorName}`,
  });

  if (activePlayersCount(next) <= 1) {
    const winner = next.players.find((p) => !p.isBankrupt) ?? null;
    next = {
      ...next,
      phase: 'GAME_OVER',
      winnerId: winner?.id ?? null,
      victoryReason: 'ผู้เล่นคนอื่นล้มละลายทั้งหมด',
    };
    next = appendEntry(next, entries, {
      type: 'GAME_OVER',
      actorId: winner?.id,
      message: winner
        ? `จบเกม! ${winner.name} เป็นซุปเปอร์เศรษฐีผู้ชนะเพียงหนึ่งเดียว!`
        : 'จบเกม!',
    });
    return ok(next, entries);
  }

  next = checkSpecialVictory(next, entries);
  if (next.phase === 'GAME_OVER') {
    return ok(next, entries);
  }

  if (state.phase === 'TURN_ORDER_ROLL' && next.turnOrder) {
    const cleaned: GameState = {
      ...next,
      turnOrder: {
        ...next.turnOrder,
        contenderIds: next.turnOrder.contenderIds.filter((id) => id !== playerId),
      },
    };
    const resolved = evaluateTurnOrderState(cleaned, next.currentTurnIndex, entries);
    return ok(resolved, entries);
  }

  // Advance to next active player's turn
  const nextIdx = getNextActiveTurnIndex(next.players, next.currentTurnIndex);
  next = {
    ...next,
    currentTurnIndex: nextIdx,
    turnNumber: next.turnNumber + 1,
    phase: 'AWAIT_ROLL',
    hasRolledThisTurn: false,
    doublesCount: 0,
    lastDice: null,
  };

  return ok(next, entries);
}

function validateTradeAssets(
  state: GameState,
  fromPlayer: PlayerState,
  toPlayer: PlayerState,
  offer: TradeOfferInput,
): string | null {
  if (offer.offeredCash < 0 || offer.requestedCash < 0) {
    return 'จำนวนเงินแลกเปลี่ยนต้องไม่ติดลบ';
  }
  if (offer.offeredCash > fromPlayer.cash) {
    return 'ผู้เสนอมีเงินสดไม่พอ';
  }
  if (offer.requestedCash > toPlayer.cash) {
    return 'ผู้รับข้อเสนอมีเงินสดไม่พอ';
  }
  if (offer.offeredJailCards < 0 || offer.requestedJailCards < 0) {
    return 'จำนวนบัตรผ่านคุกฟรีต้องไม่ติดลบ';
  }
  if (offer.offeredJailCards > fromPlayer.jailFreeCards) {
    return 'ผู้เสนอมีบัตรผ่านคุกฟรีไม่พอ';
  }
  if (offer.requestedJailCards > toPlayer.jailFreeCards) {
    return 'ผู้รับข้อเสนอมีบัตรผ่านคุกฟรีไม่พอ';
  }

  for (const idx of offer.offeredTileIndices) {
    const deed = state.deeds[idx];
    const tile = getTile(idx);
    if (!deed || deed.ownerId !== fromPlayer.id) {
      return `ผู้เสนอไม่ได้เป็นเจ้าของ ${buildTileLedgerLabel(idx)}`;
    }
    if (tile.colorGroup && hasAnyBuildingInColorGroup(state, tile.colorGroup)) {
      return `ไม่สามารถแลกเปลี่ยนโฉนดที่มีบ้านหรือโรงแรมในกลุ่มสี ${tile.colorGroup} ได้`;
    }
  }

  for (const idx of offer.requestedTileIndices) {
    const deed = state.deeds[idx];
    const tile = getTile(idx);
    if (!deed || deed.ownerId !== toPlayer.id) {
      return `อีกฝ่ายไม่ได้เป็นเจ้าของ ${buildTileLedgerLabel(idx)}`;
    }
    if (tile.colorGroup && hasAnyBuildingInColorGroup(state, tile.colorGroup)) {
      return `ไม่สามารถขอแลกเปลี่ยนโฉนดที่มีบ้านหรือโรงแรมในกลุ่มสี ${tile.colorGroup} ได้`;
    }
  }

  return null;
}

export function createTradeOffer(
  state: GameState,
  playerId: string,
  offer: TradeOfferInput,
): EngineResult {
  const check = requireCurrentPlayer(state, playerId);
  if (!check.ok) return fail(state, check.error);
  const fromPlayer = check.player;

  if (state.phase !== 'AWAIT_ROLL' && state.phase !== 'ACTION_PHASE') {
    return fail(state, 'สามารถยื่นข้อเสนอแลกเปลี่ยนได้เฉพาะก่อนทอยหรือในช่วง ACTION_PHASE');
  }

  if (offer.toPlayerId === playerId) {
    return fail(state, 'ไม่สามารถแลกเปลี่ยนกับตนเองได้');
  }

  const toPlayer = findPlayer(state, offer.toPlayerId);
  if (!toPlayer || toPlayer.isBankrupt) {
    return fail(state, 'ไม่พบผู้เล่นปลายทางหรือผู้เล่นล้มละลายแล้ว');
  }

  const validationError = validateTradeAssets(state, fromPlayer, toPlayer, offer);
  if (validationError) {
    return fail(state, validationError);
  }

  const trade: TradeOffer = {
    id: `trade-${state.turnNumber}-${state.pendingTrades.length + 1}`,
    fromPlayerId: playerId,
    toPlayerId: offer.toPlayerId,
    offeredTileIndices: [...new Set(offer.offeredTileIndices)],
    requestedTileIndices: [...new Set(offer.requestedTileIndices)],
    offeredCash: offer.offeredCash,
    requestedCash: offer.requestedCash,
    offeredJailCards: offer.offeredJailCards,
    requestedJailCards: offer.requestedJailCards,
    status: 'PENDING',
    createdAt: Date.now(),
  };

  return ok(
    {
      ...state,
      pendingTrades: [...state.pendingTrades, trade],
    },
    [],
  );
}

export function respondTradeOffer(
  state: GameState,
  playerId: string,
  tradeId: string,
  accept: boolean,
): EngineResult {
  if (state.phase === 'LOBBY' || state.phase === 'GAME_OVER') {
    return fail(state, 'เกมยังไม่เริ่มหรือจบลงแล้ว');
  }

  const trade = state.pendingTrades.find((t) => t.id === tradeId);
  if (!trade || trade.status !== 'PENDING') {
    return fail(state, 'ไม่พบข้อเสนอแลกเปลี่ยนที่รอการตอบรับ');
  }

  if (!accept && trade.fromPlayerId === playerId) {
    return ok(
      {
        ...state,
        pendingTrades: state.pendingTrades.map((t) =>
          t.id === tradeId ? { ...t, status: 'CANCELLED' } : t,
        ),
      },
      [],
    );
  }

  if (trade.toPlayerId !== playerId) {
    return fail(state, 'คุณไม่ใช่ผู้รับข้อเสนอแลกเปลี่ยนนี้');
  }

  const fromPlayer = findPlayer(state, trade.fromPlayerId);
  const toPlayer = findPlayer(state, trade.toPlayerId);
  if (!fromPlayer || !toPlayer || fromPlayer.isBankrupt || toPlayer.isBankrupt) {
    return fail(state, 'ผู้เล่นในการแลกเปลี่ยนไม่พร้อมใช้งาน');
  }

  const entries: LedgerEntry[] = [];
  if (!accept) {
    let next: GameState = {
      ...state,
      pendingTrades: state.pendingTrades.map((t) =>
        t.id === tradeId ? { ...t, status: 'DECLINED' } : t,
      ),
    };
    next = appendEntry(next, entries, {
      type: 'TRADE',
      actorId: toPlayer.id,
      targetId: fromPlayer.id,
      message: `${toPlayer.name} ปฏิเสธข้อเสนอแลกเปลี่ยนจาก ${fromPlayer.name}`,
    });
    return ok(next, entries);
  }

  const validationError = validateTradeAssets(state, fromPlayer, toPlayer, trade);
  if (validationError) {
    return fail(state, validationError);
  }

  let next = state;
  // Transfer cash
  const cashDeltaFrom = trade.requestedCash - trade.offeredCash;
  next = updatePlayer(next, fromPlayer.id, (p) => adjustPlayerCash(p, cashDeltaFrom));
  next = updatePlayer(next, toPlayer.id, (p) => adjustPlayerCash(p, -cashDeltaFrom));

  // Transfer jail cards
  const fromGivenDecks = fromPlayer.heldJailCardDecks.slice(0, trade.offeredJailCards);
  const fromRemainingDecks = fromPlayer.heldJailCardDecks.slice(trade.offeredJailCards);
  const toGivenDecks = toPlayer.heldJailCardDecks.slice(0, trade.requestedJailCards);
  const toRemainingDecks = toPlayer.heldJailCardDecks.slice(trade.requestedJailCards);

  next = updatePlayer(next, fromPlayer.id, (p) => ({
    ...p,
    jailFreeCards: p.jailFreeCards - trade.offeredJailCards + trade.requestedJailCards,
    heldJailCardDecks: [...fromRemainingDecks, ...toGivenDecks],
  }));
  next = updatePlayer(next, toPlayer.id, (p) => ({
    ...p,
    jailFreeCards: p.jailFreeCards - trade.requestedJailCards + trade.offeredJailCards,
    heldJailCardDecks: [...toRemainingDecks, ...fromGivenDecks],
  }));

  // Transfer deeds
  for (const idx of trade.offeredTileIndices) {
    next = updateDeed(next, idx, (d) => ({ ...d, ownerId: toPlayer.id }));
  }
  for (const idx of trade.requestedTileIndices) {
    next = updateDeed(next, idx, (d) => ({ ...d, ownerId: fromPlayer.id }));
  }

  next = {
    ...next,
    pendingTrades: next.pendingTrades.map((t) =>
      t.id === tradeId ? { ...t, status: 'ACCEPTED' } : t,
    ),
  };

  next = appendEntry(next, entries, {
    type: 'TRADE',
    actorId: fromPlayer.id,
    targetId: toPlayer.id,
    amount: Math.abs(cashDeltaFrom),
    message: `${fromPlayer.name} และ ${toPlayer.name} ตกลงแลกเปลี่ยนทรัพย์สินสำเร็จ!`,
  });

  next = checkSpecialVictory(next, entries);
  return ok(next, entries);
}

export function endTurn(state: GameState, playerId: string): EngineResult {
  const check = requireCurrentPlayer(state, playerId);
  if (!check.ok) return fail(state, check.error);
  const player = check.player;

  if (state.phase !== 'ACTION_PHASE') {
    return fail(state, 'ยังไม่สามารถจบตาได้ในขั้นตอนนี้');
  }

  if (canRollAgain(state, playerId)) {
    return fail(state, 'คุณทอยได้เบิ้ล ต้องทอยลูกเต๋าอีกครั้งก่อนจบตา');
  }

  const entries: LedgerEntry[] = [];
  const nextIdx = getNextActiveTurnIndex(state.players, state.currentTurnIndex);
  const nextPlayer = state.players[nextIdx]!;
  const nextTurnNumber = state.turnNumber + 1;

  let next: GameState = {
    ...state,
    currentTurnIndex: nextIdx,
    turnNumber: nextTurnNumber,
    phase: 'AWAIT_ROLL',
    hasRolledThisTurn: false,
    doublesCount: 0,
    lastDice: null,
    pendingDecisionTileIndex: null,
    pendingTrades: state.pendingTrades.map((t) =>
      t.status === 'PENDING' && t.fromPlayerId === playerId
        ? { ...t, status: 'CANCELLED' }
        : t,
    ),
  };

  const maxRounds = next.rules?.maxRounds ?? null;
  const nextRound = getCurrentRoundNumber(next);
  if (maxRounds && nextRound > maxRounds) {
    const activeRanked = next.players
      .filter((p) => !p.isBankrupt)
      .map((p) => ({
        player: p,
        netWorth: calculatePlayerNetWorth(next, p.id),
      }))
      .sort((a, b) => {
        if (b.netWorth !== a.netWorth) return b.netWorth - a.netWorth;
        return b.player.cash - a.player.cash;
      });

    const richest = activeRanked[0];
    const reason = richest
      ? `ครบกำหนด ${maxRounds} รอบ — ชนะด้วยมูลค่าทรัพย์สินสุทธิสูงสุด (${formatBaht(richest.netWorth)})`
      : `ครบกำหนด ${maxRounds} รอบ`;

    next = {
      ...next,
      phase: 'GAME_OVER',
      winnerId: richest?.player.id ?? null,
      victoryReason: reason,
    };
    next = appendEntry(next, entries, {
      type: 'GAME_OVER',
      actorId: richest?.player.id,
      amount: richest?.netWorth,
      message: richest
        ? `🏆 จบเกม! ครบกำหนด ${maxRounds} รอบ — ${richest.player.name} ชนะด้วยมูลค่าทรัพย์สินสุทธิสูงสุด ${formatBaht(richest.netWorth)}!`
        : `จบเกมครบ ${maxRounds} รอบ!`,
    });
    return ok(next, entries);
  }

  next = appendEntry(next, entries, {
    type: 'TURN_END',
    actorId: player.id,
    targetId: nextPlayer.id,
    message: `${player.name} จบตา — ถึงตาของ ${nextPlayer.name}`,
  });

  return ok(next, entries);
}

export function applyGameAction(
  state: GameState,
  action: GameAction,
  rng?: () => number,
): EngineResult {
  switch (action.type) {
    case 'ROLL_DICE':
      return rollDice(state, action.playerId, rng, action.powerRange);
    case 'PAY_JAIL_BAIL':
      return payJailBail(state, action.playerId);
    case 'USE_JAIL_CARD':
      return useJailCard(state, action.playerId);
    case 'BUY_CURRENT_TILE':
      return buyCurrentTile(state, action.playerId);
    case 'DECLINE_CURRENT_TILE':
      return declineCurrentTile(state, action.playerId);
    case 'BUILD_ON_CURRENT_TILE':
      return buildOnCurrentTile(state, action.playerId);
    case 'SELL_HOUSE_ON_TILE':
      return sellHouseOnTile(state, action.playerId, action.tileIndex);
    case 'MORTGAGE_TILE':
      return mortgageTile(state, action.playerId, action.tileIndex);
    case 'UNMORTGAGE_CURRENT_TILE':
      return unmortgageCurrentTile(state, action.playerId);
    case 'HOSTILE_TAKEOVER_CURRENT_TILE':
      return hostileTakeoverCurrentTile(state, action.playerId);
    case 'DECLARE_BANKRUPTCY':
      return declareBankruptcy(state, action.playerId);
    case 'CREATE_TRADE_OFFER':
      return createTradeOffer(state, action.playerId, action.offer);
    case 'RESPOND_TRADE_OFFER':
      return respondTradeOffer(state, action.playerId, action.tradeId, action.accept);
    case 'END_TURN':
      return endTurn(state, action.playerId);
  }
}

export { BOARD_TILES };
