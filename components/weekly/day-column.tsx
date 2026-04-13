"use client";

import { useState, useCallback } from "react";
import { GripVertical, X, ArrowRight, CheckCircle2, SkipForward, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDayName, formatDateShort, isSameDay, addWeeks, toDateOnlyISO } from "@/lib/date-utils";
import { updateDailyTarget, unscheduleUnit, batchReorderUnits, moveUnitToWeek, quickAddUnitToDay } from "@/app/actions/weekly-plan";
import { getActiveTasksForQuickAdd } from "@/app/actions/timer";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePlannerStore, type ScheduledUnitInfo, type DailyPlanData } from "@/store/planner-store";

export type { DailyPlanData };

interface SortableUnitProps {
  su: ScheduledUnitInfo;
  onUnschedule: (id: string) => void;
  onMoveToNextWeek: (id: string) => void;
  currentMonday: string;
}

function SortableUnit({ su, onUnschedule, onMoveToNextWeek }: SortableUnitProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: su.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDone = su.unit.status === "completed";
  const isSkipped = su.unit.status === "skipped";
  const isDoneOrSkipped = isDone || isSkipped;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/unit flex items-center gap-2 rounded-md bg-background border border-border/50 px-2.5 py-1.5",
        isDone && "opacity-60 bg-muted/40",
        isSkipped && "opacity-40 bg-muted/20",
        isDragging && "opacity-50 shadow-lg z-10"
      )}
    >
      <button
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 rounded hover:bg-muted text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: su.unit.task?.project.color ?? "#94a3b8" }}
      />

      <div className="flex-1 min-w-0">
        <span className={cn("text-xs block truncate", isDoneOrSkipped && "line-through text-muted-foreground")}>
          {su.unit.label || su.unit.task?.title || "Untitled"}
        </span>
        {su.unit.task && (
          <span className="text-[10px] text-muted-foreground block truncate">
            {su.unit.task.project.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {isDone && <CheckCircle2 className="h-3 w-3 text-green-500" />}
        {isSkipped && <SkipForward className="h-3 w-3 text-muted-foreground" />}

        <div className="flex items-center gap-0 opacity-0 group-hover/unit:opacity-100 transition-opacity">
          <button
            onClick={() => onMoveToNextWeek(su.id)}
            className="p-0.5 rounded hover:bg-muted"
            title="Move to next week"
          >
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            onClick={() => onUnschedule(su.id)}
            className="p-0.5 rounded hover:bg-destructive/10"
            title="Unschedule"
          >
            <X className="h-3 w-3 text-destructive/70" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface DayColumnProps {
  daily: DailyPlanData;
  currentMonday: string;
}

export function DayColumn({ daily, currentMonday }: DayColumnProps) {
  const {
    optimisticSetDailyTarget,
    optimisticUnscheduleUnit,
    optimisticReorderDay,
    optimisticMoveUnitToWeek,
    optimisticAddNewUnitToDay,
    weeklyPlan,
  } = usePlannerStore();

  const [showCompleted, setShowCompleted] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddLabel, setQuickAddLabel] = useState("");
  const [quickAddTaskId, setQuickAddTaskId] = useState("");
  const [quickAddPending, setQuickAddPending] = useState(false);
  const [allTasks, setAllTasks] = useState<
    { id: string; title: string; project: { id: string; name: string; color: string } }[]
  >([]);
  const [allTasksLoading, setAllTasksLoading] = useState(false);

  const date = new Date(daily.date);
  const isToday = isSameDay(date, new Date());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const items = daily.scheduledUnits;
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex);
      // Optimistic update immediately
      optimisticReorderDay(daily.id, reordered.map((i) => i.id));
      // Fire-and-forget
      batchReorderUnits(daily.id, reordered.map((i) => i.id));
    },
    [daily.scheduledUnits, daily.id, optimisticReorderDay]
  );

  function handleTargetChange(value: number) {
    optimisticSetDailyTarget(daily.id, value);
    updateDailyTarget(daily.id, value);
  }

  function handleUnschedule(suId: string) {
    const su = daily.scheduledUnits.find((s) => s.id === suId);
    if (!su) return;
    optimisticUnscheduleUnit(suId, su.unit.id);
    unscheduleUnit(suId);
  }

  function handleMoveToNextWeek(suId: string) {
    const nextMonday = toDateOnlyISO(addWeeks(new Date(currentMonday + "T00:00:00"), 1));
    optimisticMoveUnitToWeek(suId, "");
    moveUnitToWeek(suId, nextMonday);
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

  function cancelQuickAdd() {
    setShowQuickAdd(false);
    setQuickAddLabel("");
    setQuickAddTaskId("");
  }

  async function handleQuickAdd() {
    if (!quickAddTaskId) return;
    setQuickAddPending(true);

    const task = allTasks.find((t) => t.id === quickAddTaskId);
    const tempId = `opt-${Date.now()}`;
    if (task) {
      optimisticAddNewUnitToDay(daily.id, tempId, {
        id: tempId,
        label: quickAddLabel.trim() || null,
        task,
      });
    }

    cancelQuickAdd();
    await quickAddUnitToDay(quickAddTaskId, quickAddLabel.trim() || null, daily.id);
    setQuickAddPending(false);
  }

  const tasksByProject = allTasks.reduce<
    Record<string, { project: { id: string; name: string; color: string }; tasks: typeof allTasks }>
  >((acc, t) => {
    if (!acc[t.project.id]) acc[t.project.id] = { project: t.project, tasks: [] };
    acc[t.project.id].tasks.push(t);
    return acc;
  }, {});

  const allItems = daily.scheduledUnits;
  const visibleItems = showCompleted
    ? allItems
    : allItems.filter((s) => s.unit.status !== "completed" && s.unit.status !== "skipped");

  const completedCount = allItems.filter((s) => s.unit.status === "completed").length;
  const activeCount = allItems.filter((s) => s.unit.status !== "completed" && s.unit.status !== "skipped").length;
  const atCapacity = allItems.length >= daily.targetUnits && daily.targetUnits > 0;

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card p-4 min-w-0",
        isToday && "ring-2 ring-primary/30 border-primary/40"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-semibold", isToday ? "text-primary" : "text-foreground")}>
            {getDayName(date)}
          </p>
          <p className="text-xs text-muted-foreground">{formatDateShort(date)}</p>
          {isToday && <Badge variant="secondary" className="text-[10px]">Today</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor={`target-${daily.id}`} className="text-[11px] text-muted-foreground">
              Target
            </label>
            <Input
              id={`target-${daily.id}`}
              type="number"
              min={0}
              max={99}
              value={daily.targetUnits}
              onChange={(e) => {
                const v = parseInt((e.target as HTMLInputElement).value, 10);
                if (!isNaN(v)) handleTargetChange(v);
              }}
              className="h-6 w-12 text-xs text-center tabular-nums"
            />
          </div>
          <Badge
            variant={atCapacity ? "default" : "outline"}
            className="text-[10px] tabular-nums"
          >
            {allItems.length}/{daily.targetUnits}
          </Badge>
        </div>
      </div>

      {completedCount > 0 && (
        <button
          onClick={() => setShowCompleted((v) => !v)}
          className="text-[10px] text-muted-foreground hover:text-foreground text-left mb-2 transition-colors"
        >
          {showCompleted ? "▾" : "▸"} {completedCount} done · {activeCount} active
        </button>
      )}

      <div className="flex-1 min-h-[80px] rounded border border-dashed border-border/60 bg-muted/20 p-2 space-y-1.5">
        {allItems.length === 0 && (
          <p className="text-xs text-muted-foreground/60 text-center pt-6">No units scheduled</p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visibleItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {visibleItems.map((su) => (
              <SortableUnit
                key={su.id}
                su={su}
                onUnschedule={handleUnschedule}
                onMoveToNextWeek={handleMoveToNextWeek}
                currentMonday={currentMonday}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
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
              onChange={(e) => setQuickAddLabel((e.target as HTMLInputElement).value)}
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
                onClick={cancelQuickAdd}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
