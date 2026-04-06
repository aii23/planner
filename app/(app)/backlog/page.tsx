import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { BacklogProjects } from "@/components/backlog/backlog-projects";
import { ActiveUnitsView } from "@/components/backlog/active-units-view";
import { getProjects } from "@/app/actions/projects";
import { getActiveUnits } from "@/app/actions/units";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function BacklogPage() {
  await connection();
  const user = await getCurrentUser();

  const [projects, archivedCount, activeUnits] = await Promise.all([
    getProjects(false),
    prisma.project.count({ where: { userId: user.id, status: "archived" } }),
    getActiveUnits(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backlog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Projects, tasks, and work units
        </p>
      </div>

      <Tabs defaultValue="projects">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="active">
            Active Units
            {activeUnits.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold tabular-nums">
                {activeUnits.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          <BacklogProjects initialProjects={projects} hasArchived={archivedCount > 0} />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <ActiveUnitsView initialUnits={activeUnits} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
