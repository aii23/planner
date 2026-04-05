"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTimer } from "@/hooks/use-timer";
import { TimerDisplay } from "@/components/timer-display";
import { TimerControls } from "@/components/timer-controls";
import { UnitQueue, type QueueItem } from "@/components/unit-queue";
import {
  getTodayQueue,
  completeCurrentUnit,
  skipCurrentUnit,
  quickAddUnit,
} from "@/app/actions/timer";

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
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddLabel, setQuickAddLabel] = useState("");
  const [quickAddTaskId, setQuickAddTaskId] = useState("");
  const [quickAddPending, setQuickAddPending] = useState(false);
  const autoTransitioned = useRef(false);

  const timer = useTimer({
    workDurationSec: workDurationMin * 60,
    restDurationSec: restDurationMin * 60,
  });

  const refreshQueue = useCallback(async () => {
    const updated = await getTodayQueue();
    setQueue(updated);
  }, []);

  const getNextUnit = useCallback(
    (skipId?: string) => {
      return (
        queue.find(
          (q) =>
            q.unit.status !== "completed" &&
            q.unit.status !== "skipped" &&
            q.unit.id !== skipId
        ) ?? null
      );
    },
    [queue]
  );

  const currentUnit = currentUnitId
    ? queue.find((q) => q.unit.id === currentUnitId)?.unit ?? null
    : null;

  const currentUnitDisplay = currentUnit
    ? { label: currentUnit.label, task: currentUnit.task }
    : null;

  // Auto transition: WORK_ENDED → REST_RUNNING
  useEffect(() => {
    if (timer.state === "WORK_ENDED" && !autoTransitioned.current) {
      autoTransitioned.current = true;
      timer.endWork();
    }
    if (timer.state !== "WORK_ENDED") {
      autoTransitioned.current = false;
    }
  }, [timer.state, timer.endWork]);

  function handleStart() {
    const next = getNextUnit();
    if (next) {
      setCurrentUnitId(next.unit.id);
    }
    timer.start();
  }

  async function handleCompleteUnit() {
    if (!currentUnitId) return;
    await completeCurrentUnit(currentUnitId);

    setQueue((prev) =>
      prev.map((q) =>
        q.unit.id === currentUnitId
          ? { ...q, unit: { ...q.unit, status: "completed" } }
          : q
      )
    );

    const next = getNextUnit(currentUnitId);
    setCurrentUnitId(next?.unit.id ?? null);

    await refreshQueue();
  }

  async function handleCompleteFromQueue(unitId: string) {
    await completeCurrentUnit(unitId);

    setQueue((prev) =>
      prev.map((q) =>
        q.unit.id === unitId
          ? { ...q, unit: { ...q.unit, status: "completed" } }
          : q
      )
    );

    if (unitId === currentUnitId) {
      const next = getNextUnit(unitId);
      setCurrentUnitId(next?.unit.id ?? null);
    }

    await refreshQueue();
  }

  async function handleSkipFromQueue(unitId: string) {
    await skipCurrentUnit(unitId);

    setQueue((prev) =>
      prev.map((q) =>
        q.unit.id === unitId
          ? { ...q, unit: { ...q.unit, status: "skipped" } }
          : q
      )
    );

    if (unitId === currentUnitId) {
      const next = getNextUnit(unitId);
      setCurrentUnitId(next?.unit.id ?? null);
    }

    await refreshQueue();
  }

  function handleEndWork() {
    timer.endWork();
  }

  function handleSkipRest() {
    timer.skipRest();
  }

  async function handleQuickAdd() {
    if (!quickAddTaskId) return;
    setQuickAddPending(true);
    await quickAddUnit(quickAddTaskId, quickAddLabel || null);
    await refreshQueue();
    setQuickAddPending(false);
    setShowQuickAdd(false);
    setQuickAddLabel("");
    setQuickAddTaskId("");
  }

  // Time projection
  const remaining = queue.filter(
    (q) => q.unit.status !== "completed" && q.unit.status !== "skipped"
  ).length;
  const unitDurationMin = 20;
  const totalMinLeft = remaining * unitDurationMin;
  const etaDate = new Date(Date.now() + totalMinLeft * 60 * 1000);
  const etaStr = etaDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const availableTasks = Array.from(
    new Map(
      queue.map((q) => [q.unit.task.id, q.unit.task])
    ).values()
  );

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
          hasCurrentUnit={!!currentUnitId}
          onStart={handleStart}
          onPause={timer.pause}
          onResume={timer.resume}
          onSkipRest={handleSkipRest}
          onReset={timer.reset}
          onEndWork={handleEndWork}
          onCompleteUnit={handleCompleteUnit}
        />

        {remaining > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              ~{remaining} {remaining === 1 ? "unit" : "units"} left, done by {etaStr}
            </span>
          </div>
        )}
      </div>

      <aside className="w-72 shrink-0 rounded-lg border border-border bg-card p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
        <UnitQueue
          queue={queue}
          currentUnitId={currentUnitId}
          onComplete={handleCompleteFromQueue}
          onSkip={handleSkipFromQueue}
        />

        <div className="mt-4 pt-3 border-t border-border">
          {!showQuickAdd ? (
            <button
              onClick={() => setShowQuickAdd(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3 w-3" />
              Quick add unit
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium">Quick Add Unit</p>
              <Input
                placeholder="Label (optional)"
                value={quickAddLabel}
                onChange={(e) => setQuickAddLabel((e.target as HTMLInputElement).value)}
                className="h-7 text-xs"
                autoFocus
              />
              {availableTasks.length > 0 && (
                <select
                  value={quickAddTaskId}
                  onChange={(e) => setQuickAddTaskId(e.target.value)}
                  className="w-full h-7 text-xs rounded-md border border-border bg-background px-2"
                >
                  <option value="">Select task…</option>
                  {availableTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.project.name} · {t.title}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleQuickAdd}
                  disabled={!quickAddTaskId || quickAddPending}
                  className="h-7 text-xs flex-1"
                >
                  {quickAddPending ? "Adding…" : "Add"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowQuickAdd(false);
                    setQuickAddLabel("");
                    setQuickAddTaskId("");
                  }}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
