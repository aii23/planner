"use client";

import { cn } from "@/lib/utils";

interface IntervalTimerDisplayProps {
  remainingSeconds: number;
  cycleCount: number;
  intervalSec: number;
  isActive: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function IntervalTimerDisplay({
  remainingSeconds,
  cycleCount,
  intervalSec,
  isActive,
}: IntervalTimerDisplayProps) {
  const elapsed = intervalSec - remainingSeconds;
  const progressPercent = intervalSec > 0 ? (elapsed / intervalSec) * 100 : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progressPercent / 100);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 transition-opacity duration-300",
        isActive ? "opacity-100" : "opacity-35"
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        20-min block
      </p>

      <div className="relative flex items-center justify-center w-24 h-24">
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 80 80"
        >
          <circle
            cx="40"
            cy="40"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted/30"
          />
          <circle
            cx="40"
            cy="40"
            r={RADIUS}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            stroke="currentColor"
            className="text-amber-500 transition-all duration-500"
          />
        </svg>

        <span className="z-10 text-xl font-mono font-bold tabular-nums tracking-tight">
          {formatTime(remainingSeconds)}
        </span>
      </div>

      <p className="text-xs text-muted-foreground h-4">
        {cycleCount > 0
          ? `${cycleCount} ${cycleCount === 1 ? "block" : "blocks"} done`
          : null}
      </p>
    </div>
  );
}
