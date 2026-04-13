"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Clock, Check, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTimer } from "@/hooks/use-timer";
import { useNotifications } from "@/hooks/use-notifications";
import { TimerDisplay } from "@/components/timer/timer-display";
import { TimerControls } from "@/components/timer/timer-controls";
import { UnitQueue, type QueueItem } from "@/components/timer/unit-queue";
import { CheckpointPopup } from "@/components/timer/checkpoint-popup";
import { WorkEndedPopup } from "@/components/timer/work-ended-popup";
import {
  getTodayQueue,
  completeCurrentUnit,
  skipCurrentUnit,
  quickAddUnit,
  saveTimerSession,
  incrementUnitsConsumed,
  splitUnit,
  reorderTodayQueue,
  getActiveTasksForQuickAdd,
  pullUnitToToday,
} from "@/app/actions/timer";
import { DailyCheckin } from "@/components/ai/daily-checkin";

interface TimerViewProps {
  initialQueue: QueueItem[];
  initialTomorrowQueue?: QueueItem[];
  workDurationMin: number;
  restDurationMin: number;
  notificationSound: boolean;
}

export function TimerView({
  initialQueue,
  initialTomorrowQueue = [],
  workDurationMin,
  restDurationMin,
  notificationSound,
}: TimerViewProps) {
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [tomorrowQueue, setTomorrowQueue] = useState<QueueItem[]>(initialTomorrowQueue);
  const [tomorrowPendingId, setTomorrowPendingId] = useState<string | null>(null);
  const [showTomorrow, setShowTomorrow] = useState(false);
  const [currentUnitId, setCurrentUnitId] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddLabel, setQuickAddLabel] = useState("");
  const [quickAddTaskId, setQuickAddTaskId] = useState("");
  const [quickAddPending, setQuickAddPending] = useState(false);
  const [allTasks, setAllTasks] = useState<
    { id: string; title: string; project: { id: string; name: string; color: string } }[]
  >([]);
  const [allTasksLoading, setAllTasksLoading] = useState(false);
  const [checkpointVisible, setCheckpointVisible] = useState(false);
  const [checkpointMinute, setCheckpointMinute] = useState(0);
  const lastCheckpointRef = useRef(0);
  const autoTransitioned = useRef(false);
  const sessionStartRef = useRef<string | null>(null);
  const prevStateRef = useRef<string>("IDLE");
  const unitStartTimeRef = useRef<number | null>(null);
  const [workEndedVisible, setWorkEndedVisible] = useState(false);

  const { requestPermission, notify, playChime } = useNotifications();

  const chime = useCallback(() => {
    if (notificationSound) playChime();
  }, [notificationSound, playChime]);

  const timer = useTimer({
    workDurationSec: workDurationMin * 60,
    restDurationSec: restDurationMin * 60,
  });

  // Restore currentUnitId from persisted timer state
  useEffect(() => {
    if (timer.persistedUnitId && !currentUnitId) {
      setCurrentUnitId(timer.persistedUnitId);
    }
  }, [timer.persistedUnitId, currentUnitId]);

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

  // Request notification permission on first interaction
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // 20-min checkpoint detection
  useEffect(() => {
    if (timer.state !== "WORK_RUNNING") return;
    const elapsedMin = Math.floor(timer.elapsedSeconds / 60);
    const checkpointAt = Math.floor(elapsedMin / 20) * 20;
    if (checkpointAt > 0 && checkpointAt > lastCheckpointRef.current) {
      lastCheckpointRef.current = checkpointAt;
      setCheckpointMinute(checkpointAt);
      setCheckpointVisible(true);
      chime();
    }
  }, [timer.state, timer.elapsedSeconds, chime]);

  // Notifications + session saving on state transitions
  useEffect(() => {
    const prev = prevStateRef.current;
    const curr = timer.state;
    prevStateRef.current = curr;

    if (prev === curr) return;

    // Work started — track session start
    if (curr === "WORK_RUNNING" && prev === "IDLE") {
      sessionStartRef.current = new Date().toISOString();
      lastCheckpointRef.current = 0;
    }

    // Work ended — notify + save session
    if (curr === "WORK_ENDED" && prev === "WORK_RUNNING") {
      chime();
      notify("Work session complete!", "Time for a break.");

      if (sessionStartRef.current) {
        saveTimerSession(
          currentUnitId,
          "work",
          sessionStartRef.current,
          new Date().toISOString()
        );
      }
      sessionStartRef.current = new Date().toISOString();
    }

    // Rest started
    if (curr === "REST_RUNNING" && (prev === "WORK_ENDED" || prev === "WORK_RUNNING")) {
      if (!sessionStartRef.current) {
        sessionStartRef.current = new Date().toISOString();
      }
    }

    // Rest ended — notify + save session
    if (curr === "REST_ENDED" && prev === "REST_RUNNING") {
      chime();
      notify("Rest is over!", "Ready for the next work session?");

      if (sessionStartRef.current) {
        saveTimerSession(null, "rest", sessionStartRef.current, new Date().toISOString());
      }
      sessionStartRef.current = null;
    }

    // Skip rest — save partial rest session
    if (curr === "IDLE" && (prev === "REST_RUNNING" || prev === "REST_PAUSED" || prev === "REST_ENDED" || prev === "WORK_ENDED")) {
      if (sessionStartRef.current && (prev === "REST_RUNNING" || prev === "REST_PAUSED")) {
        saveTimerSession(null, "rest", sessionStartRef.current, new Date().toISOString());
      }
      sessionStartRef.current = null;
    }
  }, [timer.state, chime, notify, currentUnitId]);

  // Show work-ended popup instead of silent auto-transition
  useEffect(() => {
    if (timer.state === "WORK_ENDED" && !autoTransitioned.current) {
      autoTransitioned.current = true;
      setWorkEndedVisible(true);
    }
    if (timer.state !== "WORK_ENDED") {
      autoTransitioned.current = false;
    }
  }, [timer.state]);

  function handleWorkEndedStartRest() {
    setWorkEndedVisible(false);
    timer.endWork();
  }

  function handleWorkEndedSkipRest() {
    setWorkEndedVisible(false);
    timer.skipRest();
  }

  function handleStart() {
    const next = getNextUnit();
    if (next) {
      setCurrentUnitId(next.unit.id);
      timer.start(next.unit.id);
    } else {
      timer.start();
    }
    unitStartTimeRef.current = Date.now();
  }

  function getUnitElapsedSeconds(): number {
    if (!unitStartTimeRef.current) return 0;
    return Math.floor((Date.now() - unitStartTimeRef.current) / 1000);
  }

  async function handleCompleteUnit() {
    if (!currentUnitId) return;
    const elapsed = getUnitElapsedSeconds();
    await completeCurrentUnit(currentUnitId, elapsed);

    setQueue((prev) =>
      prev.map((q) =>
        q.unit.id === currentUnitId
          ? { ...q, unit: { ...q.unit, status: "completed" } }
          : q
      )
    );

    const next = getNextUnit(currentUnitId);
    const nextId = next?.unit.id ?? null;
    setCurrentUnitId(nextId);
    timer.setPersistedUnitId(nextId);
    unitStartTimeRef.current = nextId ? Date.now() : null;

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
      const nextId = next?.unit.id ?? null;
      setCurrentUnitId(nextId);
      timer.setPersistedUnitId(nextId);
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
      const nextId = next?.unit.id ?? null;
      setCurrentUnitId(nextId);
      timer.setPersistedUnitId(nextId);
    }

    await refreshQueue();
  }

  async function handleCompleteTomorrow(scheduledUnitId: string, unitId: string) {
    setTomorrowPendingId(scheduledUnitId);
    await completeCurrentUnit(unitId);
    setTomorrowQueue((prev) => prev.filter((q) => q.scheduledUnitId !== scheduledUnitId));
    setTomorrowPendingId(null);
  }

  async function handlePullToToday(scheduledUnitId: string) {
    setTomorrowPendingId(scheduledUnitId);
    const result = await pullUnitToToday(scheduledUnitId);
    if (!("error" in result)) {
      setTomorrowQueue((prev) => prev.filter((q) => q.scheduledUnitId !== scheduledUnitId));
      await refreshQueue();
    }
    setTomorrowPendingId(null);
  }

  const handleReorder = useCallback(
    async (orderedScheduledUnitIds: string[]) => {
      const reordered = orderedScheduledUnitIds
        .map((suId) => queue.find((q) => q.scheduledUnitId === suId))
        .filter((q): q is QueueItem => q != null);
      setQueue(reordered);
      await reorderTodayQueue(orderedScheduledUnitIds);
    },
    [queue]
  );

  function handleCheckpointComplete() {
    setCheckpointVisible(false);
    handleCompleteUnit();
  }

  async function handleCheckpointContinue() {
    setCheckpointVisible(false);
    if (currentUnitId) {
      await incrementUnitsConsumed(currentUnitId);
    }
  }

  async function handleCheckpointSplit() {
    setCheckpointVisible(false);
    if (!currentUnitId) return;
    const result = await splitUnit(currentUnitId, null);

    setQueue((prev) =>
      prev.map((q) =>
        q.unit.id === currentUnitId
          ? { ...q, unit: { ...q.unit, status: "completed" } }
          : q
      )
    );

    const next = getNextUnit(currentUnitId);
    const nextId = next?.unit.id ?? null;
    setCurrentUnitId(nextId);
    timer.setPersistedUnitId(nextId);

    await refreshQueue();
  }

  function handleEndWork() {
    timer.endWork();
  }

  function handleSkipRest() {
    timer.skipRest();
  }

  async function openQuickAdd() {
    setShowQuickAdd(true);
    setAllTasksLoading(true);
    try {
      const tasks = await getActiveTasksForQuickAdd();
      setAllTasks(tasks);
    } finally {
      setAllTasksLoading(false);
    }
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

  // Group allTasks by project for the quick-add dropdown
  const tasksByProject = allTasks.reduce<
    Record<string, { project: { id: string; name: string; color: string }; tasks: typeof allTasks }>
  >((acc, t) => {
    if (!acc[t.project.id]) acc[t.project.id] = { project: t.project, tasks: [] };
    acc[t.project.id].tasks.push(t);
    return acc;
  }, {});

  const checkpointLabel =
    currentUnit?.label || currentUnit?.task?.title || "this unit";

  return (
    <div className="flex gap-8">
      <div className="w-1/3 shrink-0 flex flex-col items-center gap-8 pt-4">
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
              ~{remaining} {remaining === 1 ? "unit" : "units"} left, done by{" "}
              {etaStr}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 rounded-lg border border-border bg-card p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
        <div className="mb-3 pb-3 border-b border-border">
          <DailyCheckin queue={queue} onReorderApplied={refreshQueue} />
        </div>

        <UnitQueue
          queue={queue}
          currentUnitId={currentUnitId}
          onComplete={handleCompleteFromQueue}
          onSkip={handleSkipFromQueue}
          onReorder={handleReorder}
        />

        {tomorrowQueue.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <button
              onClick={() => setShowTomorrow((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
            >
              <Clock className="h-3 w-3" />
              {showTomorrow ? "▾" : "▸"} Tomorrow — {tomorrowQueue.length} unit{tomorrowQueue.length !== 1 ? "s" : ""}
            </button>
            {showTomorrow && (
              <div className="mt-2 space-y-1">
                {tomorrowQueue.map((q) => {
                  const isPending = tomorrowPendingId === q.scheduledUnitId;
                  return (
                    <div
                      key={q.scheduledUnitId}
                      className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/30 px-2.5 py-1.5 opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: q.unit.task?.project.color ?? "#94a3b8" }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs truncate block">
                          {q.unit.label || q.unit.task?.title || "Untitled"}
                        </span>
                        {q.unit.task && (
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {q.unit.task.project.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handlePullToToday(q.scheduledUnitId)}
                          disabled={isPending}
                          title="Pull to today"
                          className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleCompleteTomorrow(q.scheduledUnitId, q.unit.id)}
                          disabled={isPending}
                          title="Mark complete"
                          className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-green-600 hover:bg-accent transition-colors disabled:opacity-40"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-border">
          {!showQuickAdd ? (
            <button
              onClick={openQuickAdd}
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
                onChange={(e) =>
                  setQuickAddLabel((e.target as HTMLInputElement).value)
                }
                className="h-7 text-xs"
                autoFocus
              />
              <select
                value={quickAddTaskId}
                onChange={(e) => setQuickAddTaskId(e.target.value)}
                className="w-full h-7 text-xs rounded-md border border-border bg-background px-2"
                disabled={allTasksLoading}
              >
                <option value="">
                  {allTasksLoading ? "Loading tasks…" : "Select task…"}
                </option>
                {Object.values(tasksByProject).map(({ project, tasks }) => (
                  <optgroup key={project.id} label={project.name}>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
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
      </div>

      <CheckpointPopup
        visible={checkpointVisible}
        minutesMark={checkpointMinute}
        unitLabel={checkpointLabel}
        onComplete={handleCheckpointComplete}
        onContinue={handleCheckpointContinue}
        onSplit={handleCheckpointSplit}
      />

      <WorkEndedPopup
        visible={workEndedVisible}
        unitLabel={checkpointLabel}
        onStartRest={handleWorkEndedStartRest}
        onSkipRest={handleWorkEndedSkipRest}
      />
    </div>
  );
}
