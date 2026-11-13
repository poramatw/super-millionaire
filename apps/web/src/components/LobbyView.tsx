import { useEffect, useState } from 'react';
import {
  BOT_DEFAULT_NAMES,
  PLAYER_COLORS,
  TOKEN_NAMES,
  type BotStyle,
  type PlayerSlotConfig,
  type RoomActionAck,
  type RoomConfig,
  type RoomJoinAck,
  type RoomState,
} from '@super-millionaire/shared';
import {
  Bot,
  Check,
  Copy,
  Crown,
  Eye,
  LogOut,
  Play,
  PlusCircle,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { BankerAvatar, BoardCenterArt, PlayerToken } from '../artwork';
import type { ConnectionStatus, TransportMode } from '../hooks/useSocketGame';

export interface LobbyViewProps {
  roomState: RoomState | null;
  connectionStatus: ConnectionStatus;
  transportMode?: TransportMode;
  mySeatIndex: number | null;
  isSpectator: boolean;
  isHost: boolean;
  deepLinkRoomCode: string | null;
  savedPlayerName: string;
  onCreateRoom: (playerName: string, config?: Partial<RoomConfig>) => Promise<RoomJoinAck>;
  onStartLocalGame: (playerName: string, config?: Partial<RoomConfig>) => RoomJoinAck;
  onJoinRoom: (
    roomId: string,
    playerName: string,
    preferredSeatIndex?: number,
    asSpectator?: boolean,
  ) => Promise<RoomJoinAck>;
  onSelectSeat: (seatIndex: number, playerName: string) => Promise<RoomJoinAck>;
  onUpdateRoomConfig: (config: RoomConfig) => Promise<RoomActionAck>;
  onSetReady: (ready: boolean) => void;
  onStartGame: () => Promise<RoomActionAck>;
  onLeaveRoom: () => void;
}

const BOT_STYLE_LABELS: Record<BotStyle, string> = {
  aggressive: 'ดุดัน (Aggressive)',
  balanced: 'สมดุล (Balanced)',
  cautious: 'รอบคอบ (Cautious)',
};

function buildDefaultConfig(
  totalSeats: 2 | 3 | 4 | 5 | 6 | 7 | 8 = 4,
  mode: 'mixed' | 'allBots' | 'allHumans' = 'mixed',
): RoomConfig {
  const slots: PlayerSlotConfig[] = Array.from({ length: totalSeats }, (_, idx) => {
    const isBot =
      mode === 'allBots' ? true : mode === 'allHumans' ? false : idx > 0;
    return {
      seatIndex: idx,
      kind: isBot ? 'bot' : 'human',
      name: isBot ? BOT_DEFAULT_NAMES[idx % BOT_DEFAULT_NAMES.length] : undefined,
      botStyle: isBot ? (idx % 3 === 1 ? 'aggressive' : idx % 3 === 2 ? 'cautious' : 'balanced') : undefined,
    };
  });
  return { totalSeats, slots };
}

export function LobbyView({
  roomState,
  connectionStatus,
  transportMode = 'socket',
  mySeatIndex,
  isSpectator,
  isHost,
  deepLinkRoomCode,
  savedPlayerName,
  onCreateRoom,
  onStartLocalGame,
  onJoinRoom,
  onSelectSeat,
  onUpdateRoomConfig,
  onSetReady,
  onStartGame,
  onLeaveRoom,
}: LobbyViewProps) {
  const [playerName, setPlayerName] = useState(savedPlayerName || 'เศรษฐีสยาม');
  const [joinCode, setJoinCode] = useState(deepLinkRoomCode ?? '');
  const [createSeats, setCreateSeats] = useState<2 | 3 | 4 | 5 | 6 | 7 | 8>(4);
  const [createPreset, setCreatePreset] = useState<'mixed' | 'allBots' | 'allHumans'>('mixed');
  const [busy, setBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (deepLinkRoomCode && !joinCode) {
      setJoinCode(deepLinkRoomCode);
    }
  }, [deepLinkRoomCode, joinCode]);

  const isConnected = connectionStatus === 'connected';

  const handleCreate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onCreateRoom(playerName, buildDefaultConfig(createSeats, createPreset));
    } finally {
      setBusy(false);
    }
  };

  const handleStartLocal = () => {
    if (busy) return;
    const localPreset = createPreset === 'allHumans' ? 'mixed' : createPreset;
    onStartLocalGame(playerName, buildDefaultConfig(createSeats, localPreset));
  };

  const handleJoin = async (asSpectator = false) => {
    if (busy || !isConnected || !joinCode.trim()) return;
    setBusy(true);
    try {
      await onJoinRoom(joinCode.trim().toUpperCase(), playerName, undefined, asSpectator);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCode = async () => {
    if (!roomState) return;
    try {
      await navigator.clipboard.writeText(roomState.roomId);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleCopyInviteLink = async () => {
    if (!roomState) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomState.roomId);
      await navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const applySeatCount = (nextCount: 2 | 3 | 4 | 5 | 6 | 7 | 8) => {
    if (!roomState || !isHost) return;
    const slots: PlayerSlotConfig[] = Array.from({ length: nextCount }, (_, idx) => {
      const existing = roomState.config.slots[idx];
      if (existing) return existing;
      return {
        seatIndex: idx,
        kind: 'bot',
        name: BOT_DEFAULT_NAMES[idx % BOT_DEFAULT_NAMES.length],
        botStyle: 'balanced',
      };
    });
    void onUpdateRoomConfig({ totalSeats: nextCount, slots });
  };

  const updateSingleSlot = (seatIndex: number, patch: Partial<PlayerSlotConfig>) => {
    if (!roomState || !isHost) return;
    const slots: PlayerSlotConfig[] = Array.from({ length: roomState.config.totalSeats }, (_, idx) => {
      const base: PlayerSlotConfig = roomState.config.slots[idx] ?? {
        seatIndex: idx,
        kind: 'bot',
        name: BOT_DEFAULT_NAMES[idx % BOT_DEFAULT_NAMES.length],
        botStyle: 'balanced',
      };
      if (idx !== seatIndex) return base;
      const nextKind = patch.kind ?? base.kind;
      return {
        ...base,
        ...patch,
        seatIndex: idx,
        kind: nextKind,
        name:
          patch.name !== undefined
            ? patch.name
            : nextKind === 'bot'
              ? base.name || BOT_DEFAULT_NAMES[idx % BOT_DEFAULT_NAMES.length]
              : undefined,
        botStyle: nextKind === 'bot' ? (patch.botStyle ?? base.botStyle ?? 'balanced') : undefined,
      };
    });
    void onUpdateRoomConfig({ totalSeats: roomState.config.totalSeats, slots });
  };

  const setAllBotsMode = () => {
    if (!roomState || !isHost) return;
    void onUpdateRoomConfig(buildDefaultConfig(roomState.config.totalSeats, 'allBots'));
  };

  // Screen 1: No room yet — Create or Join
  if (!roomState) {
    return (
      <div className="min-h-dvh w-full bg-[radial-gradient(circle_at_top,#2a2117_0%,#17120c_65%,#0e0b08_100%)] px-4 py-6 text-amber-50 sm:py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          {/* Hero Banner */}
          <div className="board-bevel-outer relative overflow-hidden rounded-2xl bg-[#1C6B3A] p-4 sm:p-6">
            <div className="grid items-center gap-6 md:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-stone-950/60 px-3 py-1 text-xs font-semibold text-amber-200">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>กระดานคลาสสิก ๔๐ ช่อง • ๒๙ โฉนด • No. 9028</span>
                </div>
                <h1 className="retro-title-shadow font-[var(--font-display)] text-3xl font-extrabold tracking-tight text-amber-200 sm:text-5xl">
                  ซุปเปอร์เศรษฐี
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-amber-50/90 sm:text-base">
                  เกมเศรษฐีกระดานไทยระดับตำนาน ออนไลน์แบบเรียลไทม์ รองรับ ๒–๘ ที่นั่ง
                  ปรับแต่งได้อิสระทั้งผู้เล่นจริง AI บอท และโหมดผู้ชมบอทล้วน พร้อมนายธนาคารดูแลบัญชี
                </p>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
                      isConnected
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-400/40'
                        : 'bg-amber-950/80 text-amber-200 border border-amber-400/40'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    {connectionStatus === 'connected'
                      ? transportMode === 'p2p'
                        ? 'พร้อมสร้างห้องออนไลน์ (P2P)'
                        : 'เชื่อมต่อเซิร์ฟเวอร์แล้ว'
                      : connectionStatus === 'connecting'
                        ? 'กำลังเตรียมระบบห้องออนไลน์...'
                        : 'ขาดการเชื่อมต่อ กำลังลองใหม่...'}
                  </span>
                  <span className="rounded-full border border-amber-300/30 bg-stone-950/50 px-2.5 py-1 text-amber-100">
                    ทุนเริ่มต้น <span className="mono-num font-bold">฿15,000</span>
                  </span>
                  <span className="rounded-full border border-amber-300/30 bg-stone-950/50 px-2.5 py-1 text-amber-100">
                    ไม่มีจับเวลาเทิร์น
                  </span>
                </div>
              </div>

              <div className="mx-auto w-full max-w-[240px] sm:max-w-[270px]">
                <div className="board-bevel-outer aspect-square overflow-hidden rounded-xl border-2 border-amber-950">
                  <BoardCenterArt className="h-full w-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Player Name Input Card */}
          <div className="cardstock-texture deed-card-bevel rounded-2xl border-2 border-[#2a2118] p-4 text-[#1c1814] sm:p-5">
            <label className="block text-sm font-bold text-[#2a2118]">
              ชื่อผู้เล่นของคุณ
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                maxLength={24}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="กรอกชื่อที่ต้องการแสดงบนกระดาน"
                className="w-full rounded-xl border-2 border-[#2a2118]/40 bg-white/90 px-3.5 py-2.5 font-semibold text-[#1c1814] placeholder:text-stone-400 focus:border-[#1b7a43] focus:outline-none"
              />
              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[#2a2118]/20 bg-[#ede1c4]/80 px-3 py-2 text-xs font-medium text-stone-700">
                <BankerAvatar size={28} />
                <span>นายธนาคารพร้อมแจกธนบัตร!</span>
              </div>
            </div>
          </div>

          {/* Two Action Columns: Create vs Join */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Create Room Card */}
            <div className="cardstock-texture deed-card-bevel flex flex-col justify-between rounded-2xl border-2 border-[#2a2118] p-5 text-[#1c1814]">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b7a43] text-amber-100 shadow">
                    <PlusCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-[var(--font-display)] text-xl font-bold">
                      สร้างห้องใหม่
                    </h2>
                    <p className="text-xs text-stone-600">
                      กำหนดจำนวนที่นั่ง 2–8 คน และสลับคน/บอทได้ในห้อง
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-stone-700">
                    จำนวนผู้เล่น (ที่นั่ง)
                  </span>
                  <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
                    {([2, 3, 4, 5, 6, 7, 8] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCreateSeats(n)}
                        className={`tactile-btn rounded-xl border-2 font-bold ${
                          createSeats === n
                            ? 'border-[#1b7a43] bg-[#1b7a43] text-amber-50 shadow'
                            : 'border-[#2a2118]/25 bg-white/75 text-[#1c1814] hover:bg-white'
                        }`}
                      >
                        <span className="mono-num text-base">{n}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-stone-700">
                    รูปแบบห้องเริ่มต้น
                  </span>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'mixed', label: 'คน + บอท' },
                      { id: 'allHumans', label: 'ผู้เล่นล้วน' },
                      { id: 'allBots', label: 'บอทล้วน (ชม)' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCreatePreset(opt.id as 'mixed' | 'allBots' | 'allHumans')}
                        className={`tactile-btn rounded-xl border-2 px-2 py-2 font-semibold ${
                          createPreset === opt.id
                            ? 'border-[#c8232c] bg-[#c8232c] text-white shadow'
                            : 'border-[#2a2118]/25 bg-white/75 text-stone-800 hover:bg-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                <button
                  type="button"
                  disabled={!isConnected || busy}
                  onClick={handleCreate}
                  className="tactile-btn flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#143d25] bg-[#1b7a43] px-4 py-3 font-bold text-amber-50 shadow-md hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlusCircle className="h-5 w-5" />
                  <span>{busy ? 'กำลังสร้างห้อง...' : 'สร้างห้องออนไลน์'}</span>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={handleStartLocal}
                  className="tactile-btn flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-900/60 bg-gradient-to-r from-[#8b5e1a] to-[#a97222] px-4 py-3 font-bold text-amber-50 shadow-md hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Bot className="h-5 w-5" />
                  <span>เล่นทันทีบนเบราว์เซอร์ (AI บอท)</span>
                </button>
              </div>
            </div>

            {/* Join Room Card */}
            <div className="cardstock-texture deed-card-bevel flex flex-col justify-between rounded-2xl border-2 border-[#2a2118] p-5 text-[#1c1814]">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1c4e8a] text-amber-100 shadow">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-[var(--font-display)] text-xl font-bold">
                      เข้าร่วมห้องด้วยรหัส
                    </h2>
                    <p className="text-xs text-stone-600">
                      กรอกรหัสห้อง 6 ตัวอักษร หรือเปิดลิงก์เชิญจากเพื่อน
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-stone-700">
                    รหัสห้อง (Room Code)
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="เช่น RICH88"
                    className="mono-num mt-2 w-full rounded-xl border-2 border-[#2a2118]/40 bg-white/90 px-4 py-3 text-center text-xl font-extrabold uppercase tracking-[0.22em] text-[#1c1814] placeholder:tracking-normal placeholder:font-normal placeholder:text-stone-400 focus:border-[#1c4e8a] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!isConnected || busy || joinCode.trim().length < 4}
                  onClick={() => handleJoin(false)}
                  className="tactile-btn flex items-center justify-center gap-2 rounded-xl border-2 border-[#12335c] bg-[#1c4e8a] px-4 py-3 font-bold text-white shadow-md hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Users className="h-4 w-4" />
                  <span>เข้าร่วมเล่น</span>
                </button>
                <button
                  type="button"
                  disabled={!isConnected || busy || joinCode.trim().length < 4}
                  onClick={() => handleJoin(true)}
                  className="tactile-btn flex items-center justify-center gap-2 rounded-xl border-2 border-[#2a2118]/40 bg-[#ede1c4] px-4 py-3 font-bold text-[#1c1814] shadow-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" />
                  <span>เข้าชม (Spectator)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 2: Inside Room Lobby — Custom Room Builder
  const mySeat = mySeatIndex !== null ? roomState.seats[mySeatIndex] : undefined;
  const allBotsRoom = roomState.seats.every((s) => s.kind === 'bot');
  const humanSeats = roomState.seats.filter((s) => s.kind === 'human');
  const allOccupiedHumansReady = humanSeats.every((s) => !s.occupiedBySocketId || s.ready);
  const canHostStart =
    isHost &&
    roomState.seats.length >= 2 &&
    (allBotsRoom ||
      (humanSeats.some((s) => Boolean(s.occupiedBySocketId)) && allOccupiedHumansReady));

  return (
    <div className="min-h-dvh w-full bg-[radial-gradient(circle_at_top,#2a2117_0%,#17120c_65%,#0e0b08_100%)] px-3 py-4 text-amber-50 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        {/* Top Lobby Header */}
        <div className="board-bevel-outer flex flex-col justify-between gap-4 rounded-2xl bg-[#1C6B3A] p-4 sm:flex-row sm:items-center sm:p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-amber-300 px-2 py-0.5 text-xs font-extrabold text-stone-950">
                ห้องรอเริ่มเกม
              </span>
              {isHost && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-300/60 bg-stone-950/60 px-2 py-0.5 text-xs font-semibold text-amber-200">
                  <Crown className="h-3.5 w-3.5 text-amber-300" />
                  คุณเป็นเจ้าบ้าน
                </span>
              )}
              {isSpectator && (
                <span className="inline-flex items-center gap-1 rounded-md border border-sky-300/50 bg-sky-950/70 px-2 py-0.5 text-xs font-semibold text-sky-200">
                  <Eye className="h-3.5 w-3.5" />
                  โหมดผู้ชม
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-[var(--font-display)] text-2xl font-extrabold text-amber-100 sm:text-3xl">
                รหัสห้อง:{' '}
                <span className="mono-num tracking-widest text-amber-300">
                  {roomState.roomId}
                </span>
              </h1>
              <button
                type="button"
                onClick={handleCopyCode}
                className="tactile-btn inline-flex items-center gap-1.5 rounded-lg border border-amber-300/50 bg-stone-950/60 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-stone-900"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? 'คัดลอกแล้ว' : 'คัดลอกรหัส'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="tactile-btn inline-flex items-center gap-1.5 rounded-lg border border-amber-300/50 bg-stone-950/60 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-stone-900"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์เชิญ'}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="tactile-btn inline-flex items-center justify-center gap-1.5 self-start rounded-xl border border-rose-300/40 bg-rose-950/80 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-900 sm:self-center"
          >
            <LogOut className="h-4 w-4" />
            <span>ออกจากห้อง</span>
          </button>
        </div>

        {/* Host Custom Room Builder Controls */}
        <div className="cardstock-texture deed-card-bevel rounded-2xl border-2 border-[#2a2118] p-4 text-[#1c1814] sm:p-5">
          <div className="flex flex-col justify-between gap-4 border-b border-[#2a2118]/15 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-[var(--font-display)] text-lg font-bold">
                ตั้งค่าที่นั่ง & ตัวเดิน (2–8 ที่นั่ง)
              </h2>
              <p className="text-xs text-stone-600">
                {isHost
                  ? 'เจ้าบ้านสามารถเปลี่ยนจำนวนที่นั่ง สลับระหว่างผู้เล่นจริงกับ AI บอท และปรับนิสัยบอทได้ทุกช่อง'
                  : 'คลิกที่นั่ง "ผู้เล่นจริง" ที่ยังว่างเพื่อเปลี่ยนตัวเดินและสีของคุณ'}
              </p>
            </div>

            {isHost && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-stone-700">จำนวนที่นั่ง:</span>
                {([2, 3, 4, 5, 6, 7, 8] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => applySeatCount(n)}
                    className={`tactile-btn rounded-lg border-2 px-3 py-1 text-sm font-bold ${
                      roomState.config.totalSeats === n
                        ? 'border-[#1b7a43] bg-[#1b7a43] text-white'
                        : 'border-[#2a2118]/25 bg-white/80 text-stone-800 hover:bg-white'
                    }`}
                  >
                    <span className="mono-num">{n}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={setAllBotsMode}
                  className="tactile-btn inline-flex items-center gap-1 rounded-lg border-2 border-amber-700/40 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950 hover:bg-amber-200"
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>ตั้งเป็นบอทล้วน</span>
                </button>
              </div>
            )}
          </div>

          {/* Seat Grid */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {roomState.seats.map((seat) => {
              const isMine = mySeatIndex === seat.seatIndex;
              const isBot = seat.kind === 'bot';
              const isOccupiedHuman = seat.kind === 'human' && Boolean(seat.occupiedBySocketId);
              const canClaimSeat = !isBot && !isOccupiedHuman && !isMine;
              const seatColor = seat.color || PLAYER_COLORS[seat.seatIndex % PLAYER_COLORS.length]!;
              const tokenName = TOKEN_NAMES[seat.tokenId % TOKEN_NAMES.length];

              return (
                <div
                  key={seat.seatIndex}
                  className={`flex flex-col justify-between rounded-xl border-2 p-3.5 transition ${
                    isMine
                      ? 'border-[#1b7a43] bg-emerald-50/90 shadow-md'
                      : 'border-[#2a2118]/20 bg-white/75'
                  }`}
                >
                  <div>
                    {/* Seat Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/15 bg-[#f7f0de] shadow-inner"
                          style={{ boxShadow: `inset 0 0 0 2px ${seatColor}33` }}
                        >
                          <PlayerToken tokenId={seat.tokenId} color={seatColor} size={34} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="mono-num text-xs font-bold text-stone-500">
                              ที่นั่ง #{seat.seatIndex + 1}
                            </span>
                            {roomState.hostSeatIndex === seat.seatIndex && !isBot && (
                              <Crown className="h-3.5 w-3.5 text-amber-600" />
                            )}
                            {isMine && (
                              <span className="rounded bg-[#1b7a43] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                คุณ
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-stone-700">
                            ตัวเดิน: {tokenName}
                          </div>
                        </div>
                      </div>

                      {/* Status badge */}
                      {isBot ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-bold text-purple-800">
                          <Bot className="h-3 w-3" />
                          AI บอท
                        </span>
                      ) : isOccupiedHuman ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            seat.ready
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {seat.ready ? 'พร้อมแล้ว' : 'รอพร้อม'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-600">
                          ว่าง
                        </span>
                      )}
                    </div>

                    {/* Seat Name / Bot Customization */}
                    <div className="mt-3 space-y-2">
                      {isBot ? (
                        isHost ? (
                          <>
                            <input
                              type="text"
                              maxLength={20}
                              value={seat.name}
                              onChange={(e) =>
                                updateSingleSlot(seat.seatIndex, { name: e.target.value })
                              }
                              aria-label={`ชื่อบอทที่นั่ง ${seat.seatIndex + 1}`}
                              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-stone-900 focus:border-[#1b7a43] focus:outline-none"
                            />
                            <select
                              value={seat.botStyle}
                              onChange={(e) =>
                                updateSingleSlot(seat.seatIndex, {
                                  botStyle: e.target.value as BotStyle,
                                })
                              }
                              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-800 focus:border-[#1b7a43] focus:outline-none"
                            >
                              {(Object.keys(BOT_STYLE_LABELS) as BotStyle[]).map((style) => (
                                <option key={style} value={style}>
                                  สไตล์: {BOT_STYLE_LABELS[style]}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <div className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-bold text-stone-800">
                            {seat.name}{' '}
                            <span className="text-xs font-normal text-stone-500">
                              ({BOT_STYLE_LABELS[seat.botStyle]})
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="rounded-lg bg-stone-100/90 px-3 py-2 text-sm font-bold text-stone-900">
                          {isOccupiedHuman ? seat.name : 'รอผู้เล่นเข้าร่วม...'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seat Footer Actions */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {isHost && (
                      <button
                        type="button"
                        disabled={isOccupiedHuman && !isMine && roomState.hostSeatIndex === seat.seatIndex}
                        onClick={() =>
                          updateSingleSlot(seat.seatIndex, {
                            kind: isBot ? 'human' : 'bot',
                          })
                        }
                        className="tactile-btn flex flex-1 items-center justify-center gap-1 rounded-lg border border-stone-300 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-40"
                      >
                        {isBot ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                        <span>{isBot ? 'เปลี่ยนเป็นคน' : 'เปลี่ยนเป็นบอท'}</span>
                      </button>
                    )}

                    {canClaimSeat && (
                      <button
                        type="button"
                        onClick={() => void onSelectSeat(seat.seatIndex, playerName)}
                        className="tactile-btn flex-1 rounded-lg border border-[#1c4e8a] bg-[#1c4e8a] px-2.5 py-1.5 text-xs font-bold text-white hover:brightness-110"
                      >
                        เลือกตัวเดินนี้
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Ready / Start Action Bar */}
          <div className="mt-5 flex flex-col items-stretch justify-between gap-3 border-t border-[#2a2118]/15 pt-4 sm:flex-row sm:items-center">
            <div className="text-xs text-stone-700">
              {allBotsRoom ? (
                <span className="font-semibold text-purple-800">
                  โหมดบอทล้วน + ผู้ชม: AI บอททั้งหมดจะเล่นอัตโนมัติทันทีเมื่อเริ่มเกม
                </span>
              ) : (
                <span>
                  ผู้เล่นจริงที่เข้าห้องแล้วต้องกด <strong>พร้อม</strong> ก่อนเจ้าบ้านกดเริ่มเกม
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {mySeat && (
                <button
                  type="button"
                  onClick={() => onSetReady(!mySeat.ready)}
                  className={`tactile-btn flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-2.5 font-bold shadow ${
                    mySeat.ready
                      ? 'border-emerald-700 bg-emerald-100 text-emerald-900'
                      : 'border-amber-600 bg-amber-400 text-stone-950 hover:bg-amber-300'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  <span>{mySeat.ready ? 'พร้อมแล้ว (คลิกเพื่อยกเลิก)' : 'กดพร้อม!'}</span>
                </button>
              )}

              {isHost && (
                <button
                  type="button"
                  disabled={!canHostStart}
                  onClick={() => void onStartGame()}
                  className="tactile-btn flex items-center justify-center gap-2 rounded-xl border-2 border-[#143d25] bg-[#1b7a43] px-6 py-2.5 font-bold text-amber-50 shadow-md hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>เริ่มเกมซุปเปอร์เศรษฐี!</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
