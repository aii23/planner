"use client";

import { useEffect, useCallback, useState } from "react";
import { Target, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WeekSelector } from "@/components/weekly/week-selector";
import { DayColumn } from "@/components/weekly/day-column";
import { SchedulingBacklog } from "@/components/weekly/scheduling-backlog";
import {
  getMonday,
  addWeeks,
  toDateOnlyISO,
} from "@/lib/date-utils";
import {
  getOrCreateWeeklyPlan,
  getUnscheduledUnits,
  getCarryForwardUnits,
  updateWeeklyTarget,
} from "@/app/actions/weekly-plan";
import { WeeklyPlanReview } from "@/components/ai/weekly-plan-review";
import {
  usePlannerStore,
  type BacklogUnitItem,
  type WeeklyPlanData,
  type CarryForwardItem,
} from "@/store/planner-store";

interface WeeklyPlanViewProps {
  initialPlan: WeeklyPlanData;
  initialMonday: string;
  initialBacklog: BacklogUnitItem[];
  initialCarryForward: CarryForwardItem[];
}

export function WeeklyPlanView({
  initialPlan,
  initialMonday,
  initialBacklog,
  initialCarryForward,
}: WeeklyPlanViewProps) {
  const {
    weeklyPlan,
    weeklyMonday,
    backlog,
    carryForward,
    setWeeklyData,
    optimisticSetWeeklyTarget,
  } = usePlannerStore();

  // Hydrate store with server-fetched initial data on mount (once)
  useEffect(() => {
    setWeeklyData(initialPlan, initialMonday, initialBacklog, initialCarryForward);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = weeklyPlan ?? initialPlan;
  const monday = weeklyMonday ? new Date(weeklyMonday + "T00:00:00") : new Date(initialMonday + "T00:00:00");

  const [loading, setLoading] = useState(false);

  const loadWeek = useCallback(async (newMonday: Date) => {
    setLoading(true);
    const mondayISO = toDateOnlyISO(newMonday);
    const [newPlan, newBacklog, newCarry] = await Promise.all([
      getOrCreateWeeklyPlan(mondayISO),
      getUnscheduledUnits(),
      getCarryForwardUnits(mondayISO),
    ]);
    setWeeklyData(newPlan, mondayISO, newBacklog, newCarry);
    setLoading(false);
  }, [setWeeklyData]);

  function handlePrev() { loadWeek(addWeeks(monday, -1)); }
  function handleNext() { loadWeek(addWeeks(monday, 1)); }
  function handleToday() { loadWeek(getMonday(new Date())); }

  // Soft refresh backlog + plan without navigating weeks
  const refreshCurrentWeek = useCallback(async () => {
    if (!weeklyMonday) return;
    const [newPlan, newBacklog, newCarry] = await Promise.all([
      getOrCreateWeeklyPlan(weeklyMonday),
      getUnscheduledUnits(),
      getCarryForwardUnits(weeklyMonday),
    ]);
    setWeeklyData(newPlan, weeklyMonday, newBacklog, newCarry);
  }, [weeklyMonday, setWeeklyData]);

  function handleWeeklyTargetChange(value: number) {
    optimisticSetWeeklyTarget(value);
    updateWeeklyTarget(plan.id, value).catch(() => {
      // Rollback on error
      optimisticSetWeeklyTarget(plan.targetUnits);
    });
  }

  const dailyTargetSum = plan.dailyPlans.reduce((sum, d) => sum + d.targetUnits, 0);
  const totalScheduled = plan.dailyPlans.reduce((sum, d) => sum + d.scheduledUnits.length, 0);

  const dayOptions = plan.dailyPlans.map((d) => ({
    id: d.id,
    date: d.date,
    scheduledCount: d.scheduledUnits.length,
    targetUnits: d.targetUnits,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <WeekSelector
          monday={monday}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
        />

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <label htmlFor="weekly-target" className="text-sm text-muted-foreground whitespace-nowrap">
              Weekly target
            </label>
            <Input
              id="weekly-target"
              type="number"
              min={0}
              max={999}
              value={plan.targetUnits}
              onChange={(e) => {
                const v = parseInt((e.target as HTMLInputElement).value, 10);
                if (!isNaN(v)) handleWeeklyTargetChange(v);
              }}
              className="h-8 w-16 text-sm text-center tabular-nums"
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Badge
              variant={dailyTargetSum === plan.targetUnits ? "default" : "outline"}
              className="tabular-nums"
            >
              {dailyTargetSum}/{plan.targetUnits}
            </Badge>
            <span className="text-muted-foreground text-xs">daily sum</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Badge
              variant={totalScheduled >= plan.targetUnits ? "default" : "secondary"}
              className="tabular-nums"
            >
              {totalScheduled}/{plan.targetUnits}
            </Badge>
            <span className="text-muted-foreground text-xs">scheduled</span>
          </div>
        </div>
      </div>

      {carryForward.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">
              {carryForward.length} unfinished {carryForward.length === 1 ? "unit" : "units"} from last week
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {carryForward.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: u.task?.project.color ?? "#94a3b8" }}
                  />
                  {u.label || u.task?.title || "Untitled"}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-amber-700 mt-1.5">
              Schedule these units into this week or return them to backlog.
            </p>
          </div>
        </div>
      )}

      <div className={`flex gap-4 ${loading ? "opacity-60 pointer-events-none" : ""}`}>
        <aside className="w-56 shrink-0 rounded-lg border border-border bg-card p-3 overflow-y-auto max-h-[calc(100vh-220px)]">
          <SchedulingBacklog
            units={backlog}
            days={dayOptions}
            onScheduled={refreshCurrentWeek}
          />
        </aside>

        <div className="flex-1 min-w-0 overflow-x-auto">
          <div className="grid grid-cols-2 gap-3 min-w-0" style={{ gridAutoRows: "min-content" }}>
            {plan.dailyPlans.map((daily) => (
              <DayColumn
                key={daily.id}
                daily={daily}
                currentMonday={toDateOnlyISO(monday)}
              />
            ))}
          </div>
        </div>
      </div>

      <WeeklyPlanReview weekStartISO={toDateOnlyISO(monday)} />
    </div>
  );
}
