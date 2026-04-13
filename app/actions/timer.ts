"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, getUserTimezone } from "@/lib/user";
import { toDateOnlyISOInTz, getMondayInTz } from "@/lib/date-utils";

async function fetchDayQueue(userId: string, dateISO: string) {
  const scheduledUnitInclude = {
    orderBy: { sortOrder: "asc" } as const,
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
  };

  const dailyPlan = await prisma.dailyPlan.findFirst({
    where: { userId, date: new Date(dateISO + "T00:00:00.000Z") },
    include: { scheduledUnits: scheduledUnitInclude },
  });

  if (!dailyPlan) return [];

  return dailyPlan.scheduledUnits.map((su) => ({
    scheduledUnitId: su.id,
    sortOrder: su.sortOrder,
    unit: {
      id: su.unit.id,
      label: su.unit.label,
      status: su.unit.status,
      task: su.unit.task,
    },
  }));
}

export async function getTodayQueue() {
  const user = await getCurrentUser();
  const tz = await getUserTimezone();
  const now = new Date();
  const todayISO = toDateOnlyISOInTz(now, tz);
  return fetchDayQueue(user.id, todayISO);
}

export async function getTodayAndTomorrowQueues() {
  const user = await getCurrentUser();
  const tz = await getUserTimezone();
  const now = new Date();
  const todayISO = toDateOnlyISOInTz(now, tz);

  // Tomorrow = today + 1 day in user tz
  const todayDate = new Date(todayISO + "T12:00:00.000Z");
  todayDate.setUTCDate(todayDate.getUTCDate() + 1);
  const tomorrowISO = todayDate.toISOString().slice(0, 10);

  const [todayQueue, tomorrowQueue] = await Promise.all([
    fetchDayQueue(user.id, todayISO),
    fetchDayQueue(user.id, tomorrowISO),
  ]);

  return { todayQueue, tomorrowQueue };
}

export async function getUserPreferences() {
  const user = await getCurrentUser();
  const prefs = user.preferences as Record<string, unknown> | null;
  return {
    workDurationMin: (prefs?.work_duration_min as number) ?? 50,
    restDurationMin: (prefs?.rest_duration_min as number) ?? 10,
    notificationSound: (prefs?.notification_sound as boolean) ?? true,
  };
}

export async function reorderTodayQueue(orderedScheduledUnitIds: string[]) {
  const user = await getCurrentUser();

  if (orderedScheduledUnitIds.length === 0) return { success: true };

  const first = await prisma.scheduledUnit.findUnique({
    where: { id: orderedScheduledUnitIds[0] },
    include: { dailyPlan: true },
  });
  if (!first || first.dailyPlan.userId !== user.id) {
    return { error: "Not authorized" };
  }

  await prisma.$transaction(
    orderedScheduledUnitIds.map((id, index) =>
      prisma.scheduledUnit.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  revalidatePath("/today");
  return { success: true };
}

export async function completeCurrentUnit(
  unitId: string,
  actualDurationSeconds?: number
) {
  const user = await getCurrentUser();

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, userId: user.id },
  });
  if (!unit) return { error: "Unit not found" };

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      status: "completed",
      completedAt: new Date(),
      ...(actualDurationSeconds != null && actualDurationSeconds > 0 && {
        actualDurationSeconds,
      }),
    },
  });

  if (unit.taskId) {
    const completedCount = await prisma.unit.count({
      where: { taskId: unit.taskId, status: "completed" },
    });
    await prisma.task.update({
      where: { id: unit.taskId },
      data: { completedUnits: completedCount },
    });
  }

  revalidatePath("/today");
  return { success: true };
}

export async function skipCurrentUnit(unitId: string) {
  const user = await getCurrentUser();

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, userId: user.id },
  });
  if (!unit) return { error: "Unit not found" };

  await prisma.unit.update({
    where: { id: unitId },
    data: { status: "skipped" },
  });

  revalidatePath("/today");
  return { success: true };
}

export async function quickAddUnit(taskId: string, label: string | null) {
  const user = await getCurrentUser();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id },
  });
  if (!task) return { error: "Task not found" };

  const tz = await getUserTimezone();
  const now = new Date();
  const todayISO = toDateOnlyISOInTz(now, tz);
  const monday = getMondayInTz(now, tz);
  const mondayISO = monday.toISOString().slice(0, 10);

  const dailyPlan = await prisma.dailyPlan.findFirst({
    where: {
      userId: user.id,
      date: new Date(todayISO + "T00:00:00.000Z"),
      weeklyPlan: { weekStartDate: new Date(mondayISO + "T00:00:00.000Z") },
    },
  });

  const unit = await prisma.unit.create({
    data: {
      taskId,
      userId: user.id,
      label: label?.trim() || null,
      status: dailyPlan ? "scheduled" : "pending",
    },
  });

  if (dailyPlan) {
    const maxOrder = await prisma.scheduledUnit.aggregate({
      where: { dailyPlanId: dailyPlan.id },
      _max: { sortOrder: true },
    });
    await prisma.scheduledUnit.create({
      data: {
        dailyPlanId: dailyPlan.id,
        unitId: unit.id,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  revalidatePath("/today");
  return { success: true, unitId: unit.id };
}

export async function incrementUnitsConsumed(unitId: string) {
  const user = await getCurrentUser();

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, userId: user.id },
  });
  if (!unit) return { error: "Unit not found" };

  await prisma.unit.update({
    where: { id: unitId },
    data: { actualUnitsConsumed: (unit.actualUnitsConsumed ?? 1) + 1 },
  });

  return { success: true };
}

export async function splitUnit(unitId: string, followUpLabel: string | null) {
  const user = await getCurrentUser();

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, userId: user.id },
    include: { scheduledUnits: true },
  });
  if (!unit) return { error: "Unit not found" };

  await prisma.unit.update({
    where: { id: unitId },
    data: { status: "completed", completedAt: new Date() },
  });

  if (unit.taskId) {
    const completedCount = await prisma.unit.count({
      where: { taskId: unit.taskId, status: "completed" },
    });
    await prisma.task.update({
      where: { id: unit.taskId },
      data: { completedUnits: completedCount },
    });
  }

  const newUnit = await prisma.unit.create({
    data: {
      taskId: unit.taskId,
      userId: user.id,
      label: followUpLabel?.trim() || (unit.label ? `${unit.label} (cont.)` : null),
      status: "scheduled",
    },
  });

  if (unit.scheduledUnits.length > 0) {
    const su = unit.scheduledUnits[0];
    const maxOrder = await prisma.scheduledUnit.aggregate({
      where: { dailyPlanId: su.dailyPlanId },
      _max: { sortOrder: true },
    });
    await prisma.scheduledUnit.create({
      data: {
        dailyPlanId: su.dailyPlanId,
        unitId: newUnit.id,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  revalidatePath("/today");
  return { success: true, newUnitId: newUnit.id };
}

export async function getActiveTasksForQuickAdd() {
  const user = await getCurrentUser();

  const tasks = await prisma.task.findMany({
    where: { userId: user.id, status: { not: "done" } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      project: { select: { id: true, name: true, color: true } },
    },
  });

  return tasks;
}

export async function saveTimerSession(
  unitId: string | null,
  type: "work" | "rest",
  startedAt: string,
  endedAt: string
) {
  const user = await getCurrentUser();

  await prisma.timerSession.create({
    data: {
      userId: user.id,
      unitId: unitId || null,
      type,
      startedAt: new Date(startedAt),
      endedAt: new Date(endedAt),
    },
  });

  return { success: true };
}
