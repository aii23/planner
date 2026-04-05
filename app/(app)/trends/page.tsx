import { TrendingUp } from "lucide-react";

export default function TrendsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trends</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Patterns across weeks and months
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <TrendingUp className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Coming soon — historical charts, streaks, and productivity insights.
        </p>
      </div>
    </div>
  );
}
