"use client";

import { useState, useRef } from "react";
import { CalendarPlus, Inbox, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { scheduleUnit, createQuickUnit } from "@/app/actions/weekly-plan";
import { getDayName, formatDateShort } from "@/lib/date-utils";

export interface BacklogUnitItem {
  id: string;
  label: string | null;
  task: {
    id: string;
    title: string;
    project: { id: string; name: string; color: string };
  } | null;
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

const STANDALONE_KEY = "__standalone__";
const STANDALONE_COLOR = "#94a3b8";

function groupByProjectAndTask(units: BacklogUnitItem[]): {
  groups: ProjectGroup[];
  standalone: BacklogUnitItem[];
} {
  const projectMap = new Map<string, ProjectGroup>();
  const standalone: BacklogUnitItem[] = [];

  for (const unit of units) {
    if (!unit.task) {
      standalone.push(unit);
      continue;
    }

    const proj = unit.task.project;
    if (!projectMap.has(proj.id)) {
      projectMap.set(proj.id, { project: proj, tasks: [] });
    }
    const pg = projectMap.get(proj.id)!;

    let tg = pg.tasks.find((t) => t.taskId === unit.task!.id);
    if (!tg) {
      tg = { taskId: unit.task.id, taskTitle: unit.task.title, units: [] };
      pg.tasks.push(tg);
    }
    tg.units.push(unit);
  }

  return { groups: Array.from(projectMap.values()), standalone };
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

function QuickAddUnit({ onCreated }: { onCreated: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const label = inputRef.current?.value?.trim();
    if (!label) {
      setError("Label is required");
      return;
    }

    setPending(true);
    setError("");

    const result = await createQuickUnit(label);
    setPending(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    if (inputRef.current) inputRef.current.value = "";
    setExpanded(false);
    onCreated();
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full px-1 py-1.5"
      >
        <Plus className="h-3 w-3" />
        New unit
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5 px-1">
      <Input
        ref={inputRef}
        placeholder="Unit label"
        autoFocus
        className="h-7 text-xs"
        disabled={pending}
      />
      <div className="flex items-center gap-1.5">
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          className="h-6 text-[11px] px-2 flex-1"
        >
          {pending ? "Adding…" : "Add"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setExpanded(false); setError(""); }}
          className="h-6 text-[11px] px-2"
        >
          Cancel
        </Button>
      </div>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </form>
  );
}

export function SchedulingBacklog({
  units,
  days,
  onScheduled,
}: SchedulingBacklogProps) {
  const { groups, standalone } = groupByProjectAndTask(units);

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

      <QuickAddUnit onCreated={onScheduled} />

      {units.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-xs text-muted-foreground">
            No unscheduled units
          </p>
        </div>
      )}

      {standalone.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-1 mb-1">
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: STANDALONE_COLOR }}
            />
            <span className="text-[11px] font-medium truncate text-muted-foreground">
              Standalone
            </span>
          </div>
          <div className="ml-3 mb-2">
            {standalone.map((unit) => (
              <UnitAssignRow
                key={unit.id}
                unit={unit}
                days={days}
                onScheduled={onScheduled}
              />
            ))}
          </div>
        </div>
      )}

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
