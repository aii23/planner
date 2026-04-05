"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

export async function getTrendsData() {
  const user = await getCurrentUser();

  const weeklyPlans = await prisma.weeklyPlan.findMany({
    where: { userId: user.id },
    orderBy: { weekStartDate: "asc" },
    include: {
      dailyPlans: {
        orderBy: { date: "asc" },
        include: {
          scheduledUnits: {
            include: {
              unit: {
                select: {
                  status: true,
                  actualUnitsConsumed: true,
                  task: {
                    select: {
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

  const weeks = weeklyPlans.map((wp) => {
    const allUnits = wp.dailyPlans.flatMap((dp) => dp.scheduledUnits);
    const completed = allUnits.filter((su) => su.unit.status === "completed");
    const actualSlots = completed.reduce(
      (sum, su) => sum + (su.unit.actualUnitsConsumed ?? 1),
      0
    );

    const projectMap = new Map<
      string,
      { id: string; name: string; color: string; count: number }
    >();
    for (const su of completed) {
      const p = su.unit.task.project;
      const entry = projectMap.get(p.id) ?? { ...p, count: 0 };
      entry.count++;
      projectMap.set(p.id, entry);
    }

    const dailyCompleted = wp.dailyPlans.map((dp) => ({
      date: dp.date,
      dayOfWeek: new Date(dp.date).getDay(),
      completed: dp.scheduledUnits.filter((su) => su.unit.status === "completed").length,
      target: dp.targetUnits,
    }));

    return {
      weekStart: wp.weekStartDate,
      target: wp.targetUnits,
      completed: completed.length,
      scheduled: allUnits.length,
      actualSlots,
      estimationAccuracy:
        completed.length > 0
          ? Math.round((completed.length / actualSlots) * 100)
          : null,
      projects: Array.from(projectMap.values()),
      daily: dailyCompleted,
    };
  });

  const allDailyData = weeks.flatMap((w) => w.daily);
  const dayAverages = [1, 2, 3, 4, 5, 6, 0].map((dow) => {
    const dayEntries = allDailyData.filter((d) => d.dayOfWeek === dow);
    const avg =
      dayEntries.length > 0
        ? Math.round(
            (dayEntries.reduce((s, d) => s + d.completed, 0) / dayEntries.length) * 10
          ) / 10
        : 0;
    return { dayOfWeek: dow, average: avg };
  });

  const totalWeeks = weeks.length;
  const avgPerWeek =
    totalWeeks > 0
      ? Math.round(
          (weeks.reduce((s, w) => s + w.completed, 0) / totalWeeks) * 10
        ) / 10
      : 0;
  const avgPerDay =
    allDailyData.length > 0
      ? Math.round(
          (allDailyData.reduce((s, d) => s + d.completed, 0) / allDailyData.length) * 10
        ) / 10
      : 0;

  let currentStreak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].completed > 0) currentStreak++;
    else break;
  }

  const allProjects = new Map<
    string,
    { id: string; name: string; color: string; total: number }
  >();
  for (const w of weeks) {
    for (const p of w.projects) {
      const entry = allProjects.get(p.id) ?? { ...p, total: 0 };
      entry.total += p.count;
      allProjects.set(p.id, entry);
    }
  }

  return {
    weeks,
    avgPerWeek,
    avgPerDay,
    currentStreak,
    totalWeeks,
    dayAverages,
    allTimeProjects: Array.from(allProjects.values()).sort(
      (a, b) => b.total - a.total
    ),
  };
}
