"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { getMonday, toDateOnlyISO } from "@/lib/date-utils";

export async function getTodayQueue() {
  const user = await getCurrentUser();
  const today = new Date();
  const monday = getMonday(today);
  const todayISO = toDateOnlyISO(today);
  const mondayISO = toDateOnlyISO(monday);

  const dailyPlan = await prisma.dailyPlan.findFirst({
    where: {
      userId: user.id,
      date: new Date(todayISO + "T00:00:00.000Z"),
      weeklyPlan: {
        weekStartDate: new Date(mondayISO + "T00:00:00.000Z"),
      },
    },
    include: {
      scheduledUnits: {
        orderBy: { sortOrder: "asc" },
        include: {
          unit: {
            include: {
              task: {
                select: {
                  id: true,
                  title: true,
                  project: {
                    select: { id: true, name: true, color: true },
                  },
                },
              },
            },
          },
        },
      },
    },
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

export async function getUserPreferences() {
  const user = await getCurrentUser();
  const prefs = user.preferences as Record<string, unknown> | null;
  return {
    workDurationMin: (prefs?.work_duration_min as number) ?? 50,
    restDurationMin: (prefs?.rest_duration_min as number) ?? 10,
  };
}
