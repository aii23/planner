"use client";

import { useState, useRef } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTask } from "@/app/actions/tasks";

interface AddTaskFormProps {
  projectId: string;
}

export function AddTaskForm({ projectId }: AddTaskFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");
    formData.set("projectId", projectId);

    const result = await createTask(formData);
    setPending(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    formRef.current?.reset();
    setExpanded(false);
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <Plus className="h-3 w-3" />
        Add task
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="rounded-md border border-border bg-muted/30 p-3 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">New Task</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            setExpanded(false);
            setError("");
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        <Input
          name="title"
          placeholder="Task title"
          required
          autoFocus
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Textarea
          name="description"
          placeholder="Description (optional)"
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor={`units-${projectId}`} className="text-xs text-muted-foreground whitespace-nowrap">
            Est. units
          </label>
          <Input
            id={`units-${projectId}`}
            name="estimatedUnits"
            type="number"
            min={1}
            defaultValue={1}
            required
            className="h-8 w-16 text-sm"
          />
        </div>

        <div className="flex-1" />

        <Button type="submit" size="sm" disabled={pending} className="h-7 text-xs">
          {pending ? "Adding…" : "Add Task"}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
