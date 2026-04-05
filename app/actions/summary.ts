"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { addDays, toDateOnlyISO } from "@/lib/date-utils";

export async function getWeeklySummary(weekStartISO: string) {
  const user = await getCurrentUser();
  const weekStart = new Date(weekStartISO + "T00:00:00.000Z");
  const weekEnd = addDays(weekStart, 7);

  const plan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: weekStart,
      },
    },
    include: {
      dailyPlans: {
        orderBy: { date: "asc" },
        include: {
          scheduledUnits: {
            include: {
              unit: {
                include: {
                  task: {
                    select: {
                      id: true,
                      title: true,
                      status: true,
                      completedAt: true,
                      project: { select: { id: true, name: true, color: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!plan) return null;

  const allScheduledUnits = plan.dailyPlans.flatMap((dp) => dp.scheduledUnits);

  const completedUnits = allScheduledUnits.filter(
    (su) => su.unit.status === "completed"
  );
  const skippedUnits = allScheduledUnits.filter(
    (su) => su.unit.status === "skipped"
  );
  const unfinishedUnits = allScheduledUnits.filter(
    (su) => su.unit.status !== "completed" && su.unit.status !== "skipped"
  );

  const totalScheduled = allScheduledUnits.length;
  const totalCompleted = completedUnits.length;
  const totalActualSlots = completedUnits.reduce(
    (sum, su) => sum + (su.unit.actualUnitsConsumed ?? 1),
    0
  );

  const projectMap = new Map<
    string,
    { id: string; name: string; color: string; completed: number; scheduled: number }
  >();
  for (const su of allScheduledUnits) {
    const p = su.unit.task.project;
    const entry = projectMap.get(p.id) ?? {
      id: p.id,
      name: p.name,
      color: p.color,
      completed: 0,
      scheduled: 0,
    };
    entry.scheduled++;
    if (su.unit.status === "completed") entry.completed++;
    projectMap.set(p.id, entry);
  }

  const completedTaskIds = new Set<string>();
  for (const su of completedUnits) {
    if (su.unit.task.status === "done") {
      completedTaskIds.add(su.unit.task.id);
    }
  }
  const completedTasks = Array.from(completedTaskIds).map((taskId) => {
    const su = completedUnits.find((s) => s.unit.task.id === taskId)!;
    return {
      id: su.unit.task.id,
      title: su.unit.task.title,
      project: su.unit.task.project,
    };
  });

  const seen = new Set<string>();
  const dedupedUnfinished = unfinishedUnits.filter((su) => {
    if (seen.has(su.unit.id)) return false;
    seen.add(su.unit.id);
    return true;
  });

  return {
    weekStartISO,
    targetUnits: plan.targetUnits,
    totalScheduled,
    totalCompleted,
    totalActualSlots,
    projectBreakdown: Array.from(projectMap.values()),
    completedTasks,
    unfinishedUnits: dedupedUnfinished.map((su) => ({
      unitId: su.unit.id,
      scheduledUnitId: su.id,
      label: su.unit.label,
      status: su.unit.status,
      task: su.unit.task,
    })),
    dailyBreakdown: plan.dailyPlans.map((dp) => ({
      date: dp.date,
      target: dp.targetUnits,
      completed: dp.scheduledUnits.filter((su) => su.unit.status === "completed").length,
      scheduled: dp.scheduledUnits.length,
    })),
  };
}

export async function carryForwardUnit(unitId: string) {
  const user = await getCurrentUser();

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, userId: user.id },
  });
  if (!unit) return { error: "Unit not found" };

  await prisma.scheduledUnit.deleteMany({
    where: { unitId },
  });

  await prisma.unit.update({
    where: { id: unitId },
    data: { status: "pending" },
  });

  revalidatePath("/summary");
  revalidatePath("/weekly-plan");
  return { success: true };
}

export async function markUnitSkipped(unitId: string) {
  const user = await getCurrentUser();

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, userId: user.id },
  });
  if (!unit) return { error: "Unit not found" };

  await prisma.unit.update({
    where: { id: unitId },
    data: { status: "skipped" },
  });

  revalidatePath("/summary");
  return { success: true };
}
