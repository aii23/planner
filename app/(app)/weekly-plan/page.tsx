import { connection } from "next/server";
import { getOrCreateWeeklyPlan, getUnscheduledUnits, getCarryForwardUnits } from "@/app/actions/weekly-plan";
import { WeeklyPlanView } from "@/components/weekly/weekly-plan-view";
import { getMondayInTz } from "@/lib/date-utils";
import { getUserTimezone } from "@/lib/user";

export default async function WeeklyPlanPage() {
  await connection();

  const tz = await getUserTimezone();
  const now = new Date();
  const monday = getMondayInTz(now, tz);
  const mondayISO = monday.toISOString().slice(0, 10);

  const [plan, backlog, carryForward] = await Promise.all([
    getOrCreateWeeklyPlan(mondayISO),
    getUnscheduledUnits(),
    getCarryForwardUnits(mondayISO),
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
        initialCarryForward={carryForward}
      />
    </div>
  );
}
