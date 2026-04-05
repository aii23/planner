"use client";

import { useState, useRef } from "react";
import { Pencil } from "lucide-react";
import { useBacklogRefresh } from "@/components/backlog/backlog-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateTask } from "@/app/actions/tasks";
import type { TaskStatus } from "@/src/generated/prisma/client";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

interface EditTaskDialogProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    estimatedUnits: number;
  };
}

export function EditTaskDialog({ task }: EditTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const formRef = useRef<HTMLFormElement>(null);
  const refresh = useBacklogRefresh();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");
    formData.set("id", task.id);
    formData.set("status", status);

    const result = await updateTask(formData);
    setPending(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    refresh();
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setStatus(task.status);
      setError("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Pencil className="h-3.5 w-3.5" />
        <span className="sr-only">Edit task</span>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update the task details, estimated units, or status.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor={`edit-task-title-${task.id}`} className="text-sm font-medium">
              Title
            </label>
            <Input
              id={`edit-task-title-${task.id}`}
              name="title"
              defaultValue={task.title}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={`edit-task-desc-${task.id}`} className="text-sm font-medium">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id={`edit-task-desc-${task.id}`}
              name="description"
              defaultValue={task.description ?? ""}
              rows={3}
              placeholder="What does this task involve?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor={`edit-task-units-${task.id}`} className="text-sm font-medium">
                Estimated Units
              </label>
              <Input
                id={`edit-task-units-${task.id}`}
                name="estimatedUnits"
                type="number"
                min={1}
                defaultValue={task.estimatedUnits}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`
                      rounded-md border px-2.5 py-1 text-xs font-medium transition-colors
                      ${
                        status === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
