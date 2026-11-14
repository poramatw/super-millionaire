import crypto from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { createServer, type Server as HttpServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express, { type Express } from 'express';
import { Server, type Socket } from 'socket.io';
import {
  SHARED_PACKAGE_NAME,
  type ClientToServerEvents,
  type GameState,
  type RoomActionAck,
  type RoomState,
  type ServerHealthPayload,
  type ServerToClientEvents,
} from '@super-millionaire/shared';
import { RoomManager, type RoomManagerOptions } from './roomManager.js';

export type TypedSocketServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export interface AppServerInstance {
  app: Express;
  httpServer: HttpServer;
  io: TypedSocketServer;
  roomManager: RoomManager;
}

export interface CreateAppServerOptions extends RoomManagerOptions {
  webDistDir?: string;
}

function resolveSessionToken(socket: TypedSocket, payloadToken?: unknown): string {
  if (typeof payloadToken === 'string' && payloadToken.trim().length > 0) {
    return payloadToken.trim().slice(0, 128);
  }
  const authToken = socket.handshake.auth?.sessionToken;
  if (typeof authToken === 'string' && authToken.trim().length > 0) {
    return authToken.trim().slice(0, 128);
  }
  return crypto.randomUUID();
}

export function createAppServer(options: CreateAppServerOptions = {}): AppServerInstance {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const httpServer = createServer(app);
  const io: TypedSocketServer = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  const broadcastRoom = (room: RoomState, gameState: GameState | null): void => {
    io.to(room.roomId).emit('room:state', room);
    if (gameState) {
      io.to(room.roomId).emit('game:state', gameState);
    }
  };

  const roomManager = new RoomManager({
    botDelayMs: options.botDelayMs,
    onRoomUpdated: (room, gameState) => {
      broadcastRoom(room, gameState);
      options.onRoomUpdated?.(room, gameState);
    },
    onGameActionResult: (roomId, payload) => {
      io.to(roomId).emit('game:actionResult', payload);
      options.onGameActionResult?.(roomId, payload);
    },
  });

  app.get('/health', (_req, res) => {
    const payload: ServerHealthPayload & { activeRooms: number } = {
      status: 'ok',
      service: SHARED_PACKAGE_NAME,
      activeRooms: roomManager.getActiveRoomCount(),
    };
    res.json(payload);
  });

  const defaultWebDistDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../web/dist',
  );
  const webDistDir = options.webDistDir ?? defaultWebDistDir;
  const indexHtmlPath = path.join(webDistDir, 'index.html');
  const shouldServeStatic =
    process.env.NODE_ENV === 'production' || existsSync(indexHtmlPath);

  if (shouldServeStatic && existsSync(indexHtmlPath)) {
    app.use(express.static(webDistDir));
    app.use((req, res, next) => {
      if (
        req.method !== 'GET' ||
        req.path === '/health' ||
        req.path.startsWith('/socket.io')
      ) {
        next();
        return;
      }
      res.sendFile(indexHtmlPath);
    });
  }

  const leavePreviousRoomIfDifferent = (socket: TypedSocket, targetRoomId?: string): void => {
    const prevRoomId = roomManager.getSocketRoomId(socket.id);
    if (!prevRoomId) return;
    if (targetRoomId && prevRoomId === targetRoomId.trim().toUpperCase()) return;

    socket.leave(prevRoomId);
    const left = roomManager.leaveRoom({ socketId: socket.id, roomId: prevRoomId });
    if (left.leftRoomId && !left.roomDeleted && left.room) {
      broadcastRoom(left.room, left.gameState ?? null);
    }
  };

  io.on('connection', (socket) => {
    const connectionToken = resolveSessionToken(socket);
    socket.emit('health', { status: 'ok', service: SHARED_PACKAGE_NAME });

    socket.on('room:create', (payload, cb) => {
      if (!payload || typeof payload.playerName !== 'string') {
        const msg = 'กรุณาระบุชื่อผู้เล่น';
        socket.emit('room:error', { message: msg });
        cb?.({ ok: false, error: msg });
        return;
      }

      leavePreviousRoomIfDifferent(socket);
      const token = resolveSessionToken(
        socket,
        (payload as { sessionToken?: unknown }).sessionToken ?? connectionToken,
      );

      const res = roomManager.createRoom({
        socketId: socket.id,
        sessionToken: token,
        playerName: payload.playerName,
        config: payload.config,
      });

      if (!res.ok || !res.room || !res.roomId) {
        const msg = res.error ?? 'ไม่สามารถสร้างห้องได้';
        socket.emit('room:error', { message: msg });
        cb?.({ ok: false, error: msg });
        return;
      }

      socket.join(res.roomId);
      io.to(res.roomId).emit('room:state', res.room);
      cb?.({
        ok: true,
        roomId: res.roomId,
        seatIndex: res.seatIndex,
        playerId: res.playerId,
        isSpectator: res.isSpectator,
      });
    });

    socket.on('room:join', (payload, cb) => {
      if (!payload || typeof payload.roomId !== 'string' || !payload.roomId.trim()) {
        const msg = 'กรุณาระบุรหัสห้อง';
        socket.emit('room:error', { message: msg });
        cb?.({ ok: false, error: msg });
        return;
      }

      leavePreviousRoomIfDifferent(socket, payload.roomId);
      const token = resolveSessionToken(
        socket,
        (payload as { sessionToken?: unknown }).sessionToken ?? connectionToken,
      );

      const res = roomManager.joinRoom({
        socketId: socket.id,
        sessionToken: token,
        roomId: payload.roomId,
        playerName: typeof payload.playerName === 'string' ? payload.playerName : 'ผู้เล่น',
        preferredSeatIndex: payload.preferredSeatIndex,
        preferredTokenId: payload.preferredTokenId,
        asSpectator: payload.asSpectator,
      });

      if (!res.ok || !res.room || !res.roomId) {
        const msg = res.error ?? 'ไม่สามารถเข้าร่วมห้องได้';
        socket.emit('room:error', { message: msg });
        cb?.({ ok: false, error: msg });
        return;
      }

      socket.join(res.roomId);
      broadcastRoom(res.room, res.room.gameState);
      cb?.({
        ok: true,
        roomId: res.roomId,
        seatIndex: res.seatIndex,
        playerId: res.playerId,
        isSpectator: res.isSpectator,
      });
    });

    socket.on('room:updateConfig', (payload, cb) => {
      if (!payload || typeof payload.roomId !== 'string' || !payload.config) {
        const msg = 'ข้อมูลการตั้งค่าห้องไม่ถูกต้อง';
        socket.emit('room:error', { message: msg });
        cb?.({ ok: false, error: msg });
        return;
      }

      const res = roomManager.updateConfig({
        socketId: socket.id,
        sessionToken: connectionToken,
        roomId: payload.roomId,
        config: payload.config,
      });

      if (!res.ok || !res.room) {
        const msg = res.error ?? 'ไม่สามารถอัปเดตการตั้งค่าห้องได้';
        socket.emit('room:error', { message: msg });
        cb?.({ ok: false, error: msg });
        return;
      }

      io.to(res.room.roomId).emit('room:state', res.room);
      cb?.({ ok: true });
    });

    socket.on('room:setReady', (payload) => {
      if (!payload || typeof payload.roomId !== 'string') {
        socket.emit('room:error', { message: 'ข้อมูลห้องไม่ถูกต้อง' });
        return;
      }

      const res = roomManager.setReady({
        socketId: socket.id,
        roomId: payload.roomId,
        ready: Boolean(payload.ready),
      });

      if (!res.ok || !res.room) {
        socket.emit('room:error', { message: res.error ?? 'ไม่สามารถเปลี่ยนสถานะพร้อมได้' });
        return;
      }

      io.to(res.room.roomId).emit('room:state', res.room);
    });

    socket.on('room:startGame', (payload, cb) => {
      if (!payload || typeof payload.roomId !== 'string') {
        const msg = 'กรุณาระบุรหัสห้อง';
        socket.emit('room:error', { message: msg });
        cb?.({ ok: false, error: msg });
        return;
      }

      const res = roomManager.startGame({
        socketId: socket.id,
        sessionToken: connectionToken,
        roomId: payload.roomId,
      });

      if (!res.ok || !res.room) {
        const msg = res.error ?? 'ไม่สามารถเริ่มเกมได้';
        socket.emit('room:error', { message: msg });
        cb?.({ ok: false, error: msg });
        return;
      }

      broadcastRoom(res.room, res.gameState ?? res.room.gameState);
      cb?.({ ok: true });
    });

    socket.on('room:leave', (payload) => {
      const roomId = payload?.roomId;
      const res = roomManager.leaveRoom({ socketId: socket.id, roomId });
      if (res.leftRoomId) {
        socket.leave(res.leftRoomId);
      }
      if (!res.roomDeleted && res.room) {
        broadcastRoom(res.room, res.gameState ?? null);
        if (res.entries && res.entries.length > 0) {
          io.to(res.room.roomId).emit('game:actionResult', {
            ok: true,
            ledgerEntries: res.entries,
          });
        }
      }
    });

    socket.on('room:requestState', (payload) => {
      if (!payload || typeof payload.roomId !== 'string') {
        socket.emit('room:error', { message: 'กรุณาระบุรหัสห้อง' });
        return;
      }

      const res = roomManager.requestStateForSocket({
        socketId: socket.id,
        sessionToken: connectionToken,
        roomId: payload.roomId,
      });

      if (!res.ok || !res.room) {
        socket.emit('room:error', { message: res.error ?? 'ไม่พบห้องนี้' });
        return;
      }

      socket.join(res.room.roomId);
      if (res.reconnected) {
        broadcastRoom(res.room, res.gameState ?? null);
      } else {
        socket.emit('room:state', res.room);
        if (res.gameState) {
          socket.emit('game:state', res.gameState);
        }
      }
    });

    socket.on('game:action', (payload, cb) => {
      if (!payload || typeof payload.roomId !== 'string' || !payload.action) {
        const msg = 'คำสั่งไม่ถูกต้อง';
        socket.emit('game:actionResult', { ok: false, error: msg });
        cb?.({ ok: false, error: msg });
        return;
      }

      const res = roomManager.handleGameAction({
        socketId: socket.id,
        roomId: payload.roomId,
        action: payload.action,
      });

      if (!res.ok || !res.room) {
        const msg = res.error ?? 'ไม่สามารถดำเนินการได้';
        socket.emit('game:actionResult', { ok: false, error: msg });
        cb?.({ ok: false, error: msg });
        return;
      }

      broadcastRoom(res.room, res.gameState ?? res.room.gameState);
      io.to(res.room.roomId).emit('game:actionResult', {
        ok: true,
        ledgerEntries: res.entries,
      });
      cb?.({ ok: true });
    });

    // Optional host-only reset back to LOBBY after GAME_OVER
    (socket as unknown as Socket).on(
      'room:resetLobby',
      (payload: { roomId?: string }, cb?: (res: RoomActionAck) => void) => {
        if (!payload || typeof payload.roomId !== 'string') {
          const msg = 'กรุณาระบุรหัสห้อง';
          socket.emit('room:error', { message: msg });
          cb?.({ ok: false, error: msg });
          return;
        }
        const res = roomManager.resetLobby({
          socketId: socket.id,
          sessionToken: connectionToken,
          roomId: payload.roomId,
        });
        if (!res.ok || !res.room) {
          const msg = res.error ?? 'ไม่สามารถรีเซ็ตห้องได้';
          socket.emit('room:error', { message: msg });
          cb?.({ ok: false, error: msg });
          return;
        }
        io.to(res.room.roomId).emit('room:state', res.room);
        cb?.({ ok: true });
      },
    );

    socket.on('disconnect', () => {
      const res = roomManager.handleDisconnect(socket.id);
      if (res && !res.roomDeleted && res.room) {
        broadcastRoom(res.room, res.gameState ?? null);
      }
    });
  });

  return { app, httpServer, io, roomManager };
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return (
      realpathSync(path.resolve(entry)) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (isMainModule()) {
  const PORT = Number(process.env.PORT ?? 3001);
  const { httpServer } = createAppServer();
  httpServer.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}
