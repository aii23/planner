"use client";

import { useState, useRef } from "react";
import { Pencil } from "lucide-react";
import { useBacklogRefresh } from "@/components/backlog/backlog-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateProject } from "@/app/actions/projects";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#06b6d4",
];

interface EditProjectDialogProps {
  project: {
    id: string;
    name: string;
    color: string;
  };
}

export function EditProjectDialog({ project }: EditProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(project.color);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const refresh = useBacklogRefresh();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");
    formData.set("id", project.id);
    formData.set("color", color);

    const result = await updateProject(formData);
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
      setColor(project.color);
      setError("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon-sm" />}
      >
        <Pencil className="h-3.5 w-3.5" />
        <span className="sr-only">Edit project</span>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the project name or color.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor={`edit-name-${project.id}`} className="text-sm font-medium">
              Name
            </label>
            <Input
              id={`edit-name-${project.id}`}
              name="name"
              defaultValue={project.name}
              required
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "var(--color-foreground)" : "transparent",
                    transform: color === c ? "scale(1.15)" : "scale(1)",
                  }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="h-5 w-5 rounded border border-border"
                style={{ backgroundColor: color }}
              />
              <Input
                value={color}
                onChange={(e) => {
                  const v = (e.target as HTMLInputElement).value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(v);
                }}
                className="h-7 w-24 font-mono text-xs"
                placeholder="#6366f1"
              />
            </div>
          </div>

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
