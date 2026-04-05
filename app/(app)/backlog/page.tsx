import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { BacklogProjects } from "@/components/backlog/backlog-projects";
import { getProjects } from "@/app/actions/projects";

export default async function BacklogPage() {
  await connection();
  const user = await getCurrentUser();
  const projects = await getProjects(false);

  const archivedCount = await prisma.project.count({
    where: { userId: user.id, status: "archived" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backlog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Projects, tasks, and work units
        </p>
      </div>

      <BacklogProjects
        initialProjects={projects}
        hasArchived={archivedCount > 0}
      />
    </div>
  );
}
