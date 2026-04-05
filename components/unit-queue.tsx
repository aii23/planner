"use client";

import { useState } from "react";
import {
  Circle,
  CheckCircle2,
  Loader2,
  Check,
  SkipForward,
  ArrowUp,
  ArrowDown,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
    };
  };
}

interface UnitQueueProps {
  queue: QueueItem[];
  currentUnitId: string | null;
  onComplete: (unitId: string) => void;
  onSkip: (unitId: string) => void;
}

export function UnitQueue({
  queue,
  currentUnitId,
  onComplete,
  onSkip,
}: UnitQueueProps) {
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
  const remaining = queue.length - completedCount - queue.filter((q) => q.unit.status === "skipped").length;

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

      {queue.map((item, idx) => {
        const isCurrent = item.unit.id === currentUnitId;
        const isCompleted = item.unit.status === "completed";
        const isSkipped = item.unit.status === "skipped";
        const isInProgress = item.unit.status === "in_progress";
        const isFinished = isCompleted || isSkipped;

        return (
          <div
            key={item.scheduledUnitId}
            className={cn(
              "group flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
              isCurrent && "bg-primary/10 ring-1 ring-primary/30",
              isCompleted && "opacity-50",
              isSkipped && "opacity-35",
              !isCurrent && !isFinished && "hover:bg-muted/50"
            )}
          >
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
              style={{ backgroundColor: item.unit.task.project.color }}
            />

            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  "text-sm truncate block",
                  isFinished && "line-through text-muted-foreground",
                  isCurrent && "font-medium"
                )}
              >
                {item.unit.label || item.unit.task.title}
              </span>
              <span className="text-[10px] text-muted-foreground truncate block">
                {item.unit.task.project.name} · {item.unit.task.title}
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
      })}
    </div>
  );
}
