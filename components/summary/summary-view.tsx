"use client";

import { useState, useCallback, useTransition } from "react";
import {
  Target,
  CheckCircle2,
  ArrowRight,
  Ban,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getWeeklySummary,
  carryForwardUnit,
  markUnitSkipped,
} from "@/app/actions/summary";
import {
  formatWeekRange,
  formatDateShort,
  getDayName,
  addWeeks,
  getMonday,
  isCurrentWeek,
  toDateOnlyISO,
} from "@/lib/date-utils";

type SummaryData = NonNullable<Awaited<ReturnType<typeof getWeeklySummary>>>;

interface SummaryViewProps {
  initialSummary: SummaryData | null;
  initialMonday: string;
}

export function SummaryView({ initialSummary, initialMonday }: SummaryViewProps) {
  const [monday, setMonday] = useState(() => new Date(initialMonday + "T00:00:00"));
  const [summary, setSummary] = useState<SummaryData | null>(initialSummary);
  const [isPending, startTransition] = useTransition();

  const loadWeek = useCallback((newMonday: Date) => {
    setMonday(newMonday);
    startTransition(async () => {
      const data = await getWeeklySummary(toDateOnlyISO(newMonday));
      setSummary(data);
    });
  }, []);

  async function handleCarryForward(unitId: string) {
    await carryForwardUnit(unitId);
    const data = await getWeeklySummary(toDateOnlyISO(monday));
    setSummary(data);
  }

  async function handleSkip(unitId: string) {
    await markUnitSkipped(unitId);
    const data = await getWeeklySummary(toDateOnlyISO(monday));
    setSummary(data);
  }

  const isCurrent = isCurrentWeek(monday);

  if (!summary) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground">
          No plan exists for this week. Navigate to a week with data.
        </p>
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => loadWeek(addWeeks(monday, -1))}>
            Previous Week
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadWeek(getMonday(new Date()))}>
            This Week
          </Button>
        </div>
      </div>
    );
  }

  const completionPct = summary.targetUnits > 0
    ? Math.round((summary.totalCompleted / summary.targetUnits) * 100)
    : 0;
  const estimationAccuracy = summary.totalCompleted > 0
    ? Math.round((summary.totalCompleted / summary.totalActualSlots) * 100)
    : 100;

  return (
    <div className={`space-y-6 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" onClick={() => loadWeek(addWeeks(monday, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{formatWeekRange(monday)}</span>
          {isCurrent && <Badge variant="secondary" className="text-[10px]">This week</Badge>}
        </div>
        <Button variant="outline" size="icon-sm" onClick={() => loadWeek(addWeeks(monday, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isCurrent && (
          <Button variant="ghost" size="sm" onClick={() => loadWeek(getMonday(new Date()))} className="text-xs">
            Today
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold tabular-nums">{summary.totalCompleted}</p>
            <p className="text-sm text-muted-foreground mt-1">
              of {summary.targetUnits} target units
            </p>
            <Progress value={completionPct} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-1">{completionPct}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold tabular-nums">{summary.totalActualSlots}</p>
            <p className="text-sm text-muted-foreground mt-1">
              actual unit-slots consumed
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {summary.totalCompleted} planned → {summary.totalActualSlots} actual
            </p>
            <p className="text-xs font-medium mt-1">
              {estimationAccuracy}% estimation accuracy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold tabular-nums">{summary.totalScheduled}</p>
            <p className="text-sm text-muted-foreground mt-1">total scheduled</p>
            <div className="flex justify-center gap-3 mt-2 text-xs">
              <span className="text-emerald-600">{summary.totalCompleted} done</span>
              <span className="text-muted-foreground">
                {summary.unfinishedUnits.length} remaining
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {summary.dailyBreakdown.map((day) => {
          const d = new Date(day.date);
          const pct = day.target > 0 ? Math.round((day.completed / day.target) * 100) : 0;
          return (
            <div key={day.date.toString()} className="rounded-lg border border-border p-2 text-center">
              <p className="text-[10px] text-muted-foreground">{getDayName(d)}</p>
              <p className="text-lg font-bold tabular-nums">{day.completed}</p>
              <p className="text-[10px] text-muted-foreground">/ {day.target}</p>
              <div className="mt-1">
                <Progress value={pct} className="h-1" />
              </div>
            </div>
          );
        })}
      </div>

      {summary.projectBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">By Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.projectBreakdown.map((p) => {
              const pct = p.scheduled > 0 ? Math.round((p.completed / p.scheduled) * 100) : 0;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-sm flex-1 truncate">{p.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {p.completed}/{p.scheduled}
                  </span>
                  <div className="w-24">
                    <Progress value={pct} className="h-1.5" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {summary.completedTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.completedTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.project.color }} />
                <span className="text-sm">{t.title}</span>
                <span className="text-xs text-muted-foreground">{t.project.name}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {summary.unfinishedUnits.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Unfinished Units</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.unfinishedUnits.map((u) => (
              <div key={u.unitId} className="flex items-center gap-2 group">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: u.task.project.color }} />
                <span className="text-sm flex-1 truncate">{u.label || u.task.title}</span>
                <span className="text-[10px] text-muted-foreground">{u.task.project.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCarryForward(u.unitId)}
                    className="h-6 text-[10px] px-2"
                    title="Return to backlog for rescheduling"
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    Backlog
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSkip(u.unitId)}
                    className="h-6 text-[10px] px-2"
                    title="Mark as skipped"
                  >
                    <Ban className="h-3 w-3 mr-1" />
                    Skip
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
