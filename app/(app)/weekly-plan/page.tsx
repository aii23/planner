import { connection } from "next/server";
import { getOrCreateWeeklyPlan, getUnscheduledUnits } from "@/app/actions/weekly-plan";
import { WeeklyPlanView } from "@/components/weekly/weekly-plan-view";
import { getMonday, toDateOnlyISO } from "@/lib/date-utils";

export default async function WeeklyPlanPage() {
  await connection();

  const now = new Date();
  const monday = getMonday(now);
  const mondayISO = toDateOnlyISO(monday);

  const [plan, backlog] = await Promise.all([
    getOrCreateWeeklyPlan(mondayISO),
    getUnscheduledUnits(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Weekly Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set targets and schedule units across the week
        </p>
      </div>

      <WeeklyPlanView
        initialPlan={plan}
        initialMonday={mondayISO}
        initialBacklog={backlog}
      />
    </div>
  );
}
