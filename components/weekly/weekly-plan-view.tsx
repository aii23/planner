"use client";

import { useState, useCallback, useTransition } from "react";
import { Target, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WeekSelector } from "@/components/weekly/week-selector";
import { DayColumn, type DailyPlanData } from "@/components/weekly/day-column";
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

interface BacklogUnitItem {
  id: string;
  label: string | null;
  task: {
    id: string;
    title: string;
    project: { id: string; name: string; color: string };
  };
}

interface WeeklyPlanData {
  id: string;
  targetUnits: number;
  status: string;
  dailyPlans: DailyPlanData[];
}

interface CarryForwardItem {
  id: string;
  label: string | null;
  status: string;
  task: {
    id: string;
    title: string;
    project: { id: string; name: string; color: string };
  };
}

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
  const [monday, setMonday] = useState(() => new Date(initialMonday + "T00:00:00"));
  const [plan, setPlan] = useState<WeeklyPlanData>(initialPlan);
  const [backlog, setBacklog] = useState<BacklogUnitItem[]>(initialBacklog);
  const [carryForward, setCarryForward] = useState<CarryForwardItem[]>(initialCarryForward);
  const [weeklyTarget, setWeeklyTarget] = useState(initialPlan.targetUnits);
  const [isPending, startTransition] = useTransition();
  const [savingTarget, setSavingTarget] = useState(false);

  const refresh = useCallback(
    (newMonday?: Date) => {
      const m = newMonday ?? monday;
      startTransition(async () => {
        const [newPlan, newBacklog, newCarry] = await Promise.all([
          getOrCreateWeeklyPlan(toDateOnlyISO(m)),
          getUnscheduledUnits(),
          getCarryForwardUnits(toDateOnlyISO(m)),
        ]);
        setPlan(newPlan);
        setBacklog(newBacklog);
        setCarryForward(newCarry);
        if (newMonday) {
          setMonday(m);
          setWeeklyTarget(newPlan.targetUnits);
        }
      });
    },
    [monday]
  );

  function handlePrev() {
    refresh(addWeeks(monday, -1));
  }

  function handleNext() {
    refresh(addWeeks(monday, 1));
  }

  function handleToday() {
    refresh(getMonday(new Date()));
  }

  function handleSchedulingChanged() {
    refresh();
  }

  async function handleWeeklyTargetBlur() {
    if (weeklyTarget === plan.targetUnits) return;
    setSavingTarget(true);
    await updateWeeklyTarget(plan.id, weeklyTarget);
    setSavingTarget(false);
  }

  const dailyTargetSum = plan.dailyPlans.reduce(
    (sum, d) => sum + d.targetUnits,
    0
  );
  const totalScheduled = plan.dailyPlans.reduce(
    (sum, d) => sum + d.scheduledUnits.length,
    0
  );

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
              value={weeklyTarget}
              onChange={(e) =>
                setWeeklyTarget(
                  parseInt((e.target as HTMLInputElement).value, 10) || 0
                )
              }
              onBlur={handleWeeklyTargetBlur}
              className={`h-8 w-16 text-sm text-center tabular-nums ${savingTarget ? "opacity-50" : ""}`}
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Badge
              variant={dailyTargetSum === weeklyTarget ? "default" : "outline"}
              className="tabular-nums"
            >
              {dailyTargetSum}/{weeklyTarget}
            </Badge>
            <span className="text-muted-foreground text-xs">daily sum</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Badge
              variant={totalScheduled >= weeklyTarget ? "default" : "secondary"}
              className="tabular-nums"
            >
              {totalScheduled}/{weeklyTarget}
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
                    style={{ backgroundColor: u.task.project.color }}
                  />
                  {u.label || u.task.title}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-amber-700 mt-1.5">
              Schedule these units into this week or return them to backlog.
            </p>
          </div>
        </div>
      )}

      <div className={`flex gap-4 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
        <aside className="w-56 shrink-0 rounded-lg border border-border bg-card p-3 overflow-y-auto max-h-[calc(100vh-220px)]">
          <SchedulingBacklog
            units={backlog}
            days={dayOptions}
            onScheduled={handleSchedulingChanged}
          />
        </aside>

        <div className="flex-1 grid grid-cols-7 gap-2 min-w-0">
          {plan.dailyPlans.map((daily) => (
            <DayColumn
              key={daily.id}
              daily={daily}
              onChanged={handleSchedulingChanged}
            />
          ))}
        </div>
      </div>

      <WeeklyPlanReview weekStartISO={toDateOnlyISO(monday)} />
    </div>
  );
}
