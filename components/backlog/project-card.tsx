"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, ChevronDown, ListTodo, CheckCircle2 } from "lucide-react";
import { useBacklogRefresh } from "@/components/backlog/backlog-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EditProjectDialog } from "@/components/backlog/edit-project-dialog";
import { TaskList } from "@/components/backlog/task-list";
import { archiveProject } from "@/app/actions/projects";
import { cn } from "@/lib/utils";
import type { TaskWithUnits } from "@/components/backlog/task-row";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    color: string;
    status: "active" | "archived";
    createdAt: Date;
    _count: { tasks: number };
    tasks: TaskWithUnits[];
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const refresh = useBacklogRefresh();
  const isArchived = project.status === "archived";

  const doneTasks = project.tasks.filter((t) => t.status === "done").length;
  const totalTasks = project._count.tasks;

  async function handleArchive() {
    setArchiving(true);
    const formData = new FormData();
    formData.set("id", project.id);
    await archiveProject(formData);
    setArchiving(false);
    refresh();
  }

  return (
    <Card className={cn("transition-opacity", isArchived && "opacity-60")}>
      <CardHeader className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: project.color }}
          />

          <CardTitle className="flex-1 text-sm font-medium">
            {project.name}
          </CardTitle>

          <Badge variant={isArchived ? "outline" : "secondary"} className="text-[10px]">
            {isArchived ? "Archived" : "Active"}
          </Badge>

          <div className="flex items-center gap-0.5">
            <EditProjectDialog project={project} />

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleArchive}
              disabled={archiving}
              title={isArchived ? "Restore project" : "Archive project"}
            >
              {isArchived ? (
                <ArchiveRestore className="h-3.5 w-3.5" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">
                {isArchived ? "Restore" : "Archive"}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? "Collapse" : "Expand"}
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  expanded && "rotate-180"
                )}
              />
              <span className="sr-only">Toggle</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-1 ml-6">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ListTodo className="h-3 w-3" />
            {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
          </span>
          {doneTasks > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              {doneTasks} done
            </span>
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t border-border px-4 py-3">
          <TaskList
            tasks={project.tasks}
            projectId={project.id}
            projectColor={project.color}
          />
        </CardContent>
      )}
    </Card>
  );
}
