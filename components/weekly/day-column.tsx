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
    };
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
        "flex flex-col rounded-lg border border-border bg-card p-3 min-w-0",
        isToday && "ring-2 ring-primary/30 border-primary/40"
      )}
    >
      <div className="text-center mb-2">
        <p
          className={cn(
            "text-xs font-medium",
            isToday ? "text-primary" : "text-muted-foreground"
          )}
        >
          {getDayName(date)}
        </p>
        <p className="text-sm font-semibold">{formatDateShort(date)}</p>
      </div>

      <div className="flex items-center gap-1.5 justify-center mb-2">
        <label
          htmlFor={`target-${daily.id}`}
          className="text-[10px] text-muted-foreground"
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

      <div className="flex items-center justify-center gap-1.5 mb-3">
        <Badge
          variant={atCapacity ? "default" : "outline"}
          className="text-[10px] tabular-nums"
        >
          {scheduledCount}/{target}
        </Badge>
        <span className="text-[10px] text-muted-foreground">scheduled</span>
      </div>

      <div className="flex-1 min-h-[120px] rounded border border-dashed border-border/60 bg-muted/20 p-1.5 space-y-1">
        {scheduledCount === 0 && (
          <p className="text-[10px] text-muted-foreground/60 text-center pt-8">
            No units
          </p>
        )}

        {daily.scheduledUnits.map((su, idx) => {
          const isActing = acting === su.id;
          return (
            <div
              key={su.id}
              className={cn(
                "group/unit flex items-center gap-1 rounded bg-background border border-border/50 px-1.5 py-1",
                isActing && "opacity-50"
              )}
            >
              <div
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: su.unit.task.project.color }}
              />
              <span className="text-[10px] truncate flex-1">
                {su.unit.label || su.unit.task.title}
              </span>

              <div className="flex items-center gap-0 opacity-0 group-hover/unit:opacity-100 transition-opacity shrink-0">
                {idx > 0 && (
                  <button
                    onClick={() => handleReorder(su.id, "up")}
                    disabled={isActing}
                    className="p-0.5 rounded hover:bg-muted"
                    title="Move up"
                  >
                    <ArrowUp className="h-2.5 w-2.5 text-muted-foreground" />
                  </button>
                )}
                {idx < scheduledCount - 1 && (
                  <button
                    onClick={() => handleReorder(su.id, "down")}
                    disabled={isActing}
                    className="p-0.5 rounded hover:bg-muted"
                    title="Move down"
                  >
                    <ArrowDown className="h-2.5 w-2.5 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => handleUnschedule(su.id)}
                  disabled={isActing}
                  className="p-0.5 rounded hover:bg-destructive/10"
                  title="Unschedule"
                >
                  <X className="h-2.5 w-2.5 text-destructive/70" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
