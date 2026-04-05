"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import type { TaskStatus } from "@/src/generated/prisma/client";

const VALID_STATUSES: TaskStatus[] = [
  "backlog",
  "planned",
  "in_progress",
  "done",
];

export async function getTasks(projectId: string) {
  const user = await getCurrentUser();

  return prisma.task.findMany({
    where: { projectId, userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { units: true } },
      units: {
        select: { status: true },
      },
    },
  });
}

export async function createTask(formData: FormData) {
  const user = await getCurrentUser();
  const projectId = formData.get("projectId") as string;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const estimatedUnits = parseInt(formData.get("estimatedUnits") as string, 10);

  if (!projectId) return { error: "Project ID is required" };
  if (!title?.trim()) return { error: "Task title is required" };
  if (!estimatedUnits || estimatedUnits < 1)
    return { error: "Estimated units must be at least 1" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) return { error: "Project not found" };

  await prisma.task.create({
    data: {
      projectId,
      userId: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      estimatedUnits,
    },
  });

  revalidatePath("/backlog");
  return { success: true };
}

export async function updateTask(formData: FormData) {
  const user = await getCurrentUser();
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const estimatedUnits = parseInt(formData.get("estimatedUnits") as string, 10);
  const status = formData.get("status") as TaskStatus | null;

  if (!id) return { error: "Task ID is required" };
  if (!title?.trim()) return { error: "Task title is required" };
  if (!estimatedUnits || estimatedUnits < 1)
    return { error: "Estimated units must be at least 1" };

  const task = await prisma.task.findFirst({
    where: { id, userId: user.id },
  });
  if (!task) return { error: "Task not found" };

  if (status && !VALID_STATUSES.includes(status)) {
    return { error: "Invalid task status" };
  }

  await prisma.task.update({
    where: { id },
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      estimatedUnits,
      ...(status && { status }),
      ...(status === "done" && !task.completedAt && { completedAt: new Date() }),
      ...(status && status !== "done" && task.completedAt && { completedAt: null }),
    },
  });

  revalidatePath("/backlog");
  return { success: true };
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const user = await getCurrentUser();

  if (!VALID_STATUSES.includes(status)) {
    return { error: "Invalid task status" };
  }

  const task = await prisma.task.findFirst({
    where: { id, userId: user.id },
  });
  if (!task) return { error: "Task not found" };

  await prisma.task.update({
    where: { id },
    data: {
      status,
      ...(status === "done" && !task.completedAt && { completedAt: new Date() }),
      ...(status !== "done" && task.completedAt && { completedAt: null }),
    },
  });

  revalidatePath("/backlog");
  return { success: true };
}

export async function deleteTask(id: string) {
  const user = await getCurrentUser();

  const task = await prisma.task.findFirst({
    where: { id, userId: user.id },
  });
  if (!task) return { error: "Task not found" };

  await prisma.task.delete({ where: { id } });

  revalidatePath("/backlog");
  return { success: true };
}
