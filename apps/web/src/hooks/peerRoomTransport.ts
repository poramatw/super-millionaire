import Peer, { util as peerUtil, type DataConnection } from 'peerjs';
import {
  BOT_DEFAULT_NAMES,
  PLAYER_COLORS,
  applyGameAction,
  createGameState,
  decideNextBotAction,
  evaluateTradeOffer,
  getCurrentPlayer,
  type BotStyle,
  type GameAction,
  type LedgerEntry,
  type PlayerSlotConfig,
  type RoomActionAck,
  type RoomConfig,
  type RoomJoinAck,
  type RoomSeat,
  type RoomState,
} from '@super-millionaire/shared';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PEER_PREFIX = 'sm9028-';

const PEER_ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    ...(peerUtil.defaultConfig?.iceServers ?? []),
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)]!;
  }
  return code;
}

function isValidSeatCount(v: unknown): v is 2 | 3 | 4 | 5 | 6 | 7 | 8 {
  return v === 2 || v === 3 || v === 4 || v === 5 || v === 6 || v === 7 || v === 8;
}

function normalizeStyle(style: unknown): BotStyle {
  if (style === 'aggressive' || style === 'balanced' || style === 'cautious') {
    return style;
  }
  return 'balanced';
}

export type PeerClientToHostMsg =
  | {
      type: 'join';
      reqId: string;
      sessionToken: string;
      playerName: string;
      preferredSeatIndex?: number;
      asSpectator?: boolean;
    }
  | {
      type: 'setReady';
      sessionToken: string;
      ready: boolean;
    }
  | {
      type: 'gameAction';
      reqId: string;
      sessionToken: string;
      action: GameAction;
    }
  | {
      type: 'leave';
      sessionToken: string;
    };

export type PeerHostToClientMsg =
  | {
      type: 'ack';
      reqId: string;
      payload: RoomJoinAck & RoomActionAck;
    }
  | {
      type: 'state';
      room: RoomState;
      entries?: LedgerEntry[];
    }
  | {
      type: 'error';
      message: string;
    };

interface HostTransportCallbacks {
  onRoomChange: (room: RoomState, entries?: LedgerEntry[]) => void;
  onError: (message: string) => void;
}

/**
 * Serverless WebRTC P2P Host that runs RoomManager logic + game engine directly in the host's browser,
 * letting players create rooms and invite friends via code/link on static hosts like Vercel.
 */
export class PeerRoomHost {
  private peer: Peer | null = null;
  private room: RoomState;
  private readonly hostSessionToken: string;
  private readonly seatTokens = new Map<number, string>();
  private readonly connections = new Set<DataConnection>();
  private readonly connSession = new WeakMap<DataConnection, string>();
  private readonly connQueues = new WeakMap<DataConnection, PeerHostToClientMsg[]>();
  private readonly callbacks: HostTransportCallbacks;
  private botTimer: number | null = null;
  private destroyed = false;

  private constructor(
    room: RoomState,
    hostSessionToken: string,
    callbacks: HostTransportCallbacks,
  ) {
    this.room = room;
    this.hostSessionToken = hostSessionToken;
    this.callbacks = callbacks;
  }

  static async create(params: {
    sessionToken: string;
    playerName: string;
    config?: Partial<RoomConfig>;
    callbacks: HostTransportCallbacks;
  }): Promise<{ host: PeerRoomHost; ack: RoomJoinAck }> {
    const totalSeats = isValidSeatCount(params.config?.totalSeats) ? params.config.totalSeats : 4;
    const rawSlotMap = new Map<number, PlayerSlotConfig>();
    for (const s of params.config?.slots ?? []) {
      if (s && typeof s.seatIndex === 'number' && s.seatIndex >= 0 && s.seatIndex < totalSeats) {
        rawSlotMap.set(s.seatIndex, s);
      }
    }

    const slots: PlayerSlotConfig[] = [];
    const seats: RoomSeat[] = [];
    for (let i = 0; i < totalSeats; i++) {
      const raw = rawSlotMap.get(i);
      const kind = raw?.kind === 'bot' ? 'bot' : 'human';
      const botStyle = normalizeStyle(raw?.botStyle);
      slots.push({
        seatIndex: i,
        kind,
        name: kind === 'bot' ? raw?.name?.trim() || BOT_DEFAULT_NAMES[i % BOT_DEFAULT_NAMES.length] : undefined,
        botStyle: kind === 'bot' ? botStyle : undefined,
      });
      seats.push({
        seatIndex: i,
        kind,
        name: kind === 'bot' ? raw?.name?.trim() || BOT_DEFAULT_NAMES[i % BOT_DEFAULT_NAMES.length]! : `รอผู้เล่น #${i + 1}`,
        botStyle,
        occupiedBySocketId: null,
        playerId: `player-${i + 1}`,
        ready: kind === 'bot',
        tokenId: i,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length]!,
      });
    }

    const trimmedName = params.playerName.trim().slice(0, 32) || 'เจ้าบ้าน';
    const firstHumanIdx = slots.findIndex((s) => s.kind === 'human');
    const hostSeatIndex = firstHumanIdx >= 0 ? firstHumanIdx : 0;

    // Try up to 3 fresh room codes in case one collides on PeerJS signaling server
    let openedPeer: Peer | null = null;
    let roomId = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = generateRoomCode();
      try {
        openedPeer = await new Promise<Peer>((resolve, reject) => {
          const p = new Peer(`${PEER_PREFIX}${candidate}`, {
            debug: 0,
            config: PEER_ICE_CONFIG,
          });
          const timeout = window.setTimeout(() => {
            p.destroy();
            reject(new Error('หมดเวลาการเชื่อมต่อระบบห้องออนไลน์'));
          }, 8000);
          p.once('open', () => {
            window.clearTimeout(timeout);
            resolve(p);
          });
          p.once('error', (err) => {
            window.clearTimeout(timeout);
            p.destroy();
            reject(err);
          });
        });
        roomId = candidate;
        break;
      } catch (err) {
        if (attempt === 2) {
          return {
            host: null as unknown as PeerRoomHost,
            ack: {
              ok: false,
              error:
                err instanceof Error && err.message.includes('taken')
                  ? 'รหัสห้องซ้ำ กรุณาลองสร้างใหม่อีกครั้ง'
                  : 'ไม่สามารถเชื่อมต่อระบบห้องออนไลน์ P2P ได้ กรุณาลองโหมด AI บอท หรือรันเซิร์ฟเวอร์',
            },
          };
        }
      }
    }

    if (!openedPeer || !roomId) {
      return {
        host: null as unknown as PeerRoomHost,
        ack: { ok: false, error: 'ไม่สามารถเปิดห้องออนไลน์ได้' },
      };
    }

    if (firstHumanIdx >= 0) {
      const seat = seats[firstHumanIdx]!;
      seat.name = trimmedName;
      seat.occupiedBySocketId = `peer-host`;
      seat.ready = true;
    }

    const room: RoomState = {
      roomId,
      hostSeatIndex,
      config: { totalSeats, slots },
      seats,
      status: 'LOBBY',
      gameState: null,
      createdAt: Date.now(),
    };

    const host = new PeerRoomHost(room, params.sessionToken, params.callbacks);
    if (firstHumanIdx >= 0) {
      host.seatTokens.set(firstHumanIdx, params.sessionToken);
    }
    host.attachPeer(openedPeer);
    params.callbacks.onRoomChange(room);

    return {
      host,
      ack: {
        ok: true,
        roomId,
        seatIndex: firstHumanIdx >= 0 ? firstHumanIdx : undefined,
        playerId: firstHumanIdx >= 0 ? `player-${firstHumanIdx + 1}` : undefined,
        isSpectator: firstHumanIdx < 0,
      },
    };
  }

  private sendToConn(conn: DataConnection, msg: PeerHostToClientMsg): void {
    if (conn.open) {
      conn.send(msg);
      return;
    }
    const queue = this.connQueues.get(conn) ?? [];
    queue.push(msg);
    this.connQueues.set(conn, queue);
  }

  private flushConnQueue(conn: DataConnection): void {
    const queue = this.connQueues.get(conn);
    if (!queue || queue.length === 0 || !conn.open) return;
    this.connQueues.delete(conn);
    for (const msg of queue) {
      if (conn.open) {
        conn.send(msg);
      }
    }
  }

  private attachPeer(peer: Peer): void {
    this.peer = peer;
    peer.on('connection', (conn) => {
      if (this.destroyed) {
        conn.close();
        return;
      }
      this.connections.add(conn);
      conn.on('open', () => {
        this.flushConnQueue(conn);
      });
      conn.on('data', (raw) => {
        if (!raw || typeof raw !== 'object') return;
        this.handleIncomingMessage(conn, raw as PeerClientToHostMsg);
      });
      conn.on('close', () => {
        this.connections.delete(conn);
        this.connQueues.delete(conn);
        const token = this.connSession.get(conn);
        this.connSession.delete(conn);
        if (token && token !== this.hostSessionToken) {
          const hasOtherConn = [...this.connections].some(
            (other) => other.open && this.connSession.get(other) === token,
          );
          if (!hasOtherConn) {
            this.markConnectionState(token, false);
          }
        }
      });
    });

    peer.on('disconnected', () => {
      if (!this.destroyed && !peer.destroyed) {
        try {
          peer.reconnect();
        } catch {
          // Ignore transient signaling reconnect errors
        }
      }
    });

    peer.on('error', (err) => {
      if (!this.destroyed) {
        this.callbacks.onError(`การเชื่อมต่อ P2P ขัดข้อง: ${err.message}`);
      }
    });
  }

  private markConnectionState(sessionToken: string, connected: boolean): void {
    if (sessionToken === this.hostSessionToken && !connected) return;
    let changed = false;
    const nextSeats = this.room.seats.map((s, idx) => {
      if (this.seatTokens.get(idx) !== sessionToken) return s;
      changed = true;
      return {
        ...s,
        occupiedBySocketId: connected ? `peer-${sessionToken.slice(0, 8)}` : null,
      };
    });

    let nextGame = this.room.gameState;
    if (nextGame) {
      nextGame = {
        ...nextGame,
        players: nextGame.players.map((p) =>
          this.seatTokens.get(p.seatIndex) === sessionToken ? { ...p, connected } : p,
        ),
      };
    }

    if (changed) {
      this.room = { ...this.room, seats: nextSeats, gameState: nextGame };
      this.broadcastState();
    }
  }

  private broadcastState(entries?: LedgerEntry[]): void {
    // Always publish a fresh shallow copy so React useState re-renders immediately on every update
    const snapshot: RoomState = {
      ...this.room,
      seats: this.room.seats.map((s) => ({ ...s })),
    };
    this.room = snapshot;
    this.callbacks.onRoomChange(snapshot, entries);
    const msg: PeerHostToClientMsg = { type: 'state', room: snapshot, entries };
    for (const conn of this.connections) {
      if (conn.open) {
        conn.send(msg);
      }
    }
  }

  private handleIncomingMessage(conn: DataConnection, msg: PeerClientToHostMsg): void {
    switch (msg.type) {
      case 'join': {
        this.connSession.set(conn, msg.sessionToken);
        const ack = this.handleJoin(msg);
        this.sendToConn(conn, {
          type: 'ack',
          reqId: msg.reqId,
          payload: ack,
        } satisfies PeerHostToClientMsg);
        if (ack.ok) {
          this.sendToConn(conn, {
            type: 'state',
            room: this.room,
          } satisfies PeerHostToClientMsg);
        }
        break;
      }
      case 'setReady': {
        this.handleSetReady(msg.sessionToken, msg.ready);
        break;
      }
      case 'gameAction': {
        const ack = this.handleGameAction(msg.sessionToken, msg.action);
        this.sendToConn(conn, {
          type: 'ack',
          reqId: msg.reqId,
          payload: ack,
        } satisfies PeerHostToClientMsg);
        break;
      }
      case 'leave': {
        this.handleRemoteLeave(msg.sessionToken);
        break;
      }
    }
  }

  handleJoin(params: {
    sessionToken: string;
    playerName: string;
    preferredSeatIndex?: number;
    asSpectator?: boolean;
  }): RoomJoinAck {
    const cleanName = params.playerName.trim().slice(0, 32) || 'ผู้เล่น';
    // Guard against PeerJS/structured-clone coercing missing optional keys into null
    const hasPreferredSeat =
      typeof params.preferredSeatIndex === 'number' &&
      Number.isInteger(params.preferredSeatIndex);

    // Reconnect by token
    for (let i = 0; i < this.room.seats.length; i++) {
      if (this.seatTokens.get(i) === params.sessionToken) {
        if (this.room.status === 'LOBBY' && hasPreferredSeat && params.preferredSeatIndex !== i) {
          break; // switching seat in lobby
        }
        const socketId =
          params.sessionToken === this.hostSessionToken
            ? 'peer-host'
            : `peer-${params.sessionToken.slice(0, 8)}`;
        this.room = {
          ...this.room,
          seats: this.room.seats.map((s, idx) =>
            idx === i
              ? { ...s, occupiedBySocketId: socketId, name: cleanName || s.name }
              : s,
          ),
          gameState: this.room.gameState
            ? {
                ...this.room.gameState,
                players: this.room.gameState.players.map((p) =>
                  p.seatIndex === i ? { ...p, connected: true } : p,
                ),
              }
            : null,
        };
        this.broadcastState();
        return {
          ok: true,
          roomId: this.room.roomId,
          seatIndex: i,
          playerId: `player-${i + 1}`,
          isSpectator: false,
        };
      }
    }

    if (params.asSpectator) {
      return {
        ok: true,
        roomId: this.room.roomId,
        isSpectator: true,
      };
    }

    if (this.room.status !== 'LOBBY') {
      return { ok: true, roomId: this.room.roomId, isSpectator: true };
    }

    let targetIndex = -1;
    if (hasPreferredSeat) {
      const target = this.room.seats[params.preferredSeatIndex!];
      if (!target || target.kind !== 'human') {
        return { ok: false, error: 'ที่นั่งนี้ไม่ใช่ช่องผู้เล่นจริง' };
      }
      const heldBy = this.seatTokens.get(target.seatIndex);
      if (target.occupiedBySocketId && heldBy !== params.sessionToken) {
        return { ok: false, error: 'ที่นั่งนี้มีผู้เล่นอื่นนั่งแล้ว' };
      }
      targetIndex = target.seatIndex;
    } else {
      const open = this.room.seats.find((s) => s.kind === 'human' && !s.occupiedBySocketId);
      if (!open) {
        return { ok: true, roomId: this.room.roomId, isSpectator: true };
      }
      targetIndex = open.seatIndex;
    }

    // Clear previous seat if switching inside lobby
    const clearedIndices = new Set<number>();
    for (let i = 0; i < this.room.seats.length; i++) {
      if (this.seatTokens.get(i) === params.sessionToken) {
        this.seatTokens.delete(i);
        clearedIndices.add(i);
      }
    }

    this.seatTokens.set(targetIndex, params.sessionToken);
    const assignedSocketId =
      params.sessionToken === this.hostSessionToken
        ? 'peer-host'
        : `peer-${params.sessionToken.slice(0, 8)}`;

    this.room = {
      ...this.room,
      seats: this.room.seats.map((s, idx) => {
        if (idx === targetIndex) {
          return {
            ...s,
            occupiedBySocketId: assignedSocketId,
            name: cleanName,
            ready: idx === this.room.hostSeatIndex,
          };
        }
        if (clearedIndices.has(idx)) {
          return {
            ...s,
            occupiedBySocketId: null,
            name: `รอผู้เล่น #${idx + 1}`,
            ready: false,
          };
        }
        return s;
      }),
    };

    this.broadcastState();
    return {
      ok: true,
      roomId: this.room.roomId,
      seatIndex: targetIndex,
      playerId: `player-${targetIndex + 1}`,
      isSpectator: false,
    };
  }

  handleSetReady(sessionToken: string, ready: boolean): void {
    if (this.room.status !== 'LOBBY') return;
    let changed = false;
    const seats = this.room.seats.map((s, idx) => {
      if (this.seatTokens.get(idx) === sessionToken && s.kind === 'human') {
        changed = true;
        return { ...s, ready };
      }
      return s;
    });
    if (changed) {
      this.room = { ...this.room, seats };
      this.broadcastState();
    }
  }

  updateConfig(config: RoomConfig): RoomActionAck {
    if (this.room.status !== 'LOBBY') {
      return { ok: false, error: 'ไม่สามารถปรับห้องระหว่างเล่นได้' };
    }
    const totalSeats = config.totalSeats;
    const prevBySeat = new Map(this.room.seats.map((s) => [s.seatIndex, s]));
    const nextSlots: PlayerSlotConfig[] = [];
    const nextSeats: RoomSeat[] = [];

    for (let i = 0; i < totalSeats; i++) {
      const slot = config.slots.find((s) => s.seatIndex === i);
      const prev = prevBySeat.get(i);
      const kind = slot?.kind ?? (i === 0 ? 'human' : 'bot');
      const botStyle = normalizeStyle(slot?.botStyle);
      const defaultBotName = BOT_DEFAULT_NAMES[i % BOT_DEFAULT_NAMES.length]!;
      const slotName =
        kind === 'bot'
          ? slot?.name?.trim() || defaultBotName
          : prev?.kind === 'human' && prev.occupiedBySocketId
            ? prev.name
            : `รอผู้เล่น #${i + 1}`;

      nextSlots.push({
        seatIndex: i,
        kind,
        name: kind === 'bot' ? slotName : undefined,
        botStyle: kind === 'bot' ? botStyle : undefined,
      });

      const keepOccupied = kind === 'human' && prev?.kind === 'human' ? prev.occupiedBySocketId : null;
      if (!keepOccupied) {
        this.seatTokens.delete(i);
      }

      nextSeats.push({
        seatIndex: i,
        kind,
        name: slotName,
        botStyle,
        occupiedBySocketId: keepOccupied,
        playerId: `player-${i + 1}`,
        ready: kind === 'bot' ? true : Boolean(keepOccupied && i === this.room.hostSeatIndex ? true : prev?.ready),
        tokenId: i,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length]!,
      });
    }

    // Drop tokens for removed seats
    for (const key of [...this.seatTokens.keys()]) {
      if (key >= totalSeats) {
        this.seatTokens.delete(key);
      }
    }

    this.room = {
      ...this.room,
      config: { totalSeats, slots: nextSlots },
      seats: nextSeats,
    };
    this.broadcastState();
    return { ok: true };
  }

  startGame(): RoomActionAck {
    if (this.room.status !== 'LOBBY') {
      return { ok: false, error: 'เกมเริ่มไปแล้ว' };
    }
    const occupiedHumans = this.room.seats.filter((s) => s.kind === 'human' && s.occupiedBySocketId);
    const allBots = this.room.seats.every((s) => s.kind === 'bot');
    if (!allBots && occupiedHumans.length === 0) {
      return { ok: false, error: 'ต้องมีผู้เล่นจริงอย่างน้อย 1 คน หรือสลับเป็นโหมดบอทล้วน' };
    }
    if (!allBots && occupiedHumans.some((s) => !s.ready && s.seatIndex !== this.room.hostSeatIndex)) {
      return { ok: false, error: 'ยังมีผู้เล่นในห้องที่ยังไม่ได้กดพร้อม' };
    }

    // Build final seats: unoccupied human slots automatically become bots so game never hangs
    const finalSlots: PlayerSlotConfig[] = this.room.seats.map((s) => {
      if (s.kind === 'human' && !s.occupiedBySocketId) {
        return {
          seatIndex: s.seatIndex,
          kind: 'bot',
          name: BOT_DEFAULT_NAMES[s.seatIndex % BOT_DEFAULT_NAMES.length],
          botStyle: 'balanced',
        };
      }
      return {
        seatIndex: s.seatIndex,
        kind: s.kind,
        name: s.kind === 'human' ? s.name : this.room.config.slots[s.seatIndex]?.name,
        botStyle: s.botStyle,
      };
    });

    const gs = createGameState(this.room.roomId, {
      totalSeats: this.room.config.totalSeats,
      slots: finalSlots,
    });

    this.room = {
      ...this.room,
      status: 'PLAYING',
      gameState: gs,
    };
    this.broadcastState();
    this.scheduleBotIfNeeded();
    return { ok: true };
  }

  handleGameAction(sessionToken: string, action: GameAction): RoomActionAck {
    if (!this.room.gameState) {
      return { ok: false, error: 'เกมยังไม่เริ่ม' };
    }
    const actorSeatIdx = this.room.gameState.players.findIndex((p) => p.id === action.playerId);
    if (actorSeatIdx < 0) {
      return { ok: false, error: 'ไม่พบผู้เล่น' };
    }
    const ownerToken = this.seatTokens.get(actorSeatIdx);
    if (ownerToken !== sessionToken) {
      return { ok: false, error: 'คุณไม่มีสิทธิ์สั่งการในนามผู้เล่นนี้' };
    }

    const res = applyGameAction(this.room.gameState, action);
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    this.room = {
      ...this.room,
      status: res.state.phase === 'GAME_OVER' ? 'FINISHED' : 'PLAYING',
      gameState: res.state,
    };
    this.broadcastState(res.entries);
    this.scheduleBotIfNeeded();
    return { ok: true };
  }

  private handleRemoteLeave(sessionToken: string): void {
    if (this.room.status === 'LOBBY') {
      const removed = new Set<number>();
      for (let i = 0; i < this.room.seats.length; i++) {
        if (this.seatTokens.get(i) === sessionToken) {
          this.seatTokens.delete(i);
          removed.add(i);
        }
      }
      if (removed.size > 0) {
        this.room = {
          ...this.room,
          seats: this.room.seats.map((s, idx) =>
            removed.has(idx)
              ? { ...s, occupiedBySocketId: null, name: `รอผู้เล่น #${idx + 1}`, ready: false }
              : s,
          ),
        };
        this.broadcastState();
      }
    } else if (this.room.gameState) {
      for (const [seatIdx, token] of this.seatTokens.entries()) {
        if (token === sessionToken && this.room.gameState) {
          const pid = `player-${seatIdx + 1}`;
          const res = applyGameAction(this.room.gameState, { type: 'DECLARE_BANKRUPTCY', playerId: pid });
          if (res.ok) {
            this.room = {
              ...this.room,
              status: res.state.phase === 'GAME_OVER' ? 'FINISHED' : 'PLAYING',
              gameState: res.state,
            };
            this.broadcastState(res.entries);
            this.scheduleBotIfNeeded();
          }
        }
      }
    }
  }

  resetLobby(): RoomActionAck {
    if (this.botTimer !== null) {
      window.clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    const resetSeats = this.room.seats.map((s) => ({
      ...s,
      ready: s.kind === 'bot' || s.seatIndex === this.room.hostSeatIndex,
    }));
    this.room = {
      ...this.room,
      seats: resetSeats,
      status: 'LOBBY',
      gameState: null,
    };
    this.broadcastState();
    return { ok: true };
  }

  private scheduleBotIfNeeded(): void {
    if (this.botTimer !== null) {
      window.clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    const gs = this.room.gameState;
    if (this.destroyed || !gs || gs.phase === 'LOBBY' || gs.phase === 'GAME_OVER') {
      return;
    }

    const pendingBotTrade = gs.pendingTrades.find((t) => {
      if (t.status !== 'PENDING') return false;
      const recipient = gs.players.find((p) => p.id === t.toPlayerId);
      return Boolean(recipient && recipient.kind === 'bot' && !recipient.isBankrupt);
    });

    if (pendingBotTrade) {
      this.botTimer = window.setTimeout(() => {
        if (this.destroyed || !this.room.gameState) return;
        const accept = evaluateTradeOffer(
          this.room.gameState,
          pendingBotTrade.toPlayerId,
          pendingBotTrade,
        );
        const res = applyGameAction(this.room.gameState, {
          type: 'RESPOND_TRADE_OFFER',
          playerId: pendingBotTrade.toPlayerId,
          tradeId: pendingBotTrade.id,
          accept,
        });
        if (res.ok) {
          this.room = {
            ...this.room,
            status: res.state.phase === 'GAME_OVER' ? 'FINISHED' : 'PLAYING',
            gameState: res.state,
          };
          this.broadcastState(res.entries);
          this.scheduleBotIfNeeded();
        }
      }, 750);
      return;
    }

    const current = getCurrentPlayer(gs);
    if (current.kind !== 'bot' || current.isBankrupt) return;

    const action = decideNextBotAction(gs, current.id);
    if (!action) return;

    const delayMs = action.type === 'ROLL_DICE' ? 850 : 750;
    this.botTimer = window.setTimeout(() => {
      if (this.destroyed || !this.room.gameState) return;
      const curr = getCurrentPlayer(this.room.gameState);
      if (curr.id !== current.id) return;
      const nextAction = decideNextBotAction(this.room.gameState, curr.id);
      if (!nextAction) return;
      const res = applyGameAction(this.room.gameState, nextAction);
      if (res.ok) {
        this.room = {
          ...this.room,
          status: res.state.phase === 'GAME_OVER' ? 'FINISHED' : 'PLAYING',
          gameState: res.state,
        };
        this.broadcastState(res.entries);
        this.scheduleBotIfNeeded();
      }
    }, delayMs);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.botTimer !== null) {
      window.clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    for (const conn of this.connections) {
      conn.close();
    }
    this.connections.clear();
    this.peer?.destroy();
    this.peer = null;
  }
}

interface GuestCallbacks {
  onState: (room: RoomState, entries?: LedgerEntry[]) => void;
  onError: (message: string) => void;
  onDisconnect?: (reason: string) => void;
}

/**
 * WebRTC Guest client connecting directly to a PeerRoomHost by 6-char room code.
 */
export class PeerRoomClient {
  private peer: Peer;
  private conn: DataConnection;
  private readonly sessionToken: string;
  private readonly pending = new Map<string, (ack: RoomJoinAck & RoomActionAck) => void>();
  private reqSeq = 0;
  private destroyed = false;

  private constructor(peer: Peer, conn: DataConnection, sessionToken: string, callbacks: GuestCallbacks) {
    this.peer = peer;
    this.conn = conn;
    this.sessionToken = sessionToken;

    conn.on('data', (raw) => {
      if (!raw || typeof raw !== 'object') return;
      const msg = raw as PeerHostToClientMsg;
      if (msg.type === 'ack') {
        const cb = this.pending.get(msg.reqId);
        if (cb) {
          this.pending.delete(msg.reqId);
          cb(msg.payload);
        }
      } else if (msg.type === 'state') {
        callbacks.onState(msg.room, msg.entries);
      } else if (msg.type === 'error') {
        callbacks.onError(msg.message);
      }
    });

    conn.on('close', () => {
      if (this.destroyed) return;
      const msg = 'เจ้าบ้านปิดห้องหรือการเชื่อมต่อขาดหาย';
      if (callbacks.onDisconnect) {
        callbacks.onDisconnect(msg);
      } else {
        callbacks.onError(msg);
      }
    });
  }

  static async connect(params: {
    roomId: string;
    sessionToken: string;
    playerName: string;
    preferredSeatIndex?: number;
    asSpectator?: boolean;
    callbacks: GuestCallbacks;
  }): Promise<{ client?: PeerRoomClient; ack: RoomJoinAck }> {
    const normalized = params.roomId.trim().toUpperCase();
    try {
      const peer = await new Promise<Peer>((resolve, reject) => {
        const p = new Peer({ debug: 0, config: PEER_ICE_CONFIG });
        const timeout = window.setTimeout(() => {
          p.destroy();
          reject(new Error('หมดเวลาเชื่อมต่อสัญญาณห้อง P2P'));
        }, 12000);
        p.once('open', () => {
          window.clearTimeout(timeout);
          resolve(p);
        });
        p.once('error', (err) => {
          window.clearTimeout(timeout);
          p.destroy();
          reject(err);
        });
      });

      const conn = await new Promise<DataConnection>((resolve, reject) => {
        // Use JSON serialization so optional undefined fields (e.g. preferredSeatIndex) stay omitted rather than coerced to null
        const c = peer.connect(`${PEER_PREFIX}${normalized}`, {
          reliable: true,
          serialization: 'json',
        });
        const timeout = window.setTimeout(() => {
          c.close();
          peer.destroy();
          reject(new Error(`ไม่พบห้อง ${normalized} หรือเจ้าบ้านปิดห้องแล้ว`));
        }, 12000);
        c.once('open', () => {
          window.clearTimeout(timeout);
          resolve(c);
        });
        c.once('error', (err) => {
          window.clearTimeout(timeout);
          peer.destroy();
          reject(err);
        });
      });

      const client = new PeerRoomClient(peer, conn, params.sessionToken, params.callbacks);
      const ack = await client.sendJoin({
        playerName: params.playerName,
        preferredSeatIndex: params.preferredSeatIndex,
        asSpectator: params.asSpectator,
      });
      if (!ack.ok) {
        client.destroy();
        return { ack };
      }
      return { client, ack };
    } catch (err) {
      return {
        ack: {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : `ไม่พบห้อง ${normalized} หรือไม่สามารถเชื่อมต่อกับเจ้าบ้านได้`,
        },
      };
    }
  }

  private nextReqId(): string {
    this.reqSeq += 1;
    return `r-${this.reqSeq}`;
  }

  sendJoin(params: {
    playerName: string;
    preferredSeatIndex?: number;
    asSpectator?: boolean;
  }): Promise<RoomJoinAck> {
    const reqId = this.nextReqId();
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(reqId);
        resolve({ ok: false, error: 'คำขอเข้าร่วมห้องหมดเวลา' });
      }, 8000);
      this.pending.set(reqId, (ack) => {
        window.clearTimeout(timer);
        resolve(ack);
      });
      const payload: PeerClientToHostMsg = {
        type: 'join',
        reqId,
        sessionToken: this.sessionToken,
        playerName: params.playerName,
        ...(typeof params.preferredSeatIndex === 'number'
          ? { preferredSeatIndex: params.preferredSeatIndex }
          : {}),
        ...(params.asSpectator ? { asSpectator: true } : {}),
      };
      this.conn.send(payload);
    });
  }

  setReady(ready: boolean): void {
    if (this.conn.open) {
      this.conn.send({
        type: 'setReady',
        sessionToken: this.sessionToken,
        ready,
      } satisfies PeerClientToHostMsg);
    }
  }

  sendAction(action: GameAction): Promise<RoomActionAck> {
    const reqId = this.nextReqId();
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(reqId);
        resolve({ ok: false, error: 'การส่งคำสั่งไปยังเจ้าบ้านหมดเวลา' });
      }, 8000);
      this.pending.set(reqId, (ack) => {
        window.clearTimeout(timer);
        resolve(ack);
      });
      this.conn.send({
        type: 'gameAction',
        reqId,
        sessionToken: this.sessionToken,
        action,
      } satisfies PeerClientToHostMsg);
    });
  }

  leave(): void {
    if (this.conn.open) {
      this.conn.send({
        type: 'leave',
        sessionToken: this.sessionToken,
      } satisfies PeerClientToHostMsg);
    }
    this.destroy();
  }

  destroy(): void {
    this.destroyed = true;
    this.pending.clear();
    this.conn.close();
    this.peer.destroy();
  }
}
