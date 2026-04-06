"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Calendar, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getActiveUnits } from "@/app/actions/units";

type ActiveUnit = Awaited<ReturnType<typeof getActiveUnits>>[number];

interface ActiveUnitsViewProps {
  initialUnits: ActiveUnit[];
}

const statusColors: Record<string, string> = {
  pending: "text-muted-foreground bg-muted",
  scheduled: "text-blue-700 bg-blue-100",
  in_progress: "text-amber-700 bg-amber-100",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  in_progress: "In Progress",
};

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function ActiveUnitsView({ initialUnits }: ActiveUnitsViewProps) {
  const [units, setUnits] = useState<ActiveUnit[]>(initialUnits);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    const updated = await getActiveUnits();
    setUnits(updated);
    setRefreshing(false);
  }

  // Group by project
  const grouped = new Map<string, { projectName: string; color: string; units: ActiveUnit[] }>();
  const standalone: ActiveUnit[] = [];

  for (const unit of units) {
    if (!unit.task) {
      standalone.push(unit);
      continue;
    }
    const projId = unit.task.project.id;
    if (!grouped.has(projId)) {
      grouped.set(projId, {
        projectName: unit.task.project.name,
        color: unit.task.project.color,
        units: [],
      });
    }
    grouped.get(projId)!.units.push(unit);
  }

  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No active units</p>
        <p className="text-xs text-muted-foreground/70 mt-1">All units are completed or there are none yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {units.length} active {units.length === 1 ? "unit" : "units"}
        </p>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
          Refresh
        </button>
      </div>

      {standalone.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            <h3 className="text-sm font-medium text-muted-foreground">Standalone</h3>
          </div>
          <UnitTable units={standalone} />
        </section>
      )}

      {Array.from(grouped.entries()).map(([projId, group]) => (
        <section key={projId}>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: group.color }}
            />
            <h3 className="text-sm font-medium">{group.projectName}</h3>
            <Badge variant="outline" className="text-[10px] tabular-nums">{group.units.length}</Badge>
          </div>
          <UnitTable units={group.units} />
        </section>
      ))}
    </div>
  );
}

function UnitTable({ units }: { units: ActiveUnit[] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {units.map((unit, i) => (
        <div
          key={unit.id}
          className={`flex items-center gap-3 px-3 py-2.5 ${i !== 0 ? "border-t border-border/50" : ""} hover:bg-muted/30 transition-colors`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{unit.label || unit.task?.title || "Untitled"}</p>
            {unit.task && unit.label && (
              <p className="text-xs text-muted-foreground truncate">{unit.task.title}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {unit.scheduledDate && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(unit.scheduledDate)}
              </div>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[unit.status] ?? ""}`}>
              {statusLabels[unit.status] ?? unit.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
