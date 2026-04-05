"use client";

import { useState } from "react";
import { CalendarPlus, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { scheduleUnit } from "@/app/actions/weekly-plan";
import { getDayName, formatDateShort } from "@/lib/date-utils";

interface BacklogUnitItem {
  id: string;
  label: string | null;
  task: {
    id: string;
    title: string;
    project: { id: string; name: string; color: string };
  };
}

interface DayOption {
  id: string;
  date: Date;
  scheduledCount: number;
  targetUnits: number;
}

interface SchedulingBacklogProps {
  units: BacklogUnitItem[];
  days: DayOption[];
  onScheduled: () => void;
}

interface ProjectGroup {
  project: { id: string; name: string; color: string };
  tasks: TaskGroup[];
}

interface TaskGroup {
  taskId: string;
  taskTitle: string;
  units: BacklogUnitItem[];
}

function groupByProjectAndTask(units: BacklogUnitItem[]): ProjectGroup[] {
  const projectMap = new Map<string, ProjectGroup>();

  for (const unit of units) {
    const proj = unit.task.project;
    if (!projectMap.has(proj.id)) {
      projectMap.set(proj.id, { project: proj, tasks: [] });
    }
    const pg = projectMap.get(proj.id)!;

    let tg = pg.tasks.find((t) => t.taskId === unit.task.id);
    if (!tg) {
      tg = { taskId: unit.task.id, taskTitle: unit.task.title, units: [] };
      pg.tasks.push(tg);
    }
    tg.units.push(unit);
  }

  return Array.from(projectMap.values());
}

function UnitAssignRow({
  unit,
  days,
  onScheduled,
}: {
  unit: BacklogUnitItem;
  days: DayOption[];
  onScheduled: () => void;
}) {
  const [assigning, setAssigning] = useState(false);
  const [showDays, setShowDays] = useState(false);

  async function handleAssign(dailyPlanId: string) {
    setAssigning(true);
    await scheduleUnit(unit.id, dailyPlanId);
    setAssigning(false);
    setShowDays(false);
    onScheduled();
  }

  return (
    <div className="group">
      <div className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted/50">
        <span className="text-[11px] truncate flex-1">
          {unit.label || "Untitled"}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setShowDays(!showDays)}
          disabled={assigning}
          title="Assign to day"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <CalendarPlus className="h-3 w-3" />
        </Button>
      </div>

      {showDays && (
        <div className="ml-3 mb-1 flex flex-wrap gap-1">
          {days.map((day) => {
            const d = new Date(day.date);
            const full = day.scheduledCount >= day.targetUnits && day.targetUnits > 0;
            return (
              <button
                key={day.id}
                onClick={() => handleAssign(day.id)}
                disabled={assigning}
                className={`
                  rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors
                  ${full
                    ? "border-border/40 text-muted-foreground/50 bg-muted/30"
                    : "border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  }
                `}
                title={`${getDayName(d)} ${formatDateShort(d)} (${day.scheduledCount}/${day.targetUnits})`}
              >
                {getDayName(d)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SchedulingBacklog({
  units,
  days,
  onScheduled,
}: SchedulingBacklogProps) {
  const groups = groupByProjectAndTask(units);

  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground/30" />
        <p className="mt-2 text-xs text-muted-foreground">
          No unscheduled units
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          Create units in the Backlog view
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-muted-foreground">
          Unscheduled
        </span>
        <Badge variant="outline" className="text-[10px] tabular-nums">
          {units.length}
        </Badge>
      </div>

      {groups.map((pg) => (
        <div key={pg.project.id}>
          <div className="flex items-center gap-2 px-1 mb-1">
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: pg.project.color }}
            />
            <span className="text-[11px] font-medium truncate">
              {pg.project.name}
            </span>
          </div>

          {pg.tasks.map((tg) => (
            <div key={tg.taskId} className="ml-3 mb-2">
              <p className="text-[10px] text-muted-foreground font-medium mb-0.5 truncate">
                {tg.taskTitle}
              </p>
              {tg.units.map((unit) => (
                <UnitAssignRow
                  key={unit.id}
                  unit={unit}
                  days={days}
                  onScheduled={onScheduled}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
