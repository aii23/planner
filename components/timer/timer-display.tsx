"use client";

import { cn } from "@/lib/utils";
import type { TimerState } from "@/hooks/use-timer";

interface TimerDisplayProps {
  remainingSeconds: number;
  totalDurationSec: number;
  state: TimerState;
  currentUnit: {
    label: string | null;
    task: {
      title: string;
      project: { name: string; color: string };
    } | null;
  } | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function stateLabel(state: TimerState): string {
  switch (state) {
    case "IDLE": return "Ready";
    case "WORK_RUNNING": return "Working";
    case "WORK_PAUSED": return "Paused";
    case "WORK_ENDED": return "Work Complete";
    case "REST_RUNNING": return "Resting";
    case "REST_PAUSED": return "Rest Paused";
    case "REST_ENDED": return "Rest Complete";
  }
}

export function TimerDisplay({
  remainingSeconds,
  totalDurationSec,
  state,
  currentUnit,
}: TimerDisplayProps) {
  const isWork = state === "WORK_RUNNING" || state === "WORK_PAUSED" || state === "WORK_ENDED";
  const isRest = state === "REST_RUNNING" || state === "REST_PAUSED" || state === "REST_ENDED";
  const isIdle = state === "IDLE";

  const progressPercent =
    totalDurationSec > 0
      ? ((totalDurationSec - remainingSeconds) / totalDurationSec) * 100
      : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center w-64 h-64">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted/30"
          />
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercent / 100)}`}
            className={cn(
              "transition-all duration-500",
              isWork && "text-primary",
              isRest && "text-emerald-500",
              isIdle && "text-muted-foreground/20"
            )}
            stroke="currentColor"
          />
        </svg>

        <div className="flex flex-col items-center z-10">
          <span
            className={cn(
              "text-5xl font-mono font-bold tabular-nums tracking-tight",
              isWork && "text-foreground",
              isRest && "text-emerald-600",
              isIdle && "text-muted-foreground"
            )}
          >
            {formatTime(remainingSeconds)}
          </span>
          <span
            className={cn(
              "text-xs font-medium mt-1 uppercase tracking-wider",
              isWork && "text-primary",
              isRest && "text-emerald-500",
              isIdle && "text-muted-foreground"
            )}
          >
            {stateLabel(state)}
          </span>
        </div>
      </div>

      {currentUnit && (
        <div className="flex flex-col items-center gap-1 mt-2">
          {currentUnit.task && (
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: currentUnit.task.project.color }}
              />
              <span className="text-xs text-muted-foreground">
                {currentUnit.task.project.name}
              </span>
            </div>
          )}
          <span className="text-sm font-medium text-center max-w-xs truncate">
            {currentUnit.label || currentUnit.task?.title || "Untitled"}
          </span>
        </div>
      )}

      {!currentUnit && !isIdle && (
        <p className="text-xs text-muted-foreground mt-2">No unit selected</p>
      )}
    </div>
  );
}
