"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WeekSelector } from "@/components/week-selector";
import { DayColumn, type DailyPlanData } from "@/components/day-column";
import {
  getMonday,
  addWeeks,
  toDateOnlyISO,
} from "@/lib/date-utils";
import {
  getOrCreateWeeklyPlan,
  updateWeeklyTarget,
} from "@/app/actions/weekly-plan";

interface WeeklyPlanData {
  id: string;
  targetUnits: number;
  status: string;
  dailyPlans: DailyPlanData[];
}

interface WeeklyPlanViewProps {
  initialPlan: WeeklyPlanData;
  initialMonday: string;
}

export function WeeklyPlanView({
  initialPlan,
  initialMonday,
}: WeeklyPlanViewProps) {
  const [monday, setMonday] = useState(() => new Date(initialMonday + "T00:00:00"));
  const [plan, setPlan] = useState<WeeklyPlanData>(initialPlan);
  const [weeklyTarget, setWeeklyTarget] = useState(initialPlan.targetUnits);
  const [isPending, startTransition] = useTransition();
  const [savingTarget, setSavingTarget] = useState(false);

  const loadWeek = useCallback(
    (newMonday: Date) => {
      setMonday(newMonday);
      startTransition(async () => {
        const newPlan = await getOrCreateWeeklyPlan(toDateOnlyISO(newMonday));
        setPlan(newPlan);
        setWeeklyTarget(newPlan.targetUnits);
      });
    },
    []
  );

  function handlePrev() {
    loadWeek(addWeeks(monday, -1));
  }

  function handleNext() {
    loadWeek(addWeeks(monday, 1));
  }

  function handleToday() {
    loadWeek(getMonday(new Date()));
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <WeekSelector
          monday={monday}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
        />

        <div className="flex items-center gap-4">
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
            <Badge variant="secondary" className="tabular-nums">
              {totalScheduled}
            </Badge>
            <span className="text-muted-foreground text-xs">scheduled</span>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-7 gap-2 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
        {plan.dailyPlans.map((daily) => (
          <DayColumn key={daily.id} daily={daily} />
        ))}
      </div>
    </div>
  );
}
