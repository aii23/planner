"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, ChevronDown, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { archiveProject } from "@/app/actions/projects";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    color: string;
    status: "active" | "archived";
    createdAt: Date;
    _count: { tasks: number };
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const isArchived = project.status === "archived";

  async function handleArchive() {
    setArchiving(true);
    const formData = new FormData();
    formData.set("id", project.id);
    await archiveProject(formData);
    setArchiving(false);
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
            {project._count.tasks} {project._count.tasks === 1 ? "task" : "tasks"}
          </span>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Tasks will appear here once you build them in Step 5.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
