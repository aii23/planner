"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import type { ProjectStatus } from "@/src/generated/prisma/client";

export async function getProjects(includeArchived = false) {
  const user = await getCurrentUser();

  const where: { userId: string; status?: ProjectStatus } = {
    userId: user.id,
  };
  if (!includeArchived) {
    where.status = "active";
  }

  return prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { tasks: true } },
      tasks: {
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: {
          _count: { select: { units: true } },
          units: { select: { status: true } },
        },
      },
    },
  });
}

export async function createProject(formData: FormData) {
  const user = await getCurrentUser();
  const name = formData.get("name") as string;
  const color = (formData.get("color") as string) || "#6366f1";

  if (!name?.trim()) {
    return { error: "Project name is required" };
  }

  await prisma.project.create({
    data: {
      userId: user.id,
      name: name.trim(),
      color,
    },
  });

  revalidatePath("/backlog");
  return { success: true };
}

export async function updateProject(formData: FormData) {
  const user = await getCurrentUser();
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;

  if (!id) return { error: "Project ID is required" };
  if (!name?.trim()) return { error: "Project name is required" };

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
  });

  if (!project) return { error: "Project not found" };

  await prisma.project.update({
    where: { id },
    data: {
      name: name.trim(),
      ...(color && { color }),
    },
  });

  revalidatePath("/backlog");
  return { success: true };
}

export async function archiveProject(formData: FormData) {
  const user = await getCurrentUser();
  const id = formData.get("id") as string;

  if (!id) return { error: "Project ID is required" };

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
  });

  if (!project) return { error: "Project not found" };

  const newStatus = project.status === "archived" ? "active" : "archived";

  await prisma.project.update({
    where: { id },
    data: { status: newStatus as ProjectStatus },
  });

  revalidatePath("/backlog");
  return { success: true };
}
