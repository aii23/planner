"use client";

import { useState } from "react";
import { Trash2, Check, SkipForward } from "lucide-react";
import { useBacklogRefresh } from "@/components/backlog/backlog-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateUnit, deleteUnit } from "@/app/actions/units";
import { cn } from "@/lib/utils";
import type { UnitData } from "@/components/backlog/task-row";
import type { UnitStatus } from "@/src/generated/prisma/client";

const UNIT_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pending: { label: "Pending", variant: "outline" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  skipped: { label: "Skipped", variant: "destructive" },
};

interface UnitRowProps {
  unit: UnitData;
}

export function UnitRow({ unit }: UnitRowProps) {
  const [pending, setPending] = useState(false);
  const refresh = useBacklogRefresh();

  const config = UNIT_STATUS_CONFIG[unit.status] ?? UNIT_STATUS_CONFIG.pending;
  const isFinished = unit.status === "completed" || unit.status === "skipped";

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }

  async function handleComplete() {
    setPending(true);
    await updateUnit(unit.id, { status: "completed" as UnitStatus });
    setPending(false);
    refresh();
  }

  async function handleSkip() {
    setPending(true);
    await updateUnit(unit.id, { status: "skipped" as UnitStatus });
    setPending(false);
    refresh();
  }

  async function handleDelete() {
    setPending(true);
    await deleteUnit(unit.id);
    setPending(false);
    refresh();
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-muted/40",
        isFinished && "opacity-50"
      )}
    >
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span
          className={cn(
            "text-xs truncate",
            isFinished && "line-through",
            !unit.label && "text-muted-foreground italic"
          )}
        >
          {unit.label || "Untitled unit"}
        </span>

        <Badge variant={config.variant} className="text-[9px] shrink-0 h-4">
          {config.label}
        </Badge>

        {unit.actualDurationSeconds != null && unit.actualDurationSeconds > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {formatDuration(unit.actualDurationSeconds)}
          </span>
        )}

        {unit.actualUnitsConsumed != null && unit.actualUnitsConsumed > 1 && (
          <span className="text-[10px] text-muted-foreground shrink-0">
            ×{unit.actualUnitsConsumed}
          </span>
        )}
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!isFinished && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleComplete}
              disabled={pending}
              title="Mark completed"
              className="h-6 w-6"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSkip}
              disabled={pending}
              title="Skip unit"
              className="h-6 w-6"
            >
              <SkipForward className="h-3 w-3" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          disabled={pending}
          title="Delete unit"
          className="h-6 w-6 text-destructive/70 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
