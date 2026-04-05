"use client";

import { useState, useEffect, useCallback } from "react";
import { Inbox, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/backlog/project-card";
import { NewProjectDialog } from "@/components/backlog/new-project-dialog";
import { getProjects } from "@/app/actions/projects";

type ProjectWithCount = Awaited<ReturnType<typeof getProjects>>[number];

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

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getProjects(showArchived);
    setProjects(data);
    setLoading(false);
  }, [showArchived]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasProjects = projects.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <NewProjectDialog />

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

      {!hasProjects && !loading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Inbox className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {showArchived
              ? "No archived projects."
              : "No projects yet. Create your first project to get started."}
          </p>
        </div>
      )}

      {hasProjects && (
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
