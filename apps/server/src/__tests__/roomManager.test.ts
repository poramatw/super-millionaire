import { afterEach, describe, expect, it } from 'vitest';
import { io as createClient, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  GameState,
  RoomJoinAck,
  RoomState,
  ServerToClientEvents,
} from '@super-millionaire/shared';
import { createAppServer, type AppServerInstance } from '../index.js';
import { RoomManager } from '../roomManager.js';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function connectSocket(port: number, sessionToken?: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client: ClientSocket = createClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      auth: sessionToken ? { sessionToken } : undefined,
    });
    client.once('connect', () => resolve(client));
    client.once('connect_error', (err) => reject(err));
  });
}

function waitForEvent<T>(
  socket: ClientSocket,
  event: keyof ServerToClientEvents,
  predicate: (data: T) => boolean = () => true,
  timeoutMs = 4000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler as never);
      reject(new Error(`Timed out waiting for event "${String(event)}"`));
    }, timeoutMs);

    const handler = (data: T) => {
      if (predicate(data)) {
        clearTimeout(timer);
        socket.off(event, handler as never);
        resolve(data);
      }
    };

    socket.on(event, handler as never);
  });
}

function trackLatestGameState(socket: ClientSocket): {
  getLatest: () => GameState | null;
  waitUntil: (predicate: (g: GameState) => boolean, timeoutMs?: number) => Promise<GameState>;
  dispose: () => void;
} {
  let latest: GameState | null = null;
  const waiters: Array<{
    predicate: (g: GameState) => boolean;
    resolve: (g: GameState) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];

  const handler = (g: GameState) => {
    latest = g;
    for (let i = waiters.length - 1; i >= 0; i--) {
      const w = waiters[i]!;
      if (w.predicate(g)) {
        clearTimeout(w.timer);
        waiters.splice(i, 1);
        w.resolve(g);
      }
    }
  };

  socket.on('game:state', handler);

  return {
    getLatest: () => latest,
    waitUntil: (predicate, timeoutMs = 4000) => {
      if (latest && predicate(latest)) {
        return Promise.resolve(latest);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = waiters.findIndex((w) => w.timer === timer);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(new Error('Timed out waiting for tracked GameState predicate'));
        }, timeoutMs);
        waiters.push({ predicate, resolve, timer });
      });
    },
    dispose: () => {
      for (const w of waiters) clearTimeout(w.timer);
      waiters.length = 0;
      socket.off('game:state', handler);
    },
  };
}

async function driveTurnOrderOverSockets(
  roomId: string,
  tracker: ReturnType<typeof trackLatestGameState>,
  humanSockets: Record<string, ClientSocket>,
): Promise<GameState> {
  let state = await tracker.waitUntil((g) => g.phase === 'TURN_ORDER_ROLL' || g.phase === 'AWAIT_ROLL');
  for (let guard = 0; state.phase === 'TURN_ORDER_ROLL' && guard < 40; guard++) {
    const prevLedgerLen = state.banker.ledger.length;
    const roller = state.players[state.currentTurnIndex]!;
    const sock = humanSockets[roller.id];
    const nextPromise = tracker.waitUntil((g) => g.banker.ledger.length > prevLedgerLen);
    if (sock) {
      await new Promise((resolve) =>
        sock.emit(
          'game:action',
          { roomId, action: { type: 'ROLL_DICE', playerId: roller.id } },
          resolve,
        ),
      );
    }
    state = await nextPromise;
  }
  return state;
}

describe('RoomManager & Socket.IO multiplayer server', () => {
  const cleanups: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      const fn = cleanups.pop()!;
      await fn();
    }
  });

  async function startTestServer(botDelayMs = 15): Promise<{
    server: AppServerInstance;
    port: number;
  }> {
    const server = createAppServer({ botDelayMs });
    await new Promise<void>((resolve) => {
      server.httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.httpServer.address();
    if (!addr || typeof addr === 'string') {
      throw new Error('Unexpected server address');
    }
    cleanups.push(async () => {
      server.roomManager.destroyAll();
      await new Promise<void>((resolve) => server.io.close(() => resolve()));
    });
    return { server, port: addr.port };
  }

  it('serves /health with active room count and creates 6-char uppercase room codes', async () => {
    const { port } = await startTestServer();
    const res1 = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res1.status).toBe(200);
    const body1 = (await res1.json()) as { status: string; service: string; activeRooms: number };
    expect(body1).toEqual({
      status: 'ok',
      service: '@super-millionaire/shared',
      activeRooms: 0,
    });

    const host = await connectSocket(port, 'tok-host-1');
    cleanups.push(() => {
      host.disconnect();
    });

    const ack = await new Promise<RoomJoinAck>((resolve) => {
      host.emit('room:create', { playerName: 'คุณก้อง', config: { totalSeats: 4 } }, resolve);
    });
    expect(ack.ok).toBe(true);
    expect(ack.roomId).toMatch(/^[A-Z0-9]{6}$/);
    expect(ack.seatIndex).toBe(0);
    expect(ack.playerId).toBe('player-1');

    const res2 = await fetch(`http://127.0.0.1:${port}/health`);
    const body2 = (await res2.json()) as { activeRooms: number };
    expect(body2.activeRooms).toBe(1);
  });

  it('supports 6-seat mixed human+bot lobby config, seat switching, ready state, and no human turn timer', async () => {
    const { port } = await startTestServer(15);
    const host = await connectSocket(port, 'tok-host');
    const guest = await connectSocket(port, 'tok-guest');
    cleanups.push(() => {
      host.disconnect();
      guest.disconnect();
    });

    const createAck = await new Promise<RoomJoinAck>((resolve) => {
      host.emit('room:create', { playerName: 'เจ้าสัวเอ', config: { totalSeats: 4 } }, resolve);
    });
    const roomId = createAck.roomId!;

    // Host configures 6 seats: seat 0 human (host), seat 1 human (open), seats 2..5 bots
    const configAck = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      host.emit(
        'room:updateConfig',
        {
          roomId,
          config: {
            totalSeats: 6,
            slots: [
              { seatIndex: 0, kind: 'human' },
              { seatIndex: 1, kind: 'human' },
              { seatIndex: 2, kind: 'bot', name: 'บอทสายลุย', botStyle: 'aggressive' },
              { seatIndex: 3, kind: 'bot', name: 'บอทสมดุล', botStyle: 'balanced' },
              { seatIndex: 4, kind: 'bot', name: 'บอทระวังตัว', botStyle: 'cautious' },
              { seatIndex: 5, kind: 'bot', name: 'มาดามเอไอ', botStyle: 'balanced' },
            ],
          },
        },
        resolve,
      );
    });
    expect(configAck.ok).toBe(true);

    // Cannot start while human seat 1 is unoccupied
    const prematureStart = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      host.emit('room:startGame', { roomId }, resolve);
    });
    expect(prematureStart.ok).toBe(false);
    expect(prematureStart.error).toContain('ที่นั่ง 2');

    // Guest joins and picks seat 1
    const joinAck = await new Promise<RoomJoinAck>((resolve) => {
      guest.emit('room:join', { roomId, playerName: 'คุณบี', preferredSeatIndex: 1 }, resolve);
    });
    expect(joinAck.ok).toBe(true);
    expect(joinAck.seatIndex).toBe(1);
    expect(joinAck.playerId).toBe('player-2');

    // Non-host cannot updateConfig
    const guestConfigAttempt = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      guest.emit(
        'room:updateConfig',
        { roomId, config: { totalSeats: 2, slots: [] } },
        resolve,
      );
    });
    expect(guestConfigAttempt.ok).toBe(false);

    // Guest marks ready
    const readyRoomPromise = waitForEvent<RoomState>(
      host,
      'room:state',
      (r) => r.seats[1]?.ready === true,
    );
    guest.emit('room:setReady', { roomId, ready: true });
    const readyRoom = await readyRoomPromise;
    expect(readyRoom.seats).toHaveLength(6);
    expect(readyRoom.seats[1]?.ready).toBe(true);

    // Host starts game -> enters TURN_ORDER_ROLL first, then resolves highest roller into AWAIT_ROLL
    const tracker = trackLatestGameState(guest);
    cleanups.push(() => tracker.dispose());

    const startAck = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      host.emit('room:startGame', { roomId }, resolve);
    });
    expect(startAck.ok).toBe(true);

    const startedInTurnOrder = await tracker.waitUntil((g) => g.phase === 'TURN_ORDER_ROLL');
    expect(startedInTurnOrder.players).toHaveLength(6);
    expect(startedInTurnOrder.players[0]?.kind).toBe('human');
    expect(startedInTurnOrder.players[1]?.kind).toBe('human');
    expect(startedInTurnOrder.players[2]?.kind).toBe('bot');

    // Spoofing another player's roll fails even during TURN_ORDER_ROLL
    const spoofOrderAck = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      guest.emit(
        'game:action',
        { roomId, action: { type: 'ROLL_DICE', playerId: 'player-1' } },
        resolve,
      );
    });
    expect(spoofOrderAck.ok).toBe(false);

    // Complete turn-order rolls for humans and bots (including any tie-breakers)
    const afterTurnOrder = await driveTurnOrderOverSockets(roomId, tracker, {
      'player-1': host,
      'player-2': guest,
    });
    expect(afterTurnOrder.phase).toBe('AWAIT_ROLL');
    expect(afterTurnOrder.turnOrder?.winnerId).toBe(
      afterTurnOrder.players[afterTurnOrder.currentTurnIndex]?.id,
    );

    // Wait until it is player-1's turn in AWAIT_ROLL (bots auto-play if a bot won Turn 1)
    let current = await tracker.waitUntil(
      (g) => g.phase === 'AWAIT_ROLL' && g.players[g.currentTurnIndex]?.id === 'player-1',
    );

    // Host rolls dice with server CSPRNG; no turn timer skips their turn
    const rollPromise = tracker.waitUntil((g) => g.hasRolledThisTurn === true);
    const rollAck = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      host.emit(
        'game:action',
        { roomId, action: { type: 'ROLL_DICE', playerId: 'player-1' } },
        resolve,
      );
    });
    expect(rollAck.ok).toBe(true);
    current = await rollPromise;
    expect(current.lastDice?.die1).toBeGreaterThanOrEqual(1);
    expect(current.lastDice?.die1).toBeLessThanOrEqual(6);
    expect(current.lastDice?.die2).toBeGreaterThanOrEqual(1);
    expect(current.lastDice?.die2).toBeLessThanOrEqual(6);

    // Verify human turn does NOT auto-timeout
    await new Promise((r) => setTimeout(r, 120));
    expect(current.players[current.currentTurnIndex]?.id).toBe('player-1');

    // Finish host's turn (handle doubles/decision/debt safely if rolled)
    let safety = 0;
    while (
      current.phase !== 'GAME_OVER' &&
      current.players[current.currentTurnIndex]?.id === 'player-1' &&
      safety < 10
    ) {
      safety++;
      const prevLen = current.banker.ledger.length;
      const nextPromise = tracker.waitUntil(
        (g) =>
          g.banker.ledger.length > prevLen ||
          g.players[g.currentTurnIndex]?.id !== 'player-1' ||
          g.phase === 'GAME_OVER',
      );
      if (current.phase === 'AWAIT_ROLL') {
        await new Promise((resolve) =>
          host.emit('game:action', { roomId, action: { type: 'ROLL_DICE', playerId: 'player-1' } }, resolve),
        );
      } else if (current.phase === 'AWAIT_DECISION') {
        await new Promise((resolve) =>
          host.emit('game:action', { roomId, action: { type: 'DECLINE_CURRENT_TILE', playerId: 'player-1' } }, resolve),
        );
      } else if (current.phase === 'AWAIT_DEBT_RESOLUTION') {
        await new Promise((resolve) =>
          host.emit('game:action', { roomId, action: { type: 'DECLARE_BANKRUPTCY', playerId: 'player-1' } }, resolve),
        );
      } else if (current.phase === 'ACTION_PHASE') {
        if (current.lastDice?.isDoubles && !current.players[0]?.inJail && current.doublesCount < 3) {
          await new Promise((resolve) =>
            host.emit('game:action', { roomId, action: { type: 'ROLL_DICE', playerId: 'player-1' } }, resolve),
          );
        } else {
          await new Promise((resolve) =>
            host.emit('game:action', { roomId, action: { type: 'END_TURN', playerId: 'player-1' } }, resolve),
          );
        }
      }
      current = await nextPromise;
    }

    // Turn should now pass clockwise to player-2 (guest)
    expect(current.players[current.currentTurnIndex]?.id).toBe('player-2');
  });

  it('preserves seat on disconnect and seamlessly reconnects via sessionToken', async () => {
    const { port, server } = await startTestServer(15);
    const host = await connectSocket(port, 'session-host');
    const guest1 = await connectSocket(port, 'session-guest-abc');
    cleanups.push(() => {
      host.disconnect();
      guest1.disconnect();
    });

    const createAck = await new Promise<RoomJoinAck>((resolve) => {
      host.emit(
        'room:create',
        {
          playerName: 'เจ้าบ้าน',
          config: {
            totalSeats: 2,
            slots: [
              { seatIndex: 0, kind: 'human' },
              { seatIndex: 1, kind: 'human' },
            ],
          },
        },
        resolve,
      );
    });
    const roomId = createAck.roomId!;

    await new Promise<RoomJoinAck>((resolve) => {
      guest1.emit('room:join', { roomId, playerName: 'เพื่อนรัก' }, resolve);
    });
    await new Promise((resolve) => host.emit('room:startGame', { roomId }, resolve));

    // Guest disconnects unexpectedly during active game
    const disconnectStatePromise = waitForEvent<GameState>(
      host,
      'game:state',
      (g) => g.players[1]?.connected === false,
    );
    guest1.disconnect();
    const afterDisconnect = await disconnectStatePromise;
    expect(afterDisconnect.players[1]?.connected).toBe(false);
    expect(server.roomManager.getRoomState(roomId)?.status).toBe('PLAYING');

    // Reconnect with a brand new socket using the same sessionToken
    const guestReconnected = await connectSocket(port, 'session-guest-abc');
    cleanups.push(() => {
      guestReconnected.disconnect();
    });

    const reconnectStatePromise = waitForEvent<GameState>(
      host,
      'game:state',
      (g) => g.players[1]?.connected === true,
    );
    const reconnectAck = await new Promise<RoomJoinAck>((resolve) => {
      guestReconnected.emit('room:join', { roomId, playerName: 'เพื่อนรัก' }, resolve);
    });

    expect(reconnectAck.ok).toBe(true);
    expect(reconnectAck.seatIndex).toBe(1);
    expect(reconnectAck.playerId).toBe('player-2');

    const afterReconnect = await reconnectStatePromise;
    expect(afterReconnect.players[1]?.connected).toBe(true);
  });

  it('automatically evaluates and responds to human TradeOffers sent to AI bots', async () => {
    const { port } = await startTestServer(15);
    const host = await connectSocket(port, 'trade-host');
    cleanups.push(() => {
      host.disconnect();
    });

    const createAck = await new Promise<RoomJoinAck>((resolve) => {
      host.emit(
        'room:create',
        {
          playerName: 'นักเจรจา',
          config: {
            totalSeats: 2,
            slots: [
              { seatIndex: 0, kind: 'human' },
              { seatIndex: 1, kind: 'bot', name: 'บอทคู่ค้า', botStyle: 'balanced' },
            ],
          },
        },
        resolve,
      );
    });
    const roomId = createAck.roomId!;
    const tradeTracker = trackLatestGameState(host);
    cleanups.push(() => tradeTracker.dispose());
    await new Promise((resolve) => host.emit('room:startGame', { roomId }, resolve));
    await driveTurnOrderOverSockets(roomId, tradeTracker, { 'player-1': host });
    await tradeTracker.waitUntil(
      (g) => g.phase === 'AWAIT_ROLL' && g.players[g.currentTurnIndex]?.id === 'player-1',
    );

    // Wait for bot auto-response after human sends a trade offer
    const tradeResolvedPromise = waitForEvent<GameState>(
      host,
      'game:state',
      (g) => g.pendingTrades.some((t) => t.status === 'ACCEPTED' || t.status === 'DECLINED'),
    );

    const tradeAck = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      host.emit(
        'game:action',
        {
          roomId,
          action: {
            type: 'CREATE_TRADE_OFFER',
            playerId: 'player-1',
            offer: {
              toPlayerId: 'player-2',
              offeredTileIndices: [],
              requestedTileIndices: [],
              offeredCash: 1000,
              requestedCash: 500,
              offeredJailCards: 0,
              requestedJailCards: 0,
            },
          },
        },
        resolve,
      );
    });
    expect(tradeAck.ok).toBe(true);

    const resolvedState = await tradeResolvedPromise;
    expect(resolvedState.pendingTrades[0]?.status).toBe('ACCEPTED');
  });

  it('runs an all-bot spectator room cleanly across multiple bot turns', async () => {
    const { port } = await startTestServer(10);
    const spectatorHost = await connectSocket(port, 'spec-host');
    cleanups.push(() => {
      spectatorHost.disconnect();
    });

    const createAck = await new Promise<RoomJoinAck>((resolve) => {
      spectatorHost.emit(
        'room:create',
        {
          playerName: 'ผู้ชมหลัก',
          config: {
            totalSeats: 4,
            slots: [
              { seatIndex: 0, kind: 'bot', name: 'บอท 1', botStyle: 'aggressive' },
              { seatIndex: 1, kind: 'bot', name: 'บอท 2', botStyle: 'balanced' },
              { seatIndex: 2, kind: 'bot', name: 'บอท 3', botStyle: 'cautious' },
              { seatIndex: 3, kind: 'bot', name: 'บอท 4', botStyle: 'balanced' },
            ],
          },
        },
        resolve,
      );
    });

    expect(createAck.ok).toBe(true);
    expect(createAck.isSpectator).toBe(true);
    expect(createAck.seatIndex).toBeUndefined();
    const roomId = createAck.roomId!;

    const turnProgressPromise = waitForEvent<GameState>(
      spectatorHost,
      'game:state',
      (g) => g.turnNumber >= 4 || g.phase === 'GAME_OVER',
      5000,
    );

    const startAck = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      spectatorHost.emit('room:startGame', { roomId }, resolve);
    });
    expect(startAck.ok).toBe(true);

    const progressed = await turnProgressPromise;
    expect(progressed.turnNumber).toBeGreaterThanOrEqual(4);
    expect(progressed.banker.ledger.length).toBeGreaterThan(4);
  });

  it('handles permanent room:leave in PLAYING by declaring bankruptcy or transferring room cleanly', () => {
    const manager = new RoomManager();
    const c1 = manager.createRoom({
      socketId: 's1',
      sessionToken: 't1',
      playerName: 'ผู้เล่น 1',
      config: {
        totalSeats: 2,
        slots: [
          { seatIndex: 0, kind: 'human' },
          { seatIndex: 1, kind: 'human' },
        ],
      },
    });
    const roomId = c1.roomId!;
    manager.joinRoom({ socketId: 's2', sessionToken: 't2', roomId, playerName: 'ผู้เล่น 2' });
    manager.startGame({ socketId: 's1', sessionToken: 't1', roomId });

    // Complete turn-order rolls cleanly via RoomManager before entering Turn 1
    let state = manager.getRoomState(roomId)!.gameState!;
    for (let guard = 0; state.phase === 'TURN_ORDER_ROLL' && guard < 20; guard++) {
      const rollerId = state.players[state.currentTurnIndex]!.id;
      const rollerSock = rollerId === 'player-1' ? 's1' : 's2';
      const orderRoll = manager.handleGameAction({
        socketId: rollerSock,
        roomId,
        action: { type: 'ROLL_DICE', playerId: rollerId },
      });
      expect(orderRoll.ok).toBe(true);
      state = orderRoll.gameState!;
    }
    expect(state.phase).toBe('AWAIT_ROLL');

    // Roll starting player into ACTION_PHASE or AWAIT_DECISION -> decline if needed -> ACTION_PHASE
    const starterId = state.players[state.currentTurnIndex]!.id;
    const starterSock = starterId === 'player-1' ? 's1' : 's2';
    const otherId = starterId === 'player-1' ? 'player-2' : 'player-1';
    const roll = manager.handleGameAction({
      socketId: starterSock,
      roomId,
      action: { type: 'ROLL_DICE', playerId: starterId },
    });
    expect(roll.ok).toBe(true);
    state = roll.gameState!;
    if (state.phase === 'AWAIT_DECISION') {
      manager.handleGameAction({
        socketId: starterSock,
        roomId,
        action: { type: 'DECLINE_CURRENT_TILE', playerId: starterId },
      });
    }

    // Starting player leaves permanently while in ACTION_PHASE -> bankrupts & remaining player wins!
    const leaveRes = manager.leaveRoom({ socketId: starterSock, roomId });
    expect(leaveRes.roomDeleted).toBe(false);
    expect(leaveRes.gameState?.phase).toBe('GAME_OVER');
    expect(leaveRes.gameState?.winnerId).toBe(otherId);
    manager.destroyAll();
  });
});
