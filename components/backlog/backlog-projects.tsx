"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Inbox, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectCard } from "@/components/backlog/project-card";
import { NewProjectDialog } from "@/components/backlog/new-project-dialog";
import {
  BacklogProvider,
  type OptimisticProject,
  type OptimisticTask,
  type OptimisticUnit,
} from "@/components/backlog/backlog-context";
import { getProjects } from "@/app/actions/projects";

type ProjectWithCount = Awaited<ReturnType<typeof getProjects>>[number];

const TASK_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
] as const;

type TaskStatusFilter = (typeof TASK_STATUS_FILTERS)[number]["value"];

interface BacklogProjectsProps {
  initialProjects: ProjectWithCount[];
  hasArchived: boolean;
}

export function BacklogProjects({
  initialProjects,
  hasArchived,
}: BacklogProjectsProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [projects, setProjects] = useState(initialProjects);
  const [loading, setLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskStatusFilter>("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getProjects(showArchived);
    setProjects(data);
    setLoading(false);
  }, [showArchived]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addProject = useCallback((project: OptimisticProject) => {
    setProjects((prev) => [project as unknown as ProjectWithCount, ...prev]);
  }, []);

  const addTask = useCallback((projectId: string, task: OptimisticTask) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          _count: { ...p._count, tasks: p._count.tasks + 1 },
          tasks: [...p.tasks, task as unknown as ProjectWithCount["tasks"][number]],
        } as typeof p;
      })
    );
  }, []);

  const addUnits = useCallback((taskId: string, units: OptimisticUnit[]) => {
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        tasks: p.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            _count: { ...t._count, units: t._count.units + units.length },
            units: [...t.units, ...units as unknown as typeof t.units],
          } as typeof t;
        }),
      }) as typeof p)
    );
  }, []);

  const filteredProjects = projects.map((project) => {
    if (taskFilter === "all") return project;
    return {
      ...project,
      tasks: project.tasks.filter((t) => t.status === taskFilter),
    };
  });

  const visibleProjects = taskFilter === "all"
    ? filteredProjects
    : filteredProjects.filter((p) => p.tasks.length > 0);

  const hasProjects = visibleProjects.length > 0;

  const ctxValue = useMemo(
    () => ({ refresh, addProject, addTask, addUnits }),
    [refresh, addProject, addTask, addUnits]
  );

  return (
    <BacklogProvider value={ctxValue}>
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <NewProjectDialog />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            {TASK_STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTaskFilter(f.value)}
                className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  taskFilter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {(hasArchived || showArchived) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                  Hide archived
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Show archived
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {!hasProjects && !loading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Inbox className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {taskFilter !== "all"
              ? `No tasks with status "${taskFilter.replace("_", " ")}".`
              : showArchived
                ? "No archived projects."
                : "No projects yet. Create your first project to get started."}
          </p>
        </div>
      )}

      {hasProjects && (
        <div className="space-y-3">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
    </BacklogProvider>
  );
}
