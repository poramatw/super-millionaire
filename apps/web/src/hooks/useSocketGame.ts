import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  BOT_DEFAULT_NAMES,
  PLAYER_COLORS,
  applyGameAction,
  createGameState,
  decideNextBotAction,
  evaluateTradeOffer,
  getCurrentPlayer,
  getRecommendedBotActionDelayMs,
  type ClientToServerEvents,
  type GameAction,
  type GameState,
  type LedgerEntry,
  type PlayerSlotConfig,
  type RoomActionAck,
  type RoomConfig,
  type RoomJoinAck,
  type RoomSeat,
  type RoomState,
  type ServerToClientEvents,
} from '@super-millionaire/shared';
import { PeerRoomClient, PeerRoomHost } from './peerRoomTransport';

type ExtendedClientToServerEvents = ClientToServerEvents & {
  'room:resetLobby': (
    payload: { roomId: string },
    cb?: (res: RoomActionAck) => void,
  ) => void;
};

type GameSocket = Socket<ServerToClientEvents, ExtendedClientToServerEvents>;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type TransportMode = 'socket' | 'p2p';

const SESSION_TOKEN_KEY = 'sm_9028_session_token';
const LAST_ROOM_KEY = 'sm_9028_last_room';
const HOST_ROOM_KEY = 'sm_9028_host_room';
const PLAYER_NAME_KEY = 'sm_9028_player_name';

function getConfiguredSocketUrl(): string | undefined {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const raw = env?.VITE_SOCKET_URL?.trim();
    return raw && raw.length > 0 ? raw : undefined;
  } catch {
    return undefined;
  }
}

function readStoredHostRoom(): string | null {
  try {
    return window.localStorage.getItem(HOST_ROOM_KEY);
  } catch {
    return null;
  }
}

function saveStoredHostRoom(roomId: string | null): void {
  try {
    if (roomId) {
      window.localStorage.setItem(HOST_ROOM_KEY, roomId);
    } else {
      window.localStorage.removeItem(HOST_ROOM_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function getOrCreateSessionToken(): string {
  // Store per-tab in sessionStorage so multiple tabs on the same browser get distinct seats
  try {
    const existing = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (existing && existing.length >= 8) {
      return existing;
    }
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(SESSION_TOKEN_KEY, generated);
    return generated;
  } catch {
    return `sm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function readStoredPlayerName(): string {
  try {
    return window.localStorage.getItem(PLAYER_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveStoredPlayerName(name: string): void {
  try {
    window.localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    // Ignore storage errors
  }
}

function readStoredRoomId(): string | null {
  try {
    return window.localStorage.getItem(LAST_ROOM_KEY);
  } catch {
    return null;
  }
}

function saveStoredRoomId(roomId: string | null): void {
  try {
    if (roomId) {
      window.localStorage.setItem(LAST_ROOM_KEY, roomId);
    } else {
      window.localStorage.removeItem(LAST_ROOM_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function readRoomCodeFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room')?.trim().toUpperCase();
    return code && code.length > 0 ? code : null;
  } catch {
    return null;
  }
}

function syncRoomUrlParam(roomId: string | null): void {
  try {
    const url = new URL(window.location.href);
    if (roomId) {
      url.searchParams.set('room', roomId);
    } else {
      url.searchParams.delete('room');
    }
    window.history.replaceState({}, '', url.toString());
  } catch {
    // Ignore history API failures
  }
}

function normalizeLocalConfig(
  playerName: string,
  partial?: Partial<RoomConfig>,
): { config: RoomConfig; humanSeatIndex: number | null } {
  const totalSeats = (partial?.totalSeats ?? 4) as 2 | 3 | 4 | 5 | 6 | 7 | 8;
  const slotMap = new Map<number, PlayerSlotConfig>();
  for (const s of partial?.slots ?? []) {
    slotMap.set(s.seatIndex, s);
  }

  let humanSeatIndex: number | null = null;
  const slots: PlayerSlotConfig[] = Array.from({ length: totalSeats }, (_, idx) => {
    const existing = slotMap.get(idx);
    const kind = existing?.kind ?? (idx === 0 ? 'human' : 'bot');
    if (kind === 'human' && humanSeatIndex === null) {
      humanSeatIndex = idx;
    }
    if (kind === 'bot') {
      return {
        seatIndex: idx,
        kind: 'bot',
        name: existing?.name?.trim() || BOT_DEFAULT_NAMES[idx % BOT_DEFAULT_NAMES.length],
        botStyle: existing?.botStyle ?? 'balanced',
      };
    }
    return {
      seatIndex: idx,
      kind: 'human',
      name: idx === 0 ? playerName.trim() || 'เศรษฐีสยาม' : existing?.name || `ผู้เล่น ${idx + 1}`,
    };
  });

  // In local browser mode, extra human slots beyond the local player become bots so the game never stalls
  const normalizedSlots: PlayerSlotConfig[] = slots.map((s) => {
    if (s.kind === 'human' && s.seatIndex !== humanSeatIndex) {
      return {
        seatIndex: s.seatIndex,
        kind: 'bot',
        name: BOT_DEFAULT_NAMES[s.seatIndex % BOT_DEFAULT_NAMES.length],
        botStyle: 'balanced',
      };
    }
    return s;
  });

  return {
    config: { totalSeats, slots: normalizedSlots },
    humanSeatIndex,
  };
}

function buildSeatsFromConfig(config: RoomConfig, humanSeatIndex: number | null): RoomSeat[] {
  return config.slots.map((slot) => {
    const isLocalHuman = slot.kind === 'human' && slot.seatIndex === humanSeatIndex;
    return {
      seatIndex: slot.seatIndex,
      kind: slot.kind,
      name:
        slot.name ||
        (slot.kind === 'bot'
          ? BOT_DEFAULT_NAMES[slot.seatIndex % BOT_DEFAULT_NAMES.length]!
          : `ผู้เล่น ${slot.seatIndex + 1}`),
      botStyle: slot.botStyle ?? 'balanced',
      occupiedBySocketId: isLocalHuman ? 'local-browser' : null,
      playerId: `player-${slot.seatIndex + 1}`,
      ready: true,
      tokenId: slot.seatIndex,
      color: PLAYER_COLORS[slot.seatIndex % PLAYER_COLORS.length]!,
    };
  });
}

export interface UseSocketGameResult {
  roomState: RoomState | null;
  gameState: GameState | null;
  connectionStatus: ConnectionStatus;
  transportMode: TransportMode;
  isLocalOffline: boolean;
  mySeatIndex: number | null;
  myPlayerId: string | null;
  isSpectator: boolean;
  isHost: boolean;
  deepLinkRoomCode: string | null;
  savedPlayerName: string;
  errorToast: string | null;
  lastActionEntries: LedgerEntry[];
  clearError: () => void;
  setErrorToast: (msg: string | null) => void;
  createRoom: (playerName: string, config?: Partial<RoomConfig>) => Promise<RoomJoinAck>;
  startLocalGame: (playerName: string, config?: Partial<RoomConfig>) => RoomJoinAck;
  joinRoom: (
    roomId: string,
    playerName: string,
    preferredSeatIndex?: number,
    asSpectator?: boolean,
  ) => Promise<RoomJoinAck>;
  selectSeat: (seatIndex: number, playerName: string) => Promise<RoomJoinAck>;
  updateRoomConfig: (config: RoomConfig) => Promise<RoomActionAck>;
  setReady: (ready: boolean) => void;
  startGame: () => Promise<RoomActionAck>;
  dispatchGameAction: (action: GameAction) => Promise<RoomActionAck>;
  leaveRoom: () => void;
  resetLobby: () => Promise<RoomActionAck>;
}

export function useSocketGame(): UseSocketGameResult {
  const socketRef = useRef<GameSocket | null>(null);
  const sessionTokenRef = useRef<string>(getOrCreateSessionToken());
  const errorTimerRef = useRef<number | null>(null);
  const currentRoomIdRef = useRef<string | null>(null);
  const creatorRoomIdRef = useRef<string | null>(readStoredHostRoom());
  const localBotTimerRef = useRef<number | null>(null);
  const peerHostRef = useRef<PeerRoomHost | null>(null);
  const peerClientRef = useRef<PeerRoomClient | null>(null);

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [standaloneGameState, setStandaloneGameState] = useState<GameState | null>(null);
  const [localRoomState, setLocalRoomState] = useState<RoomState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [transportMode, setTransportMode] = useState<TransportMode>('socket');
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);
  const [errorToast, setErrorToastState] = useState<string | null>(null);
  const [lastActionEntries, setLastActionEntries] = useState<LedgerEntry[]>([]);
  const [deepLinkRoomCode] = useState<string | null>(() => readRoomCodeFromUrl());
  const [savedPlayerName] = useState<string>(() => readStoredPlayerName());

  const showError = useCallback((message: string | null) => {
    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setErrorToastState(message);
    if (message) {
      errorTimerRef.current = window.setTimeout(() => {
        setErrorToastState(null);
        errorTimerRef.current = null;
      }, 4500);
    }
  }, []);

  const clearError = useCallback(() => showError(null), [showError]);

  useEffect(() => {
    const socketUrl = getConfiguredSocketUrl();
    const hasExplicitSocket = Boolean(socketUrl);
    const socketOptions = {
      path: '/socket.io',
      auth: {
        sessionToken: sessionTokenRef.current,
      },
      transports: ['websocket', 'polling'] as ('websocket' | 'polling')[],
      reconnection: hasExplicitSocket,
      reconnectionAttempts: hasExplicitSocket ? Infinity : 0,
      timeout: hasExplicitSocket ? 8000 : 1200,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
    };

    const socket: GameSocket = socketUrl
      ? io(socketUrl, socketOptions)
      : io(socketOptions);

    socketRef.current = socket;
    let connectedOnce = false;

    socket.on('connect', () => {
      connectedOnce = true;
      setTransportMode('socket');
      setConnectionStatus('connected');

      // Rebind active room on socket connect / reconnect
      const storedRoom = currentRoomIdRef.current ?? readStoredRoomId();
      const urlRoom = readRoomCodeFromUrl();
      const targetRoom = storedRoom ?? (urlRoom && readStoredRoomId() === urlRoom ? urlRoom : null);

      if (targetRoom) {
        socket.emit('room:requestState', { roomId: targetRoom });
        const name = readStoredPlayerName() || 'ผู้เล่น';
        socket.emit('room:join', { roomId: targetRoom, playerName: name }, (ack) => {
          if (ack.ok && ack.roomId) {
            currentRoomIdRef.current = ack.roomId;
            setMySeatIndex(ack.seatIndex ?? null);
            setMyPlayerId(ack.playerId ?? null);
            setIsSpectator(Boolean(ack.isSpectator));
          } else if (currentRoomIdRef.current === null && storedRoom) {
            saveStoredRoomId(null);
          }
        });
      }
    });

    socket.on('disconnect', () => {
      if (connectedOnce || hasExplicitSocket) {
        setConnectionStatus('disconnected');
      }
    });

    socket.on('connect_error', () => {
      if (!connectedOnce && !hasExplicitSocket) {
        // Static hosting (e.g. Vercel without separate backend) -> switch seamlessly to WebRTC P2P online rooms!
        socket.disconnect();
        socketRef.current = null;
        setTransportMode('p2p');
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    });

    socket.on('room:state', (room) => {
      currentRoomIdRef.current = room.roomId;
      saveStoredRoomId(room.roomId);
      syncRoomUrlParam(room.roomId);
      setRoomState(room);
      setStandaloneGameState(room.gameState);

      const matchedSeat = room.seats.find((s) => s.occupiedBySocketId === socket.id);
      if (matchedSeat) {
        setMySeatIndex(matchedSeat.seatIndex);
        setMyPlayerId(matchedSeat.playerId ?? `player-${matchedSeat.seatIndex + 1}`);
        setIsSpectator(false);
      } else if (room.seats.every((s) => s.kind === 'bot')) {
        setMySeatIndex(null);
        setMyPlayerId(null);
        setIsSpectator(true);
      }
    });

    socket.on('game:state', (nextGame) => {
      setStandaloneGameState(nextGame);
      setRoomState((prev) => (prev ? { ...prev, gameState: nextGame } : prev));
    });

    socket.on('game:actionResult', (res) => {
      if (!res.ok && res.error) {
        showError(res.error);
      }
      if (res.ledgerEntries && res.ledgerEntries.length > 0) {
        setLastActionEntries(res.ledgerEntries);
      }
    });

    socket.on('room:error', (payload) => {
      if (payload?.message) {
        showError(payload.message);
      }
    });

    return () => {
      if (errorTimerRef.current !== null) {
        window.clearTimeout(errorTimerRef.current);
      }
      peerHostRef.current?.destroy();
      peerHostRef.current = null;
      peerClientRef.current?.destroy();
      peerClientRef.current = null;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [showError]);

  // Local / Offline AI Bot Runner (for Vercel static mode or solo instant play)
  useEffect(() => {
    if (localBotTimerRef.current !== null) {
      window.clearTimeout(localBotTimerRef.current);
      localBotTimerRef.current = null;
    }
    if (!localRoomState || localRoomState.status !== 'PLAYING' || !localRoomState.gameState) {
      return;
    }

    const gs = localRoomState.gameState;
    if (gs.phase === 'LOBBY' || gs.phase === 'GAME_OVER') {
      return;
    }

    // 1. Check if any bot has a pending incoming trade offer
    const pendingBotTrade = gs.pendingTrades.find((t) => {
      if (t.status !== 'PENDING') return false;
      const recipient = gs.players.find((p) => p.id === t.toPlayerId);
      return Boolean(recipient && recipient.kind === 'bot' && !recipient.isBankrupt);
    });

    if (pendingBotTrade) {
      localBotTimerRef.current = window.setTimeout(() => {
        setLocalRoomState((prev) => {
          if (!prev?.gameState) return prev;
          const accept = evaluateTradeOffer(
            prev.gameState,
            pendingBotTrade.toPlayerId,
            pendingBotTrade,
          );
          const res = applyGameAction(prev.gameState, {
            type: 'RESPOND_TRADE_OFFER',
            playerId: pendingBotTrade.toPlayerId,
            tradeId: pendingBotTrade.id,
            accept,
          });
          if (!res.ok) return prev;
          return {
            ...prev,
            status: res.state.phase === 'GAME_OVER' ? 'FINISHED' : 'PLAYING',
            gameState: res.state,
          };
        });
      }, 800);

      return () => {
        if (localBotTimerRef.current !== null) {
          window.clearTimeout(localBotTimerRef.current);
          localBotTimerRef.current = null;
        }
      };
    }

    // 2. Check if current turn player is an AI Bot
    const current = getCurrentPlayer(gs);
    if (current.kind !== 'bot' || current.isBankrupt) {
      return;
    }

    const action = decideNextBotAction(gs, current.id);
    if (!action) return;

    const delayMs = getRecommendedBotActionDelayMs(gs, action);
    localBotTimerRef.current = window.setTimeout(() => {
      setLocalRoomState((prev) => {
        if (!prev?.gameState) return prev;
        const curr = getCurrentPlayer(prev.gameState);
        if (curr.id !== current.id) return prev;
        const nextAction = decideNextBotAction(prev.gameState, curr.id);
        if (!nextAction) return prev;
        const res = applyGameAction(prev.gameState, nextAction);
        if (!res.ok) return prev;
        if (res.entries.length > 0) {
          setLastActionEntries(res.entries);
        }
        return {
          ...prev,
          status: res.state.phase === 'GAME_OVER' ? 'FINISHED' : 'PLAYING',
          gameState: res.state,
        };
      });
    }, delayMs);

    return () => {
      if (localBotTimerRef.current !== null) {
        window.clearTimeout(localBotTimerRef.current);
        localBotTimerRef.current = null;
      }
    };
  }, [localRoomState]);

  const startLocalGame = useCallback(
    (playerName: string, partialConfig?: Partial<RoomConfig>): RoomJoinAck => {
      const trimmedName = playerName.trim() || 'เศรษฐีสยาม';
      saveStoredPlayerName(trimmedName);

      const { config, humanSeatIndex } = normalizeLocalConfig(trimmedName, partialConfig);
      const seats = buildSeatsFromConfig(config, humanSeatIndex);
      const gameState = createGameState('LOCAL', config);

      const nextRoom: RoomState = {
        roomId: 'LOCAL',
        hostSeatIndex: humanSeatIndex ?? 0,
        config,
        seats,
        status: 'PLAYING',
        gameState,
        createdAt: Date.now(),
      };

      setLocalRoomState(nextRoom);
      setMySeatIndex(humanSeatIndex);
      setMyPlayerId(humanSeatIndex !== null ? `player-${humanSeatIndex + 1}` : null);
      setIsSpectator(humanSeatIndex === null);
      clearError();

      return {
        ok: true,
        roomId: 'LOCAL',
        seatIndex: humanSeatIndex ?? undefined,
        playerId: humanSeatIndex !== null ? `player-${humanSeatIndex + 1}` : undefined,
        isSpectator: humanSeatIndex === null,
      };
    },
    [clearError],
  );

  const createRoom = useCallback(
    async (playerName: string, config?: Partial<RoomConfig>): Promise<RoomJoinAck> => {
      const socket = socketRef.current;
      if (socket && socket.connected) {
        return new Promise((resolve) => {
          const trimmedName = playerName.trim() || 'เจ้าบ้าน';
          saveStoredPlayerName(trimmedName);

          socket.emit('room:create', { playerName: trimmedName, config }, (ack) => {
            if (ack.ok && ack.roomId) {
              setLocalRoomState(null);
              currentRoomIdRef.current = ack.roomId;
              creatorRoomIdRef.current = ack.roomId;
              saveStoredHostRoom(ack.roomId);
              saveStoredRoomId(ack.roomId);
              syncRoomUrlParam(ack.roomId);
              setMySeatIndex(ack.seatIndex ?? null);
              setMyPlayerId(ack.playerId ?? null);
              setIsSpectator(Boolean(ack.isSpectator));
              clearError();
            } else if (ack.error) {
              showError(ack.error);
            }
            resolve(ack);
          });
        });
      }

      if (transportMode === 'p2p') {
        peerHostRef.current?.destroy();
        peerHostRef.current = null;
        peerClientRef.current?.destroy();
        peerClientRef.current = null;

        const trimmedName = playerName.trim() || 'เจ้าบ้าน';
        saveStoredPlayerName(trimmedName);

        const { host, ack } = await PeerRoomHost.create({
          sessionToken: sessionTokenRef.current,
          playerName: trimmedName,
          config,
          callbacks: {
            onRoomChange: (room, entries) => {
              setLocalRoomState(null);
              setRoomState(room);
              setStandaloneGameState(room.gameState);
              if (entries && entries.length > 0) {
                setLastActionEntries(entries);
              }
            },
            onError: (msg) => showError(msg),
          },
        });

        if (ack.ok && ack.roomId) {
          peerHostRef.current = host;
          currentRoomIdRef.current = ack.roomId;
          creatorRoomIdRef.current = ack.roomId;
          saveStoredHostRoom(ack.roomId);
          saveStoredRoomId(ack.roomId);
          syncRoomUrlParam(ack.roomId);
          setMySeatIndex(ack.seatIndex ?? null);
          setMyPlayerId(ack.playerId ?? null);
          setIsSpectator(Boolean(ack.isSpectator));
          clearError();
          return ack;
        }
        if (ack.error) showError(ack.error);
        return ack;
      }

      // Offline fallback if neither Socket.IO nor P2P ready yet
      return startLocalGame(playerName, config);
    },
    [clearError, showError, startLocalGame, transportMode],
  );

  const joinRoom = useCallback(
    async (
      roomId: string,
      playerName: string,
      preferredSeatIndex?: number,
      asSpectator?: boolean,
    ): Promise<RoomJoinAck> => {
      const normalizedRoomId = roomId.trim().toUpperCase();
      const trimmedName = playerName.trim() || 'ผู้เล่น';
      saveStoredPlayerName(trimmedName);

      const socket = socketRef.current;
      if (socket && socket.connected) {
        return new Promise((resolve) => {
          socket.emit(
            'room:join',
            {
              roomId: normalizedRoomId,
              playerName: trimmedName,
              preferredSeatIndex,
              asSpectator,
            },
            (ack) => {
              if (ack.ok && ack.roomId) {
                setLocalRoomState(null);
                currentRoomIdRef.current = ack.roomId;
                saveStoredRoomId(ack.roomId);
                syncRoomUrlParam(ack.roomId);
                setMySeatIndex(ack.seatIndex ?? null);
                setMyPlayerId(ack.playerId ?? null);
                setIsSpectator(Boolean(ack.isSpectator));
                clearError();
              } else if (ack.error) {
                showError(ack.error);
              }
              resolve(ack);
            },
          );
        });
      }

      if (peerHostRef.current && currentRoomIdRef.current === normalizedRoomId) {
        const ack = peerHostRef.current.handleJoin({
          sessionToken: sessionTokenRef.current,
          playerName: trimmedName,
          preferredSeatIndex,
          asSpectator,
        });
        if (ack.ok) {
          setMySeatIndex(ack.seatIndex ?? null);
          setMyPlayerId(ack.playerId ?? null);
          setIsSpectator(Boolean(ack.isSpectator));
          clearError();
        } else if (ack.error) {
          showError(ack.error);
        }
        return ack;
      }

      if (peerClientRef.current && currentRoomIdRef.current === normalizedRoomId) {
        const ack = await peerClientRef.current.sendJoin({
          playerName: trimmedName,
          preferredSeatIndex,
          asSpectator,
        });
        if (ack.ok) {
          setMySeatIndex(ack.seatIndex ?? null);
          setMyPlayerId(ack.playerId ?? null);
          setIsSpectator(Boolean(ack.isSpectator));
          clearError();
        } else if (ack.error) {
          showError(ack.error);
        }
        return ack;
      }

      if (transportMode === 'p2p') {
        peerClientRef.current?.destroy();
        peerClientRef.current = null;

        const { client, ack } = await PeerRoomClient.connect({
          roomId: normalizedRoomId,
          sessionToken: sessionTokenRef.current,
          playerName: trimmedName,
          preferredSeatIndex,
          asSpectator,
          callbacks: {
            onState: (room, entries) => {
              setLocalRoomState(null);
              setRoomState(room);
              setStandaloneGameState(room.gameState);
              if (entries && entries.length > 0) {
                setLastActionEntries(entries);
              }
            },
            onError: (msg) => showError(msg),
            onDisconnect: (msg) => {
              peerClientRef.current = null;
              currentRoomIdRef.current = null;
              saveStoredRoomId(null);
              syncRoomUrlParam(null);
              setRoomState(null);
              setStandaloneGameState(null);
              setMySeatIndex(null);
              setMyPlayerId(null);
              setIsSpectator(false);
              showError(msg);
            },
          },
        });

        if (ack.ok && client && ack.roomId) {
          peerClientRef.current = client;
          currentRoomIdRef.current = ack.roomId;
          saveStoredRoomId(ack.roomId);
          syncRoomUrlParam(ack.roomId);
          setMySeatIndex(ack.seatIndex ?? null);
          setMyPlayerId(ack.playerId ?? null);
          setIsSpectator(Boolean(ack.isSpectator));
          clearError();
          return ack;
        }
        if (ack.error) showError(ack.error);
        return ack;
      }

      const msg = 'เซิร์ฟเวอร์ออนไลน์ไม่พร้อมใช้งาน สามารถเลือก "เล่นทันทีบนเบราว์เซอร์ (AI บอท)" ได้เลย!';
      showError(msg);
      return { ok: false, error: msg };
    },
    [clearError, showError, transportMode],
  );

  const selectSeat = useCallback(
    (seatIndex: number, playerName: string): Promise<RoomJoinAck> => {
      if (localRoomState) {
        return Promise.resolve({ ok: true, roomId: 'LOCAL', seatIndex });
      }
      const roomId = roomState?.roomId ?? currentRoomIdRef.current;
      if (!roomId) {
        return Promise.resolve({ ok: false, error: 'ไม่พบรหัสห้อง' });
      }
      return joinRoom(roomId, playerName, seatIndex, false);
    },
    [joinRoom, localRoomState, roomState?.roomId],
  );

  const updateRoomConfig = useCallback(
    (config: RoomConfig): Promise<RoomActionAck> => {
      return new Promise((resolve) => {
        if (localRoomState) {
          const humanSeat = config.slots.find((s) => s.kind === 'human')?.seatIndex ?? null;
          setLocalRoomState((prev) =>
            prev
              ? {
                  ...prev,
                  config,
                  seats: buildSeatsFromConfig(config, humanSeat),
                }
              : prev,
          );
          resolve({ ok: true });
          return;
        }
        if (peerHostRef.current) {
          const ack = peerHostRef.current.updateConfig(config);
          if (!ack.ok && ack.error) showError(ack.error);
          resolve(ack);
          return;
        }
        const socket = socketRef.current;
        const roomId = roomState?.roomId ?? currentRoomIdRef.current;
        if (!socket || !roomId) {
          resolve({ ok: false, error: 'ไม่พบห้องที่เชื่อมต่ออยู่' });
          return;
        }
        socket.emit('room:updateConfig', { roomId, config }, (ack) => {
          if (!ack.ok && ack.error) {
            showError(ack.error);
          }
          resolve(ack);
        });
      });
    },
    [localRoomState, roomState?.roomId, showError],
  );

  const setReady = useCallback(
    (ready: boolean) => {
      if (localRoomState) return;
      if (peerHostRef.current) {
        peerHostRef.current.handleSetReady(sessionTokenRef.current, ready);
        return;
      }
      if (peerClientRef.current) {
        peerClientRef.current.setReady(ready);
        return;
      }
      const socket = socketRef.current;
      const roomId = roomState?.roomId ?? currentRoomIdRef.current;
      if (!socket || !roomId) return;
      socket.emit('room:setReady', { roomId, ready });
    },
    [localRoomState, roomState?.roomId],
  );

  const startGame = useCallback((): Promise<RoomActionAck> => {
    return new Promise((resolve) => {
      if (localRoomState) {
        const gs = createGameState('LOCAL', localRoomState.config);
        const humanSeat =
          localRoomState.config.slots.find((s) => s.kind === 'human')?.seatIndex ?? null;
        setLocalRoomState((prev) =>
          prev
            ? {
                ...prev,
                status: 'PLAYING',
                gameState: gs,
              }
            : prev,
        );
        setMySeatIndex(humanSeat);
        setMyPlayerId(humanSeat !== null ? `player-${humanSeat + 1}` : null);
        setIsSpectator(humanSeat === null);
        resolve({ ok: true });
        return;
      }

      if (peerHostRef.current) {
        const ack = peerHostRef.current.startGame();
        if (!ack.ok && ack.error) showError(ack.error);
        resolve(ack);
        return;
      }

      const socket = socketRef.current;
      const roomId = roomState?.roomId ?? currentRoomIdRef.current;
      if (!socket || !roomId) {
        resolve({ ok: false, error: 'ไม่พบห้อง' });
        return;
      }
      socket.emit('room:startGame', { roomId }, (ack) => {
        if (!ack.ok && ack.error) {
          showError(ack.error);
        }
        resolve(ack);
      });
    });
  }, [localRoomState, roomState?.roomId, showError]);

  const dispatchGameAction = useCallback(
    (action: GameAction): Promise<RoomActionAck> => {
      return new Promise((resolve) => {
        if (localRoomState?.gameState) {
          const result = applyGameAction(localRoomState.gameState, action);
          if (!result.ok) {
            if (result.error) showError(result.error);
            resolve({ ok: false, error: result.error });
            return;
          }
          if (result.entries.length > 0) {
            setLastActionEntries(result.entries);
          }
          setLocalRoomState((prev) =>
            prev
              ? {
                  ...prev,
                  status: result.state.phase === 'GAME_OVER' ? 'FINISHED' : 'PLAYING',
                  gameState: result.state,
                }
              : prev,
          );
          resolve({ ok: true });
          return;
        }

        if (peerHostRef.current) {
          const ack = peerHostRef.current.handleGameAction(sessionTokenRef.current, action);
          if (!ack.ok && ack.error) showError(ack.error);
          resolve(ack);
          return;
        }

        if (peerClientRef.current) {
          void peerClientRef.current.sendAction(action).then((ack) => {
            if (!ack.ok && ack.error) showError(ack.error);
            resolve(ack);
          });
          return;
        }

        const socket = socketRef.current;
        const roomId = roomState?.roomId ?? currentRoomIdRef.current;
        if (!socket || !roomId) {
          resolve({ ok: false, error: 'ไม่พบห้องเกม' });
          return;
        }
        socket.emit('game:action', { roomId, action }, (ack) => {
          if (!ack.ok && ack.error) {
            showError(ack.error);
          }
          resolve(ack);
        });
      });
    },
    [localRoomState, roomState?.roomId, showError],
  );

  const leaveRoom = useCallback(() => {
    if (localBotTimerRef.current !== null) {
      window.clearTimeout(localBotTimerRef.current);
      localBotTimerRef.current = null;
    }
    if (localRoomState) {
      setLocalRoomState(null);
      setMySeatIndex(null);
      setMyPlayerId(null);
      setIsSpectator(false);
      clearError();
      return;
    }

    if (peerHostRef.current) {
      peerHostRef.current.destroy();
      peerHostRef.current = null;
    }
    if (peerClientRef.current) {
      peerClientRef.current.leave();
      peerClientRef.current = null;
    }

    const socket = socketRef.current;
    const roomId = roomState?.roomId ?? currentRoomIdRef.current;
    if (socket && roomId) {
      socket.emit('room:leave', { roomId });
    }
    currentRoomIdRef.current = null;
    creatorRoomIdRef.current = null;
    saveStoredHostRoom(null);
    saveStoredRoomId(null);
    syncRoomUrlParam(null);
    setRoomState(null);
    setStandaloneGameState(null);
    setMySeatIndex(null);
    setMyPlayerId(null);
    setIsSpectator(false);
    clearError();
  }, [clearError, localRoomState, roomState?.roomId]);

  const resetLobby = useCallback((): Promise<RoomActionAck> => {
    return new Promise((resolve) => {
      if (localRoomState) {
        const gs = createGameState('LOCAL', localRoomState.config);
        setLocalRoomState((prev) =>
          prev
            ? {
                ...prev,
                status: 'PLAYING',
                gameState: gs,
              }
            : prev,
        );
        resolve({ ok: true });
        return;
      }

      if (peerHostRef.current) {
        resolve(peerHostRef.current.resetLobby());
        return;
      }

      const socket = socketRef.current;
      const roomId = roomState?.roomId ?? currentRoomIdRef.current;
      if (!socket || !roomId) {
        resolve({ ok: false, error: 'ไม่พบห้อง' });
        return;
      }
      socket.emit('room:resetLobby', { roomId }, (ack) => {
        if (!ack?.ok && ack?.error) {
          showError(ack.error);
        }
        resolve(ack ?? { ok: true });
      });
    });
  }, [localRoomState, roomState?.roomId, showError]);

  const activeRoomState = localRoomState ?? roomState;
  const isLocalOffline = localRoomState !== null;
  const gameState = activeRoomState?.gameState ?? standaloneGameState;

  const isHost = Boolean(
    isLocalOffline ||
      (activeRoomState &&
        ((mySeatIndex !== null && activeRoomState.hostSeatIndex === mySeatIndex) ||
          (isSpectator &&
            activeRoomState.seats.every((s) => s.kind === 'bot') &&
            creatorRoomIdRef.current === activeRoomState.roomId))),
  );

  return {
    roomState: activeRoomState,
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
    lastActionEntries,
    clearError,
    setErrorToast: showError,
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
  };
}
