"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { addDays, addWeeks, toDateOnlyISO } from "@/lib/date-utils";
import type { UnitStatus } from "@/src/generated/prisma/client";

export async function getOrCreateWeeklyPlan(weekStartISO: string) {
  const user = await getCurrentUser();
  const weekStartDate = new Date(weekStartISO + "T00:00:00.000Z");

  let plan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate,
      },
    },
    include: {
      dailyPlans: {
        orderBy: { date: "asc" },
        include: {
          scheduledUnits: {
            orderBy: { sortOrder: "asc" },
            include: {
              unit: {
                include: {
                  task: {
                    select: { id: true, title: true, project: { select: { id: true, name: true, color: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!plan) {
    plan = await prisma.weeklyPlan.create({
      data: {
        userId: user.id,
        weekStartDate,
        targetUnits: 80,
        dailyPlans: {
          create: Array.from({ length: 7 }, (_, i) => {
            const dayDate = addDays(weekStartDate, i);
            return {
              userId: user.id,
              date: new Date(toDateOnlyISO(dayDate) + "T00:00:00.000Z"),
              targetUnits: i < 5 ? 16 : 0,
            };
          }),
        },
      },
      include: {
        dailyPlans: {
          orderBy: { date: "asc" },
          include: {
            scheduledUnits: {
              orderBy: { sortOrder: "asc" },
              include: {
                unit: {
                  include: {
                    task: {
                      select: { id: true, title: true, project: { select: { id: true, name: true, color: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  return plan;
}

export async function updateWeeklyTarget(planId: string, targetUnits: number) {
  const user = await getCurrentUser();

  if (targetUnits < 0 || targetUnits > 999) {
    return { error: "Target must be between 0 and 999" };
  }

  const plan = await prisma.weeklyPlan.findFirst({
    where: { id: planId, userId: user.id },
  });
  if (!plan) return { error: "Weekly plan not found" };

  await prisma.weeklyPlan.update({
    where: { id: planId },
    data: { targetUnits },
  });

  revalidatePath("/weekly-plan");
  return { success: true };
}

export async function updateDailyTarget(
  dailyPlanId: string,
  targetUnits: number
) {
  const user = await getCurrentUser();

  if (targetUnits < 0 || targetUnits > 99) {
    return { error: "Target must be between 0 and 99" };
  }

  const dailyPlan = await prisma.dailyPlan.findFirst({
    where: { id: dailyPlanId, userId: user.id },
  });
  if (!dailyPlan) return { error: "Daily plan not found" };

  await prisma.dailyPlan.update({
    where: { id: dailyPlanId },
    data: { targetUnits },
  });

  revalidatePath("/weekly-plan");
  return { success: true };
}

export async function getUnscheduledUnits() {
  const user = await getCurrentUser();

  return prisma.unit.findMany({
    where: {
      userId: user.id,
      status: "pending" as UnitStatus,
      scheduledUnits: { none: {} },
    },
    orderBy: { createdAt: "asc" },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          project: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });
}

export async function scheduleUnit(
  unitId: string,
  dailyPlanId: string
) {
  const user = await getCurrentUser();

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, userId: user.id },
  });
  if (!unit) return { error: "Unit not found" };

  const dailyPlan = await prisma.dailyPlan.findFirst({
    where: { id: dailyPlanId, userId: user.id },
  });
  if (!dailyPlan) return { error: "Daily plan not found" };

  const existing = await prisma.scheduledUnit.findUnique({
    where: { dailyPlanId_unitId: { dailyPlanId, unitId } },
  });
  if (existing) return { error: "Unit already scheduled for this day" };

  const maxOrder = await prisma.scheduledUnit.aggregate({
    where: { dailyPlanId },
    _max: { sortOrder: true },
  });
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  await prisma.$transaction([
    prisma.scheduledUnit.create({
      data: { dailyPlanId, unitId, sortOrder: nextOrder },
    }),
    prisma.unit.update({
      where: { id: unitId },
      data: { status: "scheduled" },
    }),
  ]);

  revalidatePath("/weekly-plan");
  return { success: true };
}

export async function quickAddUnitToDay(
  taskId: string,
  label: string | null,
  dailyPlanId: string
) {
  const user = await getCurrentUser();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id },
  });
  if (!task) return { error: "Task not found" };

  const dailyPlan = await prisma.dailyPlan.findFirst({
    where: { id: dailyPlanId, userId: user.id },
  });
  if (!dailyPlan) return { error: "Daily plan not found" };

  const unit = await prisma.unit.create({
    data: {
      taskId,
      userId: user.id,
      label: label?.trim() || null,
      status: "scheduled",
    },
  });

  const maxOrder = await prisma.scheduledUnit.aggregate({
    where: { dailyPlanId },
    _max: { sortOrder: true },
  });

  const scheduledUnit = await prisma.scheduledUnit.create({
    data: {
      dailyPlanId,
      unitId: unit.id,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    select: { id: true, sortOrder: true },
  });

  revalidatePath("/weekly-plan");
  return { success: true, unitId: unit.id, scheduledUnitId: scheduledUnit.id, sortOrder: scheduledUnit.sortOrder };
}

export async function unscheduleUnit(scheduledUnitId: string) {
  const user = await getCurrentUser();

  const su = await prisma.scheduledUnit.findUnique({
    where: { id: scheduledUnitId },
    include: { unit: true, dailyPlan: true },
  });
  if (!su) return { error: "Scheduled unit not found" };
  if (su.dailyPlan.userId !== user.id) return { error: "Not authorized" };

  await prisma.$transaction([
    prisma.scheduledUnit.delete({ where: { id: scheduledUnitId } }),
    prisma.unit.update({
      where: { id: su.unitId },
      data: { status: "pending" },
    }),
  ]);

  revalidatePath("/weekly-plan");
  return { success: true };
}

export async function reorderUnit(
  scheduledUnitId: string,
  direction: "up" | "down"
) {
  const user = await getCurrentUser();

  const su = await prisma.scheduledUnit.findUnique({
    where: { id: scheduledUnitId },
    include: { dailyPlan: true },
  });
  if (!su) return { error: "Scheduled unit not found" };
  if (su.dailyPlan.userId !== user.id) return { error: "Not authorized" };

  const allInDay = await prisma.scheduledUnit.findMany({
    where: { dailyPlanId: su.dailyPlanId },
    orderBy: { sortOrder: "asc" },
  });

  const idx = allInDay.findIndex((s) => s.id === scheduledUnitId);
  if (idx === -1) return { error: "Unit not found in day" };

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= allInDay.length) return { success: true };

  const current = allInDay[idx];
  const swap = allInDay[swapIdx];

  await prisma.$transaction([
    prisma.scheduledUnit.update({
      where: { id: current.id },
      data: { sortOrder: swap.sortOrder },
    }),
    prisma.scheduledUnit.update({
      where: { id: swap.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  revalidatePath("/weekly-plan");
  return { success: true };
}

export async function batchReorderUnits(
  dailyPlanId: string,
  orderedScheduledUnitIds: string[]
) {
  const user = await getCurrentUser();

  const dailyPlan = await prisma.dailyPlan.findFirst({
    where: { id: dailyPlanId, userId: user.id },
  });
  if (!dailyPlan) return { error: "Daily plan not found" };

  await prisma.$transaction(
    orderedScheduledUnitIds.map((id, index) =>
      prisma.scheduledUnit.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  revalidatePath("/weekly-plan");
  revalidatePath("/today");
  return { success: true };
}

export async function getCarryForwardUnits(weekStartISO: string) {
  const user = await getCurrentUser();
  const currentMonday = new Date(weekStartISO + "T00:00:00.000Z");
  const prevMonday = addWeeks(currentMonday, -1);

  const prevPlan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: prevMonday,
      },
    },
    include: {
      dailyPlans: {
        include: {
          scheduledUnits: {
            include: {
              unit: {
                include: {
                  task: {
                    select: {
                      id: true,
                      title: true,
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

  if (!prevPlan) return [];

  const unfinished = prevPlan.dailyPlans
    .flatMap((dp) => dp.scheduledUnits)
    .filter(
      (su) =>
        su.unit.status !== "completed" && su.unit.status !== "skipped"
    )
    .map((su) => ({
      id: su.unit.id,
      label: su.unit.label,
      status: su.unit.status,
      task: su.unit.task,
    }));

  const seen = new Set<string>();
  return unfinished.filter((u) => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });
}

export async function moveUnitToWeek(scheduledUnitId: string, targetWeekISO: string) {
  const user = await getCurrentUser();

  const su = await prisma.scheduledUnit.findUnique({
    where: { id: scheduledUnitId },
    include: { unit: true, dailyPlan: true },
  });
  if (!su) return { error: "Scheduled unit not found" };
  if (su.dailyPlan.userId !== user.id) return { error: "Not authorized" };

  const targetWeekStart = new Date(targetWeekISO + "T00:00:00.000Z");

  // Get or create the target week's plan
  let targetPlan = await prisma.weeklyPlan.findUnique({
    where: { userId_weekStartDate: { userId: user.id, weekStartDate: targetWeekStart } },
    include: { dailyPlans: { orderBy: { date: "asc" } } },
  });

  if (!targetPlan) {
    targetPlan = await prisma.weeklyPlan.create({
      data: {
        userId: user.id,
        weekStartDate: targetWeekStart,
        targetUnits: 80,
        dailyPlans: {
          create: Array.from({ length: 7 }, (_, i) => {
            const dayDate = addDays(targetWeekStart, i);
            return {
              userId: user.id,
              date: new Date(toDateOnlyISO(dayDate) + "T00:00:00.000Z"),
              targetUnits: i < 5 ? 16 : 0,
            };
          }),
        },
      },
      include: { dailyPlans: { orderBy: { date: "asc" } } },
    });
  }

  // Find first weekday (Monday) of target week
  const targetDailyPlan = targetPlan.dailyPlans[0];
  if (!targetDailyPlan) return { error: "Target week has no daily plans" };

  const maxOrder = await prisma.scheduledUnit.aggregate({
    where: { dailyPlanId: targetDailyPlan.id },
    _max: { sortOrder: true },
  });
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  await prisma.$transaction([
    // Remove from current day
    prisma.scheduledUnit.delete({ where: { id: scheduledUnitId } }),
    // Add to target week's Monday
    prisma.scheduledUnit.create({
      data: { dailyPlanId: targetDailyPlan.id, unitId: su.unitId, sortOrder: nextOrder },
    }),
    // Keep unit as scheduled
    prisma.unit.update({
      where: { id: su.unitId },
      data: { status: "scheduled" },
    }),
  ]);

  revalidatePath("/weekly-plan");
  return { success: true };
}

export async function createQuickUnit(label: string | null) {
  const user = await getCurrentUser();

  if (!label?.trim()) {
    return { error: "Label is required for standalone units" };
  }

  await prisma.unit.create({
    data: {
      userId: user.id,
      label: label.trim(),
      taskId: null,
    },
  });

  revalidatePath("/weekly-plan");
  return { success: true };
}
