"use client";

import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import { useBacklog } from "@/components/backlog/backlog-context";
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
import { createProject } from "@/app/actions/projects";

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#06b6d4", // cyan
];

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const { addProject, refresh } = useBacklog();

  async function handleSubmit(formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    if (!name) {
      setError("Project name is required");
      return;
    }

    formData.set("color", color);

    addProject({
      id: `optimistic-${Date.now()}`,
      name,
      color,
      status: "active",
      createdAt: new Date(),
      _count: { tasks: 0 },
      tasks: [],
    });

    setOpen(false);
    setColor(PRESET_COLORS[0]);
    formRef.current?.reset();
    setError("");

    createProject(formData).then((result) => {
      if (result?.error) setError(result.error);
      refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" />}
      >
        <Plus className="h-4 w-4" data-icon="inline-start" />
        New Project
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Create a project to organize your tasks and work units.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="project-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="project-name"
              name="name"
              placeholder="e.g. Website Redesign"
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
            <Button type="submit">
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
