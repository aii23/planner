import { prisma } from "@/lib/db";

const DEFAULT_EMAIL = "owner@planer.local";

export async function getCurrentUser() {
  let user = await prisma.user.findUnique({
    where: { email: DEFAULT_EMAIL },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEFAULT_EMAIL,
        name: "Owner",
        preferences: {
          work_duration_min: 50,
          rest_duration_min: 10,
          unit_duration_min: 20,
          week_start_day: "monday",
          daily_checkin: true,
          notification_sound: true,
        },
      },
    });
  }

  return user;
}
