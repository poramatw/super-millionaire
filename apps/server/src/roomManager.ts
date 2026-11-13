import crypto from 'node:crypto';
import {
  BOT_DEFAULT_NAMES,
  PLAYER_COLORS,
  applyGameAction,
  createGameState,
  decideNextBotAction,
  getCurrentPlayer,
  type BotStyle,
  type GameAction,
  type GameState,
  type LedgerEntry,
  type PlayerSlotConfig,
  type RoomActionAck,
  type RoomConfig,
  type RoomJoinAck,
  type RoomSeat,
  type RoomState,
} from '@super-millionaire/shared';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const DEFAULT_BOT_DELAY_MS = 750;
const MAX_CONSECUTIVE_BOT_STEPS = 60;

export interface RoomManagerOptions {
  botDelayMs?: number;
  onRoomUpdated?: (room: RoomState, gameState: GameState | null) => void;
  onGameActionResult?: (
    roomId: string,
    payload: { ok: boolean; error?: string; ledgerEntries?: LedgerEntry[] },
  ) => void;
}

interface ManagedRoom {
  room: RoomState;
  hostSocketId: string | null;
  hostSessionToken: string;
  seatSessionTokens: Map<number, string>;
  socketToSeat: Map<string, number>;
  spectatorSockets: Set<string>;
  botTimer: ReturnType<typeof setTimeout> | null;
  consecutiveBotSteps: number;
}

export interface CreateRoomResult extends RoomJoinAck {
  room?: RoomState;
  sessionToken?: string;
}

export interface JoinRoomResult extends RoomJoinAck {
  room?: RoomState;
  previousRoomId?: string;
  sessionToken?: string;
}

export interface RoomMutationResult extends RoomActionAck {
  room?: RoomState;
  gameState?: GameState | null;
  entries?: LedgerEntry[];
}

export interface LeaveRoomResult {
  leftRoomId: string | null;
  roomDeleted: boolean;
  room?: RoomState;
  gameState?: GameState | null;
  entries?: LedgerEntry[];
}

export interface DisconnectResult {
  roomId: string;
  roomDeleted: boolean;
  room?: RoomState;
  gameState?: GameState | null;
}

/**
 * Cryptographically strong uniform [0, 1) PRNG backed by Node's CSPRNG.
 */
export function cryptoRng(): number {
  return crypto.randomInt(0, 0x1_0000_0000) / 0x1_0000_0000;
}

/**
 * Cryptographically strong unbiased dice [0, 1) provider mapping Math.floor(rng() * 6) + 1
 * directly to crypto.randomInt(1, 7).
 */
export function cryptoDiceRng(): number {
  return (crypto.randomInt(1, 7) - 0.5) / 6;
}

function normalizeRoomCode(roomId: string): string {
  return roomId.trim().toUpperCase();
}

function sanitizeName(name: string | undefined, fallback: string): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return fallback;
  return trimmed.slice(0, 32);
}

function isValidTotalSeats(value: unknown): value is 2 | 3 | 4 | 5 | 6 {
  return value === 2 || value === 3 || value === 4 || value === 5 || value === 6;
}

function normalizeBotStyle(style: unknown): BotStyle {
  if (style === 'aggressive' || style === 'balanced' || style === 'cautious') {
    return style;
  }
  return 'balanced';
}

function buildDefaultSlotConfig(seatIndex: number, kind: 'human' | 'bot'): PlayerSlotConfig {
  return {
    seatIndex,
    kind,
    name: kind === 'bot' ? BOT_DEFAULT_NAMES[seatIndex % BOT_DEFAULT_NAMES.length]! : undefined,
    botStyle: kind === 'bot' ? 'balanced' : undefined,
  };
}

function cloneRoomState(room: RoomState): RoomState {
  return {
    ...room,
    config: {
      totalSeats: room.config.totalSeats,
      slots: room.config.slots.map((s) => ({ ...s })),
    },
    seats: room.seats.map((s) => ({ ...s })),
  };
}

/**
 * Authoritative multiplayer room manager for ซุปเปอร์เศรษฐี (Super Millionaire No. 9028).
 * Handles 2-6 seat custom rooms, spectators, sessionToken reconnects, CSPRNG dice,
 * zero human turn timers, and stepped AI bot scheduling.
 */
export class RoomManager {
  private readonly rooms = new Map<string, ManagedRoom>();
  private readonly socketRoomIndex = new Map<string, string>();
  private readonly botDelayMs: number;
  private readonly onRoomUpdated?: RoomManagerOptions['onRoomUpdated'];
  private readonly onGameActionResult?: RoomManagerOptions['onGameActionResult'];

  constructor(options: RoomManagerOptions = {}) {
    this.botDelayMs = options.botDelayMs ?? DEFAULT_BOT_DELAY_MS;
    this.onRoomUpdated = options.onRoomUpdated;
    this.onGameActionResult = options.onGameActionResult;
  }

  getActiveRoomCount(): number {
    return this.rooms.size;
  }

  getRoomState(roomId: string): RoomState | null {
    const managed = this.rooms.get(normalizeRoomCode(roomId));
    return managed ? cloneRoomState(managed.room) : null;
  }

  getSocketRoomId(socketId: string): string | null {
    return this.socketRoomIndex.get(socketId) ?? null;
  }

  private generateUniqueRoomCode(): string {
    for (let attempt = 0; attempt < 500; attempt++) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_ALPHABET[crypto.randomInt(0, ROOM_CODE_ALPHABET.length)]!;
      }
      if (!this.rooms.has(code)) {
        return code;
      }
    }
    throw new Error('ไม่สามารถสร้างรหัสห้องใหม่ได้');
  }

  private clearBotTimer(managed: ManagedRoom): void {
    if (managed.botTimer !== null) {
      clearTimeout(managed.botTimer);
      managed.botTimer = null;
    }
  }

  destroyAll(): void {
    for (const managed of this.rooms.values()) {
      this.clearBotTimer(managed);
    }
    this.rooms.clear();
    this.socketRoomIndex.clear();
  }

  createRoom(params: {
    socketId: string;
    sessionToken: string;
    playerName: string;
    config?: Partial<RoomConfig>;
  }): CreateRoomResult {
    const totalSeats = isValidTotalSeats(params.config?.totalSeats)
      ? params.config.totalSeats
      : 4;
    const hostName = sanitizeName(params.playerName, 'เจ้าบ้าน');

    const slotByIndex = new Map<number, PlayerSlotConfig>();
    if (Array.isArray(params.config?.slots)) {
      for (const rawSlot of params.config.slots) {
        if (
          rawSlot &&
          typeof rawSlot.seatIndex === 'number' &&
          rawSlot.seatIndex >= 0 &&
          rawSlot.seatIndex < totalSeats
        ) {
          slotByIndex.set(rawSlot.seatIndex, rawSlot);
        }
      }
    }

    const seats: RoomSeat[] = [];
    const normalizedSlots: PlayerSlotConfig[] = [];
    let firstHumanSeatIndex: number | null = null;

    for (let i = 0; i < totalSeats; i++) {
      const provided = slotByIndex.get(i);
      const kind: 'human' | 'bot' = provided?.kind === 'bot' ? 'bot' : 'human';
      if (kind === 'human' && firstHumanSeatIndex === null) {
        firstHumanSeatIndex = i;
      }
      const botStyle = normalizeBotStyle(provided?.botStyle);
      const defaultName =
        kind === 'bot'
          ? BOT_DEFAULT_NAMES[i % BOT_DEFAULT_NAMES.length]!
          : `ผู้เล่น ${i + 1}`;
      const name = sanitizeName(provided?.name, defaultName);

      normalizedSlots.push({
        seatIndex: i,
        kind,
        name: kind === 'bot' ? name : provided?.name,
        botStyle: kind === 'bot' ? botStyle : undefined,
      });

      seats.push({
        seatIndex: i,
        kind,
        name,
        botStyle,
        occupiedBySocketId: null,
        playerId: kind === 'bot' ? `player-${i + 1}` : null,
        ready: kind === 'bot',
        tokenId: i,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length]!,
      });
    }

    const roomId = this.generateUniqueRoomCode();
    const isSpectator = firstHumanSeatIndex === null;
    const hostSeatIndex = firstHumanSeatIndex ?? 0;

    const managed: ManagedRoom = {
      room: {
        roomId,
        hostSeatIndex,
        config: {
          totalSeats,
          slots: normalizedSlots,
        },
        seats,
        status: 'LOBBY',
        gameState: null,
        createdAt: Date.now(),
      },
      hostSocketId: params.socketId,
      hostSessionToken: params.sessionToken,
      seatSessionTokens: new Map(),
      socketToSeat: new Map(),
      spectatorSockets: new Set(),
      botTimer: null,
      consecutiveBotSteps: 0,
    };

    if (isSpectator) {
      managed.spectatorSockets.add(params.socketId);
    } else {
      const seat = managed.room.seats[firstHumanSeatIndex!]!;
      seat.occupiedBySocketId = params.socketId;
      seat.playerId = `player-${firstHumanSeatIndex! + 1}`;
      seat.name = hostName;
      seat.ready = true;
      managed.room.config.slots[firstHumanSeatIndex!] = {
        ...managed.room.config.slots[firstHumanSeatIndex!]!,
        name: hostName,
      };
      managed.seatSessionTokens.set(firstHumanSeatIndex!, params.sessionToken);
      managed.socketToSeat.set(params.socketId, firstHumanSeatIndex!);
    }

    this.rooms.set(roomId, managed);
    this.socketRoomIndex.set(params.socketId, roomId);

    return {
      ok: true,
      roomId,
      seatIndex: isSpectator ? undefined : hostSeatIndex,
      playerId: isSpectator ? undefined : `player-${hostSeatIndex + 1}`,
      isSpectator,
      sessionToken: params.sessionToken,
      room: cloneRoomState(managed.room),
    };
  }

  joinRoom(params: {
    socketId: string;
    sessionToken: string;
    roomId: string;
    playerName: string;
    preferredSeatIndex?: number;
    asSpectator?: boolean;
  }): JoinRoomResult {
    const roomId = normalizeRoomCode(params.roomId);
    const managed = this.rooms.get(roomId);
    if (!managed) {
      return { ok: false, error: 'ไม่พบห้องรหัสนี้ กรุณาตรวจสอบรหัสห้องอีกครั้ง' };
    }

    const trimmedName = sanitizeName(params.playerName, 'ผู้เล่น');

    // 1. Check sessionToken reconnect (works in LOBBY, PLAYING, or FINISHED)
    const tokenMatchedSeat = this.findSeatBySessionToken(managed, params.sessionToken);
    if (tokenMatchedSeat !== null && !params.asSpectator) {
      const result = this.rebindSeatSocket(managed, tokenMatchedSeat, params.socketId, params.sessionToken);
      // If in LOBBY and caller explicitly requested a different seat, allow switching below
      if (
        managed.room.status === 'LOBBY' &&
        params.preferredSeatIndex !== undefined &&
        params.preferredSeatIndex !== tokenMatchedSeat
      ) {
        return this.moveSeatedPlayerInLobby(managed, tokenMatchedSeat, params);
      }
      return result;
    }

    // 2. Check name-based reconnect for disconnected human seats during an active game
    if (managed.room.status === 'PLAYING' && !params.asSpectator) {
      const disconnectedSeat = managed.room.seats.find(
        (s) =>
          s.kind === 'human' &&
          !s.occupiedBySocketId &&
          s.name.trim().toLowerCase() === trimmedName.toLowerCase(),
      );
      if (disconnectedSeat) {
        return this.rebindSeatSocket(
          managed,
          disconnectedSeat.seatIndex,
          params.socketId,
          params.sessionToken,
        );
      }
    }

    // 3. Spectator join (allowed in any room status)
    if (params.asSpectator) {
      const existingSeat = managed.socketToSeat.get(params.socketId);
      if (existingSeat !== undefined) {
        if (managed.room.status !== 'LOBBY') {
          return { ok: false, error: 'ไม่สามารถเปลี่ยนเป็นผู้ชมระหว่างเกมกำลังดำเนินอยู่ได้' };
        }
        this.vacateLobbySeat(managed, existingSeat);
      }
      managed.spectatorSockets.add(params.socketId);
      this.socketRoomIndex.set(params.socketId, roomId);
      return {
        ok: true,
        roomId,
        isSpectator: true,
        sessionToken: params.sessionToken,
        room: cloneRoomState(managed.room),
      };
    }

    // 4. Cannot join a new seat once game has started
    if (managed.room.status !== 'LOBBY') {
      return {
        ok: false,
        error: 'เกมเริ่มแล้ว กรุณาเข้าร่วมในฐานะผู้ชม หรือใช้ชื่อเดิมเพื่อเชื่อมต่อกลับ',
      };
    }

    // 5. Already seated in LOBBY -> move seat if preferredSeatIndex specified
    const currentSeat = managed.socketToSeat.get(params.socketId);
    if (currentSeat !== undefined) {
      if (
        params.preferredSeatIndex !== undefined &&
        params.preferredSeatIndex !== currentSeat
      ) {
        return this.moveSeatedPlayerInLobby(managed, currentSeat, params);
      }
      const seat = managed.room.seats[currentSeat]!;
      return {
        ok: true,
        roomId,
        seatIndex: currentSeat,
        playerId: seat.playerId ?? `player-${currentSeat + 1}`,
        isSpectator: false,
        sessionToken: params.sessionToken,
        room: cloneRoomState(managed.room),
      };
    }

    // 6. Pick target unoccupied human seat in LOBBY
    const targetSeat = this.pickAvailableHumanSeat(managed.room, params.preferredSeatIndex);
    if (!targetSeat) {
      return {
        ok: false,
        error:
          params.preferredSeatIndex !== undefined
            ? 'ที่นั่งที่เลือกไม่ว่างหรือไม่ใช่ที่นั่งสำหรับผู้เล่นจริง'
            : 'ห้องเต็มแล้ว ไม่มีที่นั่งผู้เล่นว่าง',
      };
    }

    managed.spectatorSockets.delete(params.socketId);
    targetSeat.occupiedBySocketId = params.socketId;
    targetSeat.playerId = `player-${targetSeat.seatIndex + 1}`;
    targetSeat.name = trimmedName;
    targetSeat.ready = managed.hostSocketId === params.socketId;
    managed.room.config.slots[targetSeat.seatIndex] = {
      ...managed.room.config.slots[targetSeat.seatIndex]!,
      name: trimmedName,
    };
    managed.seatSessionTokens.set(targetSeat.seatIndex, params.sessionToken);
    managed.socketToSeat.set(params.socketId, targetSeat.seatIndex);
    this.socketRoomIndex.set(params.socketId, roomId);

    if (
      managed.hostSocketId === params.socketId ||
      managed.hostSessionToken === params.sessionToken
    ) {
      managed.room.hostSeatIndex = targetSeat.seatIndex;
    }

    return {
      ok: true,
      roomId,
      seatIndex: targetSeat.seatIndex,
      playerId: targetSeat.playerId,
      isSpectator: false,
      sessionToken: params.sessionToken,
      room: cloneRoomState(managed.room),
    };
  }

  private findSeatBySessionToken(managed: ManagedRoom, sessionToken: string): number | null {
    for (const [seatIndex, token] of managed.seatSessionTokens.entries()) {
      if (token === sessionToken) {
        return seatIndex;
      }
    }
    return null;
  }

  private rebindSeatSocket(
    managed: ManagedRoom,
    seatIndex: number,
    newSocketId: string,
    sessionToken: string,
  ): JoinRoomResult {
    const seat = managed.room.seats[seatIndex];
    if (!seat || seat.kind !== 'human') {
      return { ok: false, error: 'ไม่พบที่นั่งสำหรับเชื่อมต่อกลับ' };
    }

    if (seat.occupiedBySocketId && seat.occupiedBySocketId !== newSocketId) {
      managed.socketToSeat.delete(seat.occupiedBySocketId);
    }

    seat.occupiedBySocketId = newSocketId;
    managed.socketToSeat.set(newSocketId, seatIndex);
    managed.seatSessionTokens.set(seatIndex, sessionToken);
    managed.spectatorSockets.delete(newSocketId);
    this.socketRoomIndex.set(newSocketId, managed.room.roomId);

    if (managed.hostSessionToken === sessionToken || seatIndex === managed.room.hostSeatIndex) {
      managed.hostSocketId = newSocketId;
    }

    if (managed.room.gameState) {
      managed.room.gameState = {
        ...managed.room.gameState,
        players: managed.room.gameState.players.map((p) =>
          p.seatIndex === seatIndex ? { ...p, connected: true } : p,
        ),
      };
    }

    return {
      ok: true,
      roomId: managed.room.roomId,
      seatIndex,
      playerId: seat.playerId ?? `player-${seatIndex + 1}`,
      isSpectator: false,
      sessionToken,
      room: cloneRoomState(managed.room),
    };
  }

  private pickAvailableHumanSeat(room: RoomState, preferredSeatIndex?: number): RoomSeat | null {
    if (preferredSeatIndex !== undefined) {
      const preferred = room.seats[preferredSeatIndex];
      if (!preferred || preferred.kind !== 'human' || preferred.occupiedBySocketId) {
        return null;
      }
      return preferred;
    }
    return room.seats.find((s) => s.kind === 'human' && !s.occupiedBySocketId) ?? null;
  }

  private moveSeatedPlayerInLobby(
    managed: ManagedRoom,
    fromSeatIndex: number,
    params: {
      socketId: string;
      sessionToken: string;
      playerName: string;
      preferredSeatIndex?: number;
    },
  ): JoinRoomResult {
    const targetSeat = this.pickAvailableHumanSeat(managed.room, params.preferredSeatIndex);
    if (!targetSeat) {
      return { ok: false, error: 'ที่นั่งที่เลือกไม่ว่างหรือไม่ใช่ที่นั่งสำหรับผู้เล่นจริง' };
    }

    const oldSeat = managed.room.seats[fromSeatIndex]!;
    const playerName = oldSeat.name || sanitizeName(params.playerName, 'ผู้เล่น');
    const wasReady = oldSeat.ready;
    const wasHost =
      managed.room.hostSeatIndex === fromSeatIndex ||
      managed.hostSocketId === params.socketId;

    this.vacateLobbySeat(managed, fromSeatIndex);

    targetSeat.occupiedBySocketId = params.socketId;
    targetSeat.playerId = `player-${targetSeat.seatIndex + 1}`;
    targetSeat.name = playerName;
    targetSeat.ready = wasHost ? true : wasReady;
    managed.room.config.slots[targetSeat.seatIndex] = {
      ...managed.room.config.slots[targetSeat.seatIndex]!,
      name: playerName,
    };
    managed.seatSessionTokens.set(targetSeat.seatIndex, params.sessionToken);
    managed.socketToSeat.set(params.socketId, targetSeat.seatIndex);
    this.socketRoomIndex.set(params.socketId, managed.room.roomId);

    if (wasHost) {
      managed.room.hostSeatIndex = targetSeat.seatIndex;
    }

    return {
      ok: true,
      roomId: managed.room.roomId,
      seatIndex: targetSeat.seatIndex,
      playerId: targetSeat.playerId,
      isSpectator: false,
      sessionToken: params.sessionToken,
      room: cloneRoomState(managed.room),
    };
  }

  private vacateLobbySeat(managed: ManagedRoom, seatIndex: number): void {
    const seat = managed.room.seats[seatIndex];
    if (!seat) return;
    if (seat.occupiedBySocketId) {
      managed.socketToSeat.delete(seat.occupiedBySocketId);
    }
    managed.seatSessionTokens.delete(seatIndex);
    seat.occupiedBySocketId = null;
    seat.playerId = seat.kind === 'bot' ? `player-${seatIndex + 1}` : null;
    seat.ready = seat.kind === 'bot';
    if (seat.kind === 'human') {
      seat.name = `ผู้เล่น ${seatIndex + 1}`;
    }
  }

  private isHost(managed: ManagedRoom, socketId: string, sessionToken?: string): boolean {
    if (managed.hostSocketId === socketId) return true;
    if (sessionToken && managed.hostSessionToken === sessionToken) return true;
    return false;
  }

  updateConfig(params: {
    socketId: string;
    sessionToken?: string;
    roomId: string;
    config: RoomConfig;
  }): RoomMutationResult {
    const roomId = normalizeRoomCode(params.roomId);
    const managed = this.rooms.get(roomId);
    if (!managed) {
      return { ok: false, error: 'ไม่พบห้องนี้' };
    }
    if (!this.isHost(managed, params.socketId, params.sessionToken)) {
      return { ok: false, error: 'เฉพาะเจ้าบ้านเท่านั้นที่สามารถตั้งค่าห้องได้' };
    }
    if (managed.room.status !== 'LOBBY') {
      return { ok: false, error: 'ไม่สามารถแก้ไขการตั้งค่าหลังจากเริ่มเกมแล้วได้' };
    }
    if (!isValidTotalSeats(params.config?.totalSeats)) {
      return { ok: false, error: 'จำนวนที่นั่งต้องอยู่ระหว่าง 2 ถึง 6 ที่นั่ง' };
    }

    const totalSeats = params.config.totalSeats;
    const incomingSlotMap = new Map<number, PlayerSlotConfig>();
    for (const slot of params.config.slots ?? []) {
      if (slot && slot.seatIndex >= 0 && slot.seatIndex < totalSeats) {
        incomingSlotMap.set(slot.seatIndex, slot);
      }
    }

    // Ensure no non-host occupied human seat is removed or converted to bot
    for (const existingSeat of managed.room.seats) {
      if (!existingSeat.occupiedBySocketId) continue;
      const isHostSocket = existingSeat.occupiedBySocketId === managed.hostSocketId;
      if (existingSeat.seatIndex >= totalSeats) {
        if (!isHostSocket) {
          return {
            ok: false,
            error: `ไม่สามารถลดจำนวนที่นั่งได้ เนื่องจากยังมีผู้เล่นนั่งอยู่ที่ตำแหน่ง ${existingSeat.seatIndex + 1}`,
          };
        }
        continue;
      }
      const nextKind = incomingSlotMap.get(existingSeat.seatIndex)?.kind ?? existingSeat.kind;
      if (nextKind === 'bot' && !isHostSocket) {
        return {
          ok: false,
          error: `ไม่สามารถเปลี่ยนที่นั่งของ ${existingSeat.name} เป็นบอทได้ขณะมีผู้เล่นนั่งอยู่`,
        };
      }
    }

    const nextSeats: RoomSeat[] = [];
    const nextSlots: PlayerSlotConfig[] = [];
    let hostMovedToSpectator = false;

    // Check if host currently sits on a seat that is removed or switched to bot
    const currentHostSeat = managed.socketToSeat.get(managed.hostSocketId ?? '');
    if (currentHostSeat !== undefined) {
      const hostNextKind =
        currentHostSeat >= totalSeats
          ? 'bot'
          : (incomingSlotMap.get(currentHostSeat)?.kind ?? 'human');
      if (hostNextKind === 'bot' || currentHostSeat >= totalSeats) {
        this.vacateLobbySeat(managed, currentHostSeat);
        if (managed.hostSocketId) {
          managed.spectatorSockets.add(managed.hostSocketId);
        }
        hostMovedToSpectator = true;
      }
    }

    for (let i = 0; i < totalSeats; i++) {
      const prevSeat = managed.room.seats[i];
      const slot = incomingSlotMap.get(i) ?? buildDefaultSlotConfig(i, 'human');
      const occupiedSocket = prevSeat?.occupiedBySocketId ?? null;

      if (occupiedSocket) {
        const preservedName = sanitizeName(prevSeat?.name, `ผู้เล่น ${i + 1}`);
        nextSlots.push({
          seatIndex: i,
          kind: 'human',
          name: preservedName,
        });
        nextSeats.push({
          seatIndex: i,
          kind: 'human',
          name: preservedName,
          botStyle: 'balanced',
          occupiedBySocketId: occupiedSocket,
          playerId: `player-${i + 1}`,
          ready: prevSeat?.ready ?? false,
          tokenId: i,
          color: PLAYER_COLORS[i % PLAYER_COLORS.length]!,
        });
      } else {
        const kind: 'human' | 'bot' = slot.kind === 'bot' ? 'bot' : 'human';
        const botStyle = normalizeBotStyle(slot.botStyle);
        const defaultName =
          kind === 'bot'
            ? BOT_DEFAULT_NAMES[i % BOT_DEFAULT_NAMES.length]!
            : `ผู้เล่น ${i + 1}`;
        const name = sanitizeName(slot.name, defaultName);

        nextSlots.push({
          seatIndex: i,
          kind,
          name: kind === 'bot' ? name : slot.name,
          botStyle: kind === 'bot' ? botStyle : undefined,
        });
        nextSeats.push({
          seatIndex: i,
          kind,
          name,
          botStyle,
          occupiedBySocketId: null,
          playerId: kind === 'bot' ? `player-${i + 1}` : null,
          ready: kind === 'bot',
          tokenId: i,
          color: PLAYER_COLORS[i % PLAYER_COLORS.length]!,
        });
      }
    }

    managed.room.config = { totalSeats, slots: nextSlots };
    managed.room.seats = nextSeats;
    if (hostMovedToSpectator) {
      managed.room.hostSeatIndex = 0;
    }

    return {
      ok: true,
      room: cloneRoomState(managed.room),
    };
  }

  setReady(params: { socketId: string; roomId: string; ready: boolean }): RoomMutationResult {
    const roomId = normalizeRoomCode(params.roomId);
    const managed = this.rooms.get(roomId);
    if (!managed) {
      return { ok: false, error: 'ไม่พบห้องนี้' };
    }
    if (managed.room.status !== 'LOBBY') {
      return { ok: false, error: 'เกมเริ่มแล้ว' };
    }
    const seatIndex = managed.socketToSeat.get(params.socketId);
    if (seatIndex === undefined) {
      return { ok: false, error: 'คุณไม่ได้นั่งอยู่ในที่นั่งผู้เล่น' };
    }
    const seat = managed.room.seats[seatIndex]!;
    seat.ready = Boolean(params.ready);
    return {
      ok: true,
      room: cloneRoomState(managed.room),
    };
  }

  startGame(params: {
    socketId: string;
    sessionToken?: string;
    roomId: string;
  }): RoomMutationResult {
    const roomId = normalizeRoomCode(params.roomId);
    const managed = this.rooms.get(roomId);
    if (!managed) {
      return { ok: false, error: 'ไม่พบห้องนี้' };
    }
    if (!this.isHost(managed, params.socketId, params.sessionToken)) {
      return { ok: false, error: 'เฉพาะเจ้าบ้านเท่านั้นที่สามารถเริ่มเกมได้' };
    }
    if (managed.room.status !== 'LOBBY') {
      return { ok: false, error: 'เกมได้เริ่มไปแล้ว' };
    }

    const emptyHumanSeat = managed.room.seats.find(
      (s) => s.kind === 'human' && !s.occupiedBySocketId,
    );
    if (emptyHumanSeat) {
      return {
        ok: false,
        error: `ที่นั่ง ${emptyHumanSeat.seatIndex + 1} ยังว่างอยู่ กรุณารอผู้เล่นเข้าร่วม หรือเปลี่ยนเป็นบอทก่อนเริ่มเกม`,
      };
    }

    const finalConfig: RoomConfig = {
      totalSeats: managed.room.config.totalSeats,
      slots: managed.room.seats.map((seat) => ({
        seatIndex: seat.seatIndex,
        kind: seat.kind,
        name: seat.name,
        botStyle: seat.kind === 'bot' ? seat.botStyle : undefined,
      })),
    };

    const gameState = createGameState(roomId, finalConfig, cryptoRng);
    managed.room.config = finalConfig;
    managed.room.status = 'PLAYING';
    managed.room.gameState = gameState;
    managed.consecutiveBotSteps = 0;

    for (const seat of managed.room.seats) {
      const player = gameState.players[seat.seatIndex];
      if (player) {
        seat.playerId = player.id;
        player.connected = seat.kind === 'bot' ? true : Boolean(seat.occupiedBySocketId);
      }
    }

    this.scheduleBotStep(managed);

    return {
      ok: true,
      room: cloneRoomState(managed.room),
      gameState: managed.room.gameState,
    };
  }

  resetLobby(params: {
    socketId: string;
    sessionToken?: string;
    roomId: string;
  }): RoomMutationResult {
    const roomId = normalizeRoomCode(params.roomId);
    const managed = this.rooms.get(roomId);
    if (!managed) {
      return { ok: false, error: 'ไม่พบห้องนี้' };
    }
    if (!this.isHost(managed, params.socketId, params.sessionToken)) {
      return { ok: false, error: 'เฉพาะเจ้าบ้านเท่านั้นที่สามารถรีเซ็ตห้องได้' };
    }
    if (managed.room.status === 'LOBBY') {
      return { ok: true, room: cloneRoomState(managed.room), gameState: null };
    }

    this.clearBotTimer(managed);
    managed.consecutiveBotSteps = 0;
    managed.room.status = 'LOBBY';
    managed.room.gameState = null;

    for (const seat of managed.room.seats) {
      if (seat.kind === 'bot') {
        seat.ready = true;
        seat.playerId = `player-${seat.seatIndex + 1}`;
      } else if (seat.occupiedBySocketId) {
        seat.ready = seat.occupiedBySocketId === managed.hostSocketId;
        seat.playerId = `player-${seat.seatIndex + 1}`;
      } else {
        seat.ready = false;
        seat.playerId = null;
      }
    }

    return {
      ok: true,
      room: cloneRoomState(managed.room),
      gameState: null,
    };
  }

  handleGameAction(params: {
    socketId: string;
    roomId: string;
    action: GameAction;
  }): RoomMutationResult {
    const roomId = normalizeRoomCode(params.roomId);
    const managed = this.rooms.get(roomId);
    if (!managed) {
      return { ok: false, error: 'ไม่พบห้องนี้' };
    }
    if (managed.room.status !== 'PLAYING' || !managed.room.gameState) {
      return { ok: false, error: 'เกมยังไม่เริ่มหรือจบลงแล้ว' };
    }

    const seatIndex = managed.socketToSeat.get(params.socketId);
    if (seatIndex === undefined) {
      return { ok: false, error: 'ผู้ชมไม่สามารถสั่งการในเกมได้' };
    }

    const seat = managed.room.seats[seatIndex]!;
    const playerId = seat.playerId ?? `player-${seatIndex + 1}`;
    if (!params.action || params.action.playerId !== playerId) {
      return { ok: false, error: 'ไม่สามารถสั่งการแทนผู้เล่นอื่นได้' };
    }

    const player = managed.room.gameState.players.find((p) => p.id === playerId);
    if (!player || player.kind !== 'human') {
      return { ok: false, error: 'ไม่พบข้อมูลผู้เล่นของคุณในเกม' };
    }

    const rng = params.action.type === 'ROLL_DICE' ? cryptoDiceRng : cryptoRng;
    const result = applyGameAction(managed.room.gameState, params.action, rng);
    if (!result.ok) {
      return { ok: false, error: result.error ?? 'ไม่สามารถดำเนินการได้' };
    }

    managed.room.gameState = result.state;
    managed.consecutiveBotSteps = 0;
    if (result.state.phase === 'GAME_OVER') {
      managed.room.status = 'FINISHED';
      this.clearBotTimer(managed);
    } else {
      this.scheduleBotStep(managed);
    }

    return {
      ok: true,
      room: cloneRoomState(managed.room),
      gameState: managed.room.gameState,
      entries: result.entries,
    };
  }

  /**
   * Handle reconnect attempt when a client connects with an existing sessionToken
   * and requests state for a room.
   */
  requestStateForSocket(params: {
    socketId: string;
    sessionToken: string;
    roomId: string;
  }): {
    ok: boolean;
    reconnected?: boolean;
    room?: RoomState;
    gameState?: GameState | null;
    error?: string;
  } {
    const roomId = normalizeRoomCode(params.roomId);
    const managed = this.rooms.get(roomId);
    if (!managed) {
      return { ok: false, error: 'ไม่พบห้องนี้' };
    }

    let reconnected = false;
    const tokenSeat = this.findSeatBySessionToken(managed, params.sessionToken);
    if (tokenSeat !== null) {
      const seat = managed.room.seats[tokenSeat]!;
      if (seat.occupiedBySocketId !== params.socketId) {
        this.rebindSeatSocket(managed, tokenSeat, params.socketId, params.sessionToken);
        reconnected = true;
      }
    } else if (managed.hostSessionToken === params.sessionToken) {
      managed.hostSocketId = params.socketId;
      managed.spectatorSockets.add(params.socketId);
      this.socketRoomIndex.set(params.socketId, roomId);
    }

    return {
      ok: true,
      reconnected,
      room: cloneRoomState(managed.room),
      gameState: managed.room.gameState,
    };
  }

  leaveRoom(params: { socketId: string; roomId?: string }): LeaveRoomResult {
    const targetRoomId = params.roomId
      ? normalizeRoomCode(params.roomId)
      : this.socketRoomIndex.get(params.socketId);
    if (!targetRoomId) {
      return { leftRoomId: null, roomDeleted: false };
    }

    const managed = this.rooms.get(targetRoomId);
    this.socketRoomIndex.delete(params.socketId);
    if (!managed) {
      return { leftRoomId: targetRoomId, roomDeleted: false };
    }

    const seatIndex = managed.socketToSeat.get(params.socketId);
    managed.spectatorSockets.delete(params.socketId);

    if (seatIndex === undefined) {
      if (managed.hostSocketId === params.socketId) {
        this.transferHostIfPossible(managed);
      }
      if (this.hasNoConnectedSockets(managed)) {
        this.clearBotTimer(managed);
        this.rooms.delete(targetRoomId);
        return { leftRoomId: targetRoomId, roomDeleted: true };
      }
      return {
        leftRoomId: targetRoomId,
        roomDeleted: false,
        room: cloneRoomState(managed.room),
        gameState: managed.room.gameState,
      };
    }

    if (managed.room.status === 'LOBBY') {
      this.vacateLobbySeat(managed, seatIndex);
      if (managed.hostSocketId === params.socketId) {
        this.transferHostIfPossible(managed);
      }
      if (this.hasNoConnectedSockets(managed)) {
        this.clearBotTimer(managed);
        this.rooms.delete(targetRoomId);
        return { leftRoomId: targetRoomId, roomDeleted: true };
      }
      return {
        leftRoomId: targetRoomId,
        roomDeleted: false,
        room: cloneRoomState(managed.room),
        gameState: null,
      };
    }

    // Active or finished game permanent leave
    const seat = managed.room.seats[seatIndex]!;
    seat.occupiedBySocketId = null;
    managed.socketToSeat.delete(params.socketId);
    managed.seatSessionTokens.delete(seatIndex);
    if (managed.hostSocketId === params.socketId) {
      this.transferHostIfPossible(managed);
    }

    let entries: LedgerEntry[] = [];
    if (managed.room.status === 'PLAYING' && managed.room.gameState) {
      const playerId = seat.playerId ?? `player-${seatIndex + 1}`;
      const player = managed.room.gameState.players.find((p) => p.id === playerId);

      if (player && !player.isBankrupt) {
        // Attempt clean bankruptcy forfeit if currently allowed by engine
        const bankruptAttempt = applyGameAction(managed.room.gameState, {
          type: 'DECLARE_BANKRUPTCY',
          playerId,
        });
        if (bankruptAttempt.ok) {
          managed.room.gameState = bankruptAttempt.state;
          entries = bankruptAttempt.entries;
          if (bankruptAttempt.state.phase === 'GAME_OVER') {
            managed.room.status = 'FINISHED';
            this.clearBotTimer(managed);
          }
        } else {
          // Player left permanently mid-game outside bankruptcy phase -> hand over to AI bot so game never deadlocks
          seat.kind = 'bot';
          seat.botStyle = 'balanced';
          seat.ready = true;
          managed.room.gameState = {
            ...managed.room.gameState,
            players: managed.room.gameState.players.map((p) =>
              p.id === playerId
                ? { ...p, kind: 'bot', botStyle: 'balanced', connected: true }
                : p,
            ),
          };
        }
      } else if (player) {
        managed.room.gameState = {
          ...managed.room.gameState,
          players: managed.room.gameState.players.map((p) =>
            p.id === playerId ? { ...p, connected: false } : p,
          ),
        };
      }
    }

    if (this.hasNoConnectedSockets(managed)) {
      this.clearBotTimer(managed);
      this.rooms.delete(targetRoomId);
      return { leftRoomId: targetRoomId, roomDeleted: true, entries };
    }

    if (managed.room.status === 'PLAYING') {
      this.scheduleBotStep(managed);
    }

    return {
      leftRoomId: targetRoomId,
      roomDeleted: false,
      room: cloneRoomState(managed.room),
      gameState: managed.room.gameState,
      entries,
    };
  }

  handleDisconnect(socketId: string): DisconnectResult | null {
    const roomId = this.socketRoomIndex.get(socketId);
    if (!roomId) return null;
    this.socketRoomIndex.delete(socketId);

    const managed = this.rooms.get(roomId);
    if (!managed) return null;

    managed.spectatorSockets.delete(socketId);
    const seatIndex = managed.socketToSeat.get(socketId);

    if (managed.room.status === 'LOBBY') {
      if (seatIndex !== undefined) {
        this.vacateLobbySeat(managed, seatIndex);
      }
      if (managed.hostSocketId === socketId) {
        this.transferHostIfPossible(managed);
      }
      if (this.hasNoConnectedSockets(managed)) {
        this.clearBotTimer(managed);
        this.rooms.delete(roomId);
        return { roomId, roomDeleted: true };
      }
      return {
        roomId,
        roomDeleted: false,
        room: cloneRoomState(managed.room),
        gameState: null,
      };
    }

    // Active game or finished: reserve seat indefinitely (NO turn timer!) and keep sessionToken intact
    if (seatIndex !== undefined) {
      const seat = managed.room.seats[seatIndex]!;
      seat.occupiedBySocketId = null;
      managed.socketToSeat.delete(socketId);
      if (managed.room.gameState) {
        managed.room.gameState = {
          ...managed.room.gameState,
          players: managed.room.gameState.players.map((p) =>
            p.seatIndex === seatIndex ? { ...p, connected: false } : p,
          ),
        };
      }
    }

    if (managed.hostSocketId === socketId) {
      managed.hostSocketId = null;
    }

    return {
      roomId,
      roomDeleted: false,
      room: cloneRoomState(managed.room),
      gameState: managed.room.gameState,
    };
  }

  private transferHostIfPossible(managed: ManagedRoom): void {
    const nextHuman = managed.room.seats.find(
      (s) => s.kind === 'human' && Boolean(s.occupiedBySocketId),
    );
    if (nextHuman && nextHuman.occupiedBySocketId) {
      managed.hostSocketId = nextHuman.occupiedBySocketId;
      managed.room.hostSeatIndex = nextHuman.seatIndex;
      const token = managed.seatSessionTokens.get(nextHuman.seatIndex);
      if (token) {
        managed.hostSessionToken = token;
      }
      nextHuman.ready = true;
      return;
    }
    const nextSpectator = managed.spectatorSockets.values().next().value as string | undefined;
    managed.hostSocketId = nextSpectator ?? null;
    managed.room.hostSeatIndex = 0;
  }

  private hasNoConnectedSockets(managed: ManagedRoom): boolean {
    return managed.socketToSeat.size === 0 && managed.spectatorSockets.size === 0;
  }

  private findNextBotToAct(state: GameState): string | null {
    if (state.phase === 'LOBBY' || state.phase === 'GAME_OVER') {
      return null;
    }

    // 1. Any non-bankrupt bot with a pending incoming trade offer responds first
    for (const trade of state.pendingTrades) {
      if (trade.status !== 'PENDING') continue;
      const target = state.players.find((p) => p.id === trade.toPlayerId);
      if (target && target.kind === 'bot' && !target.isBankrupt) {
        return target.id;
      }
    }

    // 2. Otherwise check if the current turn player is a bot
    const current = getCurrentPlayer(state);
    if (current && current.kind === 'bot' && !current.isBankrupt) {
      return current.id;
    }

    return null;
  }

  private scheduleBotStep(managed: ManagedRoom): void {
    if (managed.botTimer !== null) return;
    if (managed.room.status !== 'PLAYING' || !managed.room.gameState) return;
    if (managed.consecutiveBotSteps >= MAX_CONSECUTIVE_BOT_STEPS) return;

    const botId = this.findNextBotToAct(managed.room.gameState);
    if (!botId) return;

    const roomId = managed.room.roomId;
    managed.botTimer = setTimeout(() => {
      managed.botTimer = null;
      const currentRoom = this.rooms.get(roomId);
      if (!currentRoom || currentRoom.room.status !== 'PLAYING' || !currentRoom.room.gameState) {
        return;
      }

      const activeBotId = this.findNextBotToAct(currentRoom.room.gameState);
      if (!activeBotId) {
        currentRoom.consecutiveBotSteps = 0;
        return;
      }

      const action = decideNextBotAction(currentRoom.room.gameState, activeBotId, cryptoRng);
      if (!action) {
        currentRoom.consecutiveBotSteps = 0;
        return;
      }

      const prevTurnNumber = currentRoom.room.gameState.turnNumber;
      const rng = action.type === 'ROLL_DICE' ? cryptoDiceRng : cryptoRng;
      const result = applyGameAction(currentRoom.room.gameState, action, rng);
      if (!result.ok) {
        currentRoom.consecutiveBotSteps = 0;
        return;
      }

      currentRoom.room.gameState = result.state;
      if (action.type === 'END_TURN' || result.state.turnNumber !== prevTurnNumber) {
        currentRoom.consecutiveBotSteps = 0;
      } else {
        currentRoom.consecutiveBotSteps += 1;
      }

      if (result.state.phase === 'GAME_OVER') {
        currentRoom.room.status = 'FINISHED';
        currentRoom.consecutiveBotSteps = 0;
      }

      const roomSnapshot = cloneRoomState(currentRoom.room);
      this.onRoomUpdated?.(roomSnapshot, currentRoom.room.gameState);
      this.onGameActionResult?.(roomId, {
        ok: true,
        ledgerEntries: result.entries,
      });

      if (currentRoom.room.status === 'PLAYING') {
        const nextBot = this.findNextBotToAct(currentRoom.room.gameState);
        if (!nextBot) {
          currentRoom.consecutiveBotSteps = 0;
        } else {
          this.scheduleBotStep(currentRoom);
        }
      }
    }, this.botDelayMs);
  }
}
