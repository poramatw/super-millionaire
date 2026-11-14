import { useCallback, useEffect, useRef, useState } from 'react';
import { getTile, type DicePowerRange } from '@super-millionaire/shared';
import { Dices, Gauge } from 'lucide-react';

export interface DiceChargeButtonProps {
  label: string;
  enableCharge: boolean;
  currentTileIndex?: number;
  compact?: boolean;
  onRoll: (powerRange?: DicePowerRange) => void;
}

const RANGE_META: Record<
  DicePowerRange,
  {
    title: string;
    dots: string;
    barClass: string;
    badgeClass: string;
    steps: [number, number];
  }
> = {
  low: {
    title: 'ช่วงสั้น 2–5 แต้ม',
    dots: '2–5',
    barClass: 'from-emerald-400 to-emerald-600',
    badgeClass: 'border-emerald-400/70 bg-emerald-950/90 text-emerald-200',
    steps: [2, 5],
  },
  mid: {
    title: 'ช่วงกลาง 6–8 แต้ม',
    dots: '6–8',
    barClass: 'from-amber-300 to-amber-500',
    badgeClass: 'border-amber-300/80 bg-amber-950/90 text-amber-200',
    steps: [6, 8],
  },
  high: {
    title: 'ช่วงไกล 9–12 แต้ม',
    dots: '9–12',
    barClass: 'from-rose-400 to-rose-600',
    badgeClass: 'border-rose-400/80 bg-rose-950/90 text-rose-100',
    steps: [9, 12],
  },
};

function percentToRange(pct: number): DicePowerRange {
  if (pct < 34) return 'low';
  if (pct < 67) return 'mid';
  return 'high';
}

export function DiceChargeButton({
  label,
  enableCharge,
  currentTileIndex = 0,
  compact = false,
  onRoll,
}: DiceChargeButtonProps) {
  const [isCharging, setIsCharging] = useState(false);
  const [chargePct, setChargePct] = useState(0);

  const rafRef = useRef<number | null>(null);
  const pressStartMsRef = useRef<number>(0);
  const latestPctRef = useRef<number>(0);
  const activePointerRef = useRef<boolean>(false);

  const stopChargeLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopChargeLoop();
  }, [stopChargeLoop]);

  const startCharging = useCallback(() => {
    if (!enableCharge) {
      onRoll(undefined);
      return;
    }
    if (activePointerRef.current) return;
    activePointerRef.current = true;
    pressStartMsRef.current = performance.now();
    latestPctRef.current = 0;
    setChargePct(0);
    setIsCharging(true);

    const tick = (now: number) => {
      const elapsed = now - pressStartMsRef.current;
      // Smooth triangle wave oscillation (0 -> 100 -> 0 every 1150ms)
      const cycle = (elapsed % 1150) / 1150;
      const pct = cycle <= 0.5 ? cycle * 200 : (1 - cycle) * 200;
      latestPctRef.current = pct;
      setChargePct(pct);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [enableCharge, onRoll]);

  const finishCharging = useCallback(() => {
    if (!activePointerRef.current) return;
    activePointerRef.current = false;
    stopChargeLoop();

    const heldMs = performance.now() - pressStartMsRef.current;
    const pct = latestPctRef.current;
    setIsCharging(false);
    setChargePct(0);

    // Quick tap (< 160ms) rolls normally; holding >= 160ms applies the charged range bias
    if (heldMs < 160) {
      onRoll(undefined);
    } else {
      onRoll(percentToRange(pct));
    }
  }, [onRoll, stopChargeLoop]);

  const cancelCharging = useCallback(() => {
    if (!activePointerRef.current) return;
    activePointerRef.current = false;
    stopChargeLoop();
    setIsCharging(false);
    setChargePct(0);
  }, [stopChargeLoop]);

  const activeRange = percentToRange(chargePct);
  const activeMeta = RANGE_META[activeRange];
  const minTargetTile = getTile((currentTileIndex + activeMeta.steps[0]) % 40);
  const maxTargetTile = getTile((currentTileIndex + activeMeta.steps[1]) % 40);

  if (compact) {
    return (
      <div className="relative flex flex-1 flex-col gap-1">
        {enableCharge && isCharging && (
          <div className="rounded-xl border border-amber-400/50 bg-stone-950/95 px-2.5 py-1.5 text-[10px] shadow-xl">
            <div className="flex items-center justify-between font-extrabold">
              <span className="text-amber-100">{activeMeta.title}</span>
              <span className="mono-num text-emerald-300">
                {minTargetTile.name} – {maxTargetTile.name}
              </span>
            </div>
            <div className="relative mt-1 h-2.5 w-full overflow-hidden rounded-full bg-stone-800 p-0.5">
              <div className="grid h-full w-full grid-cols-3 gap-0.5 opacity-35">
                <div className="rounded-l-full bg-emerald-500" />
                <div className="bg-amber-400" />
                <div className="rounded-r-full bg-rose-500" />
              </div>
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${activeMeta.barClass} transition-none`}
                style={{ width: `${Math.max(4, chargePct)}%` }}
              />
            </div>
          </div>
        )}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            startCharging();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            finishCharging();
          }}
          onPointerLeave={cancelCharging}
          onPointerCancel={cancelCharging}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault();
              startCharging();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              finishCharging();
            }
          }}
          className="tactile-btn flex w-full select-none items-center justify-center gap-1.5 rounded-xl border border-emerald-300/60 bg-gradient-to-b from-[#228d4f] to-[#155e34] px-3.5 py-2 text-xs font-extrabold text-amber-50 shadow sm:text-sm"
        >
          <Dices className="h-4 w-4 shrink-0 text-amber-200" />
          <span>{isCharging ? `ปล่อยเพื่อทอยช่วง ${activeMeta.dots}` : label}</span>
          {enableCharge && !isCharging && (
            <span className="rounded bg-black/35 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">
              กดค้างชาร์จได้
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex lg:flex-col lg:gap-2">
      {/* Charge Gauge Bar */}
      {enableCharge && (
        <div className="rounded-xl border border-amber-400/30 bg-stone-950/80 p-2.5 shadow-inner">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 font-bold text-amber-200">
              <Gauge className="h-3.5 w-3.5 text-amber-300" />
              <span>เกจชาร์จเล็งระยะเต๋า</span>
            </span>
            {isCharging ? (
              <span
                className={`rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold ${activeMeta.badgeClass}`}
              >
                {activeMeta.title}
              </span>
            ) : (
              <span className="text-[10px] text-stone-400">
                แตะสั้น = สุ่มปกติ • กดค้าง = เล็งช่วงแต้ม
              </span>
            )}
          </div>

          {/* 3-Zone Segmented Gauge Track */}
          <div className="relative mt-2 h-4 w-full overflow-hidden rounded-lg border border-amber-400/25 bg-stone-900">
            <div className="grid h-full w-full grid-cols-3 divide-x divide-stone-700/80 text-[9px] font-extrabold">
              <div
                className={`flex items-center justify-center transition ${
                  isCharging && activeRange === 'low'
                    ? 'bg-emerald-600/80 text-white'
                    : 'bg-emerald-950/45 text-emerald-300/80'
                }`}
              >
                สั้น 2–5
              </div>
              <div
                className={`flex items-center justify-center transition ${
                  isCharging && activeRange === 'mid'
                    ? 'bg-amber-500/85 text-stone-950'
                    : 'bg-amber-950/45 text-amber-300/80'
                }`}
              >
                กลาง 6–8
              </div>
              <div
                className={`flex items-center justify-center transition ${
                  isCharging && activeRange === 'high'
                    ? 'bg-rose-600/85 text-white'
                    : 'bg-rose-950/45 text-rose-300/80'
                }`}
              >
                ไกล 9–12
              </div>
            </div>

            {isCharging && (
              <div
                className="pointer-events-none absolute inset-y-0 w-1.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_#fff]"
                style={{ left: `${chargePct}%` }}
              />
            )}
          </div>

          {isCharging && (
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-amber-100/90">
              <span>ระยะเป้าหมาย:</span>
              <span className="font-bold text-emerald-300">
                {minTargetTile.name} → {maxTargetTile.name}
              </span>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          startCharging();
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          finishCharging();
        }}
        onPointerLeave={cancelCharging}
        onPointerCancel={cancelCharging}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            startCharging();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            finishCharging();
          }
        }}
        className={`tactile-btn flex w-full select-none items-center justify-center gap-2 rounded-xl border px-4 py-3 text-base font-extrabold text-amber-50 shadow-[0_6px_18px_rgba(16,185,129,0.28)] transition ${
          isCharging
            ? 'border-amber-300 bg-gradient-to-b from-amber-500 to-amber-700 text-stone-950 scale-[0.99]'
            : 'border-emerald-300/60 bg-gradient-to-b from-[#228d4f] to-[#155e34] hover:brightness-110'
        }`}
      >
        <Dices className={`h-5 w-5 ${isCharging ? 'animate-spin text-stone-950' : 'text-amber-200'}`} />
        <span>
          {isCharging ? `ปล่อยเพื่อทอย ${activeMeta.title}` : label}
        </span>
      </button>
    </div>
  );
}
