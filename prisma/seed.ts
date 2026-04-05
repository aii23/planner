import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const email = "owner@planer.local";

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
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
    console.log("Created user:", user.email);
  } else {
    console.log("User already exists:", user.email);
  }

  const projectCount = await prisma.project.count({ where: { userId: user.id } });
  if (projectCount > 0) {
    console.log(`${projectCount} projects already exist, skipping seed.`);
    await prisma.$disconnect();
    return;
  }

  const project1 = await prisma.project.create({
    data: {
      userId: user.id,
      name: "Website Redesign",
      color: "#6366f1",
    },
  });

  const project2 = await prisma.project.create({
    data: {
      userId: user.id,
      name: "Mobile App MVP",
      color: "#22c55e",
    },
  });

  const task1 = await prisma.task.create({
    data: {
      projectId: project1.id,
      userId: user.id,
      title: "Design homepage mockups",
      description: "Create Figma mockups for the new homepage layout",
      estimatedUnits: 4,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      projectId: project1.id,
      userId: user.id,
      title: "Implement responsive nav",
      estimatedUnits: 3,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      projectId: project2.id,
      userId: user.id,
      title: "Set up React Native project",
      description: "Initialize with Expo, configure navigation and theming",
      estimatedUnits: 2,
    },
  });

  for (let i = 1; i <= 4; i++) {
    await prisma.unit.create({
      data: {
        taskId: task1.id,
        userId: user.id,
        label: `Homepage section ${i}`,
      },
    });
  }

  for (let i = 1; i <= 3; i++) {
    await prisma.unit.create({
      data: {
        taskId: task2.id,
        userId: user.id,
        label: i === 1 ? "Desktop nav" : i === 2 ? "Mobile hamburger" : "Responsive breakpoints",
      },
    });
  }

  for (let i = 1; i <= 2; i++) {
    await prisma.unit.create({
      data: {
        taskId: task3.id,
        userId: user.id,
        label: i === 1 ? "Expo init + deps" : "Navigation setup",
      },
    });
  }

  console.log("Seed complete: 2 projects, 3 tasks, 9 units");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
