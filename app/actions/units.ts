"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import type { UnitStatus } from "@/src/generated/prisma/client";

const VALID_STATUSES: UnitStatus[] = [
  "pending",
  "scheduled",
  "in_progress",
  "completed",
  "skipped",
];

export async function createUnit(formData: FormData) {
  const user = await getCurrentUser();
  const taskId = formData.get("taskId") as string;
  const label = (formData.get("label") as string) || null;

  if (!taskId) return { error: "Task ID is required" };

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id },
  });
  if (!task) return { error: "Task not found" };

  await prisma.unit.create({
    data: {
      taskId,
      userId: user.id,
      label: label?.trim() || null,
    },
  });

  revalidatePath("/backlog");
  return { success: true };
}

export async function createBulkUnits(taskId: string, count: number) {
  const user = await getCurrentUser();

  if (!taskId) return { error: "Task ID is required" };
  if (!count || count < 1 || count > 50)
    return { error: "Count must be between 1 and 50" };

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id },
  });
  if (!task) return { error: "Task not found" };

  const data = Array.from({ length: count }, (_, i) => ({
    taskId,
    userId: user.id,
    label: count > 1 ? `Unit ${i + 1}` : null,
  }));

  await prisma.unit.createMany({ data });

  revalidatePath("/backlog");
  return { success: true };
}

export async function updateUnit(
  id: string,
  updates: { label?: string | null; status?: UnitStatus }
) {
  const user = await getCurrentUser();

  const unit = await prisma.unit.findFirst({
    where: { id, userId: user.id },
  });
  if (!unit) return { error: "Unit not found" };

  if (updates.status && !VALID_STATUSES.includes(updates.status)) {
    return { error: "Invalid unit status" };
  }

  const isCompleting =
    updates.status === "completed" && unit.status !== "completed";
  const isUncompleting =
    updates.status && updates.status !== "completed" && unit.completedAt;

  await prisma.unit.update({
    where: { id },
    data: {
      ...(updates.label !== undefined && { label: updates.label?.trim() || null }),
      ...(updates.status && { status: updates.status }),
      ...(isCompleting && { completedAt: new Date() }),
      ...(isUncompleting && { completedAt: null }),
    },
  });

  if (isCompleting || isUncompleting) {
    const completedCount = await prisma.unit.count({
      where: { taskId: unit.taskId, status: "completed" },
    });
    await prisma.task.update({
      where: { id: unit.taskId },
      data: { completedUnits: completedCount },
    });
  }

  revalidatePath("/backlog");
  return { success: true };
}

export async function deleteUnit(id: string) {
  const user = await getCurrentUser();

  const unit = await prisma.unit.findFirst({
    where: { id, userId: user.id },
  });
  if (!unit) return { error: "Unit not found" };

  await prisma.unit.delete({ where: { id } });

  const completedCount = await prisma.unit.count({
    where: { taskId: unit.taskId, status: "completed" },
  });
  await prisma.task.update({
    where: { id: unit.taskId },
    data: { completedUnits: completedCount },
  });

  revalidatePath("/backlog");
  return { success: true };
}
