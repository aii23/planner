import { connection } from "next/server";
import { getOrCreateWeeklyPlan } from "@/app/actions/weekly-plan";
import { WeeklyPlanView } from "@/components/weekly-plan-view";
import { getMonday, toDateOnlyISO } from "@/lib/date-utils";

export default async function WeeklyPlanPage() {
  await connection();

  const now = new Date();
  const monday = getMonday(now);
  const mondayISO = toDateOnlyISO(monday);
  const plan = await getOrCreateWeeklyPlan(mondayISO);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Weekly Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set targets and schedule units across the week
        </p>
      </div>

      <WeeklyPlanView initialPlan={plan} initialMonday={mondayISO} />
    </div>
  );
}
