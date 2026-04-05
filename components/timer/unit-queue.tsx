"use client";

import { useCallback } from "react";
import {
  Circle,
  CheckCircle2,
  Loader2,
  Check,
  SkipForward,
  Ban,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export interface QueueItem {
  scheduledUnitId: string;
  sortOrder: number;
  unit: {
    id: string;
    label: string | null;
    status: string;
    task: {
      id: string;
      title: string;
      project: { id: string; name: string; color: string };
    } | null;
  };
}

interface UnitQueueProps {
  queue: QueueItem[];
  currentUnitId: string | null;
  onComplete: (unitId: string) => void;
  onSkip: (unitId: string) => void;
  onReorder: (orderedScheduledUnitIds: string[]) => void;
}

function SortableQueueItem({
  item,
  isCurrent,
  onComplete,
  onSkip,
}: {
  item: QueueItem;
  isCurrent: boolean;
  onComplete: (unitId: string) => void;
  onSkip: (unitId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.scheduledUnitId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = item.unit.status === "completed";
  const isSkipped = item.unit.status === "skipped";
  const isInProgress = item.unit.status === "in_progress";
  const isFinished = isCompleted || isSkipped;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
        isCurrent && "bg-primary/10 ring-1 ring-primary/30",
        isCompleted && "opacity-50",
        isSkipped && "opacity-35",
        !isCurrent && !isFinished && "hover:bg-muted/50",
        isDragging && "opacity-50 shadow-lg z-10 bg-background"
      )}
    >
      <button
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 rounded hover:bg-muted text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : isSkipped ? (
          <Ban className="h-4 w-4 text-muted-foreground/50" />
        ) : isInProgress || isCurrent ? (
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/40" />
        )}
      </div>

      <div
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: item.unit.task?.project.color ?? "#94a3b8" }}
      />

      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm truncate block",
            isFinished && "line-through text-muted-foreground",
            isCurrent && "font-medium"
          )}
        >
          {item.unit.label || item.unit.task?.title || "Untitled"}
        </span>
        <span className="text-[10px] text-muted-foreground truncate block">
          {item.unit.task
            ? `${item.unit.task.project.name} · ${item.unit.task.title}`
            : "Standalone unit"}
        </span>
      </div>

      {!isFinished && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onComplete(item.unit.id)}
            title="Mark complete"
            className="h-6 w-6"
          >
            <Check className="h-3 w-3 text-emerald-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onSkip(item.unit.id)}
            title="Skip"
            className="h-6 w-6"
          >
            <SkipForward className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function UnitQueue({
  queue,
  currentUnitId,
  onComplete,
  onSkip,
  onReorder,
}: UnitQueueProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = queue.findIndex((i) => i.scheduledUnitId === active.id);
      const newIndex = queue.findIndex((i) => i.scheduledUnitId === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(queue, oldIndex, newIndex);
      onReorder(reordered.map((i) => i.scheduledUnitId));
    },
    [queue, onReorder]
  );

  if (queue.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          No units scheduled for today.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Schedule units in the Weekly Plan view.
        </p>
      </div>
    );
  }

  const completedCount = queue.filter((q) => q.unit.status === "completed").length;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Today&apos;s Queue
        </span>
        <Badge variant="outline" className="text-[10px] tabular-nums">
          {completedCount}/{queue.length}
        </Badge>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={queue.map((i) => i.scheduledUnitId)}
          strategy={verticalListSortingStrategy}
        >
          {queue.map((item) => (
            <SortableQueueItem
              key={item.scheduledUnitId}
              item={item}
              isCurrent={item.unit.id === currentUnitId}
              onComplete={onComplete}
              onSkip={onSkip}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
