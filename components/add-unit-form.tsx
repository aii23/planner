"use client";

import { useState, useRef } from "react";
import { Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createUnit, createBulkUnits } from "@/app/actions/units";

interface AddUnitFormProps {
  taskId: string;
}

export function AddUnitForm({ taskId }: AddUnitFormProps) {
  const [mode, setMode] = useState<"idle" | "single" | "bulk">("idle");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [bulkCount, setBulkCount] = useState(5);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAddSingle(formData: FormData) {
    setPending(true);
    setError("");
    formData.set("taskId", taskId);

    const result = await createUnit(formData);
    setPending(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    formRef.current?.reset();
    setMode("idle");
  }

  async function handleAddBulk() {
    if (bulkCount < 1 || bulkCount > 50) {
      setError("Count must be between 1 and 50");
      return;
    }

    setPending(true);
    setError("");

    const result = await createBulkUnits(taskId, bulkCount);
    setPending(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setMode("idle");
    setBulkCount(5);
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
          disabled={pending}
          className="h-6 text-[11px] px-2"
        >
          {pending ? "Adding…" : "Add"}
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
        disabled={pending}
        className="h-6 text-[11px] px-2"
      >
        {pending ? "Adding…" : "Add"}
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
