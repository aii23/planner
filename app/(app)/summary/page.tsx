import { connection } from "next/server";
import { getWeeklySummary } from "@/app/actions/summary";
import { SummaryView } from "@/components/summary/summary-view";
import { getMonday, addWeeks, toDateOnlyISO } from "@/lib/date-utils";

export default async function SummaryPage() {
  await connection();

  const now = new Date();
  const lastMonday = addWeeks(getMonday(now), -1);
  const mondayISO = toDateOnlyISO(lastMonday);
  const summary = await getWeeklySummary(mondayISO);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Weekly Summary
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your completed week
        </p>
      </div>

      <SummaryView initialSummary={summary} initialMonday={mondayISO} />
    </div>
  );
}
