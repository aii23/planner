"use client";

import { useState, useEffect, useCallback } from "react";
import { useTimer } from "@/hooks/use-timer";
import { TimerDisplay } from "@/components/timer-display";
import { TimerControls } from "@/components/timer-controls";
import { UnitQueue, type QueueItem } from "@/components/unit-queue";

interface TimerViewProps {
  initialQueue: QueueItem[];
  workDurationMin: number;
  restDurationMin: number;
}

export function TimerView({
  initialQueue,
  workDurationMin,
  restDurationMin,
}: TimerViewProps) {
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [currentUnitId, setCurrentUnitId] = useState<string | null>(null);

  const timer = useTimer({
    workDurationSec: workDurationMin * 60,
    restDurationSec: restDurationMin * 60,
  });

  const getNextUnit = useCallback(() => {
    return queue.find(
      (q) => q.unit.status !== "completed" && q.unit.status !== "skipped"
    ) ?? null;
  }, [queue]);

  const currentUnit = currentUnitId
    ? queue.find((q) => q.unit.id === currentUnitId)?.unit ?? null
    : null;

  const currentUnitDisplay = currentUnit
    ? {
        label: currentUnit.label,
        task: currentUnit.task,
      }
    : null;

  function handleStart() {
    const next = getNextUnit();
    if (next) {
      setCurrentUnitId(next.unit.id);
    }
    timer.start();
  }

  useEffect(() => {
    if (timer.state === "WORK_ENDED") {
      // Work session ended naturally
    }
  }, [timer.state]);

  function handleEndWork() {
    timer.endWork();
  }

  function handleSkipRest() {
    const next = getNextUnit();
    if (next && next.unit.id !== currentUnitId) {
      setCurrentUnitId(next.unit.id);
    }
    timer.skipRest();
  }

  return (
    <div className="flex gap-8">
      <div className="flex-1 flex flex-col items-center gap-8 pt-4">
        <TimerDisplay
          remainingSeconds={timer.remainingSeconds}
          totalDurationSec={timer.totalDurationSec}
          state={timer.state}
          currentUnit={currentUnitDisplay}
        />

        <TimerControls
          state={timer.state}
          hasQueue={getNextUnit() !== null}
          onStart={handleStart}
          onPause={timer.pause}
          onResume={timer.resume}
          onSkipRest={handleSkipRest}
          onReset={timer.reset}
          onEndWork={handleEndWork}
        />
      </div>

      <aside className="w-72 shrink-0 rounded-lg border border-border bg-card p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
        <UnitQueue queue={queue} currentUnitId={currentUnitId} />
      </aside>
    </div>
  );
}
