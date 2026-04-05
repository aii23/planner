"use client";

import { useState, useRef } from "react";
import { Plus, X } from "lucide-react";
import { useBacklog } from "@/components/backlog/backlog-context";
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
  const formRef = useRef<HTMLFormElement>(null);
  const { addTask, refresh } = useBacklog();

  async function handleSubmit(formData: FormData) {
    const title = (formData.get("title") as string)?.trim();
    if (!title) {
      setError("Task title is required");
      return;
    }

    formData.set("projectId", projectId);
    const description = (formData.get("description") as string)?.trim() || null;
    const estimatedUnits = parseInt(formData.get("estimatedUnits") as string, 10) || 1;

    addTask(projectId, {
      id: `optimistic-${Date.now()}`,
      projectId,
      title,
      description,
      status: "backlog",
      estimatedUnits,
      completedUnits: 0,
      createdAt: new Date(),
      completedAt: null,
      _count: { units: 0 },
      units: [],
    });

    formRef.current?.reset();
    setExpanded(false);
    setError("");

    createTask(formData).then((result) => {
      if (result?.error) setError(result.error);
      refresh();
    });
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

        <Button type="submit" size="sm" className="h-7 text-xs">
          Add Task
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
