import { Calendar } from "lucide-react";

export default function WeeklyPlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Weekly Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set targets and schedule units across the week
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <Calendar className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Weekly planning will be available after creating projects and tasks.
        </p>
      </div>
    </div>
  );
}
