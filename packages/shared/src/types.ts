/**
 * Core TypeScript definitions for ซุปเปอร์เศรษฐี (Super Millionaire No. 9028).
 */

export type ColorGroup =
  | 'brown'
  | 'lightBlue'
  | 'darkGreen'
  | 'orange'
  | 'skyBlue'
  | 'red'
  | 'limeGreen'
  | 'darkRed'
  | 'hotel'
  | 'utility';

export type TileType =
  | 'start'
  | 'property'
  | 'hotel'
  | 'utility'
  | 'chest'
  | 'chance'
  | 'jail'
  | 'freeParking'
  | 'goToJail'
  | 'tax';

export type BanknoteDenomination = 5000 | 1000 | 500 | 100 | 50 | 10;

export type BanknoteBreakdown = Record<BanknoteDenomination, number>;

export type BotStyle = 'aggressive' | 'balanced' | 'cautious';

export interface PlayerSlotConfig {
  seatIndex: number;
  kind: 'human' | 'bot';
  name?: string;
  botStyle?: BotStyle;
}

export interface RoomConfig {
  totalSeats: 2 | 3 | 4 | 5 | 6 | 7 | 8;
  slots: PlayerSlotConfig[];
}

export type GamePhase =
  | 'LOBBY'
  | 'TURN_ORDER_ROLL'
  | 'AWAIT_ROLL'
  | 'AWAIT_DECISION'
  | 'AWAIT_DEBT_RESOLUTION'
  | 'ACTION_PHASE'
  | 'GAME_OVER';

export interface TileDefinition {
  index: number;
  deedNumber?: number;
  name: string;
  type: TileType;
  colorGroup?: ColorGroup;
  price?: number;
  mortgageValue?: number;
  houseCost?: number;
  /**
   * For 'property': [baseRent, 1House, 2Houses, 3Houses, 4Houses, hotel]
   * For 'hotel': [1Hotel, 2Hotels, 3Hotels, 4Hotels, 5Hotels]
   */
  rents?: readonly number[];
  taxAmount?: number;
  startBonus?: number;
  description?: string;
}

export interface DeedState {
  tileIndex: number;
  ownerId: string | null;
  houses: number;
  hasHotel: boolean;
  isMortgaged: boolean;
}

export type CardDeck = 'chance' | 'chest';

export type CardEffect =
  | { kind: 'CASH'; amount: number }
  | { kind: 'COLLECT_FROM_ALL'; amountPerPlayer: number }
  | { kind: 'PAY_ALL'; amountPerPlayer: number }
  | { kind: 'REPAIRS'; perHouse: number; perHotel: number }
  | { kind: 'MOVE_TO'; tileIndex: number; collectStartIfPassed: boolean }
  | { kind: 'MOVE_BACK'; spaces: number }
  | { kind: 'GO_TO_JAIL' }
  | { kind: 'GET_OUT_OF_JAIL_FREE' };

export interface CardDefinition {
  id: string;
  deck: CardDeck;
  title: string;
  description: string;
  effect: CardEffect;
}

export interface PlayerState {
  id: string;
  seatIndex: number;
  name: string;
  kind: 'human' | 'bot';
  botStyle?: BotStyle;
  tokenId: number;
  color: string;
  cash: number;
  banknotes: BanknoteBreakdown;
  position: number;
  inJail: boolean;
  jailTurns: number;
  jailFreeCards: number;
  heldJailCardDecks: CardDeck[];
  isBankrupt: boolean;
  connected: boolean;
}

export type LedgerEntryType =
  | 'GAME_START'
  | 'TURN_ORDER'
  | 'PASS_START'
  | 'DICE_ROLL'
  | 'BUY_DEED'
  | 'DECLINE_DEED'
  | 'RENT'
  | 'BUILD_HOUSE'
  | 'BUILD_HOTEL'
  | 'SELL_HOUSE'
  | 'SELL_HOTEL'
  | 'MORTGAGE'
  | 'UNMORTGAGE'
  | 'TAX'
  | 'CARD_CHANCE'
  | 'CARD_CHEST'
  | 'JAIL'
  | 'BAIL'
  | 'JAIL_CARD'
  | 'TRADE'
  | 'BANKRUPTCY'
  | 'GAME_OVER'
  | 'TURN_END';

export interface LedgerEntry {
  id: string;
  seq: number;
  timestamp: number;
  type: LedgerEntryType;
  actorId?: string;
  targetId?: string;
  amount?: number;
  tileIndex?: number;
  message: string;
}

export interface BankerState {
  housesRemaining: number;
  hotelsRemaining: number;
  ledger: LedgerEntry[];
}

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offeredTileIndices: number[];
  requestedTileIndices: number[];
  offeredCash: number;
  requestedCash: number;
  offeredJailCards: number;
  requestedJailCards: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  createdAt: number;
}

export interface DebtState {
  debtorId: string;
  creditorId: string | null;
  splitCreditorIds?: string[];
  amount: number;
  reason: string;
  tileIndex?: number;
}

export interface DiceRollResult {
  die1: number;
  die2: number;
  total: number;
  isDoubles: boolean;
}

export interface DrawnCardInfo {
  card: CardDefinition;
  playerId: string;
  turnNumber: number;
}

export interface TurnOrderRollRecord {
  playerId: string;
  roll: DiceRollResult;
}

export interface TurnOrderRoundRecord {
  round: number;
  contenderIds: string[];
  rolls: TurnOrderRollRecord[];
  highestTotal: number;
  tiedLeaderIds: string[];
  winnerId: string | null;
}

export interface TurnOrderState {
  round: number;
  contenderIds: string[];
  rolls: Record<string, DiceRollResult>;
  history: TurnOrderRoundRecord[];
  winnerId: string | null;
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: PlayerState[];
  currentTurnIndex: number;
  turnNumber: number;
  turnOrder: TurnOrderState | null;
  doublesCount: number;
  hasRolledThisTurn: boolean;
  lastDice: DiceRollResult | null;
  lastCardDrawn: DrawnCardInfo | null;
  deeds: Record<number, DeedState>;
  banker: BankerState;
  chanceDeck: string[];
  chestDeck: string[];
  pendingDecisionTileIndex: number | null;
  pendingDebt: DebtState | null;
  pendingTrades: TradeOffer[];
  winnerId: string | null;
}

export interface RoomSeat {
  seatIndex: number;
  kind: 'human' | 'bot';
  name: string;
  botStyle: BotStyle;
  occupiedBySocketId?: string | null;
  playerId?: string | null;
  ready: boolean;
  tokenId: number;
  color: string;
}

export interface RoomState {
  roomId: string;
  hostSeatIndex: number;
  config: RoomConfig;
  seats: RoomSeat[];
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  gameState: GameState | null;
  createdAt: number;
}

export interface TradeOfferInput {
  toPlayerId: string;
  offeredTileIndices: number[];
  requestedTileIndices: number[];
  offeredCash: number;
  requestedCash: number;
  offeredJailCards: number;
  requestedJailCards: number;
}

export type GameAction =
  | { type: 'ROLL_DICE'; playerId: string }
  | { type: 'PAY_JAIL_BAIL'; playerId: string }
  | { type: 'USE_JAIL_CARD'; playerId: string }
  | { type: 'BUY_CURRENT_TILE'; playerId: string }
  | { type: 'DECLINE_CURRENT_TILE'; playerId: string }
  | { type: 'BUILD_ON_CURRENT_TILE'; playerId: string }
  | { type: 'SELL_HOUSE_ON_TILE'; playerId: string; tileIndex: number }
  | { type: 'MORTGAGE_TILE'; playerId: string; tileIndex: number }
  | { type: 'UNMORTGAGE_CURRENT_TILE'; playerId: string }
  | { type: 'DECLARE_BANKRUPTCY'; playerId: string }
  | { type: 'CREATE_TRADE_OFFER'; playerId: string; offer: TradeOfferInput }
  | { type: 'RESPOND_TRADE_OFFER'; playerId: string; tradeId: string; accept: boolean }
  | { type: 'END_TURN'; playerId: string };

export interface RoomActionAck {
  ok: boolean;
  error?: string;
}

export interface RoomJoinAck extends RoomActionAck {
  roomId?: string;
  seatIndex?: number;
  playerId?: string;
  isSpectator?: boolean;
}

export interface ClientToServerEvents {
  'room:create': (
    payload: { playerName: string; config?: Partial<RoomConfig> },
    cb?: (res: RoomJoinAck) => void,
  ) => void;
  'room:join': (
    payload: {
      roomId: string;
      playerName: string;
      preferredSeatIndex?: number;
      asSpectator?: boolean;
    },
    cb?: (res: RoomJoinAck) => void,
  ) => void;
  'room:updateConfig': (
    payload: { roomId: string; config: RoomConfig },
    cb?: (res: RoomActionAck) => void,
  ) => void;
  'room:setReady': (payload: { roomId: string; ready: boolean }) => void;
  'room:startGame': (
    payload: { roomId: string },
    cb?: (res: RoomActionAck) => void,
  ) => void;
  'room:leave': (payload: { roomId: string }) => void;
  'room:requestState': (payload: { roomId: string }) => void;
  'game:action': (
    payload: { roomId: string; action: GameAction },
    cb?: (res: RoomActionAck) => void,
  ) => void;
}

export interface ServerToClientEvents {
  health: (payload: { status: 'ok'; service: string }) => void;
  'room:state': (room: RoomState) => void;
  'game:state': (state: GameState) => void;
  'game:actionResult': (payload: {
    ok: boolean;
    error?: string;
    ledgerEntries?: LedgerEntry[];
  }) => void;
  'room:error': (payload: { message: string }) => void;
}
