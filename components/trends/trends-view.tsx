"use client";

import { Activity, Calendar, TrendingUp, BarChart3, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateShort } from "@/lib/date-utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WeekData {
  weekStart: Date;
  target: number;
  completed: number;
  scheduled: number;
  actualSlots: number;
  estimationAccuracy: number | null;
  projects: { id: string; name: string; color: string; count: number }[];
}

interface TrendsData {
  weeks: WeekData[];
  avgPerWeek: number;
  avgPerDay: number;
  currentStreak: number;
  totalWeeks: number;
  dayAverages: { dayOfWeek: number; average: number }[];
  allTimeProjects: { id: string; name: string; color: string; total: number }[];
}

interface TrendsViewProps {
  data: TrendsData;
}

export function TrendsView({ data }: TrendsViewProps) {
  if (data.weeks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <TrendingUp className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          No data yet. Complete at least one week to see trends.
        </p>
      </div>
    );
  }

  const maxCompleted = Math.max(...data.weeks.map((w) => w.completed), 1);
  const maxTarget = Math.max(...data.weeks.map((w) => w.target), 1);
  const chartMax = Math.max(maxCompleted, maxTarget);
  const maxDayAvg = Math.max(...data.dayAverages.map((d) => d.average), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Activity className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-3xl font-bold tabular-nums">{data.avgPerWeek}</p>
            <p className="text-xs text-muted-foreground">avg units/week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-3xl font-bold tabular-nums">{data.avgPerDay}</p>
            <p className="text-xs text-muted-foreground">avg units/day</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Flame className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-3xl font-bold tabular-nums">{data.currentStreak}</p>
            <p className="text-xs text-muted-foreground">week streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <BarChart3 className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-3xl font-bold tabular-nums">{data.totalWeeks}</p>
            <p className="text-xs text-muted-foreground">total weeks</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly: Target vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.weeks.map((w) => {
              const d = new Date(w.weekStart);
              const completedPct = Math.round((w.completed / chartMax) * 100);
              const targetPct = Math.round((w.target / chartMax) * 100);
              return (
                <div key={w.weekStart.toString()} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-16 shrink-0 tabular-nums">
                    {formatDateShort(d)}
                  </span>
                  <div className="flex-1 relative h-5">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/20 rounded-sm"
                      style={{ width: `${targetPct}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-primary rounded-sm"
                      style={{ width: `${completedPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums w-16 text-right shrink-0">
                    {w.completed}/{w.target}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 rounded-sm bg-primary inline-block" /> Completed
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 rounded-sm bg-primary/20 inline-block" /> Target
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estimation Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.weeks.map((w) => {
                const d = new Date(w.weekStart);
                return (
                  <div key={w.weekStart.toString()} className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground w-16 shrink-0 tabular-nums">
                      {formatDateShort(d)}
                    </span>
                    <div className="flex-1">
                      {w.estimationAccuracy != null ? (
                        <Progress value={w.estimationAccuracy} className="h-1.5" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50">—</span>
                      )}
                    </div>
                    <span className="text-[10px] tabular-nums w-8 text-right shrink-0">
                      {w.estimationAccuracy != null ? `${w.estimationAccuracy}%` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              100% = perfect (1 planned unit = 1 actual slot)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Best Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.dayAverages
                .sort((a, b) => b.average - a.average)
                .map((d) => {
                  const pct = Math.round((d.average / maxDayAvg) * 100);
                  return (
                    <div key={d.dayOfWeek} className="flex items-center gap-3">
                      <span className="text-xs font-medium w-8 shrink-0">
                        {DAY_LABELS[d.dayOfWeek]}
                      </span>
                      <div className="flex-1">
                        <Progress value={pct} className="h-1.5" />
                      </div>
                      <span className="text-xs tabular-nums w-8 text-right shrink-0">
                        {d.average}
                      </span>
                    </div>
                  );
                })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Average completed units per day of week
            </p>
          </CardContent>
        </Card>
      </div>

      {data.allTimeProjects.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All-Time by Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.allTimeProjects.map((p) => {
                const total = data.allTimeProjects.reduce((s, x) => s + x.total, 0);
                const pct = total > 0 ? Math.round((p.total / total) * 100) : 0;
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-sm flex-1 truncate">{p.name}</span>
                    <Badge variant="secondary" className="text-[10px] tabular-nums">
                      {p.total} units
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
