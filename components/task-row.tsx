"use client";

import { useState } from "react";
import { Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EditTaskDialog } from "@/components/edit-task-dialog";
import { updateTaskStatus, deleteTask } from "@/app/actions/tasks";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/src/generated/prisma/client";

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; next: TaskStatus | null }
> = {
  backlog: { label: "Backlog", variant: "outline", next: "planned" },
  planned: { label: "Planned", variant: "secondary", next: "in_progress" },
  in_progress: { label: "In Progress", variant: "default", next: "done" },
  done: { label: "Done", variant: "secondary", next: null },
};

export interface TaskWithUnits {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  estimatedUnits: number;
  completedUnits: number;
  createdAt: Date;
  completedAt: Date | null;
  _count: { units: number };
  units: { status: string }[];
}

interface TaskRowProps {
  task: TaskWithUnits;
  projectColor: string;
}

export function TaskRow({ task, projectColor }: TaskRowProps) {
  const [transitioning, setTransitioning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const completedUnitCount = task.units.filter(
    (u) => u.status === "completed"
  ).length;
  const totalUnits = task._count.units;
  const progressPercent =
    task.estimatedUnits > 0
      ? Math.round((completedUnitCount / task.estimatedUnits) * 100)
      : 0;

  const config = STATUS_CONFIG[task.status];
  const isDone = task.status === "done";

  async function handleAdvanceStatus() {
    if (!config.next) return;
    setTransitioning(true);
    await updateTaskStatus(task.id, config.next);
    setTransitioning(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this task and all its units?")) return;
    setDeleting(true);
    await deleteTask(task.id);
    setDeleting(false);
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/50",
        isDone && "opacity-60"
      )}
    >
      <div
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: projectColor }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium truncate",
              isDone && "line-through"
            )}
          >
            {task.title}
          </span>
          <Badge variant={config.variant} className="text-[10px] shrink-0">
            {config.label}
          </Badge>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <div className="w-24">
            <Progress value={progressPercent} className="h-1.5" />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {completedUnitCount}/{task.estimatedUnits} units
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {config.next && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleAdvanceStatus}
            disabled={transitioning}
            title={`Move to ${STATUS_CONFIG[config.next].label}`}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}

        <EditTaskDialog task={task} />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          disabled={deleting}
          title="Delete task"
          className="text-destructive/70 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
