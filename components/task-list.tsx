"use client";

import { ListTodo } from "lucide-react";
import { TaskRow, type TaskWithUnits } from "@/components/task-row";
import { AddTaskForm } from "@/components/add-task-form";

interface TaskListProps {
  tasks: TaskWithUnits[];
  projectId: string;
  projectColor: string;
}

export function TaskList({ tasks, projectId, projectColor }: TaskListProps) {
  const hasTasks = tasks.length > 0;

  return (
    <div className="space-y-1">
      {!hasTasks && (
        <p className="text-xs text-muted-foreground py-2 px-3">
          No tasks yet. Add your first task below.
        </p>
      )}

      {hasTasks && (
        <div className="divide-y divide-border/50">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              projectColor={projectColor}
            />
          ))}
        </div>
      )}

      <div className="pt-2 px-3">
        <AddTaskForm projectId={projectId} />
      </div>
    </div>
  );
}
