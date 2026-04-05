"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getDayName, formatDateShort, isSameDay } from "@/lib/date-utils";
import { updateDailyTarget, unscheduleUnit, reorderUnit } from "@/app/actions/weekly-plan";
import { cn } from "@/lib/utils";

interface ScheduledUnitInfo {
  id: string;
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

export interface DailyPlanData {
  id: string;
  date: Date;
  targetUnits: number;
  scheduledUnits: ScheduledUnitInfo[];
}

interface DayColumnProps {
  daily: DailyPlanData;
  onChanged: () => void;
}

export function DayColumn({ daily, onChanged }: DayColumnProps) {
  const [target, setTarget] = useState(daily.targetUnits);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const date = new Date(daily.date);
  const isToday = isSameDay(date, new Date());
  const scheduledCount = daily.scheduledUnits.length;
  const atCapacity = scheduledCount >= target && target > 0;

  async function handleTargetBlur() {
    if (target === daily.targetUnits) return;
    setSaving(true);
    await updateDailyTarget(daily.id, target);
    setSaving(false);
  }

  async function handleUnschedule(suId: string) {
    setActing(suId);
    await unscheduleUnit(suId);
    setActing(null);
    onChanged();
  }

  async function handleReorder(suId: string, direction: "up" | "down") {
    setActing(suId);
    await reorderUnit(suId, direction);
    setActing(null);
    onChanged();
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card p-4 min-w-0 snap-start",
        isToday && "ring-2 ring-primary/30 border-primary/40"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm font-semibold",
              isToday ? "text-primary" : "text-foreground"
            )}
          >
            {getDayName(date)}
          </p>
          <p className="text-xs text-muted-foreground">{formatDateShort(date)}</p>
          {isToday && (
            <Badge variant="secondary" className="text-[10px]">Today</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label
              htmlFor={`target-${daily.id}`}
              className="text-[11px] text-muted-foreground"
            >
              Target
            </label>
            <Input
              id={`target-${daily.id}`}
              type="number"
              min={0}
              max={99}
              value={target}
              onChange={(e) => setTarget(parseInt((e.target as HTMLInputElement).value, 10) || 0)}
              onBlur={handleTargetBlur}
              className={cn("h-6 w-12 text-xs text-center tabular-nums", saving && "opacity-50")}
            />
          </div>
          <Badge
            variant={atCapacity ? "default" : "outline"}
            className="text-[10px] tabular-nums"
          >
            {scheduledCount}/{target}
          </Badge>
        </div>
      </div>

      <div className="flex-1 min-h-[80px] rounded border border-dashed border-border/60 bg-muted/20 p-2 space-y-1.5">
        {scheduledCount === 0 && (
          <p className="text-xs text-muted-foreground/60 text-center pt-6">
            No units scheduled
          </p>
        )}

        {daily.scheduledUnits.map((su, idx) => {
          const isActing = acting === su.id;
          return (
            <div
              key={su.id}
              className={cn(
                "group/unit flex items-center gap-2 rounded-md bg-background border border-border/50 px-2.5 py-1.5",
                isActing && "opacity-50"
              )}
            >
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: su.unit.task?.project.color ?? "#94a3b8" }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs block truncate">
                  {su.unit.label || su.unit.task?.title || "Untitled"}
                </span>
                {su.unit.task && (
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {su.unit.task.project.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-0 opacity-0 group-hover/unit:opacity-100 transition-opacity shrink-0">
                {idx > 0 && (
                  <button
                    onClick={() => handleReorder(su.id, "up")}
                    disabled={isActing}
                    className="p-0.5 rounded hover:bg-muted"
                    title="Move up"
                  >
                    <ArrowUp className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
                {idx < scheduledCount - 1 && (
                  <button
                    onClick={() => handleReorder(su.id, "down")}
                    disabled={isActing}
                    className="p-0.5 rounded hover:bg-muted"
                    title="Move down"
                  >
                    <ArrowDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => handleUnschedule(su.id)}
                  disabled={isActing}
                  className="p-0.5 rounded hover:bg-destructive/10"
                  title="Unschedule"
                >
                  <X className="h-3 w-3 text-destructive/70" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
