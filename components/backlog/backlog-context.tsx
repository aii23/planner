"use client";

import { createContext, useContext } from "react";
import type { UnitData, TaskWithUnits } from "@/components/backlog/task-row";
import type { UnitStatus, TaskStatus } from "@/src/generated/prisma/client";

export interface OptimisticProject {
  id: string;
  name: string;
  color: string;
  status: "active";
  createdAt: Date;
  _count: { tasks: number };
  tasks: TaskWithUnits[];
}

export interface OptimisticTask {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  estimatedUnits: number;
  completedUnits: number;
  createdAt: Date;
  completedAt: null;
  _count: { units: number };
  units: UnitData[];
}

export interface OptimisticUnit {
  id: string;
  label: string | null;
  status: UnitStatus;
  actualDurationSeconds: null;
  actualUnitsConsumed: null;
  completedAt: null;
  createdAt: Date;
}

type BacklogContextValue = {
  refresh: () => Promise<void>;
  addProject: (project: OptimisticProject) => void;
  addTask: (projectId: string, task: OptimisticTask) => void;
  addUnits: (taskId: string, units: OptimisticUnit[]) => void;
};

const BacklogContext = createContext<BacklogContextValue | null>(null);

export const BacklogProvider = BacklogContext.Provider;

export function useBacklog() {
  const ctx = useContext(BacklogContext);
  if (!ctx) {
    throw new Error("useBacklog must be used within a BacklogProvider");
  }
  return ctx;
}

export function useBacklogRefresh() {
  return useBacklog().refresh;
}
