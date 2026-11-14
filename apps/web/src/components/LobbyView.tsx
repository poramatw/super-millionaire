import { useEffect, useState } from 'react';
import {
  BOARD_MAP_THEMES,
  BOT_DEFAULT_NAMES,
  DEFAULT_BOARD_MAP_THEME,
  DEFAULT_GAME_RULES,
  normalizeGameRules,
  PLAYER_COLORS,
  TOKEN_NAMES,
  type BoardMapTheme,
  type BotStyle,
  type GameRulesConfig,
  type PlayerSlotConfig,
  type RoomActionAck,
  type RoomConfig,
  type RoomJoinAck,
  type RoomState,
} from '@super-millionaire/shared';
import {
  Bot,
  Check,
  Clock,
  Copy,
  Crown,
  Eye,
  Flame,
  LogOut,
  Map as MapIcon,
  Play,
  PlusCircle,
  Sparkles,
  Trophy,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { BoardCenterArt, PlayerToken } from '../artwork';
import { Lobby3DPreview, type LobbyPreviewFocus } from './Lobby3DPreview';
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
    preferredTokenId?: number,
  ) => Promise<RoomJoinAck>;
  onSelectSeat: (
    seatIndex: number,
    playerName: string,
    preferredTokenId?: number,
  ) => Promise<RoomJoinAck>;
  onUpdateRoomConfig: (config: RoomConfig) => Promise<RoomActionAck>;
  onSetReady: (ready: boolean) => void;
  onStartGame: () => Promise<RoomActionAck>;
  onLeaveRoom: () => void;
}

const BOT_STYLE_LABELS: Record<BotStyle, string> = {
  aggressive: 'สายบุกดุดัน',
  balanced: 'สายสมดุล',
  cautious: 'สายรอบคอบ',
};

function extractRoomCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed);
      const param = parsed.searchParams.get('room');
      if (param) {
        return param.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
      }
    }
  } catch {
    // Fall through to regex extraction
  }
  const match = trimmed.match(/(?:[?&]room=|รหัสห้อง\s*:?\s*)([a-zA-Z0-9]{4,8})/i);
  if (match?.[1]) {
    return match[1].toUpperCase();
  }
  return trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
}

function buildDefaultConfig(
  totalSeats: 2 | 3 | 4 | 5 | 6 | 7 | 8 = 4,
  mode: 'mixed' | 'allBots' | 'allHumans' = 'mixed',
  forOnline = false,
  mapTheme: BoardMapTheme = DEFAULT_BOARD_MAP_THEME,
  hostTokenId = 0,
  rules: GameRulesConfig = DEFAULT_GAME_RULES,
): RoomConfig {
  const mixedHumanCount = forOnline && totalSeats >= 3 ? 2 : 1;
  const usedTokens = new Set<number>([hostTokenId]);
  const slots: PlayerSlotConfig[] = Array.from({ length: totalSeats }, (_, idx) => {
    const isBot =
      mode === 'allBots' ? true : mode === 'allHumans' ? false : idx >= mixedHumanCount;
    let tokenId = idx === 0 ? hostTokenId : idx % TOKEN_NAMES.length;
    if (idx !== 0) {
      while (usedTokens.has(tokenId)) {
        tokenId = (tokenId + 1) % TOKEN_NAMES.length;
      }
      usedTokens.add(tokenId);
    }
    return {
      seatIndex: idx,
      kind: isBot ? 'bot' : 'human',
      name: isBot ? BOT_DEFAULT_NAMES[idx % BOT_DEFAULT_NAMES.length] : undefined,
      botStyle: isBot ? (idx % 3 === 1 ? 'aggressive' : idx % 3 === 2 ? 'cautious' : 'balanced') : undefined,
      tokenId,
    };
  });
  return { totalSeats, mapTheme, rules: normalizeGameRules(rules), slots };
}

function GameRulesConfigurator({
  rules,
  readOnly = false,
  onChange,
}: {
  rules: GameRulesConfig;
  readOnly?: boolean;
  onChange: (next: GameRulesConfig) => void;
}) {
  const maxRoundOptions: Array<{ value: GameRulesConfig['maxRounds']; label: string }> = [
    { value: null, label: 'ไม่จำกัดรอบ' },
    { value: 20, label: '20 รอบ' },
    { value: 30, label: '30 รอบ' },
    { value: 40, label: '40 รอบ' },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-amber-400/25 bg-black/35 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-amber-200 uppercase">
          <Trophy className="h-3.5 w-3.5 text-amber-300" />
          ตั้งค่ากติกาพิเศษ & เงื่อนไขการชนะ
        </span>
        {readOnly && (
          <span className="text-[10px] text-stone-400">เจ้าบ้านเป็นผู้ปรับตั้งค่ากติกา</span>
        )}
      </div>

      {/* Round Limit Selector */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-stone-300">
          <span className="inline-flex items-center gap-1 font-semibold text-amber-100">
            <Clock className="h-3 w-3 text-amber-300" />
            จำกัดจำนวนรอบสูงสุด (ตัดสินด้วยทรัพย์สินสุทธิ)
          </span>
          <span className="mono-num font-bold text-emerald-300">
            {rules.maxRounds ? `${rules.maxRounds} รอบ` : 'เล่นจนกว่าจะล้มละลาย'}
          </span>
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-xl border border-amber-400/20 bg-stone-950/80 p-1 text-xs">
          {maxRoundOptions.map((opt) => {
            const active = rules.maxRounds === opt.value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                disabled={readOnly}
                onClick={() => onChange({ ...rules, maxRounds: opt.value })}
                className={`tactile-btn rounded-lg px-2 py-1.5 text-[11px] font-extrabold transition ${
                  active
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-stone-950 shadow'
                    : 'text-stone-300 hover:bg-white/5 hover:text-amber-100 disabled:opacity-60'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Mechanic Toggles */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => onChange({ ...rules, monopolyVictory: !rules.monopolyVictory })}
          className={`tactile-btn flex flex-col justify-between gap-1 rounded-xl border p-2.5 text-left transition ${
            rules.monopolyVictory
              ? 'border-emerald-400/70 bg-emerald-950/55 text-amber-50 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'border-stone-700/80 bg-stone-950/60 text-stone-400 hover:border-stone-500 disabled:opacity-60'
          }`}
        >
          <div className="flex w-full items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-100">
              <Trophy className="h-3.5 w-3.5 text-amber-300" />
              ชนะเมื่อผูกขาด
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                rules.monopolyVictory
                  ? 'bg-emerald-400 text-stone-950'
                  : 'bg-stone-800 text-stone-400'
              }`}
            >
              {rules.monopolyVictory ? 'เปิด' : 'ปิด'}
            </span>
          </div>
          <p className="text-[10px] leading-snug text-stone-300">
            ครองครบ 3 กลุ่มสี หรือครบ 5 โรงแรมใหญ่ ชนะเกมทันที
          </p>
        </button>

        <button
          type="button"
          disabled={readOnly}
          onClick={() => onChange({ ...rules, hostileTakeover: !rules.hostileTakeover })}
          className={`tactile-btn flex flex-col justify-between gap-1 rounded-xl border p-2.5 text-left transition ${
            rules.hostileTakeover
              ? 'border-amber-400/75 bg-amber-950/55 text-amber-50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
              : 'border-stone-700/80 bg-stone-950/60 text-stone-400 hover:border-stone-500 disabled:opacity-60'
          }`}
        >
          <div className="flex w-full items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-100">
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              ซื้อฮุบที่ดิน 2×
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                rules.hostileTakeover
                  ? 'bg-amber-400 text-stone-950'
                  : 'bg-stone-800 text-stone-400'
              }`}
            >
              {rules.hostileTakeover ? 'เปิด' : 'ปิด'}
            </span>
          </div>
          <p className="text-[10px] leading-snug text-stone-300">
            เมื่อตกที่ดินคู่แข่งที่ยังไม่มีโรงแรม จ่าย 2× ซื้อโฉนดต่อได้ทันที
          </p>
        </button>

        <button
          type="button"
          disabled={readOnly}
          onClick={() => onChange({ ...rules, escalatingRent: !rules.escalatingRent })}
          className={`tactile-btn flex flex-col justify-between gap-1 rounded-xl border p-2.5 text-left transition ${
            rules.escalatingRent
              ? 'border-orange-400/75 bg-orange-950/55 text-amber-50 shadow-[0_0_12px_rgba(249,115,22,0.2)]'
              : 'border-stone-700/80 bg-stone-950/60 text-stone-400 hover:border-stone-500 disabled:opacity-60'
          }`}
        >
          <div className="flex w-full items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-100">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              ค่าเช่าทวีคูณ
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                rules.escalatingRent
                  ? 'bg-orange-400 text-stone-950'
                  : 'bg-stone-800 text-stone-400'
              }`}
            >
              {rules.escalatingRent ? 'เปิด' : 'ปิด'}
            </span>
          </div>
          <p className="text-[10px] leading-snug text-stone-300">
            รอบที่ 15+ ค่าเช่า ×1.5 และรอบที่ 25+ ค่าเช่า ×2.0 เร่งเกมสนุกขึ้น
          </p>
        </button>
      </div>

      {/* Live Visual Rule & Victory Preview Card */}
      <div className="rounded-xl border border-amber-300/30 bg-gradient-to-r from-[#17281e]/95 via-[#1b1610]/95 to-[#17281e]/95 p-3">
        <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold text-amber-200">
          <span>ตัวอย่างเงื่อนไขชนะและกติกาของห้องนี้</span>
          <span className="rounded-full border border-emerald-400/40 bg-emerald-950/80 px-2 py-0.5 text-[9.5px] font-bold text-emerald-300">
            อัปเดตสด
          </span>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-1.5 text-[11px] sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/35 px-2.5 py-1.5">
            <Crown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
            <div>
              <div className="font-bold text-amber-100">ชนะด้วยการอยู่รอดคนสุดท้าย</div>
              <div className="text-[10px] text-stone-400">
                เมื่อผู้เล่นคนอื่นล้มละลายหมด เศรษฐีคนสุดท้ายชนะทันที
              </div>
            </div>
          </div>

          <div
            className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 ${
              rules.maxRounds
                ? 'border-amber-400/40 bg-amber-950/35'
                : 'border-white/5 bg-black/20 opacity-60'
            }`}
          >
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
            <div>
              <div className="font-bold text-amber-100">
                {rules.maxRounds
                  ? `ตัดสินเมื่อครบ ${rules.maxRounds} รอบ`
                  : 'ไม่จำกัดจำนวนรอบ'}
              </div>
              <div className="text-[10px] text-stone-300">
                {rules.maxRounds
                  ? 'เมื่อครบกำหนด ผู้ที่มีมูลค่าทรัพย์สินสุทธิสูงสุดชนะทันที'
                  : 'เล่นต่อเนื่องจนกว่าจะมีผู้ชนะตามเงื่อนไขอื่น'}
              </div>
            </div>
          </div>

          <div
            className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 ${
              rules.monopolyVictory
                ? 'border-emerald-400/40 bg-emerald-950/35'
                : 'border-white/5 bg-black/20 opacity-60'
            }`}
          >
            <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
            <div>
              <div className="font-bold text-amber-100">
                {rules.monopolyVictory
                  ? 'ชนะทันที: ครบ 3 สี หรือ 5 โรงแรมใหญ่'
                  : 'ปิดการชนะด้วยผูกขาด'}
              </div>
              <div className="text-[10px] text-stone-300">
                {rules.monopolyVictory
                  ? 'สะสมโฉนดครบ 3 กลุ่มสี หรือครบทั้ง 5 โรงแรมใหญ่เพื่อชนะทันที'
                  : 'การสะสมครบสีใช้เพื่อเพิ่มค่าเช่า ×2 และสร้างบ้านตามปกติ'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/35 px-2.5 py-1.5">
            <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-300" />
            <div>
              <div className="font-bold text-amber-100">
                กลเกมบนกระดาน:{' '}
                {rules.hostileTakeover && rules.escalatingRent
                  ? 'เทคโอเวอร์ 2× + ค่าเช่าทวีคูณ'
                  : rules.hostileTakeover
                    ? 'เทคโอเวอร์ 2×'
                    : rules.escalatingRent
                      ? 'ค่าเช่าทวีคูณ'
                      : 'กติกาคลาสสิกมาตรฐาน'}
              </div>
              <div className="text-[10px] text-stone-300">
                {rules.hostileTakeover ? 'ซื้อฮุบที่ดินคู่แข่งได้ในราคา 2× • ' : ''}
                {rules.escalatingRent ? 'ค่าเช่า ×1.5 (รอบ 15+) / ×2.0 (รอบ 25+)' : 'อัตราค่าเช่าคงที่'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [selectedMapTheme, setSelectedMapTheme] = useState<BoardMapTheme>(DEFAULT_BOARD_MAP_THEME);
  const [selectedTokenId, setSelectedTokenId] = useState<number>(0);
  const [selectedRules, setSelectedRules] = useState<GameRulesConfig>(() => ({
    ...DEFAULT_GAME_RULES,
  }));
  const [previewFocusMode, setPreviewFocusMode] = useState<LobbyPreviewFocus>('character');
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
      await onCreateRoom(
        playerName,
        buildDefaultConfig(
          createSeats,
          createPreset,
          true,
          selectedMapTheme,
          selectedTokenId,
          selectedRules,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleStartLocal = () => {
    if (busy) return;
    const localPreset = createPreset === 'allHumans' ? 'mixed' : createPreset;
    onStartLocalGame(
      playerName,
      buildDefaultConfig(
        createSeats,
        localPreset,
        false,
        selectedMapTheme,
        selectedTokenId,
        selectedRules,
      ),
    );
  };

  const handleJoin = async (asSpectator = false) => {
    const normalizedCode = extractRoomCode(joinCode);
    if (busy || !isConnected || normalizedCode.length < 4) return;
    setBusy(true);
    try {
      await onJoinRoom(normalizedCode, playerName, undefined, asSpectator, selectedTokenId);
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
      const existingSeat = roomState.seats[idx];
      if (existing) {
        return {
          ...existing,
          tokenId: existingSeat?.tokenId ?? existing.tokenId ?? idx % TOKEN_NAMES.length,
        };
      }
      return {
        seatIndex: idx,
        kind: 'bot',
        name: BOT_DEFAULT_NAMES[idx % BOT_DEFAULT_NAMES.length],
        botStyle: 'balanced',
        tokenId: idx % TOKEN_NAMES.length,
      };
    });
    void onUpdateRoomConfig({
      totalSeats: nextCount,
      mapTheme: roomState.config.mapTheme ?? DEFAULT_BOARD_MAP_THEME,
      rules: normalizeGameRules(roomState.config.rules),
      slots,
    });
  };

  const applyRoomMapTheme = (mapTheme: BoardMapTheme) => {
    if (!roomState || !isHost) return;
    const slots: PlayerSlotConfig[] = roomState.seats.map((seat) => ({
      seatIndex: seat.seatIndex,
      kind: seat.kind,
      name: seat.name,
      botStyle: seat.kind === 'bot' ? seat.botStyle : undefined,
      tokenId: seat.tokenId,
    }));
    void onUpdateRoomConfig({
      totalSeats: roomState.config.totalSeats,
      mapTheme,
      rules: normalizeGameRules(roomState.config.rules),
      slots,
    });
  };

  const applyRoomRules = (rules: GameRulesConfig) => {
    if (!roomState || !isHost) return;
    const slots: PlayerSlotConfig[] = roomState.seats.map((seat) => ({
      seatIndex: seat.seatIndex,
      kind: seat.kind,
      name: seat.name,
      botStyle: seat.kind === 'bot' ? seat.botStyle : undefined,
      tokenId: seat.tokenId,
    }));
    void onUpdateRoomConfig({
      totalSeats: roomState.config.totalSeats,
      mapTheme: roomState.config.mapTheme ?? DEFAULT_BOARD_MAP_THEME,
      rules: normalizeGameRules(rules),
      slots,
    });
  };

  const updateSingleSlot = (seatIndex: number, patch: Partial<PlayerSlotConfig>) => {
    if (!roomState || !isHost) return;
    const slots: PlayerSlotConfig[] = Array.from({ length: roomState.config.totalSeats }, (_, idx) => {
      const seat = roomState.seats[idx];
      const base: PlayerSlotConfig = roomState.config.slots[idx] ?? {
        seatIndex: idx,
        kind: seat?.kind ?? 'bot',
        name: seat?.name ?? BOT_DEFAULT_NAMES[idx % BOT_DEFAULT_NAMES.length],
        botStyle: seat?.botStyle ?? 'balanced',
        tokenId: seat?.tokenId ?? idx % TOKEN_NAMES.length,
      };
      if (idx !== seatIndex) {
        return {
          ...base,
          tokenId: seat?.tokenId ?? base.tokenId ?? idx % TOKEN_NAMES.length,
        };
      }
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
        tokenId: patch.tokenId ?? seat?.tokenId ?? base.tokenId ?? idx % TOKEN_NAMES.length,
      };
    });
    void onUpdateRoomConfig({
      totalSeats: roomState.config.totalSeats,
      mapTheme: roomState.config.mapTheme ?? DEFAULT_BOARD_MAP_THEME,
      rules: normalizeGameRules(roomState.config.rules),
      slots,
    });
  };

  const setAllBotsMode = () => {
    if (!roomState || !isHost) return;
    void onUpdateRoomConfig(
      buildDefaultConfig(
        roomState.config.totalSeats,
        'allBots',
        false,
        roomState.config.mapTheme ?? DEFAULT_BOARD_MAP_THEME,
        0,
        normalizeGameRules(roomState.config.rules),
      ),
    );
  };

  // Screen 1: No room yet — Vintage Velvet & Brass Salon Console
  if (!roomState) {
    return (
      <div className="tabletop-felt min-h-dvh w-full px-3 py-5 text-amber-50 sm:px-6 sm:py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
          {/* Minimalist Salon Header Bar */}
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/20 pb-3.5">
            <div className="flex items-baseline gap-2.5">
              <span className="font-[var(--font-display)] text-lg font-extrabold tracking-tight text-amber-200">
                ซุปเปอร์เศรษฐี
              </span>
              <span className="mono-num text-xs font-semibold tracking-wider text-amber-300/70">
                No. 9028
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                  isConnected
                    ? 'border-emerald-400/35 bg-emerald-950/60 text-emerald-300'
                    : 'border-amber-400/35 bg-amber-950/60 text-amber-200'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`}
                />
                {connectionStatus === 'connected'
                  ? transportMode === 'p2p'
                    ? 'P2P ออนไลน์พร้อมเล่น'
                    : 'เชื่อมต่อเซิร์ฟเวอร์แล้ว'
                  : connectionStatus === 'connecting'
                    ? 'กำลังเตรียมระบบ...'
                    : 'กำลังเชื่อมต่อใหม่...'}
              </span>
            </div>
          </header>

          {/* Unified Velvet & Brass Salon Table Console */}
          <section className="luxury-glass-panel overflow-hidden rounded-2xl">
            {/* Editorial Masthead & Brass-Framed Board Medallion */}
            <div className="grid items-center gap-6 border-b border-amber-400/15 px-5 py-6 md:grid-cols-[1.3fr_220px] md:px-7">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.2em] text-amber-300/75 uppercase">
                    กระดานไทยคลาสสิก ๔๐ ช่อง • ๒๙ โฉนด • ทุน ฿15,000
                  </p>
                  <h1 className="retro-title-shadow mt-1 font-[var(--font-display)] text-3xl font-extrabold tracking-tight text-amber-100 sm:text-4xl">
                    โต๊ะเกมซุปเปอร์เศรษฐี
                  </h1>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-amber-100/75">
                    สร้างห้องออนไลน์ชวนเพื่อนด้วยรหัส หรือท้าดวล AI บอท 2–8 ที่นั่งทันทีบนเบราว์เซอร์
                  </p>
                </div>

                {/* Inline Player Name Brass Strip */}
                <div className="max-w-md">
                  <label
                    htmlFor="lobby-player-name"
                    className="mb-1.5 block text-xs font-bold tracking-wide text-amber-200/85"
                  >
                    ชื่อผู้เล่นของคุณ
                  </label>
                  <div className="relative flex items-center">
                    <User className="pointer-events-none absolute left-3 h-4 w-4 text-amber-300/65" />
                    <input
                      id="lobby-player-name"
                      type="text"
                      maxLength={24}
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="กรอกชื่อที่แสดงบนโต๊ะเกม"
                      className="w-full rounded-xl border border-amber-400/30 bg-black/40 py-2.5 pr-3.5 pl-9 text-base font-semibold text-amber-50 placeholder:text-stone-500 focus:border-amber-300 focus:outline-none sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Vintage Brass-Rimmed Board Medallion */}
              <div className="mx-auto w-40 shrink-0 sm:w-48 md:w-[210px]">
                <div className="aspect-square overflow-hidden rounded-xl border border-amber-400/45 bg-stone-950 p-1 shadow-[0_14px_34px_rgba(0,0,0,0.55)]">
                  <BoardCenterArt className="h-full w-full rounded-lg" />
                </div>
              </div>
            </div>

            {/* Split Action Wing: Host Table vs Join by Code */}
            <div className="grid divide-y divide-amber-400/15 md:grid-cols-[1.25fr_0.95fr] md:divide-x md:divide-y-0">
              {/* Left Wing: Setup & Launch */}
              <div className="flex flex-col justify-between gap-5 p-5 sm:p-7">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <PlusCircle className="h-5 w-5 text-emerald-400" />
                    <div>
                      <h2 className="font-[var(--font-display)] text-lg font-bold text-amber-100">
                        เปิดโต๊ะเล่นใหม่
                      </h2>
                      <p className="text-xs text-stone-400">
                        ปรับจำนวนที่นั่ง 2–8 คน และสลับคน/บอทได้ละเอียดในห้องรอ
                      </p>
                    </div>
                  </div>

                  {/* Unified Segmented Seat Strip */}
                  <div>
                    <span className="text-[11px] font-bold tracking-wider text-amber-200/75 uppercase">
                      จำนวนที่นั่งบนกระดาน
                    </span>
                    <div className="mt-2 grid grid-cols-7 gap-1 rounded-xl border border-amber-400/20 bg-black/35 p-1">
                      {([2, 3, 4, 5, 6, 7, 8] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setCreateSeats(n)}
                          className={`tactile-btn flex items-center justify-center rounded-lg text-sm font-extrabold transition ${
                            createSeats === n
                              ? 'bg-gradient-to-b from-[#228d4f] to-[#155e34] text-amber-50 shadow-[0_2px_10px_rgba(16,185,129,0.3)]'
                              : 'text-stone-300 hover:bg-white/5 hover:text-amber-100'
                          }`}
                        >
                          <span className="mono-num">{n}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Unified Segmented Preset Strip */}
                  <div>
                    <span className="text-[11px] font-bold tracking-wider text-amber-200/75 uppercase">
                      รูปแบบผู้เล่นเริ่มต้น
                    </span>
                    <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl border border-amber-400/20 bg-black/35 p-1 text-xs">
                      {[
                        { id: 'mixed', label: 'คน + บอท' },
                        { id: 'allHumans', label: 'ผู้เล่นล้วน' },
                        { id: 'allBots', label: 'บอทล้วน' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setCreatePreset(opt.id as 'mixed' | 'allBots' | 'allHumans')}
                          className={`tactile-btn rounded-lg px-2 py-2 font-bold transition ${
                            createPreset === opt.id
                              ? 'bg-amber-400 text-stone-950 shadow'
                              : 'text-stone-300 hover:bg-white/5 hover:text-amber-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live 3D Interactive Preview of Selected Character & Map */}
                  <Lobby3DPreview
                    mapTheme={selectedMapTheme}
                    tokenId={selectedTokenId}
                    playerColor={PLAYER_COLORS[selectedTokenId % PLAYER_COLORS.length]!}
                    focusMode={previewFocusMode}
                    onChangeFocusMode={setPreviewFocusMode}
                  />

                  {/* Character Pawn Picker */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-amber-200/85 uppercase">
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                        เลือกตัวละครหมากของคุณ
                      </span>
                      <span className="text-xs font-bold text-emerald-300">
                        {TOKEN_NAMES[selectedTokenId]}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                      {TOKEN_NAMES.map((tName, idx) => {
                        const active = selectedTokenId === idx;
                        return (
                          <button
                            key={tName}
                            type="button"
                            onClick={() => {
                              setSelectedTokenId(idx);
                              setPreviewFocusMode('character');
                            }}
                            className={`tactile-btn flex flex-col items-center gap-1 rounded-xl border p-1.5 text-center transition ${
                              active
                                ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                                : 'border-amber-400/20 bg-black/35 hover:border-amber-300/45 hover:bg-white/5'
                            }`}
                          >
                            <PlayerToken
                              tokenId={idx}
                              color={PLAYER_COLORS[idx % PLAYER_COLORS.length]!}
                              size={32}
                            />
                            <span className="line-clamp-1 text-[10px] font-bold text-amber-100">
                              {tName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Surrounding Map Theme Selector */}
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-amber-200/85 uppercase">
                      <MapIcon className="h-3.5 w-3.5 text-amber-300" />
                      เลือกฉากแผนที่รอบกระดาน
                    </span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {BOARD_MAP_THEMES.map((theme) => {
                        const active = selectedMapTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => {
                              setSelectedMapTheme(theme.id);
                              setPreviewFocusMode('map');
                            }}
                            className={`tactile-btn flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition ${
                              active
                                ? 'border-amber-300 bg-amber-950/55 shadow-[0_0_14px_rgba(245,158,11,0.25)]'
                                : 'border-amber-400/20 bg-black/35 hover:border-amber-300/40 hover:bg-white/5'
                            }`}
                          >
                            <span className="mt-0.5 flex h-6 shrink-0 items-center justify-center rounded-md border border-amber-300/35 bg-black/50 px-1.5 text-[10px] font-bold text-amber-200">
                              {theme.badge}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-extrabold text-amber-100">
                                {theme.name}
                              </div>
                              <div className="line-clamp-1 text-[10px] text-stone-300">
                                {theme.subtitle}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Game Rules & Live Victory Condition Preview */}
                  <GameRulesConfigurator
                    rules={selectedRules}
                    onChange={setSelectedRules}
                  />
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!isConnected || busy}
                    onClick={handleCreate}
                    className="tactile-btn flex items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-gradient-to-b from-[#228d4f] to-[#145831] px-4 py-3 text-sm font-extrabold text-amber-50 shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PlusCircle className="h-4 w-4 shrink-0" />
                    <span>{busy ? 'กำลังสร้างห้อง...' : 'สร้างห้องออนไลน์'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleStartLocal}
                    className="tactile-btn flex items-center justify-center gap-2 rounded-xl border border-amber-300/45 bg-gradient-to-b from-[#9c691e] to-[#6e460f] px-4 py-3 text-sm font-extrabold text-amber-50 shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Bot className="h-4 w-4 shrink-0" />
                    <span>เล่นทันทีกับบอท</span>
                  </button>
                </div>
              </div>

              {/* Right Wing: Join Room by Invite Code */}
              <div className="flex flex-col justify-between gap-5 bg-black/20 p-5 sm:p-7">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <Users className="h-5 w-5 text-sky-400" />
                    <div>
                      <h2 className="font-[var(--font-display)] text-lg font-bold text-amber-100">
                        เข้าร่วมด้วยรหัสห้อง
                      </h2>
                      <p className="text-xs text-stone-400">
                        กรอกรหัส 6 ตัว หรือวางลิงก์เชิญที่ได้รับจากเพื่อน
                      </p>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="lobby-room-code"
                      className="text-[11px] font-bold tracking-wider text-amber-200/75 uppercase"
                    >
                      รหัสห้องเชิญ
                    </label>
                    <input
                      id="lobby-room-code"
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(extractRoomCode(e.target.value))}
                      placeholder="RICH88 หรือวางลิงก์"
                      className="mono-num mt-2 w-full rounded-xl border border-amber-400/30 bg-black/45 px-4 py-3 text-center text-base font-extrabold uppercase tracking-[0.2em] text-amber-100 placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-stone-500 focus:border-sky-400 focus:outline-none sm:text-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!isConnected || busy || joinCode.trim().length < 4}
                    onClick={() => handleJoin(false)}
                    className="tactile-btn flex items-center justify-center gap-2 rounded-xl border border-sky-400/50 bg-gradient-to-b from-[#205899] to-[#153c6b] px-4 py-3 text-sm font-extrabold text-white shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Users className="h-4 w-4" />
                    <span>เข้าร่วมเล่น</span>
                  </button>
                  <button
                    type="button"
                    disabled={!isConnected || busy || joinCode.trim().length < 4}
                    onClick={() => handleJoin(true)}
                    className="tactile-btn flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-black/35 px-4 py-3 text-sm font-bold text-amber-100 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Eye className="h-4 w-4" />
                    <span>เข้าชมโต๊ะ</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // Screen 2: Inside Room Lobby — Velvet & Brass Staging Salon
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
    <div className="tabletop-felt min-h-dvh w-full px-3 py-4 text-amber-50 sm:px-6 sm:py-7">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        {/* Room Staging Header */}
        <header className="luxury-glass-panel flex flex-col justify-between gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:px-6 sm:py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-amber-400/20 px-2 py-0.5 font-bold text-amber-200 ring-1 ring-amber-400/40">
                ห้องรอเริ่มเกม
              </span>
              {isHost && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-black/40 px-2 py-0.5 font-semibold text-amber-200">
                  <Crown className="h-3.5 w-3.5 text-amber-300" />
                  คุณเป็นเจ้าบ้าน
                </span>
              )}
              {isSpectator && (
                <span className="inline-flex items-center gap-1 rounded-md border border-sky-400/40 bg-sky-950/60 px-2 py-0.5 font-semibold text-sky-200">
                  <Eye className="h-3.5 w-3.5" />
                  โหมดผู้ชม
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              <h1 className="font-[var(--font-display)] text-2xl font-extrabold text-amber-100 sm:text-3xl">
                รหัสห้อง{' '}
                <span className="mono-num tracking-widest text-amber-300">
                  {roomState.roomId}
                </span>
              </h1>
              <button
                type="button"
                onClick={handleCopyCode}
                className="tactile-btn inline-flex items-center gap-1.5 rounded-lg border border-amber-400/35 bg-black/40 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-white/10"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? 'คัดลอกแล้ว' : 'คัดลอกรหัส'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="tactile-btn inline-flex items-center gap-1.5 rounded-lg border border-amber-400/35 bg-black/40 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-white/10"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์เชิญ'}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="tactile-btn inline-flex items-center justify-center gap-1.5 self-start rounded-xl border border-rose-400/40 bg-rose-950/70 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-900 sm:self-center"
          >
            <LogOut className="h-4 w-4" />
            <span>ออกจากห้อง</span>
          </button>
        </header>

        {/* Velvet & Brass Seat Staging Console */}
        <section className="luxury-glass-panel rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-4 border-b border-amber-400/15 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-amber-100">
                ตั้งค่าที่นั่ง & ตัวเดิน
              </h2>
              <p className="text-xs text-stone-400">
                {isHost
                  ? 'เปลี่ยนจำนวนที่นั่ง สลับระหว่างผู้เล่นจริงกับ AI บอท และเลือกสไตล์บอทได้ทุกช่อง'
                  : 'คลิกที่นั่งผู้เล่นจริงที่ยังว่างเพื่อเปลี่ยนตัวเดินและสีของคุณ'}
              </p>
            </div>

            {isHost && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border border-amber-400/20 bg-black/40 p-1">
                  {([2, 3, 4, 5, 6, 7, 8] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => applySeatCount(n)}
                      className={`tactile-btn rounded-lg px-2.5 py-1 text-sm font-bold ${
                        roomState.config.totalSeats === n
                          ? 'bg-emerald-700 text-white shadow'
                          : 'text-stone-300 hover:bg-white/5 hover:text-amber-100'
                      }`}
                    >
                      <span className="mono-num">{n}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={setAllBotsMode}
                  className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border border-amber-400/35 bg-black/40 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-white/10"
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>บอทล้วน</span>
                </button>
              </div>
            )}
          </div>

          {isSpectator && (
            <div className="mt-3 rounded-xl border border-sky-400/35 bg-sky-950/60 px-3.5 py-2.5 text-xs font-semibold text-sky-100">
              {humanSeats.some((s) => !s.occupiedBySocketId)
                ? 'คุณอยู่ในโหมดผู้ชม — กดปุ่ม "เลือกตัวเดินนี้" ในที่นั่งคนว่างด้านล่างเพื่อลงเล่นได้เลย'
                : 'คุณอยู่ในโหมดผู้ชม (ยังไม่มีที่นั่งผู้เล่นจริงว่าง) — กรุณาให้เจ้าบ้านกด "เปลี่ยนเป็นคน" ในช่อง AI บอท แล้วกด "เลือกตัวเดินนี้"'}
            </div>
          )}

          {isHost &&
            !allBotsRoom &&
            humanSeats.every((s) => Boolean(s.occupiedBySocketId)) &&
            roomState.seats.some((s) => s.kind === 'bot') && (
              <div className="mt-3 rounded-xl border border-amber-400/35 bg-amber-950/50 px-3.5 py-2 text-xs font-semibold text-amber-100">
                ตอนนี้ไม่มีที่นั่งผู้เล่นจริงว่าง — หากต้องการให้เพื่อนเพิ่มเข้าเล่น กรุณากด "เปลี่ยนเป็นคน" ในช่อง AI บอทด้านล่าง
              </div>
            )}

          {/* Live 3D Preview + Map Theme Selector & Character Picker in Waiting Room */}
          <div className="mt-4 space-y-3 rounded-xl border border-amber-400/20 bg-black/30 p-3.5">
            <Lobby3DPreview
              mapTheme={roomState.config.mapTheme ?? DEFAULT_BOARD_MAP_THEME}
              tokenId={mySeat ? mySeat.tokenId : selectedTokenId}
              playerColor={
                mySeat?.color ||
                PLAYER_COLORS[(mySeat ? mySeat.seatIndex : selectedTokenId) % PLAYER_COLORS.length]!
              }
              focusMode={previewFocusMode}
              onChangeFocusMode={setPreviewFocusMode}
              compact
            />

            <div className="grid gap-3 lg:grid-cols-2">
              {/* Map Theme Selector (Host editable, Guests view) */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-200">
                    <MapIcon className="h-4 w-4 text-amber-300" />
                    เลือกฉากแผนที่รอบกระดาน
                  </span>
                  {!isHost && (
                    <span className="text-[11px] text-stone-400">เจ้าบ้านเป็นผู้เลือกฉาก</span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {BOARD_MAP_THEMES.map((theme) => {
                    const activeTheme = roomState.config.mapTheme ?? DEFAULT_BOARD_MAP_THEME;
                    const active = activeTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        disabled={!isHost}
                        onClick={() => {
                          applyRoomMapTheme(theme.id);
                          setPreviewFocusMode('map');
                        }}
                        className={`tactile-btn flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                          active
                            ? 'border-amber-300 bg-amber-950/60 text-amber-50 shadow'
                            : 'border-amber-400/15 bg-black/35 text-stone-300 hover:bg-white/5 disabled:opacity-60'
                        }`}
                      >
                        <span className="shrink-0 rounded border border-amber-300/35 bg-black/50 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                          {theme.badge}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold">{theme.name}</div>
                          <div className="truncate text-[10px] text-stone-400">{theme.subtitle}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seated Player's Personal Character Picker */}
              {mySeat && (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-200">
                      <Sparkles className="h-4 w-4 text-emerald-300" />
                      เลือกตัวละครของคุณ
                    </span>
                    <span className="text-xs font-extrabold text-emerald-300">
                      {TOKEN_NAMES[mySeat.tokenId % TOKEN_NAMES.length]}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-6 gap-1">
                    {TOKEN_NAMES.map((tName, idx) => {
                      const isCurrent = mySeat.tokenId % TOKEN_NAMES.length === idx;
                      return (
                        <button
                          key={tName}
                          type="button"
                          title={tName}
                          onClick={() => {
                            setSelectedTokenId(idx);
                            setPreviewFocusMode('character');
                            if (isHost) {
                              updateSingleSlot(mySeat.seatIndex, { tokenId: idx });
                            } else {
                              void onSelectSeat(mySeat.seatIndex, mySeat.name || playerName, idx);
                            }
                          }}
                          className={`tactile-btn flex flex-col items-center rounded-lg border p-1 transition ${
                            isCurrent
                              ? 'border-emerald-400 bg-emerald-950/70 shadow'
                              : 'border-amber-400/15 bg-black/35 hover:border-amber-300/40'
                          }`}
                        >
                          <PlayerToken
                            tokenId={idx}
                            color={mySeat.color || PLAYER_COLORS[mySeat.seatIndex % PLAYER_COLORS.length]!}
                            size={26}
                          />
                          <span className="mt-0.5 max-w-full truncate text-[9px] font-bold text-amber-100">
                            {tName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <GameRulesConfigurator
              rules={normalizeGameRules(roomState.config.rules)}
              readOnly={!isHost}
              onChange={applyRoomRules}
            />
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
                  className={`flex flex-col justify-between rounded-xl border p-3.5 transition ${
                    isMine
                      ? 'border-emerald-400/60 bg-emerald-950/40 shadow-[0_6px_20px_rgba(16,185,129,0.16)]'
                      : 'border-amber-400/20 bg-black/35'
                  }`}
                >
                  <div>
                    {/* Seat Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/25 bg-[#120e0a] shadow-inner"
                          style={{ boxShadow: `inset 0 0 0 2px ${seatColor}55` }}
                        >
                          <PlayerToken tokenId={seat.tokenId} color={seatColor} size={34} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="mono-num text-xs font-bold text-stone-400">
                              ที่นั่ง #{seat.seatIndex + 1}
                            </span>
                            {roomState.hostSeatIndex === seat.seatIndex && !isBot && (
                              <Crown className="h-3.5 w-3.5 text-amber-400" />
                            )}
                            {isMine && (
                              <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                คุณ
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-amber-100/80">
                            ตัวเดิน: {tokenName}
                          </div>
                        </div>
                      </div>

                      {/* Status badge */}
                      {isBot ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-950/60 px-2.5 py-1 text-[11px] font-bold text-amber-200">
                          <Bot className="h-3 w-3" />
                          AI บอท
                        </span>
                      ) : isOccupiedHuman ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            seat.ready
                              ? 'bg-emerald-950/80 text-emerald-300 ring-1 ring-emerald-400/40'
                              : 'bg-amber-950/80 text-amber-200 ring-1 ring-amber-400/35'
                          }`}
                        >
                          {seat.ready ? 'พร้อมแล้ว' : 'รอพร้อม'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-stone-300">
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
                              className="w-full rounded-lg border border-amber-400/25 bg-black/50 px-2.5 py-1.5 text-base font-semibold text-amber-50 focus:border-amber-300 focus:outline-none sm:text-sm"
                            />
                            <select
                              value={seat.botStyle}
                              onChange={(e) =>
                                updateSingleSlot(seat.seatIndex, {
                                  botStyle: e.target.value as BotStyle,
                                })
                              }
                              className="w-full rounded-lg border border-amber-400/25 bg-stone-900 px-2.5 py-1.5 text-base font-semibold text-amber-100 focus:border-amber-300 focus:outline-none sm:text-xs"
                            >
                              {(Object.keys(BOT_STYLE_LABELS) as BotStyle[]).map((style) => (
                                <option key={style} value={style}>
                                  สไตล์: {BOT_STYLE_LABELS[style]}
                                </option>
                              ))}
                            </select>
                            <select
                              value={seat.tokenId % TOKEN_NAMES.length}
                              onChange={(e) =>
                                updateSingleSlot(seat.seatIndex, {
                                  tokenId: Number(e.target.value),
                                })
                              }
                              aria-label={`ตัวละครของบอทที่นั่ง ${seat.seatIndex + 1}`}
                              className="w-full rounded-lg border border-amber-400/25 bg-stone-900 px-2.5 py-1.5 text-base font-semibold text-amber-100 focus:border-amber-300 focus:outline-none sm:text-xs"
                            >
                              {TOKEN_NAMES.map((tName, tIdx) => (
                                <option key={tName} value={tIdx}>
                                  ตัวละคร: {tName}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <div className="rounded-lg bg-black/40 px-3 py-2 text-sm font-bold text-amber-100">
                            {seat.name}{' '}
                            <span className="text-xs font-normal text-stone-400">
                              ({BOT_STYLE_LABELS[seat.botStyle]})
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="rounded-lg bg-black/40 px-3 py-2 text-sm font-bold text-amber-50">
                          {isOccupiedHuman ? (
                            seat.name
                          ) : (
                            <span className="font-normal text-stone-400">รอผู้เล่นเข้าร่วม...</span>
                          )}
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
                        className="tactile-btn flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-400/25 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-amber-100 hover:bg-white/10 disabled:opacity-40"
                      >
                        {isBot ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                        <span>{isBot ? 'เปลี่ยนเป็นคน' : 'เปลี่ยนเป็นบอท'}</span>
                      </button>
                    )}

                    {canClaimSeat && (
                      <button
                        type="button"
                        onClick={() => void onSelectSeat(seat.seatIndex, playerName, selectedTokenId)}
                        className="tactile-btn flex-1 rounded-lg border border-sky-400/50 bg-[#1a4373] px-2.5 py-1.5 text-xs font-bold text-white hover:brightness-110"
                      >
                        เลือกที่นั่งนี้
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Ready / Start Action Bar */}
          <div className="mt-5 flex flex-col items-stretch justify-between gap-3 border-t border-amber-400/15 pt-4 sm:flex-row sm:items-center">
            <div className="text-xs text-stone-400">
              {allBotsRoom ? (
                <span className="font-semibold text-amber-200">
                  โหมดบอทล้วน + ผู้ชม: AI บอททั้งหมดจะเล่นอัตโนมัติทันทีเมื่อเริ่มเกม
                </span>
              ) : (
                <span>
                  ผู้เล่นจริงที่เข้าห้องแล้วต้องกด <strong className="text-amber-200">พร้อม</strong> ก่อนเจ้าบ้านกดเริ่มเกม
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {mySeat && (
                <button
                  type="button"
                  onClick={() => onSetReady(!mySeat.ready)}
                  className={`tactile-btn flex items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-extrabold shadow ${
                    mySeat.ready
                      ? 'border-emerald-400/60 bg-emerald-950/75 text-emerald-200'
                      : 'border-amber-300 bg-amber-400 text-stone-950 hover:bg-amber-300'
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
                  className="tactile-btn flex items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-gradient-to-b from-[#228d4f] to-[#145831] px-6 py-2.5 text-sm font-extrabold text-amber-50 shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>เริ่มเกมซุปเปอร์เศรษฐี!</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
