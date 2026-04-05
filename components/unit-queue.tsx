"use client";

import { Circle, CheckCircle2, Loader2 } from "lucide-react";
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
}

export function UnitQueue({ queue, currentUnitId }: UnitQueueProps) {
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

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Today&apos;s Queue
        </span>
        <Badge variant="outline" className="text-[10px] tabular-nums">
          {queue.filter((q) => q.unit.status === "completed").length}/{queue.length}
        </Badge>
      </div>

      {queue.map((item) => {
        const isCurrent = item.unit.id === currentUnitId;
        const isCompleted = item.unit.status === "completed";
        const isInProgress = item.unit.status === "in_progress";

        return (
          <div
            key={item.scheduledUnitId}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
              isCurrent && "bg-primary/10 ring-1 ring-primary/30",
              isCompleted && "opacity-50",
              !isCurrent && !isCompleted && "hover:bg-muted/50"
            )}
          >
            <div className="shrink-0">
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
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
                  isCompleted && "line-through text-muted-foreground",
                  isCurrent && "font-medium"
                )}
              >
                {item.unit.label || item.unit.task.title}
              </span>
              <span className="text-[10px] text-muted-foreground truncate block">
                {item.unit.task.project.name} · {item.unit.task.title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
