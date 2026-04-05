"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { addDays, toDateOnlyISO } from "@/lib/date-utils";

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
