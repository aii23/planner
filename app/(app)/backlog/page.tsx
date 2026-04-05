import { Inbox } from "lucide-react";

export default function BacklogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backlog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Projects, tasks, and work units
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <Inbox className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          No projects yet. Create your first project to get started.
        </p>
      </div>
    </div>
  );
}
