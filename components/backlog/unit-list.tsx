"use client";

import { UnitRow } from "@/components/backlog/unit-row";
import { AddUnitForm } from "@/components/backlog/add-unit-form";
import type { UnitData } from "@/components/backlog/task-row";

interface UnitListProps {
  units: UnitData[];
  taskId: string;
}

export function UnitList({ units, taskId }: UnitListProps) {
  const hasUnits = units.length > 0;

  return (
    <div className="py-1">
      {!hasUnits && (
        <p className="text-[11px] text-muted-foreground py-1 px-2">
          No units yet.
        </p>
      )}

      {hasUnits && (
        <div>
          {units.map((unit) => (
            <UnitRow key={unit.id} unit={unit} />
          ))}
        </div>
      )}

      <div className="px-2 pt-1">
        <AddUnitForm taskId={taskId} />
      </div>
    </div>
  );
}
