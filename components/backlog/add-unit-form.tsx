"use client";

import { useState, useRef } from "react";
import { Plus, Layers } from "lucide-react";
import { useBacklog } from "@/components/backlog/backlog-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createUnit, createBulkUnits } from "@/app/actions/units";
import type { UnitStatus } from "@/src/generated/prisma/client";

interface AddUnitFormProps {
  taskId: string;
}

export function AddUnitForm({ taskId }: AddUnitFormProps) {
  const [mode, setMode] = useState<"idle" | "single" | "bulk">("idle");
  const [error, setError] = useState("");
  const [bulkCount, setBulkCount] = useState(5);
  const formRef = useRef<HTMLFormElement>(null);
  const { addUnits, refresh } = useBacklog();

  function makeOptimisticUnit(label: string | null) {
    return {
      id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      status: "pending" as UnitStatus,
      actualDurationSeconds: null,
      actualUnitsConsumed: null,
      completedAt: null,
      createdAt: new Date(),
    };
  }

  async function handleAddSingle(formData: FormData) {
    formData.set("taskId", taskId);
    const label = (formData.get("label") as string)?.trim() || null;

    addUnits(taskId, [makeOptimisticUnit(label)]);
    formRef.current?.reset();
    setMode("idle");
    setError("");

    createUnit(formData).then((result) => {
      if (result?.error) setError(result.error);
      refresh();
    });
  }

  async function handleAddBulk() {
    if (bulkCount < 1 || bulkCount > 50) {
      setError("Count must be between 1 and 50");
      return;
    }

    const units = Array.from({ length: bulkCount }, (_, i) =>
      makeOptimisticUnit(bulkCount > 1 ? `Unit ${i + 1}` : null)
    );
    addUnits(taskId, units);
    setMode("idle");
    setBulkCount(5);
    setError("");

    createBulkUnits(taskId, bulkCount).then((result) => {
      if (result?.error) setError(result.error);
      refresh();
    });
  }

  if (mode === "idle") {
    return (
      <div className="flex items-center gap-2 py-1">
        <button
          onClick={() => setMode("single")}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add unit
        </button>
        <span className="text-muted-foreground/40 text-[10px]">|</span>
        <button
          onClick={() => setMode("bulk")}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Layers className="h-3 w-3" />
          Add N units
        </button>
      </div>
    );
  }

  if (mode === "bulk") {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">Add</span>
        <Input
          type="number"
          min={1}
          max={50}
          value={bulkCount}
          onChange={(e) => setBulkCount(parseInt((e.target as HTMLInputElement).value, 10) || 1)}
          className="h-6 w-14 text-xs"
        />
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">units</span>
        <Button
          size="sm"
          onClick={handleAddBulk}
          className="h-6 text-[11px] px-2"
        >
          Add
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setMode("idle"); setError(""); }}
          className="h-6 text-[11px] px-2"
        >
          Cancel
        </Button>
        {error && <span className="text-[10px] text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleAddSingle}
      className="flex items-center gap-2 py-1"
    >
      <Input
        name="label"
        placeholder="Label (optional)"
        className="h-6 text-xs flex-1"
        autoFocus
      />
      <Button
        type="submit"
        size="sm"
        className="h-6 text-[11px] px-2"
      >
        Add
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => { setMode("idle"); setError(""); }}
        className="h-6 text-[11px] px-2"
      >
        Cancel
      </Button>
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </form>
  );
}
