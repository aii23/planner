"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

export interface UserPreferences {
  work_duration_min: number;
  rest_duration_min: number;
  unit_duration_min: number;
  week_start_day: string;
  daily_checkin: boolean;
  notification_sound: boolean;
  timezone: string;
}

const DEFAULTS: UserPreferences = {
  work_duration_min: 50,
  rest_duration_min: 10,
  unit_duration_min: 20,
  week_start_day: "monday",
  daily_checkin: true,
  notification_sound: true,
  timezone: "UTC",
};

export async function getPreferences(): Promise<UserPreferences> {
  const user = await getCurrentUser();
  const stored = user.preferences as Record<string, unknown> | null;
  return { ...DEFAULTS, ...stored };
}

export async function updatePreferences(updates: Partial<UserPreferences>) {
  const user = await getCurrentUser();
  const current = (user.preferences as Record<string, unknown>) ?? {};

  const merged = { ...current, ...updates };

  if (
    typeof merged.work_duration_min === "number" &&
    (merged.work_duration_min < 1 || merged.work_duration_min > 120)
  ) {
    return { error: "Work duration must be between 1 and 120 minutes" };
  }
  if (
    typeof merged.rest_duration_min === "number" &&
    (merged.rest_duration_min < 1 || merged.rest_duration_min > 60)
  ) {
    return { error: "Rest duration must be between 1 and 60 minutes" };
  }
  if (
    typeof merged.unit_duration_min === "number" &&
    (merged.unit_duration_min < 5 || merged.unit_duration_min > 60)
  ) {
    return { error: "Unit duration must be between 5 and 60 minutes" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { preferences: merged },
  });

  revalidatePath("/settings");
  revalidatePath("/today");
  return { success: true };
}
